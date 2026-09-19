import sys
import hashlib
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
from ingestion.embed_and_store import index_documents, ensure_default_dataset_indexed
from datasets.dataset_manager import dataset_manager, DatasetMetadata, DEFAULT_DATASET_ID


# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class HealthResponse(BaseModel):
    status: str = Field(..., description="Service health status", json_schema_extra={"example": "ok"})


class ChatRequest(BaseModel):
    message: str = Field(..., description="User query or operator inquiry", json_schema_extra={"example": "Why is TX-107 critical?"})
    top_k: Optional[int] = Field(None, ge=1, le=20, description="Optional override for number of retrieved operational documents")
    dataset_id: Optional[str] = Field(None, description="Optional active dataset_id to filter operational retrieval")
    history: Optional[List[Dict[str, str]]] = Field(None, description="Recent conversation turns for chat history grounding")

    @field_validator("message")
    @classmethod
    def validate_message_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Message cannot be empty or whitespace-only.")
        return v.strip()


class ChatResponse(BaseModel):
    answer: str = Field(..., description="Evidence-grounded operational response")
    sources: List[Dict[str, Any]] = Field(default_factory=list, description="Retrieved evidence sources and telemetry metadata")
    dataset: Optional[Dict[str, Any]] = Field(None, description="Active dataset metadata used for operational context")


