"""
SMS Fault Alert Service
========================
Sends an SMS to configured recipients when a transformer fault is detected.

Wire contract: SMS Gateway for Android (capcom6/android-sms-gateway)
  POST SMSGATE_URL  Basic auth (SMSGATE_USER / SMSGATE_PASS)  15 s timeout
  Body: {"textMessage": {"text": "..."}, "phoneNumbers": ["+91XXXXXXXXXX"], "simNumber": 1}

Configuration (all from environment / src/backend/.env):
  SMSGATE_USER          Gateway username (REQUIRED for SMS to be sent)
  SMSGATE_PASS          Gateway password (REQUIRED for SMS to be sent)
  SMSGATE_URL           API endpoint (default: https://api.sms-gate.app/3rdparty/v1/message)
  SMSGATE_SIM           SIM slot number, 1-based (optional)
  DAILY_LIMIT           Max SMS sends per day, per process (default: 50)
  ALERT_PHONE_NUMBERS   Comma-separated recipient numbers, e.g. +919876543210,+919123456789

Security:
  - Never log full phone numbers: only last 4 digits are shown in logs.
  - Credentials are read from os.environ; never hardcoded here.
  - No public HTTP endpoint is exposed by this module.

Known limitation:
  - The daily counter and de-duplication cache are in-memory only.
    They reset on process restart. If the project adds Redis or a DB later,
    back _counter and _sent_cache with that store instead.
"""

import asyncio
import os
import re
import threading
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_DEFAULT_URL = "https://api.sms-gate.app/3rdparty/v1/message"
_TIMEOUT_S   = 15.0
_MAX_RETRIES = 2          # total attempts = 1 original + 1 retry
_DEDUP_TTL_H = 1          # same fault on same asset is suppressed for this many hours
_MAX_MSG_LEN = 300        # hard SMS length cap (well under 2-segment limit)

