import sys
import uuid
import argparse
from pathlib import Path
from typing import List

# Support running directly as script or as module
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from qdrant_client import QdrantClient, models
from sentence_transformers import SentenceTransformer

from config import settings
from ingestion.loader import load_all_csvs, load_csv, OperationalDocument
from ingestion.project_loader import load_project_documents, ProjectDocument
from datasets.dataset_manager import dataset_manager, DEFAULT_DATASET_ID, DEFAULT_DATASET_NAME


def get_qdrant_client() -> QdrantClient:
    """
    Instantiate QdrantClient based on settings (local disk or remote Qdrant Cloud).
    """
    settings.validate()
    if settings.QDRANT_MODE == "local":
        local_path = Path(settings.QDRANT_LOCAL_PATH)
        local_path.mkdir(parents=True, exist_ok=True)
        print(f"[Qdrant] Connecting to local persistent storage at: {local_path}")
        client = QdrantClient(path=str(local_path))
    elif settings.QDRANT_MODE == "remote":
        print(f"[Qdrant] Connecting to remote Qdrant Cloud at: {settings.QDRANT_URL}")
        client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY,
        )
    else:
        raise ValueError(f"Unsupported QDRANT_MODE: '{settings.QDRANT_MODE}'")

    return client


def generate_deterministic_id(doc_id: str) -> str:
    """
    Generate a stable, reproducible UUID5 from doc_id.
    """
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"grid_ops_{doc_id}"))


