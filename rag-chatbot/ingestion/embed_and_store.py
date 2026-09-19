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
from ingestion.loader import load_all_csvs, OperationalDocument


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
    recreate: bool = True,
) -> None:
    """
    Embed and store operational documents into Qdrant collection using SentenceTransformer.
    """
    if not documents:
        print("[Ingestion] No documents to index. Exiting.")
        return

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


    # If recreate is requested or collection doesn't exist, create it
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

    # Prepare point payloads
    points = []
    for doc, point_id, vector in zip(documents, ids, vectors):
        payload = {
            "document": doc.text,
            "doc_id": doc.doc_id,
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
    for doc in documents:
        print(f"  [+] {doc.doc_id} -> Point ID: {generate_deterministic_id(doc.doc_id)}")

    return {
        "status": "success",
        "documents_indexed": len(documents),
        "assets": sorted(list({doc.metadata.get("asset_id") for doc in documents if doc.metadata.get("asset_id")})),
        "dates": sorted(list({doc.metadata.get("date") for doc in documents if doc.metadata.get("date")})),
    }




def run_ingestion() -> None:
    """
    Discovers CSV files in data/raw, processes them, and indexes into Qdrant.
    """
    parser = argparse.ArgumentParser(description="Embed and store grid operations operational summaries into Qdrant.")
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
        help="Do not delete existing collection before indexing (upsert mode)",
    )
    args = parser.parse_args()

    raw_dir = Path(args.data_dir)
    print("=" * 60)
    print("GRID LOAD & RENEWABLE ADVISOR - RAG INGESTION PIPELINE")
    print("=" * 60)
    print(f"Scanning directory: {raw_dir}")

    docs = load_all_csvs(raw_dir)
    print(f"Loaded {len(docs)} operational summary documents from CSVs.")

    index_documents(
        documents=docs,
        collection_name=args.collection,
        recreate=not args.no_recreate,
    )
    print("=" * 60)
    print("Ingestion complete!")
    print("=" * 60)


if __name__ == "__main__":
    run_ingestion()
