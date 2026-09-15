"""
auth_router.py
==============
FastAPI auth router — wires the Vite frontend to MongoDB Atlas.

Endpoints:
  POST /api/auth/register        — create a new operator account
  POST /api/auth/login           — email + password → JWT
  GET  /api/auth/me              — return profile for the bearer token
  POST /api/auth/logout          — client-side only (token is stateless); 200 ok
  GET  /api/auth/google          — redirect to Google consent screen
  GET  /api/auth/google/callback — exchange code → upsert user → JWT → redirect to frontend
"""

import os
import re
import secrets
import urllib.parse
from datetime import datetime, timedelta, timezone

import bcrypt
import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from pydantic import BaseModel, field_validator
from pymongo import MongoClient, ASCENDING
from pymongo.errors import DuplicateKeyError

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

# ── Config ────────────────────────────────────────────────────────────────────
MONGODB_URI       = os.getenv("MONGODB_URI", "")
JWT_SECRET        = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM     = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))  # 7 days

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:5173")

# The FastAPI server's own public URL (for OAuth callback)
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

# ── MongoDB connection ────────────────────────────────────────────────────────
_mongo_client: MongoClient | None = None


def _get_db():
    """Return the 'voltra' database, opening the client once per process with certifi TLS."""
    global _mongo_client
    if _mongo_client is None:
        if not MONGODB_URI:
            raise RuntimeError("MONGODB_URI is not set — check src/backend/.env")
        try:
            import certifi
            _mongo_client = MongoClient(MONGODB_URI, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=10000)
        except Exception:
            _mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=10000)
    return _mongo_client["voltra"]


def _users():
    """Return the 'users' collection, creating indexes on first access."""
    db = _get_db()
    col = db["users"]
    # Idempotent — safe to call multiple times
    col.create_index([("email", ASCENDING)], unique=True, background=True)
    return col


def _sessions():
    """Return the 'sessions' collection for safe multi-user session tracking and auditing."""
    db = _get_db()
    col = db["sessions"]
    col.create_index([("userId", ASCENDING)], background=True)
    col.create_index([("email", ASCENDING)], background=True)
    col.create_index([("createdAt", ASCENDING)], background=True)
    return col


def _record_session(user_id: str, email: str, token: str, request: Request | None = None) -> str:
    """Safely log active operator session in MongoDB Atlas."""
    client_ip = request.client.host if (request and request.client) else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "unknown") if request else "unknown"
    token_sig_hash = bcrypt.hashpw(token[-16:].encode(), bcrypt.gensalt()).decode()
    session_doc = {
        "userId": user_id,
        "email": email,
        "tokenSigHash": token_sig_hash,
        "ipAddress": client_ip,
        "userAgent": user_agent,
        "createdAt": datetime.now(timezone.utc),
        "lastActiveAt": datetime.now(timezone.utc),
        "active": True,
    }
    try:
        res = _sessions().insert_one(session_doc)
        return str(res.inserted_id)
    except Exception as e:
        print(f"[Auth] Session audit write error: {e}")
        return ""


# ── JWT helpers ───────────────────────────────────────────────────────────────

def _create_token(payload: dict) -> str:
    data = payload.copy()
    data["exp"] = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {exc}")


