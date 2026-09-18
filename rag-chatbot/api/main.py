import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

# Add rag-chatbot base dir to sys.path if not present
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from config import settings
from chatbot.chain import RAGChatbotChain


# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class HealthResponse(BaseModel):
    status: str = Field(..., description="Service health status", json_schema_extra={"example": "ok"})


class ChatRequest(BaseModel):
    message: str = Field(..., description="User query or operator inquiry", json_schema_extra={"example": "Why is SOL-001 underperforming?"})
    top_k: Optional[int] = Field(None, ge=1, le=20, description="Optional override for number of retrieved operational documents")

    @field_validator("message")
    @classmethod
    def validate_message_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Message cannot be empty or whitespace-only.")
        return v.strip()


class ChatResponse(BaseModel):
    answer: str = Field(..., description="Evidence-grounded operational response")
    sources: List[Dict[str, Any]] = Field(default_factory=list, description="Retrieved evidence sources and telemetry metadata")


# ==============================================================================
# LIFESPAN & APPLICATION SETUP
# ==============================================================================

chain_instance: Optional[RAGChatbotChain] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager to load expensive models and clients once on startup.
    """
    global chain_instance
    try:
        settings.validate()
        chain_instance = RAGChatbotChain()
        print(f"[RAG-API] RAG chain initialized successfully in {settings.QDRANT_MODE} Qdrant mode.")
    except Exception as e:
        print(f"[RAG-API] Startup warning (chain will lazy-load on request): {e}", file=sys.stderr)
        chain_instance = None
    yield
    print("[RAG-API] Service shutting down.")


app = FastAPI(
    title="Grid Load & Renewable Energy Advisor RAG Chatbot API",
    description="Standalone RAG Chatbot API providing evidence-grounded operational insights for power grid and renewable asset management.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# ROUTES
# ==============================================================================

@app.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check endpoint",
    tags=["System"],
)
async def health_check():
    """
    Health check endpoint.
    Confirms that the RAG API service is alive without re-triggering expensive model reloads.
    """
    return HealthResponse(status="ok")


@app.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit an operator inquiry to the RAG Chatbot",
    tags=["Chatbot"],
    description="Processes user inquiry through Sentence Transformer query embedding, Qdrant Cloud semantic retrieval, and Groq LLM inference.",
)
async def chat_endpoint(request: ChatRequest):
    """
    Processes the user query:
    1. Validates the request message.
    2. Retrieves operational telemetry from Qdrant Cloud.
    3. Synthesizes an evidence-grounded answer using Groq LLM.
    4. Returns JSON with 'answer' and 'sources'.
    """
    global chain_instance

    query_text = request.message.strip()
    if not query_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The 'message' field cannot be empty or whitespace-only.",
        )

    try:
        if chain_instance is None:
            chain_instance = RAGChatbotChain()

        result = chain_instance.answer_question(
            question=query_text,
            top_k=request.top_k,
        )
        return ChatResponse(
            answer=result["answer"],
            sources=result["sources"],
        )

    except ValueError as ve:
        # Invalid inputs or missing configuration
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except RuntimeError as re:
        # Vector store or LLM provider errors (e.g., connection failures, quota limits)
        clean_err = str(re)
        # Prevent leaking raw API keys if any were in exception
        if settings.GROQ_API_KEY and settings.GROQ_API_KEY in clean_err:
            clean_err = clean_err.replace(settings.GROQ_API_KEY, "[REDACTED]")
        if settings.QDRANT_API_KEY and settings.QDRANT_API_KEY in clean_err:
            clean_err = clean_err.replace(settings.QDRANT_API_KEY, "[REDACTED]")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Downstream service error: {clean_err}",
        )
    except Exception as e:
        clean_err = str(e)
        if settings.GROQ_API_KEY and settings.GROQ_API_KEY in clean_err:
            clean_err = clean_err.replace(settings.GROQ_API_KEY, "[REDACTED]")
        if settings.QDRANT_API_KEY and settings.QDRANT_API_KEY in clean_err:
            clean_err = clean_err.replace(settings.QDRANT_API_KEY, "[REDACTED]")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {clean_err}",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=False,
    )
