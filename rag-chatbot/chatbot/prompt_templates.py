"""System prompts and prompt formatting templates for VOLTRA Grid Risk Intelligence & Operations Advisor.

The chatbot operates across two distinct knowledge domains:
  - DOMAIN A: PROJECT & WEBSITE KNOWLEDGE (Architecture, APIs, ML models, website features, UI routes,
               model formulas, scoring logic, deployment, maintenance action codes, TX-115 story)
  - DOMAIN B: ACTIVE OPERATIONAL DATASET (Live telemetry, sensor readings, transformer DGA metrics)
"""

from typing import List, Dict, Any, Optional

BASE_SYSTEM_PROMPT = """You are the official VOLTRA Grid Advisor — the built-in AI assistant for the VOLTRA Grid Risk Intelligence & Operations Advisor platform. You answer questions using ONLY the information provided in the CONTEXT section, which is retrieved from VOLTRA project documentation, website guides, architecture references, model formulas, and the currently active operational telemetry dataset ("{active_dataset_name}").

RULES:
1. Answer strictly from CONTEXT. Never use outside knowledge, training data, assumptions, or guesses — even if you are confident the answer is correct.
2. Website and system questions come first: if the user asks about any VOLTRA page, feature, route, API endpoint, ML model, formula, or component, look in the project documentation context first (knowledge_type=project).
3. If the CONTEXT does not contain enough information to answer, respond exactly with:
   "I don't have that information available in the active dataset or project documentation."
   Do not attempt a partial or best-guess answer.
4. Never fabricate facts, numbers, dates, asset IDs, gas ppm values, threshold values, or API paths that are not explicitly present in the CONTEXT.
5. When you answer, cite the source of each fact (e.g., "[Source: docs/website-guide.md, Section: Route /dashboard]", "[Source: docs/voltra_formulas_and_specs.md, Section: RUL Formula]", or "[Source: {active_dataset_name}, Asset: TX-107]").
6. If the question is ambiguous or could match multiple unrelated assets or documents, ask a brief clarifying question instead of guessing.
7. Do not speculate about unverified faults or physical operations unless that exact evidence is in CONTEXT.
8. Keep answers concise and directly responsive. Do not pad with generic disclaimers beyond what is needed.
9. If asked who you are or how you work, say: "I am the official VOLTRA Grid Advisor, trained on VOLTRA's own project documentation, website guide, ML model specifications, and active grid telemetry."
"""


def get_system_prompt(active_dataset_name: str = "Anand Corridor (Sample)", active_dataset_id: str = "anand-corridor-sample") -> str:
    """Generate system prompt dynamically tailored to the active dataset name."""
    return BASE_SYSTEM_PROMPT.format(
        active_dataset_name=active_dataset_name or "Anand Corridor (Sample)",
        active_dataset_id=active_dataset_id or "anand-corridor-sample",
    )


# Default system prompt for backwards-compatibility
SYSTEM_PROMPT = get_system_prompt()


def format_context(retrieved_items: list[dict], active_dataset_name: str = "Anand Corridor (Sample)") -> str:
    """
    Format retrieved Qdrant items into structured context chunks with strict source labels.
    Compatible with Rule 4: [Source: file, Section: header] or [Source: dataset, Asset: id]
    """
    if not retrieved_items:
        return "NO RELEVANT CONTEXT FOUND IN DATABASE."

    context_blocks = []
    ds_name = active_dataset_name or "Active Dataset"

    for item in retrieved_items:
        text = item.get("text", "").strip()
        meta = item.get("metadata", {})
        knowledge_type = meta.get("knowledge_type", "operational")

        if knowledge_type == "project":
            source = meta.get("source_file", "project_docs")
            section = meta.get("section", "")
            if section:
                header = f"[Source: {source}, Section: {section}]"
            else:
                header = f"[Source: {source}]"
        else:
            asset_id = meta.get("asset_id", "Operational Record")
            header = f"[Source: {ds_name}, Asset: {asset_id}]"

        context_blocks.append(f"{header}\n{text}")

    return "\n\n".join(context_blocks)


def format_chat_history(chat_history: Optional[List[Dict[str, str]]]) -> str:
    """
    Format previous conversation turns for multi-turn conversational grounding.
    """
    if not chat_history:
        return "None"

    lines = []
    for msg in chat_history:
        role = "USER" if msg.get("role") in ("user", "human") else "ASSISTANT"
        content = msg.get("content", "").strip()
        if content:
            lines.append(f"{role}: {content}")

    return "\n".join(lines) if lines else "None"


def build_user_prompt(
    question: str,
    context_str: str,
    chat_history_str: str = "None",
    active_dataset_name: str = "Anand Corridor (Sample)",
) -> str:
    """Combine user question with formatted context, chat history, and active dataset."""
    return f"""CONTEXT:
{context_str}

CONVERSATION HISTORY:
{chat_history_str}

USER QUESTION:
{question}"""
