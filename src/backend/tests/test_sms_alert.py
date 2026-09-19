"""
Tests for src/backend/services/sms_alert.py

Run from the repo root:
    python -m pytest src/backend/tests/test_sms_alert.py -v

All HTTP calls are mocked — no real SMS is ever sent.
"""

import asyncio
import os
import sys
import threading
import unittest
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

# Make the backend directory importable so `services` resolves correctly
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.sms_alert import (
    _ALERT_FAULT_TYPES,
    _ALERT_RISK_TIERS,
    _counter,
    _counter_lock,
    _dedup_key,
    _mask,
    _refund_quota,
    _sent_cache,
    _sent_cache as _dedup_cache,
    _try_consume_quota,
    build_fault_message,
    normalize_indian_number,
    parse_recipients,
    send_fault_alert,
    should_alert,
    validate_config,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _reset_counter(count: int = 0) -> None:
    with _counter_lock:
        _counter["day"]   = date.today()
        _counter["count"] = count


def _reset_dedup() -> None:
    _sent_cache.clear()


def _run(coro):
    """Run an async coroutine in a fresh event loop."""
    return asyncio.get_event_loop().run_until_complete(coro)


# ===========================================================================
# 1. Number normalisation — valid
# ===========================================================================

class TestNormalizeValid(unittest.TestCase):
    def test_ten_digits_starts_6(self):
        self.assertEqual(normalize_indian_number("6000000001"), "+916000000001")

    def test_ten_digits_starts_7(self):
        self.assertEqual(normalize_indian_number("7123456789"), "+917123456789")

    def test_ten_digits_starts_8(self):
        self.assertEqual(normalize_indian_number("8987654321"), "+918987654321")

    def test_ten_digits_starts_9(self):
        self.assertEqual(normalize_indian_number("9876543210"), "+919876543210")

    def test_twelve_digits_with_91(self):
        self.assertEqual(normalize_indian_number("919876543210"), "+919876543210")

    def test_plus91_prefix(self):
        self.assertEqual(normalize_indian_number("+919876543210"), "+919876543210")

    def test_with_spaces(self):
        self.assertEqual(normalize_indian_number("+91 98765 43210"), "+919876543210")

    def test_with_dashes(self):
        self.assertEqual(normalize_indian_number("98-765-43210"), "+919876543210")


# ===========================================================================
# 2. Number normalisation — invalid
# ===========================================================================

class TestNormalizeInvalid(unittest.TestCase):
    def test_starts_with_5(self):
        with self.assertRaises(ValueError):
            normalize_indian_number("5123456789")

    def test_starts_with_1(self):
        with self.assertRaises(ValueError):
            normalize_indian_number("1234567890")

    def test_too_short(self):
        with self.assertRaises(ValueError):
            normalize_indian_number("987654")

    def test_too_long(self):
        with self.assertRaises(ValueError):
            normalize_indian_number("989898989898")

    def test_non_indian_country_code(self):
        with self.assertRaises(ValueError):
            normalize_indian_number("+14155552671")

    def test_empty_string(self):
        with self.assertRaises(ValueError):
            normalize_indian_number("")

    def test_letters(self):
        with self.assertRaises(ValueError):
            normalize_indian_number("abcdefghij")

    def test_plus91_followed_by_5_start(self):
        with self.assertRaises(ValueError):
            normalize_indian_number("+915123456789")


# ===========================================================================
# 3. Recipient list parsing / validation
# ===========================================================================

class TestParseRecipients(unittest.TestCase):
    def test_single_valid(self):
        result = parse_recipients("+919876543210")
        self.assertEqual(result, ["+919876543210"])

    def test_multiple_valid(self):
        result = parse_recipients("+919876543210,+916000000001")
        self.assertEqual(len(result), 2)
        self.assertIn("+919876543210", result)
        self.assertIn("+916000000001", result)

    def test_mixed_valid_invalid(self):
        result = parse_recipients("+919876543210,1234,+916000000001")
        self.assertEqual(len(result), 2)

    def test_empty_string(self):
        self.assertEqual(parse_recipients(""), [])

    def test_only_commas(self):
        self.assertEqual(parse_recipients(",,,"), [])

    def test_whitespace_trimmed(self):
        result = parse_recipients("  +919876543210  ,  +916000000001  ")
        self.assertEqual(len(result), 2)


# ===========================================================================
# 4. Message building
# ===========================================================================

class TestBuildFaultMessage(unittest.TestCase):
    def test_contains_required_fields(self):
        msg = build_fault_message("TX-107", "D2", "CRITICAL", "Zone-B")
        self.assertIn("TX-107", msg)
        self.assertIn("D2", msg)
        self.assertIn("CRITICAL", msg)
        self.assertIn("Zone-B", msg)

    def test_length_under_300(self):
        msg = build_fault_message("TX-107", "D2", "CRITICAL", "Zone-B")
        self.assertLessEqual(len(msg), 300)

    def test_typical_length_under_160(self):
        msg = build_fault_message("TX-107", "D2", "CRITICAL", "Zone-B")
        # Typical message should fit in a single SMS segment
        self.assertLessEqual(len(msg), 160)

    def test_no_newlines_in_output(self):
        msg = build_fault_message("TX-107", "D2", "CRITICAL", "Zone-B")
        self.assertNotIn("\n", msg)
        self.assertNotIn("\r", msg)

    def test_no_zone_still_works(self):
        msg = build_fault_message("TX-112", "PD", "HIGH", None)
        self.assertIn("TX-112", msg)
        self.assertIn("PD", msg)

    def test_sanitizes_newline_in_asset_id(self):
        msg = build_fault_message("TX-1\n07", "D1", "HIGH", "Zone-A")
        self.assertNotIn("\n", msg)

    def test_sanitizes_control_chars(self):
        msg = build_fault_message("TX\x00107", "T3", "CRITICAL", "Zone\x1fC")
        self.assertNotIn("\x00", msg)
        self.assertNotIn("\x1f", msg)

    def test_long_asset_id_truncated(self):
        long_id = "TX-" + "X" * 100
        msg = build_fault_message(long_id, "D2", "CRITICAL", "Zone-B")
        self.assertLessEqual(len(msg), 300)

    def test_missing_fault_type_still_builds(self):
        # Empty fault_type should not crash
        msg = build_fault_message("TX-101", "", "LOW", None)
        self.assertIsInstance(msg, str)


# ===========================================================================
# 5. should_alert threshold
# ===========================================================================

class TestShouldAlert(unittest.TestCase):
    def test_d2_critical_alerts(self):
        self.assertTrue(should_alert("D2", "CRITICAL"))

    def test_d1_high_alerts(self):
        self.assertTrue(should_alert("D1", "HIGH"))

    def test_t3_medium_alerts(self):
        # fault_type T3 is in _ALERT_FAULT_TYPES regardless of tier
        self.assertTrue(should_alert("T3", "MEDIUM"))

    def test_pd_low_alerts(self):
        self.assertTrue(should_alert("PD", "LOW"))

    def test_nf_high_alerts(self):
        # tier HIGH overrides NF
        self.assertTrue(should_alert("NF", "HIGH"))

    def test_nf_critical_alerts(self):
        self.assertTrue(should_alert("NF", "CRITICAL"))

    def test_nf_low_no_alert(self):
        self.assertFalse(should_alert("NF", "LOW"))

    def test_nf_medium_no_alert(self):
        self.assertFalse(should_alert("NF", "MEDIUM"))

    def test_all_fault_types_alert(self):
        for ft in _ALERT_FAULT_TYPES:
            with self.subTest(fault_type=ft):
                self.assertTrue(should_alert(ft, "LOW"))


# ===========================================================================
# 6. De-duplication and cooldown
# ===========================================================================

class TestDeduplication(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        _reset_counter()
        _reset_dedup()

    @patch.dict(os.environ, {
        "SMSGATE_USER": "testuser",
        "SMSGATE_PASS": "testpass",
        "ALERT_PHONE_NUMBERS": "+919876543210",
    })
    @patch("services.sms_alert._send_one", new_callable=AsyncMock)
    async def test_second_alert_suppressed_within_cooldown(self, mock_send):
        mock_send.return_value = None
        score = {"asset_id": "TX-107", "fault_type": "D2", "risk_tier": "CRITICAL"}
        await send_fault_alert(score)
        await send_fault_alert(score)
        # Only one real send should have happened
        self.assertEqual(mock_send.call_count, 1)

    @patch.dict(os.environ, {
        "SMSGATE_USER": "testuser",
        "SMSGATE_PASS": "testpass",
        "ALERT_PHONE_NUMBERS": "+919876543210",
    })
    @patch("services.sms_alert._send_one", new_callable=AsyncMock)
    async def test_different_fault_type_not_suppressed(self, mock_send):
        mock_send.return_value = None
        await send_fault_alert({"asset_id": "TX-107", "fault_type": "D2", "risk_tier": "CRITICAL"})
        await send_fault_alert({"asset_id": "TX-107", "fault_type": "T3", "risk_tier": "CRITICAL"})
        self.assertEqual(mock_send.call_count, 2)

    @patch.dict(os.environ, {
        "SMSGATE_USER": "testuser",
        "SMSGATE_PASS": "testpass",
        "ALERT_PHONE_NUMBERS": "+919876543210",
    })
    @patch("services.sms_alert._send_one", new_callable=AsyncMock)
    async def test_expired_cooldown_fires_again(self, mock_send):
        mock_send.return_value = None
        key = _dedup_key("TX-107", "D2")
        # Inject a "sent" timestamp that is older than the TTL
        _sent_cache[key] = datetime.now(timezone.utc) - timedelta(hours=2)
        await send_fault_alert({"asset_id": "TX-107", "fault_type": "D2", "risk_tier": "CRITICAL"})
        self.assertEqual(mock_send.call_count, 1)


# ===========================================================================
# 7. Daily limit
# ===========================================================================

class TestDailyLimit(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        _reset_dedup()

    @patch.dict(os.environ, {
        "SMSGATE_USER": "testuser",
        "SMSGATE_PASS": "testpass",
        "ALERT_PHONE_NUMBERS": "+919876543210",
        "DAILY_LIMIT": "2",
    })
    @patch("services.sms_alert._send_one", new_callable=AsyncMock)
    async def test_daily_limit_stops_sends(self, mock_send):
        mock_send.return_value = None
        _reset_counter(count=2)   # already at limit
        await send_fault_alert({"asset_id": "TX-108", "fault_type": "D1", "risk_tier": "HIGH"})
        mock_send.assert_not_called()

    @patch.dict(os.environ, {
        "SMSGATE_USER": "testuser",
        "SMSGATE_PASS": "testpass",
        "ALERT_PHONE_NUMBERS": "+919876543210",
        "DAILY_LIMIT": "1",
    })
    @patch("services.sms_alert._send_one", new_callable=AsyncMock)
    async def test_quota_refunded_on_failure(self, mock_send):
        mock_send.side_effect = RuntimeError("gateway down")
        _reset_counter(count=0)
        await send_fault_alert({"asset_id": "TX-109", "fault_type": "T3", "risk_tier": "CRITICAL"})
        # count should be back to 0 after refund
        with _counter_lock:
            self.assertEqual(_counter["count"], 0)


# ===========================================================================
# 8. SMS failure does not break fault handling
# ===========================================================================

class TestSmsFailureIsolation(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        _reset_counter()
        _reset_dedup()

    @patch.dict(os.environ, {
        "SMSGATE_USER": "testuser",
        "SMSGATE_PASS": "testpass",
        "ALERT_PHONE_NUMBERS": "+919876543210",
    })
    @patch("services.sms_alert._send_one", new_callable=AsyncMock)
    async def test_gateway_error_does_not_raise(self, mock_send):
        mock_send.side_effect = Exception("connection refused")
        # Should complete without raising
        try:
            await send_fault_alert({"asset_id": "TX-110", "fault_type": "D2", "risk_tier": "HIGH"})
        except Exception as exc:
            self.fail(f"send_fault_alert raised unexpectedly: {exc}")

    async def test_no_credentials_does_not_raise(self):
        env_patch = {"SMSGATE_USER": "", "SMSGATE_PASS": ""}
        with patch.dict(os.environ, env_patch):
            try:
                await send_fault_alert({"asset_id": "TX-111", "fault_type": "D1", "risk_tier": "HIGH"})
            except Exception as exc:
                self.fail(f"Raised without credentials: {exc}")

    async def test_no_recipients_does_not_raise(self):
        env_patch = {
            "SMSGATE_USER": "u",
            "SMSGATE_PASS": "p",
            "ALERT_PHONE_NUMBERS": "",
        }
        with patch.dict(os.environ, env_patch):
            try:
                await send_fault_alert({"asset_id": "TX-112", "fault_type": "T3", "risk_tier": "CRITICAL"})
            except Exception as exc:
                self.fail(f"Raised with empty recipients: {exc}")

    async def test_nf_low_does_not_call_send(self):
        with patch("services.sms_alert._send_one", new_callable=AsyncMock) as mock_send:
            await send_fault_alert({"asset_id": "TX-101", "fault_type": "NF", "risk_tier": "LOW"})
            mock_send.assert_not_called()


# ===========================================================================
# 9. HTTP layer mock — correct payload structure
# ===========================================================================

class TestHttpPayload(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        _reset_counter()
        _reset_dedup()

    @patch.dict(os.environ, {
        "SMSGATE_USER": "myuser",
        "SMSGATE_PASS": "mypass",
        "SMSGATE_URL": "https://api.sms-gate.app/3rdparty/v1/message",
        "SMSGATE_SIM": "1",
        "ALERT_PHONE_NUMBERS": "+919876543210",
    })
    async def test_send_posts_correct_structure(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)

        with patch("services.sms_alert.httpx.AsyncClient", return_value=mock_client):
            await send_fault_alert({
                "asset_id": "TX-107",
                "fault_type": "D2",
                "risk_tier": "CRITICAL",
                "grid_zone": "Zone-B",
            })

        mock_client.post.assert_called_once()
        call_kwargs = mock_client.post.call_args
        # URL is the first positional arg
        self.assertIn("api.sms-gate.app", call_kwargs[0][0])
        # auth tuple
        self.assertEqual(call_kwargs[1]["auth"], ("myuser", "mypass"))
        # JSON body structure
        body = call_kwargs[1]["json"]
        self.assertIn("textMessage", body)
        self.assertIn("text", body["textMessage"])
        self.assertIn("phoneNumbers", body)
        self.assertEqual(body["phoneNumbers"], ["+919876543210"])
        self.assertEqual(body.get("simNumber"), 1)

    @patch.dict(os.environ, {
        "SMSGATE_USER": "myuser",
        "SMSGATE_PASS": "mypass",
        "SMSGATE_URL": "https://api.sms-gate.app/3rdparty/v1/message",
        "ALERT_PHONE_NUMBERS": "+919876543210,+916543210987",
    })
    @patch("services.sms_alert._send_one", new_callable=AsyncMock)
    async def test_each_recipient_called_separately(self, mock_send):
        mock_send.return_value = None
        _reset_counter()
        _reset_dedup()
        await send_fault_alert({
            "asset_id": "TX-104",
            "fault_type": "T3",
            "risk_tier": "CRITICAL",
        })
        self.assertEqual(mock_send.call_count, 2)
        called_numbers = {call[0][0] for call in mock_send.call_args_list}
        self.assertIn("+919876543210", called_numbers)
        self.assertIn("+916543210987", called_numbers)


# ===========================================================================
# 10. Masking helper
# ===========================================================================

class TestMask(unittest.TestCase):
    def test_masks_all_but_last_4(self):
        masked = _mask("+919876543210")
        self.assertTrue(masked.endswith("3210"))
        self.assertIn("*", masked)

    def test_short_number(self):
        masked = _mask("1234")
        self.assertEqual(masked, "****")


if __name__ == "__main__":
    unittest.main()
