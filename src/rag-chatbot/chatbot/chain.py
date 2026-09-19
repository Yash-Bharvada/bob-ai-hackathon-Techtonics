import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add rag-chatbot base dir to sys.path if not present
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import settings
from retriever.retriever import GridRetriever
from chatbot.prompt_templates import get_system_prompt, format_context, build_user_prompt, format_chat_history
from datasets.dataset_manager import dataset_manager
from groq import Groq, GroqError


class RAGChatbotChain:
    """
    End-to-end RAG chain orchestrating dual-domain semantic retrieval from Qdrant
    (project knowledge + active operational telemetry) and LLM inference via Groq.
    """

    def __init__(
        self,
        retriever: Optional[GridRetriever] = None,
        groq_client: Optional[Groq] = None,
    ):
        self.retriever = retriever or GridRetriever()
        self._groq_client = groq_client

    def _get_groq_client(self) -> Groq:
        if self._groq_client is not None:
            return self._groq_client

        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY is not set. Please define GROQ_API_KEY in rag-chatbot/.env "
                "or export it as an environment variable to use the RAG Chatbot."
            )

        self._groq_client = Groq(api_key=api_key)
        return self._groq_client

    def format_sources(self, retrieved_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract clean source metadata from retrieved results.
        Handles both operational telemetry fields and project knowledge fields.
        """
        sources = []
        for item in retrieved_items:
            meta = item.get("metadata", {})
            knowledge_type = meta.get("knowledge_type", "operational")

            if knowledge_type == "project":
                source_entry = {
                    "knowledge_type": "project",
                    "source_file": meta.get("source_file"),
                    "section": meta.get("section"),
                    "doc_type": meta.get("doc_type"),
                    "chunk_index": meta.get("chunk_index"),
                    "relevance_score": item.get("score"),
                }
            else:
                source_entry = {
                    "knowledge_type": "operational",
                    "dataset_id": meta.get("dataset_id"),
                    "asset_id": meta.get("asset_id"),
                    "asset_type": meta.get("asset_type"),
                    "site_name": meta.get("site_name"),
                    "date": meta.get("date"),
                    "actual_kwh": meta.get("actual_kwh"),
                    "expected_kwh": meta.get("expected_kwh"),
                    "deviation_pct": meta.get("deviation_pct"),
                    "grid_load_mw": meta.get("grid_load_mw"),
                    "weather": meta.get("weather"),
                    "health_index": meta.get("health_index"),
                    "rul_days": meta.get("rul_days"),
                    "risk_tier": meta.get("risk_tier"),
                    "fault_type": meta.get("fault_type"),
                    "relevance_score": item.get("score"),
                }

            # Remove None values
            sources.append({k: v for k, v in source_entry.items() if v is not None})
        return sources

    def answer_question(
        self,
        question: str,
        top_k: Optional[int] = None,
        dataset_id: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Execute dual-domain RAG chain for the input question:
        1. Resolve active dataset metadata (using provided dataset_id or active registered dataset).
        2. Query Qdrant for top-k relevant documents filtered strictly to active operational dataset + project knowledge.
        3. Format retrieved documents into prompt context.
        4. Send tailored system prompt + context + query to Groq API.
        5. Return dict with 'answer', 'sources', and 'dataset' metadata.
        """
        clean_q = question.strip() if question else ""
        if not clean_q:
            return {
                "answer": "Please provide a valid query about VOLTRA or grid operations.",
                "sources": [],
            }

        # Step 1: Determine active dataset
        if dataset_id:
            active_meta = {"dataset_id": dataset_id, "name": dataset_id, "asset_count": 0}
        else:
            active_meta = dataset_manager.get_active_dataset()

        active_id = active_meta.get("dataset_id")
        active_name = active_meta.get("name", "Active Dataset")

        # Step 2: Retrieve context strictly isolating active operational dataset
        retrieved_items = self.retriever.retrieve_hybrid(
            query=clean_q,
            top_k=top_k,
            dataset_id=active_id,
        )

        # Step 3: Format context and prompt
        context_str = format_context(retrieved_items, active_dataset_name=active_name)
        chat_history_str = format_chat_history(history)
        user_prompt = build_user_prompt(
            question=clean_q,
            context_str=context_str,
            chat_history_str=chat_history_str,
            active_dataset_name=active_name,
        )
        system_prompt = get_system_prompt(
            active_dataset_name=active_name,
            active_dataset_id=active_id,
        )

        # Step 4: Invoke Groq LLM
        client = self._get_groq_client()
        try:
            chat_completion = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=settings.GROQ_TEMPERATURE,
                max_completion_tokens=settings.GROQ_MAX_COMPLETION_TOKENS,
            )
            answer_text = chat_completion.choices[0].message.content.strip()
        except GroqError as ge:
            raise RuntimeError(f"Groq API call failed: {str(ge)}") from ge
        except Exception as e:
            raise RuntimeError(f"Unexpected error communicating with LLM: {str(e)}") from e

        # Step 5: Extract sources
        sources = self.format_sources(retrieved_items)

        return {
            "answer": answer_text,
            "sources": sources,
            "dataset": {
                "id": active_meta.get("dataset_id"),
                "name": active_meta.get("name"),
                "asset_count": active_meta.get("asset_count", 0),
            },
        }
