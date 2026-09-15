"""
seed_user.py
============
Creates the permanent demo operator account in MongoDB Atlas.
Run this once after the Atlas IP whitelist is updated.

Usage:
    python3 src/backend/seed_user.py

The account will be upserted (safe to run multiple times).
"""

import os, sys
from pathlib import Path
from datetime import datetime, timezone

# Load .env
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

import bcrypt
from pymongo import MongoClient, ASCENDING
from pymongo.errors import DuplicateKeyError

MONGODB_URI = os.getenv("MONGODB_URI", "")
if not MONGODB_URI:
    print("ERROR: MONGODB_URI not set in src/backend/.env")
    sys.exit(1)

# ── Account to seed ────────────────────────────────────────────────────────────
DEMO_USER = {
    "name":        "Om Vipul Bhairashiya",
    "email":       "rashiyaom@gmail.com",
    "password":    "Romashiya@123",
    "role":        "Admin / SCADA",
    "zone":        "Zone-D · Bulk Transmission Corridor",
    "designation": "Platform Administrator",
    "provider":    "credentials",
}

def seed():
    print("Connecting to MongoDB Atlas...")
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=10000)

    # Verify connection
    client.admin.command("ping")
    print("Connected ✓")

    db  = client["voltra"]
    col = db["users"]

    # Ensure unique email index
    col.create_index([("email", ASCENDING)], unique=True, background=True)

    # Hash password
    hashed = bcrypt.hashpw(DEMO_USER["password"].encode(), bcrypt.gensalt()).decode()

    now = datetime.now(timezone.utc)

    result = col.update_one(
        {"email": DEMO_USER["email"]},
        {
            "$set": {
                "name":         DEMO_USER["name"],
                "passwordHash": hashed,
                "role":         DEMO_USER["role"],
                "zone":         DEMO_USER["zone"],
                "designation":  DEMO_USER["designation"],
                "provider":     DEMO_USER["provider"],
                "lastLoginAt":  now,
            },
            "$setOnInsert": {
                "email":     DEMO_USER["email"],
                "image":     None,
                "createdAt": now,
            },
        },
        upsert=True,
    )

    if result.upserted_id:
        print(f"✅ User CREATED: {DEMO_USER['email']}")
    else:
        print(f"✅ User UPDATED (already existed): {DEMO_USER['email']}")

    # Verify
    doc = col.find_one({"email": DEMO_USER["email"]}, {"_id": 0, "name": 1, "email": 1, "role": 1, "zone": 1})
    print("Stored document:", doc)

    client.close()
    print("\nDone. You can now sign in with:")
    print(f"  Email:    {DEMO_USER['email']}")
    print(f"  Password: {DEMO_USER['password']}")

if __name__ == "__main__":
    seed()
