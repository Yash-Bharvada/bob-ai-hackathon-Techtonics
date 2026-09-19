"""
rag_proxy.py
============
Internal reverse-proxy router for the standalone RAG Chatbot service.

Enables the existing VOLTRA / BOB backend to serve as the single public entry
point, routing `/rag/*` requests internally to the standalone RAG FastAPI
service (default: http://127.0.0.1:8001) over localhost.

Architecture:
  Frontend -> BOB Backend (Public Port) -> /rag/* -> RAG FastAPI (Internal 8001)

Failure Isolation:
  If the RAG service is offline, initializing, or unreachable, this proxy
  catches connection errors and returns a 503 Service Unavailable response.
  The host BOB backend never crashes.
"""

import atexit
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional
import httpx
from fastapi import APIRouter, Request, Response, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse

router = APIRouter()

RAG_INTERNAL_URL = os.getenv("RAG_INTERNAL_URL", "http://127.0.0.1:8001").rstrip("/")
_rag_process: Optional[subprocess.Popen] = None


def get_rag_python_executable() -> str:
    """Find the best Python executable to run the standalone RAG service."""
    root_dir = Path(__file__).resolve().parent.parent.parent
    win_venv = root_dir / "rag-chatbot" / ".venv" / "Scripts" / "python.exe"
    posix_venv = root_dir / "rag-chatbot" / ".venv" / "bin" / "python"

    if win_venv.is_file():
        return str(win_venv)
    if posix_venv.is_file():
        return str(posix_venv)
    return sys.executable


def start_rag_service() -> None:
    """
    Automatically start the internal RAG FastAPI service if not already responding.
    Ensures backend and chatbot launch together seamlessly without manual terminals.
    """
    global _rag_process

    if os.getenv("AUTO_START_RAG", "true").lower() in ("false", "0", "no"):
        return

    # Check if already running on port 8001
    try:
        with httpx.Client(timeout=0.6) as client:
            resp = client.get(f"{RAG_INTERNAL_URL}/health")
            if resp.status_code == 200:
                print(f"[RAG-MANAGER] Internal RAG service is already active at {RAG_INTERNAL_URL}.")
                return
    except Exception:
        pass  # Not running yet, proceed to spawn

    root_dir = Path(__file__).resolve().parent.parent.parent
    rag_dir = root_dir / "src" / "rag-chatbot"
    if not rag_dir.is_dir():
        print(f"[RAG-MANAGER] Warning: rag-chatbot directory not found at {rag_dir}", file=sys.stderr)
        return

    python_bin = get_rag_python_executable()
    cmd = [
        python_bin,
        "-m",
        "uvicorn",
        "api.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8001",
    ]

    try:
        print(f"[RAG-MANAGER] Auto-starting RAG Chatbot on internal port 8001 using: {python_bin}")
        _rag_process = subprocess.Popen(
            cmd,
            cwd=str(rag_dir),
        )
        print(f"[RAG-MANAGER] Successfully launched RAG Chatbot subprocess (PID: {_rag_process.pid}).")
    except Exception as exc:
        print(f"[RAG-MANAGER] Failed to auto-start RAG service: {exc}", file=sys.stderr)


def stop_rag_service() -> None:
    """Cleanly terminate the RAG child process on backend shutdown."""
    global _rag_process
    if _rag_process is not None and _rag_process.poll() is None:
        print(f"[RAG-MANAGER] Stopping RAG Chatbot child process (PID: {_rag_process.pid})...")
        try:
            _rag_process.terminate()
            _rag_process.wait(timeout=5)
        except Exception:
            try:
                _rag_process.kill()
            except Exception:
                pass
        print("[RAG-MANAGER] RAG Chatbot subprocess terminated cleanly.")
        _rag_process = None


atexit.register(stop_rag_service)

# Hop-by-hop headers that should not be forwarded
HOP_BY_HOP_HEADERS = {
    "host",
    "content-length",
    "transfer-encoding",
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "upgrade",
}


def _filter_headers(headers: httpx.Headers) -> dict:
    """Filter out hop-by-hop headers from outgoing/incoming responses."""
    return {k: v for k, v in headers.items() if k.lower() not in HOP_BY_HOP_HEADERS}


@router.get("/health", summary="Check internal RAG service health")
async def rag_health():
    """
    Direct health proxy to internal RAG service.
    Returns { "status": "ok" } if internal RAG is alive, or 503 if unreachable.
    """
    target_url = f"{RAG_INTERNAL_URL}/health"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(target_url)
            return JSONResponse(
                content=resp.json(),
                status_code=resp.status_code,
            )
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unavailable",
                "detail": "Internal RAG Chatbot service is unreachable or initializing.",
                "error": str(exc),
            },
        )