def index_documents(
    documents: List[OperationalDocument],
    collection_name: str = settings.QDRANT_COLLECTION,
    recreate: bool = False,
) -> dict:
    """
    Embed and store operational documents into Qdrant collection using SentenceTransformer.
    Uses upsert by default to preserve project documentation and other datasets.
    """
    if not documents:
        print("[Ingestion] No documents to index. Exiting.")
        return {
            "status": "skipped",
            "documents_indexed": 0,
            "assets": [],
            "dates": [],
            "dataset_id": None,
        }

    client = get_qdrant_client()

    # Initialize SentenceTransformer model
    print(f"[SentenceTransformer] Loading embedding model: {settings.EMBEDDING_MODEL}")
    embed_model = SentenceTransformer(settings.EMBEDDING_MODEL)

    texts = [doc.text for doc in documents]
    ids = [generate_deterministic_id(doc.doc_id) for doc in documents]

    print(f"[SentenceTransformer] Generating normalized embeddings for {len(texts)} documents...")
    embeddings = embed_model.encode(texts, normalize_embeddings=True)
    vectors = embeddings.tolist()
    vector_dim = len(vectors[0])
    print(f"[SentenceTransformer] Generated {len(vectors)} vectors (dimension: {vector_dim}).")

    # If recreate is requested, delete and recreate collection
    if client.collection_exists(collection_name):
        if recreate:
            print(f"[Qdrant] Deleting existing collection '{collection_name}' for clean rebuild...")
            client.delete_collection(collection_name)
            print(f"[Qdrant] Creating collection '{collection_name}' (dim={vector_dim}, distance=Cosine)...")
            client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=vector_dim,
                    distance=models.Distance.COSINE,
                ),
            )
    else:
        print(f"[Qdrant] Creating collection '{collection_name}' (dim={vector_dim}, distance=Cosine)...")
        client.create_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(
                size=vector_dim,
                distance=models.Distance.COSINE,
            ),
        )

    # Ensure payload indices for fast filtered queries
    for field_name in ["knowledge_type", "dataset_id", "asset_id"]:
        try:
            client.create_payload_index(
                collection_name=collection_name,
                field_name=field_name,
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
        except Exception:
            pass

    # Prepare point payloads
    points = []
    dataset_ids = set()
    for doc, point_id, vector in zip(documents, ids, vectors):
        ds_id = doc.metadata.get("dataset_id", "default")
        dataset_ids.add(ds_id)
        payload = {
            "document": doc.text,
            "doc_id": doc.doc_id,
            "dataset_id": ds_id,
            **doc.metadata,
        }
        points.append(
            models.PointStruct(
                id=point_id,
                vector=vector,
                payload=payload,
            )
        )

    print(f"[Qdrant] Ingesting {len(points)} points into '{collection_name}'...")
    client.upsert(
        collection_name=collection_name,
        points=points,
    )

    print(f"[Qdrant] Successfully indexed {len(documents)} documents.")
    primary_dataset_id = list(dataset_ids)[0] if dataset_ids else "default"
    assets_found = sorted(list({doc.metadata.get("asset_id") for doc in documents if doc.metadata.get("asset_id")}))
    dates_found = sorted(list({doc.metadata.get("date") for doc in documents if doc.metadata.get("date")}))

    return {
        "status": "success",
        "dataset_id": primary_dataset_id,
        "documents_indexed": len(documents),
        "assets": assets_found,
        "dates": dates_found,
    }


def ensure_default_dataset_indexed(
    collection_name: str = settings.QDRANT_COLLECTION,
    force_reindex: bool = False,
) -> dict:
    """
    Ensures that the default Anand Corridor sample dataset (18 assets) is indexed in Qdrant.
    Checks if points with dataset_id='anand-corridor-sample' exist; if not, loads and indexes them.
    """
    client = get_qdrant_client()
    default_csv_path = BASE_DIR / "data" / "raw" / "anand_corridor_sample.csv"

    if not default_csv_path.exists():
        # Fallback to create_default_dataset
        import subprocess
        create_script = BASE_DIR / "data" / "create_default_dataset.py"
        if create_script.exists():
            subprocess.run([sys.executable, str(create_script)], check=True)

    if not default_csv_path.exists():
        print(f"[Default Dataset] Warning: {default_csv_path} not found.")
        return {"status": "error", "message": "Default CSV file not found"}

    # Check if points already exist in collection
    if not force_reindex and client.collection_exists(collection_name):
        try:
            res = client.scroll(
                collection_name=collection_name,
                scroll_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="dataset_id",
                            match=models.MatchValue(value=DEFAULT_DATASET_ID),
                        )
                    ]
                ),
                limit=1,
            )
            points, _ = res
            if points:
                print(f"[Default Dataset] Anand Corridor sample dataset '{DEFAULT_DATASET_ID}' already indexed in Qdrant.")
                return {"status": "already_indexed", "dataset_id": DEFAULT_DATASET_ID}
        except Exception as e:
            print(f"[Default Dataset] Could not check existing dataset: {e}")

    print(f"[Default Dataset] Indexing Anand Corridor 18-asset default dataset from {default_csv_path}...")
    docs = load_csv(default_csv_path, dataset_id=DEFAULT_DATASET_ID)
    summary = index_documents(
        documents=docs,
        collection_name=collection_name,
        recreate=False,
    )

    # Register in dataset_manager
    dataset_manager.register_dataset(
        dataset_id=DEFAULT_DATASET_ID,
        name=DEFAULT_DATASET_NAME,
        asset_count=len(summary.get("assets", [])),
        record_count=len(docs),
        source_file="anand_corridor_sample.csv",
        assets=summary.get("assets", []),
        set_active=True,
    )

    print(f"[Default Dataset] Successfully indexed and activated default dataset '{DEFAULT_DATASET_ID}' ({len(docs)} records).")
    return summary

