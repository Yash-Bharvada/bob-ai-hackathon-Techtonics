import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient, models
from qdrant_client.models import Filter, FieldCondition, MatchValue
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import settings


class GridRetriever:
    """
    Retriever for performing semantic similarity search over documents stored in Qdrant.
    Supports both unfiltered retrieval (retrieve) and dual-domain hybrid retrieval
    (retrieve_hybrid) that balances project knowledge and operational telemetry.
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

    def retrieve(self, query: str, top_k: Optional[int] = None, query_filter: Optional[Filter] = None) -> List[Dict[str, Any]]:
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
                "Please run 'python ingest_project.py' to build the index before querying."
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
                query_filter=query_filter,
            )
            points = response.points
        except Exception:
            # Fallback to search
            points = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=k,
                with_payload=True,
                query_filter=query_filter,
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

    def retrieve_hybrid(self, query: str, top_k: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Dual-domain retrieval: splits the top-K budget equally between
        'project' knowledge and 'operational' telemetry, then merges by score.

        This gives the LLM both project context (what VOLTRA is, API endpoints,
        architecture) and live telemetry context in a single combined result list.

        Args:
            query: The user query string.
            top_k: Total results to return (split ~50/50 between domains).

        Returns:
            Combined list of results sorted by score descending.
        """
        if not query or not query.strip():
            return []

        k = top_k if top_k is not None else self.top_k
        # Each domain gets at least half the budget (ceiling so odd k is rounded up)
        per_domain_k = max(1, (k + 1) // 2)

        project_filter = Filter(
            must=[FieldCondition(key="knowledge_type", match=MatchValue(value="project"))]
        )
        operational_filter = Filter(
            must=[FieldCondition(key="knowledge_type", match=MatchValue(value="operational"))]
        )

        project_results: List[Dict[str, Any]] = []
        operational_results: List[Dict[str, Any]] = []

        try:
            project_results = self.retrieve(query, top_k=per_domain_k, query_filter=project_filter)
        except Exception:
            # No project documents yet — degrade gracefully
            project_results = []

        try:
            operational_results = self.retrieve(query, top_k=per_domain_k, query_filter=operational_filter)
        except Exception:
            # No operational documents yet — degrade gracefully
            operational_results = []

        # Merge and sort by score descending, cap at top_k
        combined = project_results + operational_results
        combined.sort(key=lambda x: x["score"], reverse=True)
        return combined[:k]



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

