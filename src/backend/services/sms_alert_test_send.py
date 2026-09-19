"""
Manual test sender — sends a clearly-labelled TEST alert to a real number.

Usage (from repo root):
    python src/backend/services/sms_alert_test_send.py +91XXXXXXXXXX

Requires SMSGATE_USER and SMSGATE_PASS to be set in src/backend/.env (or in the
environment directly).  This script bypasses the deduplication cache and daily
counter so it always sends regardless of prior alerts.

NEVER run this in automated tests.  For unit tests, see test_sms_alert.py.
"""
import asyncio
import os
import sys
from pathlib import Path

# Load project .env
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Make services importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from services.sms_alert import _send_one, normalize_indian_number, _mask

_DEFAULT_URL = "https://api.sms-gate.app/3rdparty/v1/message"


async def main(raw_number: str) -> None:
    user = os.environ.get("SMSGATE_USER", "").strip()
    pwd  = os.environ.get("SMSGATE_PASS", "").strip()
    url  = os.environ.get("SMSGATE_URL", _DEFAULT_URL).strip()

    if not user or not pwd:
        print("ERROR: SMSGATE_USER and/or SMSGATE_PASS not set in src/backend/.env")
        sys.exit(1)

    try:
        number = normalize_indian_number(raw_number)
    except ValueError as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)

    message = (
        "[VOLTRA TEST] This is a manually triggered test alert from the VOLTRA "
        "fault alert system. No real fault has occurred."
    )

    try:
        sim_raw = os.environ.get("SMSGATE_SIM", "").strip()
        sim = int(sim_raw) if sim_raw else None
    except ValueError:
        sim = None

    print(f"Sending TEST alert to ...{_mask(number)} ...")
    try:
        await _send_one(number, message, url, user, pwd, sim)
        print("Done. Check your phone.")
    except Exception as exc:
        print(f"Failed: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python sms_alert_test_send.py +91XXXXXXXXXX")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))