# Fault types that always trigger an alert (everything except "no fault")
_ALERT_FAULT_TYPES  = {"D1", "D2", "T1", "T2", "T3", "PD"}
# Risk tiers that trigger an alert even if fault_type is unexpectedly "NF"
_ALERT_RISK_TIERS   = {"HIGH", "CRITICAL"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sanitize(value: Any, max_len: int = 40) -> str:
    """Strip control characters and truncate.  Returns plain ASCII-safe string."""
    s = re.sub(r"[\r\n\t\x00-\x1f\x7f]", " ", str(value)).strip()
    return s[:max_len] if len(s) > max_len else s


def _mask(number: str) -> str:
    """Return number with all but last 4 digits masked, e.g. +91******3210."""
    digits = re.sub(r"\D", "", number)
    if len(digits) <= 4:
        return "****"
    return "+" + "*" * (len(digits) - 4) + digits[-4:]


def normalize_indian_number(number: str) -> str:
    """
    Return the number in +91XXXXXXXXXX form.
    Accepts: 10 digits (6-9 start), 919XXXXXXXXX (12 digits), +919XXXXXXXXX.
    Raises ValueError for anything else.
    """
    raw = number.strip()
    # Strip all non-digit chars except a leading +
    digits = re.sub(r"[^\d]", "", raw.lstrip("+"))
    leading_plus = raw.startswith("+")

    if leading_plus:
        # +91XXXXXXXXXX — must be exactly 12 digits with country code 91
        if len(digits) == 12 and digits.startswith("91"):
            mobile = digits[2:]
        else:
            raise ValueError(f"Invalid +country format: {number!r}")
    elif len(digits) == 10:
        mobile = digits
    elif len(digits) == 12 and digits.startswith("91"):
        mobile = digits[2:]
    else:
        raise ValueError(f"Cannot normalize number: {number!r}")

    # Indian mobile: 10 digits, first digit 6-9
    if not re.fullmatch(r"[6-9]\d{9}", mobile):
        raise ValueError(
            f"Not a valid Indian mobile number (must start with 6-9): {number!r}"
        )
    return "+91" + mobile


def parse_recipients(raw: str) -> List[str]:
    """
    Parse ALERT_PHONE_NUMBERS env var.  Returns validated list.
    Logs (does not raise) for individual invalid entries.
    """
    result: List[str] = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            result.append(normalize_indian_number(part))
        except ValueError as exc:
            print(f"[SMS] Ignoring invalid recipient {_mask(part)}: {exc}")
    return result


def build_fault_message(
    asset_id: str,
    fault_type: str,
    risk_tier: str,
    grid_zone: Optional[str],
) -> str:
    """
    Build a plain-English SMS alert.  All inserted values are sanitized.
    Template stays under 160 chars for typical field lengths; hard-capped at 300.
    """
    safe_id    = _sanitize(asset_id,   20)
    safe_fault = _sanitize(fault_type, 10)
    safe_tier  = _sanitize(risk_tier,  10)
    safe_zone  = _sanitize(grid_zone,  20) if grid_zone else ""
    ts         = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    zone_part = f" ({safe_zone})" if safe_zone else ""
    msg = (
        f"ALERT: Fault in Transformer {safe_id}{zone_part} "
        f"[{safe_fault}/{safe_tier}] at {ts}. "
        f"Team informed. Issue will be resolved soon."
    )
    return msg[:_MAX_MSG_LEN]


def should_alert(fault_type: str, risk_tier: str) -> bool:
    """Return True if this score result warrants an SMS alert."""
    return fault_type in _ALERT_FAULT_TYPES or risk_tier in _ALERT_RISK_TIERS


# ---------------------------------------------------------------------------
# Daily counter (in-memory — resets on restart, see module docstring)
# ---------------------------------------------------------------------------
_counter_lock = threading.Lock()
_counter: Dict[str, Any] = {"day": date.today(), "count": 0}


def _daily_limit() -> int:
    try:
        return int(os.environ.get("DAILY_LIMIT", "50"))
    except ValueError:
        return 50


def _try_consume_quota() -> bool:
    """Attempt to reserve one SMS from today's quota.  Returns False if limit reached."""
    with _counter_lock:
        today = date.today()
        if _counter["day"] != today:
            _counter["day"]  = today
            _counter["count"] = 0
        limit = _daily_limit()
        if _counter["count"] >= limit:
            return False
        _counter["count"] += 1
        return True


def _refund_quota() -> None:
    """Refund one SMS unit (called when the send fails)."""
    with _counter_lock:
        if _counter["count"] > 0:
            _counter["count"] -= 1


# ---------------------------------------------------------------------------
# De-duplication cache (in-memory — resets on restart)
# ---------------------------------------------------------------------------
_dedup_lock  = threading.Lock()
_sent_cache: Dict[str, datetime] = {}   # key -> last sent time


def _dedup_key(asset_id: str, fault_type: str) -> str:
    return f"{asset_id}:{fault_type}"


def _is_duplicate(asset_id: str, fault_type: str) -> bool:
    key = _dedup_key(asset_id, fault_type)
    with _dedup_lock:
        last = _sent_cache.get(key)
        if last is None:
            return False
        return datetime.now(timezone.utc) - last < timedelta(hours=_DEDUP_TTL_H)


def _record_sent(asset_id: str, fault_type: str) -> None:
    key = _dedup_key(asset_id, fault_type)
    with _dedup_lock:
        _sent_cache[key] = datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Low-level HTTP send (async, uses httpx — no blocking calls)
# ---------------------------------------------------------------------------

async def _send_one(
    number: str,
    text: str,
    url: str,
    user: str,
    password: str,
    sim: Optional[int],
) -> None:
    """Send a single SMS.  Retries once on transient error.  Raises on persistent failure."""
    payload: Dict[str, Any] = {
        "textMessage": {"text": text},
        "phoneNumbers": [number],
    }
    if sim is not None:
        payload["simNumber"] = sim

    last_exc: Optional[Exception] = None
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT_S) as client:
                resp = await client.post(
                    url,
                    auth=(user, password),
                    json=payload,
                )
            resp.raise_for_status()
            print(f"[SMS] Sent to ...{_mask(number)} (attempt {attempt})")
            return
        except httpx.HTTPStatusError as exc:
            last_exc = exc
            print(
                f"[SMS] HTTP error {exc.response.status_code} "
                f"sending to ...{_mask(number)} (attempt {attempt})"
            )
            if exc.response.status_code in (400, 401, 403):
                break   # auth/validation errors: no point retrying
        except (httpx.TimeoutException, httpx.RequestError) as exc:
            last_exc = exc
            print(
                f"[SMS] Network error sending to ...{_mask(number)} "
                f"(attempt {attempt}): {type(exc).__name__}"
            )
        if attempt < _MAX_RETRIES:
            await asyncio.sleep(1.5 * attempt)

    raise RuntimeError(f"SMS send failed after {_MAX_RETRIES} attempts") from last_exc


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_recipients() -> List[str]:
    """Parse and validate ALERT_PHONE_NUMBERS from the environment."""
    raw = os.environ.get("ALERT_PHONE_NUMBERS", "").strip()
    if not raw:
        return []
    return parse_recipients(raw)