def _bearer_token(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    return auth[7:]


# ── Pydantic models ───────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    zone: str = "Zone-B · Heavy Manufacturing Corridor"
    role: str = "Regional Dispatch Engineer"
    designation: str = ""

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email address.")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.strip().lower()


class ProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    zone: str
    designation: str
    provider: str
    image: str | None
    createdAt: str
    lastLoginAt: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _doc_to_profile(doc: dict) -> dict:
    return {
        "id":          str(doc["_id"]),
        "name":        doc.get("name", ""),
        "email":       doc.get("email", ""),
        "role":        doc.get("role", "Regional Dispatch Engineer"),
        "zone":        doc.get("zone", ""),
        "designation": doc.get("designation", ""),
        "provider":    doc.get("provider", "credentials"),
        "image":       doc.get("image"),
        "createdAt":   doc.get("createdAt", datetime.now(timezone.utc)).isoformat(),
        "lastLoginAt": doc.get("lastLoginAt", datetime.now(timezone.utc)).isoformat(),
        "substation":  _zone_to_substation(doc.get("zone", "")),
    }


def _zone_to_substation(zone: str) -> str:
    if "Zone-B" in zone:
        return "GIDC Industrial Phase-2 Substation"
    if "Zone-A" in zone:
        return "Anand Central Transmission Substation"
    if "Zone-D" in zone:
        return "Anand South Bulk Substation"
    return "Borsad Rural Interconnect"


# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── POST /api/auth/register ───────────────────────────────────────────────────

@router.post("/register", status_code=201)
def register(body: RegisterRequest, request: Request):
    """
    Create a new operator account.
    Password is bcrypt-hashed before storage — never stored in plaintext.
    Returns a signed JWT alongside the operator profile.
    """
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters.")

    hashed_pw = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()

    now = datetime.now(timezone.utc)
    doc = {
        "name":        body.name.strip(),
        "email":       body.email.lower().strip(),
        "passwordHash": hashed_pw,
        "role":        body.role,
        "zone":        body.zone,
        "designation": body.designation,
        "provider":    "credentials",
        "image":       None,
        "createdAt":   now,
        "lastLoginAt": now,
    }

    try:
        result = _users().insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(409, "An account with this email already exists.")

    doc["_id"] = result.inserted_id
    profile = _doc_to_profile(doc)
    token = _create_token({"sub": profile["email"], "id": profile["id"]})
    _record_session(profile["id"], profile["email"], token, request)

    return {"token": token, "profile": profile}


# ── POST /api/auth/login ──────────────────────────────────────────────────────

@router.post("/login")
def login(body: LoginRequest, request: Request):
    """
    Verify email + password and return a JWT.
    Works for both 'credentials' and 'google' accounts that later set a password.
    """
    doc = _users().find_one({"email": body.email.lower().strip()})
    if not doc:
        raise HTTPException(401, "Invalid email or password.")

    stored_hash = doc.get("passwordHash")
    if not stored_hash:
        raise HTTPException(401, "This account uses Google sign-in. Please use Google.")

    if not bcrypt.checkpw(body.password.encode(), stored_hash.encode()):
        raise HTTPException(401, "Invalid email or password.")

    # Update lastLoginAt
    now = datetime.now(timezone.utc)
    _users().update_one({"_id": doc["_id"]}, {"$set": {"lastLoginAt": now}})
    doc["lastLoginAt"] = now

    profile = _doc_to_profile(doc)
    token = _create_token({"sub": profile["email"], "id": profile["id"]})
    _record_session(profile["id"], profile["email"], token, request)

    return {"token": token, "profile": profile}


# ── GET /api/auth/me ──────────────────────────────────────────────────────────

@router.get("/me")
def get_me(request: Request):
    """Return the profile for the current bearer token."""
    token = _bearer_token(request)
    claims = _decode_token(token)
    email = claims.get("sub")
    if not email:
        raise HTTPException(401, "Invalid token payload.")

    doc = _users().find_one({"email": email})
    if not doc:
        raise HTTPException(404, "User not found.")

    return _doc_to_profile(doc)


# ── POST /api/auth/logout ─────────────────────────────────────────────────────

@router.post("/logout")
def logout(request: Request):
    """
    Invalidate active session in MongoDB sessions collection and confirm sign out.
    """
    try:
        token = _bearer_token(request)
        claims = _decode_token(token)
        email = claims.get("sub")
        if email:
            _sessions().update_many(
                {"email": email, "active": True},
                {"$set": {"active": False, "loggedOutAt": datetime.now(timezone.utc)}}
            )
    except Exception:
        pass
    return {"status": "ok", "message": "Signed out."}


# ── GET /api/auth/google — initiate OAuth flow ────────────────────────────────

def _resolve_base_url(request: Request) -> str:
    """Dynamically determine canonical base URL from environment or request headers."""
    env_base = os.getenv("API_BASE_URL", "").rstrip("/")
    if env_base and not ("localhost" in env_base and request.headers.get("host", "").startswith("voltra")):
        return env_base
    proto = request.headers.get("x-forwarded-proto", "https" if "railway.app" in request.headers.get("host", "") else "http")
    host = request.headers.get("x-forwarded-host") or request.headers.get("host", "localhost:8000")
    return f"{proto}://{host}"


def _resolve_frontend_url(request: Request) -> str:
    """Dynamically determine frontend URL from environment or request headers."""
    env_front = os.getenv("FRONTEND_URL", "").rstrip("/")
    if env_front and not ("localhost" in env_front and request.headers.get("host", "").startswith("voltra")):
        return env_front
    return _resolve_base_url(request)


# ── GET /api/auth/google — initiate OAuth flow ────────────────────────────────

@router.get("/google")
def google_login(request: Request):
    """Redirect the browser to Google's OAuth consent page."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(500, "Google OAuth is not configured on this server (missing GOOGLE_CLIENT_ID).")

    base_url = _resolve_base_url(request)
    callback_url = f"{base_url}/api/auth/google/callback"
    state = secrets.token_urlsafe(16)

    params = {
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  callback_url,
        "response_type": "code",
        "scope":         "openid email profile",
        "state":         state,
        "prompt":        "select_account",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    response = RedirectResponse(url=url, status_code=302)
    is_secure = base_url.startswith("https")
    response.set_cookie(
        "oauth_state",
        state,
        httponly=True,
        samesite="lax",
        secure=is_secure,
        max_age=600,
    )
    return response


# ── GET /api/auth/google/callback ─────────────────────────────────────────────

@router.get("/google/callback")
def google_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    """
    Exchange the Google auth code for tokens, upsert the user into MongoDB,
    mint a Voltra JWT, and redirect to the frontend with the token in the
    query string so the SPA can store it in localStorage.
    """
    frontend_url = _resolve_frontend_url(request)
    if error:
        return RedirectResponse(f"{frontend_url}/login?error={urllib.parse.quote(error)}")

    # Verify state: check cookie if present; allow if state token is well-formed
    cookie_state = request.cookies.get("oauth_state", "")
    if cookie_state and state and cookie_state != state:
        return RedirectResponse(f"{frontend_url}/login?error=state_mismatch")

    base_url = _resolve_base_url(request)
    callback_url = f"{base_url}/api/auth/google/callback"

    # Exchange code for tokens
    try:
        token_resp = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code":          code,
                "client_id":     GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri":  callback_url,
                "grant_type":    "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=12,
        )
    except Exception as e:
        print(f"[Google OAuth] Network error exchanging token: {e}")
        return RedirectResponse(f"{frontend_url}/login?error=token_network_error")

    if token_resp.status_code != 200:
        print(f"[Google OAuth] Token exchange error: {token_resp.status_code} - {token_resp.text}")
        return RedirectResponse(f"{frontend_url}/login?error=token_exchange_failed")

    google_access_token = token_resp.json().get("access_token")
    if not google_access_token:
        return RedirectResponse(f"{frontend_url}/login?error=missing_access_token")

    # Fetch user info from Google
    try:
        userinfo_resp = httpx.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {google_access_token}"},
            timeout=12,
        )
    except Exception as e:
        print(f"[Google OAuth] Userinfo fetch error: {e}")
        return RedirectResponse(f"{frontend_url}/login?error=userinfo_network_error")

    if userinfo_resp.status_code != 200:
        return RedirectResponse(f"{frontend_url}/login?error=userinfo_failed")

    guser = userinfo_resp.json()
    email = guser.get("email", "").lower().strip()
    name  = guser.get("name", "Google User")
    image = guser.get("picture")

    if not email:
        return RedirectResponse(f"{frontend_url}/login?error=no_email")

    # Upsert into MongoDB users collection
    now = datetime.now(timezone.utc)
    _users().update_one(
        {"email": email},
        {
            "$set": {
                "name":        name,
                "image":       image,
                "provider":    "google",
                "lastLoginAt": now,
            },
            "$setOnInsert": {
                "email":       email,
                "role":        "Regional Dispatch Engineer",
                "zone":        "Zone-B · Heavy Manufacturing Corridor",
                "designation": "",
                "createdAt":   now,
            },
        },
        upsert=True,
    )

    doc = _users().find_one({"email": email})
    profile = _doc_to_profile(doc)
    voltra_token = _create_token({"sub": email, "id": profile["id"]})
    _record_session(profile["id"], email, voltra_token, request)

    # Redirect to frontend — SPA picks up token from query param and saves to localStorage
    redirect_url = (
        f"{frontend_url}/login?token={urllib.parse.quote(voltra_token)}"
        f"&name={urllib.parse.quote(name)}"
        f"&email={urllib.parse.quote(email)}"
    )
    response = RedirectResponse(url=redirect_url, status_code=302)
    response.delete_cookie("oauth_state")
    return response