class DatasetResponse(BaseModel):
    dataset_id: str = Field(..., description="Unique dataset identifier")
    name: str = Field(..., description="Human-readable dataset display name")
    asset_count: int = Field(..., description="Unique count of assets in dataset")
    record_count: int = Field(..., description="Count of operational telemetry records")
    status: str = Field(..., description="active or inactive")
    source_file: Optional[str] = Field(None, description="Original uploaded CSV filename")
    created_at: Optional[str] = Field(None, description="Registration timestamp")
    assets: Optional[List[str]] = Field(default_factory=list, description="List of unique asset IDs")


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
    Lifespan context manager:
    1. Initialize RAG chain instance.
    2. Seed default 18-asset Anand Corridor sample dataset if missing.
    """
    global chain_instance
    try:
        settings.validate()
        chain_instance = RAGChatbotChain()
        print(f"[RAG-API] RAG chain initialized in {settings.QDRANT_MODE} Qdrant mode.")
    except Exception as e:
        print(f"[RAG-API] Startup warning (chain will lazy-load on request): {e}", file=sys.stderr)
        chain_instance = None

    # Ensure default dataset exists in Qdrant and registry
    try:
        ensure_default_dataset_indexed(settings.QDRANT_COLLECTION)
    except Exception as e:
        print(f"[RAG-API] Notice: Default dataset check deferred: {e}", file=sys.stderr)

    yield
    print("[RAG-API] Service shutting down.")


app = FastAPI(
    title="VOLTRA Project-Aware Grid Operations Advisor RAG Chatbot API",
    description="Evidence-grounded operational insights and full project knowledge for power grid asset management.",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    openapi_url="/openapi.json",
)

raw_origins = getattr(settings, "ALLOWED_ORIGINS", "http://127.0.0.1:8000,http://localhost:8000,http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# ROUTES: SYSTEM & CHAT
# ==============================================================================

@app.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check endpoint",
    tags=["System"],
)
async def health_check():
    """Confirms that the RAG API service is alive."""
    return HealthResponse(status="ok")


@app.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit an inquiry to the VOLTRA Grid Advisor",
    tags=["Chatbot"],
    description="Processes user inquiry through dual-domain retrieval (Project Knowledge + Active Operational Dataset) and Groq LLM inference.",
)
async def chat_endpoint(request: ChatRequest):
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
            dataset_id=request.dataset_id,
            history=request.history,
        )
        return ChatResponse(
            answer=result["answer"],
            sources=result["sources"],
            dataset=result.get("dataset"),
        )

    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except RuntimeError as re:
        clean_err = str(re)
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


# ==============================================================================
# ROUTES: DATASET LIFECYCLE MANAGEMENT
# ==============================================================================

@app.get(
    "/datasets/active",
    response_model=DatasetResponse,
    status_code=status.HTTP_200_OK,
    summary="Get currently active operational dataset metadata",
    tags=["Datasets"],
)
async def get_active_dataset_endpoint():
    """Returns the currently active operational dataset used by the chatbot."""
    active_meta = dataset_manager.get_active_dataset()
    return DatasetResponse(**active_meta)


@app.get(
    "/datasets",
    response_model=List[DatasetResponse],
    status_code=status.HTTP_200_OK,
    summary="List all indexed operational datasets",
    tags=["Datasets"],
)
async def list_datasets_endpoint():
    """Lists all available operational datasets and indicates which is currently active."""
    all_meta = dataset_manager.list_datasets()
    return [DatasetResponse(**d) for d in all_meta]


@app.post(
    "/datasets/{dataset_id}/activate",
    response_model=DatasetResponse,
    status_code=status.HTTP_200_OK,
    summary="Activate an existing operational dataset",
    tags=["Datasets"],
)
async def activate_dataset_endpoint(dataset_id: str):
    """Switches the active dataset without re-indexing."""
    try:
        active_meta = dataset_manager.activate_dataset(dataset_id)
        # Clear cached retriever client so next query connects smoothly
        global chain_instance
        if chain_instance is not None:
            chain_instance.retriever._qdrant_client = None
        return DatasetResponse(**active_meta)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve),
        )


@app.post(
    "/datasets/upload",
    response_model=DatasetResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload, validate, index, and activate a new CSV telemetry dataset",
    tags=["Datasets"],
    description="Validates CSV, parses schema, indexes vectors into Qdrant isolated by dataset_id, and sets dataset as active.",
)
async def upload_dataset_endpoint(
    file: UploadFile = File(..., description="Telemetry CSV file to parse, index, and activate"),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a .csv extension.",
        )

    # Read and decode CSV
    try:
        content_bytes = await file.read()
        if len(content_bytes) > 25 * 1024 * 1024:  # 25 MB limit
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV file exceeds maximum supported size (25 MB).",
            )
        content_str = content_bytes.decode("utf-8-sig")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read CSV file: {str(e)}",
        )

    # Derive human-readable name and stable dataset_id
    content_hash = hashlib.sha256(content_bytes).hexdigest()
    dataset_name = dataset_manager.derive_dataset_name(file.filename)
    dataset_id = dataset_manager.derive_dataset_id(file.filename, content_hash)

    # Parse and validate documents
    try:
        documents = load_csv_from_string(
            csv_text=content_str,
            source_filename=file.filename,
            dataset_id=dataset_id,
        )
    except ValueError as ve:
        # Crucial requirement: KEEP PREVIOUS ACTIVE DATASET ON FAILURE
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV validation failed: {str(ve)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to process this dataset: {str(e)}",
        )

    # Index into Qdrant (upsert only, recreate=False so other datasets and project docs are never wiped)
    try:
        summary = index_documents(
            documents=documents,
            collection_name=settings.QDRANT_COLLECTION,
            recreate=False,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to index operational telemetry: {str(e)}",
        )

    # Register in dataset manager and activate
    unique_assets = summary.get("assets", [])
    registered_meta = dataset_manager.register_dataset(
        dataset_id=dataset_id,
        name=dataset_name,
        asset_count=len(unique_assets),
        record_count=len(documents),
        source_file=file.filename,
        assets=unique_assets,
        set_active=True,
    )

    # Reset cached retriever client to immediately read new points
    global chain_instance
    if chain_instance is not None:
        chain_instance.retriever._qdrant_client = None

    return DatasetResponse(**registered_meta)


# Backwards-compatible legacy route
@app.post(
    "/ingest/csv",
    response_model=IngestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Legacy CSV ingestion endpoint",
    tags=["Ingestion"],
)
async def ingest_csv_endpoint(
    file: UploadFile = File(..., description="Telemetry CSV file to embed and index"),
    recreate: bool = Form(False, description="Whether to recreate collection (disabled by default)"),
):
    upload_res = await upload_dataset_endpoint(file=file)
    return IngestionResponse(
        status="success",
        filename=file.filename,
        documents_indexed=upload_res.record_count,
        assets=upload_res.assets or [],
        dates=[],
        message=f"Successfully indexed and activated dataset '{upload_res.name}' with {upload_res.asset_count} assets.",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=False,
    )
