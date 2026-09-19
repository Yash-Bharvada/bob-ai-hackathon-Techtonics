import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

# Add rag-chatbot base dir to sys.path if not present
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from fastapi import FastAPI, HTTPException, status, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from config import settings
from chatbot.chain import RAGChatbotChain
from ingestion.loader import load_csv_from_string
from ingestion.embed_and_store import index_documents


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


class IngestionResponse(BaseModel):
    status: str = Field(..., description="Ingestion status")
    filename: str = Field(..., description="Name of uploaded CSV file")
    documents_indexed: int = Field(..., description="Number of operational documents aggregated and indexed")
    assets: List[str] = Field(default_factory=list, description="Unique asset IDs found in the CSV")
    dates: List[str] = Field(default_factory=list, description="Unique dates found in the CSV")
    message: str = Field(..., description="Human-readable result summary")


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


@app.post(
    "/ingest/csv",
    response_model=IngestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Dynamically upload and index an operational telemetry CSV into Qdrant Cloud",
    tags=["Ingestion"],
    description="Parses uploaded CSV, aggregates operational metrics, computes normalized embeddings, and upserts vectors into Qdrant Cloud.",
)
async def ingest_csv_endpoint(
    file: UploadFile = File(..., description="Telemetry CSV file to embed and index"),
    recreate: bool = Form(False, description="If true, wipes existing collection before indexing. Default false appends/updates."),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a .csv extension.",
        )

    try:
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8-sig")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read CSV file: {str(e)}",
        )

    try:
        documents = load_csv_from_string(content_str, source_filename=file.filename)
        if not documents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV contains no valid telemetry records.",
            )

        summary = index_documents(
            documents=documents,
            collection_name=settings.QDRANT_COLLECTION,
            recreate=recreate,
        )

        # Clear retriever cached client if needed so next search picks up new collection instantly
        global chain_instance
        if chain_instance is not None:
            chain_instance.retriever._qdrant_client = None

        return IngestionResponse(
            status="success",
            filename=file.filename,
            documents_indexed=summary.get("documents_indexed", len(documents)),
            assets=summary.get("assets", []),
            dates=summary.get("dates", []),
            message=f"Successfully indexed {len(documents)} operational records into Qdrant Cloud.",
        )

    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV validation error: {str(ve)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion failed: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=False,
    )
