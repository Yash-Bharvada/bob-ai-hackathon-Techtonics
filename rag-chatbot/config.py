import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory for the standalone RAG chatbot module
BASE_DIR = Path(__file__).resolve().parent

# Load environment variables from .env if present in rag-chatbot root
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)


class Settings:
    # Groq Settings
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "").strip()
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
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
    TOP_K: int = int(os.getenv("TOP_K", "4"))

    # API Settings
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0").strip()
    API_PORT: int = int(os.getenv("API_PORT", "8001"))

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
