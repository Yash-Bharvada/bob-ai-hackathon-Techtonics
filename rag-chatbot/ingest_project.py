"""
ingest_project.py — One-shot runner to index VOLTRA project knowledge into Qdrant.

Run this from the rag-chatbot/ directory:
    python ingest_project.py

This indexes all safe project documentation and source files (README, docs/,
backend main.py, etc.) into the existing Qdrant collection using UPSERT mode
— operational telemetry data is NEVER wiped.

After running this, the RAG chatbot will be able to answer questions about:
  - What VOLTRA is and how it works
  - The ML models (Health Index regression, DGA Fault Classifier)
  - All API endpoints and their request/response schemas
  - Architecture, deployment, setup instructions
  - The tech stack, team, and problem statement
  - How to use the system

Re-run whenever project documentation is updated.
"""

import sys
from pathlib import Path

# Ensure rag-chatbot/ is in sys.path when run as a script
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from ingestion.embed_and_store import index_project_documents


def main() -> None:
    print("=" * 60)
    print("VOLTRA RAG — PROJECT KNOWLEDGE INGESTION")
    print("=" * 60)
    print("Indexing project knowledge files (upsert mode — no wipe)...\n")

    result = index_project_documents()

    print()
    print("=" * 60)
    if result.get("status") == "success":
        count = result.get("documents_indexed", 0)
        sources = result.get("sources", [])
        print(f"SUCCESS: Indexed {count} project knowledge chunks.")
        print("\nSources indexed:")
        for src in sources:
            print(f"  - {src}")
        print()
        print("The chatbot can now answer questions about:")
        print("  - What VOLTRA is, its architecture, ML models")
        print("  - All API endpoints (GET /api/assets, POST /api/score, etc.)")
        print("  - Setup, deployment, Docker usage")
        print("  - Tech stack, team, problem statement")
        print()
        print("Re-run this script whenever docs are updated.")
    elif result.get("status") == "skipped":
        print("WARNING: No project documents were found to index.")
        print("Check that the repo root contains README.md and docs/.")
    else:
        print("Ingestion finished with unexpected status.")
    print("=" * 60)


if __name__ == "__main__":
    main()
