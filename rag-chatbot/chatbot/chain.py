import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add rag-chatbot base dir to sys.path if not present
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import settings
from retriever.retriever import GridRetriever
from chatbot.prompt_templates import SYSTEM_PROMPT, format_context, build_user_prompt
from groq import Groq, GroqError




class RAGChatbotChain:
    """
    End-to-end RAG chain orchestrating semantic retrieval from Qdrant
    and LLM inference via Groq for Grid Load and Renewable performance advisory.
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
        """
        sources = []
        for item in retrieved_items:
            meta = item.get("metadata", {})
            source_entry = {
                "asset_id": meta.get("asset_id"),
                "asset_type": meta.get("asset_type"),
                "site_name": meta.get("site_name"),
                "date": meta.get("date"),
                "actual_kwh": meta.get("actual_kwh"),
                "expected_kwh": meta.get("expected_kwh"),
                "deviation_pct": meta.get("deviation_pct"),
                "grid_load_mw": meta.get("grid_load_mw"),
                "weather": meta.get("weather"),
                "relevance_score": item.get("score"),
            }
            # Remove None values
            sources.append({k: v for k, v in source_entry.items() if v is not None})
        return sources

    def answer_question(self, question: str, top_k: Optional[int] = None) -> Dict[str, Any]:
        """
        Execute RAG chain for the input question:
        1. Query Qdrant for top-k relevant operational documents.
        2. Format retrieved documents into prompt context.
        3. Send system prompt + context + operator inquiry to Groq API.
        4. Return dict with 'answer' and 'sources'.
        """
        clean_q = question.strip() if question else ""
        if not clean_q:
            return {
                "answer": "Please provide a valid query regarding grid load or asset performance.",
                "sources": [],
            }

        # Step 1: Retrieve context from Qdrant
        retrieved_items = self.retriever.retrieve(query=clean_q, top_k=top_k)

        # Step 2: Format context and prompt
        context_str = format_context(retrieved_items)
        user_prompt = build_user_prompt(question=clean_q, context_str=context_str)

        # Step 3: Invoke Groq LLM
        client = self._get_groq_client()
        try:
            chat_completion = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
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

        # Step 4: Extract sources
        sources = self.format_sources(retrieved_items)

        return {
            "answer": answer_text,
            "sources": sources,
        }
