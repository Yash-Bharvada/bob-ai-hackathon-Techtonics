import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory for the standalone RAG chatbot module
BASE_DIR = Path(__file__).resolve().parent

# Load environment variables from rag-chatbot .env or parent root .env
ENV_PATHS = [
    BASE_DIR / ".env",
    BASE_DIR.parent / ".env",
    BASE_DIR.parent.parent / ".env",
]
for p in ENV_PATHS:
    if p.is_file():
        load_dotenv(dotenv_path=p, override=False)
# Also standard auto-discovery
load_dotenv(override=False)


class Settings:
    # Groq Settings
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "").strip()
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b").strip()
    GROQ_TEMPERATURE: float = float(os.getenv("GROQ_TEMPERATURE", "0.1"))
    GROQ_MAX_COMPLETION_TOKENS: int = int(os.getenv("GROQ_MAX_COMPLETION_TOKENS", "1024"))

    # Qdrant Settings
    QDRANT_MODE: str = os.getenv("QDRANT_MODE", "local").strip().lower()  # "local" or "remote"
    QDRANT_URL: str = os.getenv("QDRANT_URL", "").strip()
    QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY", "").strip()
    
    # Resolve local path relative to BASE_DIR if not absolute
    _local_path_raw: str = os.getenv("QDRANT_LOCAL_PATH", "./data/processed/qdrant").strip()
    QDRANT_LOCAL_PATH: str = str(
        Path(_local_path_raw) if Path(_local_path_raw).is_absolute() else (BASE_DIR / _local_path_raw).resolve()
    )
    
    QDRANT_COLLECTION: str = os.getenv("QDRANT_COLLECTION", "grid_operations").strip()

    # Embedding & Retrieval Settings
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5").strip()
    TOP_K: int = int(os.getenv("TOP_K", "8"))

    # API Settings
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0").strip()
    API_PORT: int = int(os.getenv("RAG_PORT", os.getenv("API_PORT", "8001")))
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://127.0.0.1:8000,http://localhost:8000,http://localhost:3000,http://127.0.0.1:3000"
    ).strip()

    # Data paths
    DATA_RAW_DIR: Path = BASE_DIR / "data" / "raw"
    DATA_PROCESSED_DIR: Path = BASE_DIR / "data" / "processed"

    @classmethod
    def validate(cls) -> None:
        """Validate critical configuration parameters and raise informative errors."""
        if cls.QDRANT_MODE not in ("local", "remote"):
            raise ValueError(
                f"Invalid QDRANT_MODE='{cls.QDRANT_MODE}'. Allowed values are 'local' or 'remote'."
            )
        if cls.QDRANT_MODE == "remote":
            if not cls.QDRANT_URL:
                raise ValueError(
                    "QDRANT_URL must be specified when QDRANT_MODE is set to 'remote'."
                )
            if not cls.QDRANT_API_KEY:
                raise ValueError(
                    "QDRANT_API_KEY must be specified when QDRANT_MODE is set to 'remote'."
                )


settings = Settings()
