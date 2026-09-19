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

    def classify_query(self, query: str) -> str:
        """
        Classify query into 'project', 'operational', or 'hybrid'.
        """
        import re
        q_lower = query.lower()

        project_keywords = {
            "voltra", "architecture", "tech stack", "frontend", "backend",
            "api endpoint", "routes", "route", "fastapi", "qdrant", "groq", "how does voltra",
            "how does the chatbot", "grid console", "prediction system", "ml pipeline",
            "who created", "deployment", "github", "bob", "technology stack", "how does the rag",
            "how does", "evaluate", "determine", "interpret", "algorithm", "model",
            "website", "web", "page", "pages", "dashboard", "predict", "stream", "blackout",
            "technology", "login", "button", "ui", "component", "drawer", "inspector",
            "simulation", "feature", "features", "navigation", "navbar", "banner", "modal",
            "incident report", "csv upload", "how do i", "where is", "duval triangle"
        }
        has_project_kw = any(kw in q_lower for kw in project_keywords)

        has_asset_pattern = bool(re.search(r"\b(tx-\w+|sol-\w+|wnd-\w+|asset|transformer|substation)\b", q_lower))
        operational_keywords = {
            "load", "reading", "hydrogen", "methane", "acetylene", "acethylene", "ethylene", "ethane",
            "water content", "temperature", "power factor", "rul", "health index",
            "underperforming", "generation", "kwh", "mw", "highest", "lowest", "critical",
            "ppm", "sensor", "telemetry", "dga", "fault"
        }
        has_ops_kw = any(kw in q_lower for kw in operational_keywords)

        if has_project_kw and (has_asset_pattern or has_ops_kw):
            return "hybrid"
        elif has_project_kw:
            return "project"
        elif has_asset_pattern or has_ops_kw:
            return "operational"
        return "hybrid"

    def retrieve_hybrid(
        self,
        query: str,
        top_k: Optional[int] = None,
        dataset_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Dual-domain retrieval:
        1. Project knowledge is queried with no dataset filter (universal VOLTRA documentation).
        2. Operational telemetry is strictly filtered to 'knowledge_type=operational' AND 'dataset_id=active_id'.
        """
        if not query or not query.strip():
            return []

        k = top_k if top_k is not None else self.top_k
        query_type = self.classify_query(query)

        # Build domain filters
        project_filter = Filter(
            must=[FieldCondition(key="knowledge_type", match=MatchValue(value="project"))]
        )

        ops_must = [FieldCondition(key="knowledge_type", match=MatchValue(value="operational"))]
        if dataset_id:
            ops_must.append(FieldCondition(key="dataset_id", match=MatchValue(value=dataset_id)))
        operational_filter = Filter(must=ops_must)

        # Budget allocation based on classification
        if query_type == "project":
            proj_k = max(k, 8)
            ops_k = 0
        elif query_type == "operational":
            proj_k = 0
            ops_k = max(k, 6)
        else:  # hybrid
            proj_k = max(4, (k + 1) // 2)
            ops_k = max(4, (k + 1) // 2)

        project_results: List[Dict[str, Any]] = []
        operational_results: List[Dict[str, Any]] = []

        if proj_k > 0:
            try:
                project_results = self.retrieve(query, top_k=proj_k, query_filter=project_filter)
            except Exception:
                project_results = []

        if ops_k > 0:
            try:
                operational_results = self.retrieve(query, top_k=ops_k, query_filter=operational_filter)
            except Exception:
                operational_results = []

        # If operational query and no operational results found for this dataset_id,
        # return empty operational results without cross-dataset fallback!
        combined = project_results + operational_results
        combined.sort(key=lambda x: x["score"], reverse=True)
        limit = max(k, proj_k if query_type == "project" else (ops_k if query_type == "operational" else proj_k + ops_k))
        return combined[:limit]



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

