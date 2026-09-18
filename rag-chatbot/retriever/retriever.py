import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import settings


class GridRetriever:
    """
    Retriever for performing semantic similarity search over operational documents stored in Qdrant.
    """

    def __init__(
        self,
        collection_name: str = settings.QDRANT_COLLECTION,
        top_k: int = settings.TOP_K,
        client: Optional[QdrantClient] = None,
        embed_model: Optional[SentenceTransformer] = None,
    ):
        self.collection_name = collection_name
        self.top_k = top_k
        self.client = client or self._init_client()
        if embed_model is not None:
            self.embed_model = embed_model
        else:
            try:
                self.embed_model = SentenceTransformer(settings.EMBEDDING_MODEL, local_files_only=True)
            except Exception:
                self.embed_model = SentenceTransformer(settings.EMBEDDING_MODEL)

    def _init_client(self) -> QdrantClient:
        settings.validate()
        if settings.QDRANT_MODE == "local":
            local_path = Path(settings.QDRANT_LOCAL_PATH)
            if not local_path.exists():
                local_path.mkdir(parents=True, exist_ok=True)
            client = QdrantClient(path=str(local_path), check_compatibility=False)
        elif settings.QDRANT_MODE == "remote":
            client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY,
                check_compatibility=False,
            )
        else:
            raise ValueError(f"Unsupported QDRANT_MODE: '{settings.QDRANT_MODE}'")

        return client

    def retrieve(self, query: str, top_k: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Perform similarity search for query against the Qdrant collection.

        Returns a list of dicts:
        [
            {
                "text": "...",
                "score": 0.91,
                "metadata": {...}
            }
        ]
        """
        if not query or not query.strip():
            return []

        k = top_k if top_k is not None else self.top_k

        if not self.client.collection_exists(self.collection_name):
            raise RuntimeError(
                f"Qdrant collection '{self.collection_name}' does not exist. "
                "Please run 'python -m ingestion.embed_and_store' to build the index before querying."
            )

        # Generate normalized query embedding
        query_vector = self.embed_model.encode(query.strip(), normalize_embeddings=True).tolist()


        # Query points using Qdrant search
        try:
            # Try query_points (modern API)
            response = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                limit=k,
                with_payload=True,
            )
            points = response.points
        except Exception:
            # Fallback to search
            points = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=k,
                with_payload=True,
            )

        formatted_results: List[Dict[str, Any]] = []
        for point in points:
            payload = getattr(point, "payload", {}) or {}
            doc_text = payload.get("document", "") or payload.get("text", "")
            score = float(getattr(point, "score", 0.0))

            meta = dict(payload)
            meta.pop("document", None)
            meta.pop("text", None)

            formatted_results.append({
                "text": str(doc_text),
                "score": round(score, 4),
                "metadata": meta,
            })

        return formatted_results



if __name__ == "__main__":
    # Test retriever CLI
    retriever = GridRetriever()
    test_query = "Why is SOL-001 underperforming on 2026-09-15?"
    print(f"Executing test query: '{test_query}'")
    try:
        results = retriever.retrieve(test_query)
        print(f"Retrieved {len(results)} results:")
        for r in results:
            print(f"- Score: {r['score']} | Text preview: {r['text'][:100]}...")
            print(f"  Metadata: {r['metadata']}")
    except Exception as e:
        print(f"Retriever error: {e}")