@router.post("/chat", summary="Proxy chat inquiry to internal RAG service")
async def rag_chat(request: Request):
    """
    Forward user chat inquiry to internal RAG FastAPI service.
    """
    target_url = f"{RAG_INTERNAL_URL}/chat"
    try:
        body = await request.body()
        req_headers = {
            k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP_HEADERS
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                target_url,
                content=body,
                headers=req_headers,
            )
            return JSONResponse(
                content=resp.json(),
                status_code=resp.status_code,
            )
    except httpx.ConnectError:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": "RAG Chatbot service is offline. Please ensure the internal service is started on port 8001.",
            },
        )
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": f"Failed to communicate with internal RAG service: {str(exc)}",
            },
        )


@router.get("/datasets/active", summary="Get active operational dataset from RAG service")
async def rag_get_active_dataset():
    """Get active operational dataset metadata."""
    target_url = f"{RAG_INTERNAL_URL}/datasets/active"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(target_url)
            return JSONResponse(content=resp.json(), status_code=resp.status_code)
    except httpx.ConnectError:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "RAG Chatbot service is offline."},
        )
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": str(exc)},
        )


@router.get("/datasets", summary="List all indexed operational datasets")
async def rag_list_datasets():
    """List all indexed operational datasets."""
    target_url = f"{RAG_INTERNAL_URL}/datasets"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(target_url)
            return JSONResponse(content=resp.json(), status_code=resp.status_code)
    except httpx.ConnectError:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "RAG Chatbot service is offline."},
        )
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": str(exc)},
        )


@router.post("/datasets/{dataset_id}/activate", summary="Activate a specific operational dataset")
async def rag_activate_dataset(dataset_id: str):
    """Set specified dataset as active."""
    target_url = f"{RAG_INTERNAL_URL}/datasets/{dataset_id}/activate"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(target_url)
            return JSONResponse(content=resp.json(), status_code=resp.status_code)
    except httpx.ConnectError:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "RAG Chatbot service is offline."},
        )
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": str(exc)},
        )


@router.post("/datasets/upload", summary="Proxy CSV telemetry dataset upload and activation")
async def rag_upload_dataset(request: Request):
    """
    Forward multipart CSV dataset upload to internal RAG FastAPI service.
    """
    target_url = f"{RAG_INTERNAL_URL}/datasets/upload"
    try:
        body = await request.body()
        req_headers = {
            k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP_HEADERS
        }
        if request.url.query:
            target_url += f"?{request.url.query}"

        async with httpx.AsyncClient(timeout=180.0) as client:
            resp = await client.post(
                target_url,
                content=body,
                headers=req_headers,
            )
            return JSONResponse(
                content=resp.json(),
                status_code=resp.status_code,
            )
    except httpx.ConnectError:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": "RAG Chatbot service is offline. Cannot process dataset upload.",
            },
        )
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": f"Failed to forward dataset to internal RAG service: {str(exc)}",
            },
        )


@router.post("/ingest/csv", summary="Proxy CSV telemetry ingestion to internal RAG service")
async def rag_ingest_csv(request: Request):
    """
    Forward multipart CSV telemetry upload to internal RAG FastAPI service.
    """
    target_url = f"{RAG_INTERNAL_URL}/ingest/csv"
    try:
        body = await request.body()
        req_headers = {
            k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP_HEADERS
        }
        if request.url.query:
            target_url += f"?{request.url.query}"

        async with httpx.AsyncClient(timeout=180.0) as client:
            resp = await client.post(
                target_url,
                content=body,
                headers=req_headers,
            )
            return JSONResponse(
                content=resp.json(),
                status_code=resp.status_code,
            )
    except httpx.ConnectError:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": "RAG Chatbot service is offline. Cannot process telemetry ingestion.",
            },
        )
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": f"Failed to forward telemetry to internal RAG service: {str(exc)}",
            },
        )


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"], include_in_schema=False)
async def rag_catchall(request: Request, path: str):
    """
    Catch-all proxy forwarding any other current or future RAG routes.
    Preserves streaming responses and query parameters.
    """
    target_url = f"{RAG_INTERNAL_URL}/{path}"
    if request.url.query:
        target_url += f"?{request.url.query}"

    try:
        req_headers = {
            k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP_HEADERS
        }
        body = await request.body()

        client = httpx.AsyncClient(timeout=60.0)
        req = client.build_request(
            method=request.method,
            url=target_url,
            headers=req_headers,
            content=body,
        )
        resp = await client.send(req, stream=True)

        return StreamingResponse(
            resp.aiter_raw(),
            status_code=resp.status_code,
            headers=_filter_headers(resp.headers),
            background=httpx.Response.aclose(resp),
        )
    except httpx.ConnectError:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": "Internal RAG Chatbot service is currently unavailable.",
            },
        )
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "detail": f"Gateway error forwarding to RAG service: {str(exc)}",
            },
        )