def validate_config() -> None:
    """
    Validate SMS configuration at startup.
    Prints a clear warning if SMS sending is not possible; does NOT raise —
    the main system must continue working without SMS.
    """
    user = os.environ.get("SMSGATE_USER", "").strip()
    pwd  = os.environ.get("SMSGATE_PASS", "").strip()
    recipients = get_recipients()

    if not user or not pwd:
        print(
            "[SMS] WARNING: SMSGATE_USER and/or SMSGATE_PASS not set. "
            "SMS fault alerts are disabled."
        )
    if not recipients:
        print(
            "[SMS] WARNING: ALERT_PHONE_NUMBERS not set or contains no valid numbers. "
            "SMS fault alerts are disabled."
        )
    else:
        print(
            f"[SMS] Configured. {len(recipients)} recipient(s). "
            f"Daily limit: {_daily_limit()}."
        )


async def send_fault_alert(score_result: Dict[str, Any]) -> None:
    """
    Fire-and-forget coroutine.  Call with asyncio.create_task() from endpoint handlers.

    Reads score_result keys:
        asset_id, fault_type, risk_tier  (required)
        grid_zone                         (optional — from merged registry)

    SMS is suppressed when:
      - fault does not meet alert threshold (NF + LOW/MEDIUM)
      - same asset+fault_type already alerted within DEDUP_TTL_H hours
      - daily quota exhausted
      - SMSGATE credentials or recipients not configured
    """
    asset_id   = str(score_result.get("asset_id", "UNKNOWN"))
    fault_type = str(score_result.get("fault_type", "NF"))
    risk_tier  = str(score_result.get("risk_tier", score_result.get("risk_tier", "LOW")))
    grid_zone  = score_result.get("registry", {}).get("grid_zone") if isinstance(
        score_result.get("registry"), dict
    ) else score_result.get("grid_zone")

    # --- threshold check ---
    if not should_alert(fault_type, risk_tier):
        return

    # --- credentials ---
    user = os.environ.get("SMSGATE_USER", "").strip()
    pwd  = os.environ.get("SMSGATE_PASS", "").strip()
    if not user or not pwd:
        return   # misconfiguration already warned at startup

    recipients = get_recipients()
    if not recipients:
        return   # misconfiguration already warned at startup

    # --- de-duplication ---
    if _is_duplicate(asset_id, fault_type):
        print(
            f"[SMS] Suppressed duplicate alert for {asset_id}/{fault_type} "
            f"(cooldown {_DEDUP_TTL_H}h active)"
        )
        return

    # --- build message ---
    url  = os.environ.get("SMSGATE_URL", _DEFAULT_URL).strip()
    try:
        sim = int(os.environ.get("SMSGATE_SIM", "").strip())
    except (ValueError, TypeError):
        sim = None

    message = build_fault_message(asset_id, fault_type, risk_tier, grid_zone)

    # --- send to each recipient separately ---
    any_success = False
    for number in recipients:
        if not _try_consume_quota():
            print(
                f"[SMS] Daily limit ({_daily_limit()}) reached. "
                f"Alert for {asset_id}/{fault_type} not sent."
            )
            break
        try:
            await _send_one(number, message, url, user, pwd, sim)
            any_success = True
        except Exception as exc:
            _refund_quota()
            print(
                f"[SMS] Failed to send alert for {asset_id}/{fault_type} "
                f"to ...{_mask(number)}: {exc}"
            )
            # Continue to next recipient — one failed number must not block others

    # Record dedup only if at least one send succeeded
    if any_success:
        _record_sent(asset_id, fault_type)


def send_custom_sms(number: str, message: str) -> bool:
    """
    Synchronous helper to send a custom SMS via the configured SMS Gateway for Android.
    Can be called by broadcast and single consumer SMS dispatch endpoints.
    """
    user = os.environ.get("SMSGATE_USER", "").strip()
    pwd  = os.environ.get("SMSGATE_PASS", "").strip()
    if not user or not pwd:
        print("[SMS] Gateway user/pass not configured. Custom SMS skipped.")
        return False

    url = os.environ.get("SMSGATE_URL", _DEFAULT_URL).strip()
    try:
        sim = int(os.environ.get("SMSGATE_SIM", "").strip())
    except (ValueError, TypeError):
        sim = None

    try:
        clean_num = normalize_indian_number(number)
    except Exception:
        clean_num = number.strip()

    if not _try_consume_quota():
        print(f"[SMS] Daily limit reached ({_daily_limit()}). Cannot send to {_mask(clean_num)}")
        return False

    payload: Dict[str, Any] = {
        "textMessage": {"text": message[:_MAX_MSG_LEN]},
        "phoneNumbers": [clean_num],
    }
    if sim is not None:
        payload["simNumber"] = sim

    try:
        with httpx.Client(timeout=_TIMEOUT_S) as client:
            resp = client.post(url, auth=(user, pwd), json=payload)
            resp.raise_for_status()
            print(f"[SMS] Custom SMS successfully sent to {_mask(clean_num)}")
            return True
    except Exception as e:
        _refund_quota()
        print(f"[SMS] Error sending custom SMS to {_mask(clean_num)}: {e}")
        return False