def index_project_documents(
    collection_name: str = settings.QDRANT_COLLECTION,
) -> dict:
    """
    Embed and upsert project knowledge documents into Qdrant.

    IMPORTANT: This function NEVER recreates/wipes the collection.
    It always uses upsert so operational telemetry is fully preserved.
    """
    print("[Project Ingestion] Loading project knowledge files...")
    documents = load_project_documents()

    if not documents:
        print("[Project Ingestion] No project documents found. Exiting.")
        return {"status": "skipped", "documents_indexed": 0}

    client = get_qdrant_client()

    print(f"[SentenceTransformer] Loading embedding model: {settings.EMBEDDING_MODEL}")
    embed_model = SentenceTransformer(settings.EMBEDDING_MODEL)

    texts = [doc.text for doc in documents]
    ids = [generate_deterministic_id(f"proj_{doc.doc_id}") for doc in documents]

    print(f"[SentenceTransformer] Generating embeddings for {len(texts)} project chunks...")
    embeddings = embed_model.encode(texts, normalize_embeddings=True)
    vectors = embeddings.tolist()
    vector_dim = len(vectors[0])
    print(f"[SentenceTransformer] Generated {len(vectors)} vectors (dim={vector_dim}).")

    # Ensure collection exists (create if first-ever run; never wipe)
    if not client.collection_exists(collection_name):
        print(f"[Qdrant] Creating collection '{collection_name}' (dim={vector_dim}, distance=Cosine)...")
        client.create_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(
                size=vector_dim,
                distance=models.Distance.COSINE,
            ),
        )
    else:
        print(f"[Qdrant] Collection '{collection_name}' exists — upserting project chunks (no wipe).")

    # Create payload index on knowledge_type for fast filtered retrieval
    try:
        client.create_payload_index(
            collection_name=collection_name,
            field_name="knowledge_type",
            field_schema=models.PayloadSchemaType.KEYWORD,
        )
        print("[Qdrant] Payload index on 'knowledge_type' ensured.")
    except Exception:
        # Index may already exist — that is fine
        pass

    points = [
        models.PointStruct(
            id=point_id,
            vector=vector,
            payload={"document": doc.text, "doc_id": doc.doc_id, **doc.metadata},
        )
        for doc, point_id, vector in zip(documents, ids, vectors)
    ]

    print(f"[Qdrant] Upserting {len(points)} project knowledge points into '{collection_name}'...")
    client.upsert(collection_name=collection_name, points=points)
    print(f"[Qdrant] Successfully indexed {len(documents)} project knowledge chunks.")

    return {
        "status": "success",
        "documents_indexed": len(documents),
        "sources": sorted({doc.metadata.get("source_file", "") for doc in documents}),
    }


def run_ingestion() -> None:
    """
    Discovers CSV files in data/raw, processes them, and indexes into Qdrant.
    Supports --mode operational|project|all.
    """
    parser = argparse.ArgumentParser(description="Embed and store VOLTRA RAG documents into Qdrant.")
    parser.add_argument(
        "--data-dir",
        type=str,
        default=str(settings.DATA_RAW_DIR),
        help="Path to directory containing raw CSV telemetry files",
    )
    parser.add_argument(
        "--collection",
        type=str,
        default=settings.QDRANT_COLLECTION,
        help="Target Qdrant collection name",
    )
    parser.add_argument(
        "--no-recreate",
        action="store_true",
        help="Do not delete existing collection before indexing operational data (upsert mode)",
    )
    parser.add_argument(
        "--mode",
        type=str,
        choices=["operational", "project", "all"],
        default="operational",
        help="What to index: 'operational' (CSV telemetry), 'project' (docs/source), or 'all' (both)",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("VOLTRA RAG — INGESTION PIPELINE")
    print(f"Mode: {args.mode.upper()}")
    print("=" * 60)

    if args.mode in ("operational", "all"):
        raw_dir = Path(args.data_dir)
        print(f"[Operational] Scanning directory: {raw_dir}")
        docs = load_all_csvs(raw_dir)
        print(f"[Operational] Loaded {len(docs)} operational summary documents from CSVs.")
        index_documents(
            documents=docs,
            collection_name=args.collection,
            recreate=not args.no_recreate,
        )

    if args.mode in ("project", "all"):
        print("[Project] Indexing project knowledge files...")
        result = index_project_documents(collection_name=args.collection)
        print(f"[Project] Indexed {result.get('documents_indexed', 0)} project chunks.")

    print("=" * 60)
    print("Ingestion complete!")
    print("=" * 60)


if __name__ == "__main__":
    run_ingestion()

