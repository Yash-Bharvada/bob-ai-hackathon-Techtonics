import os, re, sys
from pathlib import Path
from dotenv import dotenv_values

env_path = Path("src/backend/.env")
if not env_path.exists():
    print("ERROR: src/backend/.env not found"); sys.exit(1)

vals = dotenv_values(env_path)

REQUIRED = ["SMSGATE_USER", "SMSGATE_PASS", "ALERT_PHONE_NUMBERS",
            "SMSGATE_URL", "DAILY_LIMIT"]
PLACEHOLDER_RE = re.compile(r"PASTE_|XXXXXXXXXX|your_", re.I)

missing, bad_ph, bad_nums = [], [], []

for var in REQUIRED:
    v = (vals.get(var) or "").strip()
    if not v:
        missing.append(var)
    elif PLACEHOLDER_RE.search(v):
        bad_ph.append(var)

raw_nums = (vals.get("ALERT_PHONE_NUMBERS") or "").strip()
if raw_nums and not PLACEHOLDER_RE.search(raw_nums):
    for part in raw_nums.split(","):
        part = part.strip()
        digits = re.sub(r"\D", "", part.lstrip("+"))
        if part.startswith("+"):
            mobile = digits[2:] if (len(digits)==12 and digits.startswith("91")) else None
        elif len(digits) == 10:
            mobile = digits
        elif len(digits) == 12 and digits.startswith("91"):
            mobile = digits[2:]
        else:
            mobile = None
        mask = ("+" + "*"*(len(digits)-4) + digits[-4:]) if len(digits) > 4 else "****"
        if mobile is None or not re.fullmatch(r"[6-9]\d{9}", mobile):
            bad_nums.append("  INVALID: ..." + mask)
        else:
            print("  phone ..." + mask + ": OK")

all_ok = not missing and not bad_ph and not bad_nums
if missing:  print("MISSING: " + ", ".join(missing))
if bad_ph:   print("STILL PLACEHOLDER: " + ", ".join(bad_ph))
if bad_nums:
    print("BAD NUMBERS:")
    for n in bad_nums: print(n)
if all_ok:   print("OK")
