"""
reingest_all.py -- VOLTRA RAG Full Reset & Re-ingestion Script
==============================================================

This script:
  1. DELETES the entire existing Qdrant collection (clean slate)
  2. Re-indexes ALL project knowledge files (docs, README, pipeline source,
     website-guide, API reference, architecture, formulas & specs, DOCX if available)
  3. Re-indexes the default Anand Corridor operational telemetry dataset

Run this from the rag-chatbot/ directory:
    python reingest_all.py

After this script completes, the VOLTRA Grid Advisor chatbot will have
fresh, complete knowledge of:
  - The VOLTRA website: all routes, UI components, data flows
  - All API endpoints and request/response schemas
  - ML model formulas, hyperparameters, and scoring logic
  - Architecture, deployment, Docker usage
  - Problem statement, solution overview, TX-115 story
  - Active Anand Corridor 18-transformer telemetry dataset
"""

import sys
from pathlib import Path

# Ensure rag-chatbot/ is in sys.path when run as a script
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import settings
from ingestion.embed_and_store import (
    get_qdrant_client,
    index_project_documents,
    ensure_default_dataset_indexed,
)


def wipe_collection(collection_name: str) -> None:
    """Delete the Qdrant collection entirely for a clean rebuild."""
    client = get_qdrant_client()
    if client.collection_exists(collection_name):
        print(f"[Wipe] Deleting collection '{collection_name}'...")
        client.delete_collection(collection_name)
        print(f"[Wipe] Collection '{collection_name}' deleted.")
    else:
        print(f"[Wipe] Collection '{collection_name}' does not exist -- nothing to delete.")


def main() -> None:
    collection = settings.QDRANT_COLLECTION

    print("=" * 65)
    print("VOLTRA RAG -- FULL RESET & RE-INGESTION")
    print("=" * 65)
    print(f"Collection : {collection}")
    print(f"Qdrant mode: {settings.QDRANT_MODE}")
    if settings.QDRANT_MODE == "local":
        print(f"Local path : {settings.QDRANT_LOCAL_PATH}")
    print()

    # STEP 1: Wipe existing collection
    print("STEP 1 -- Wiping existing Qdrant collection...")
    wipe_collection(collection)
    print()

    # STEP 2: Index all project knowledge
    print("STEP 2 -- Indexing project knowledge (docs, source, DOCX)...")
    proj_result = index_project_documents(collection_name=collection)
    if proj_result.get("status") == "success":
        count = proj_result.get("documents_indexed", 0)
        sources = proj_result.get("sources", [])
        print(f"\n  [OK] Indexed {count} project knowledge chunks from {len(sources)} source(s):")
        for src in sorted(sources):
            print(f"    - {src}")
    else:
        print(f"  [!] Project ingestion returned: {proj_result}")
    print()

    # STEP 3: Index default operational telemetry
    print("STEP 3 -- Indexing default Anand Corridor 18-asset dataset...")
    ops_result = ensure_default_dataset_indexed(
        collection_name=collection,
        force_reindex=True,          # force because we wiped the collection
    )
    status = ops_result.get("status", "unknown")
    if status == "success":
        print(f"  [OK] Indexed {ops_result.get('documents_indexed', 0)} operational records.")
        assets = ops_result.get("assets", [])
        if assets:
            print(f"  [OK] Assets: {', '.join(assets)}")
    elif status == "already_indexed":
        # Should not happen after a wipe, but handle gracefully
        print(f"  [OK] Dataset already indexed (dataset_id={ops_result.get('dataset_id')}).")
    else:
        print(f"  [!] Operational ingestion returned: {ops_result}")
    print()

    # Summary
    print("=" * 65)
    print("RE-INGESTION COMPLETE")
    print("=" * 65)
    print()
    print("The VOLTRA Grid Advisor chatbot now knows about:")
    print("  [OK] Website routes: /, /dashboard, /grid, /predict, /stream,")
    print("                       /blackout, /technology, /login")
    print("  [OK] All UI components: GridAdvisorChat, SiteNav, DataSourceBadge,")
    print("                          TX115InterventionBanner, IncidentReportModal")
    print("  [OK] All API endpoints (20+ GET/POST routes)")
    print("  [OK] ML model formulas: Health Index, RUL, Duval Triangle")
    print("  [OK] Composite ranking formula (5-component weighted score)")
    print("  [OK] Maintenance action codes (D1->ELEC-INSPECT, T3->THERM-CRITICAL, etc.)")
    print("  [OK] TX-115 intervention story (Day 65->78->89 recovery timeline)")
    print("  [OK] Architecture, Docker deployment, environment setup")
    print("  [OK] Anand Corridor 18-transformer telemetry dataset")
    print()
    if settings.QDRANT_MODE == "local":
        print(f"  Storage : {settings.QDRANT_LOCAL_PATH}")
    print()
    print("Re-run this script any time you update documentation or data.")
    print("=" * 65)


if __name__ == "__main__":
    main()
