"""
project_loader.py — Crawl and chunk VOLTRA/BOB project knowledge files.

Produces ProjectDocument objects (analogous to OperationalDocument) stamped
with knowledge_type="project" so they can coexist with operational telemetry
in the same Qdrant collection and be retrieved via metadata filtering.

SAFETY RULES (never index):
  - .env / *.env / .env.example files
  - node_modules/, .git/, .venv/, __pycache__/
  - *.pkl, *.csv (raw data/models), *.ipynb
  - Any file explicitly excluded in EXCLUDED_GLOBS
"""

import sys
from pathlib import Path
from typing import List, Dict, Any, Optional

BASE_DIR = Path(__file__).resolve().parent.parent  # rag-chatbot/
REPO_ROOT = BASE_DIR.parent                        # d:/IBM BOB/

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from ingestion.chunker import SlidingWindowChunker

# ==============================================================================
# SAFE FILES TO INDEX (relative to repo root)
# Only high-signal, secret-free project knowledge files.
# ==============================================================================
PROJECT_KNOWLEDGE_FILES: List[str] = [
    # Root docs
    "README.md",
    # Official documentation — website, architecture, API, problem, solution, setup
    "docs/website-guide.md",
    "docs/architecture.md",
    "docs/api-reference.md",
    "docs/problem-statement.md",
    "docs/solution-overview.md",
    "docs/setup-guide.md",
    # Model formulas & specs (generated markdown mirror from VOLTRA_MODEL_FORMULAS_AND_SPECS.docx)
    "docs/voltra_formulas_and_specs.md",
    # Pipeline source files (docstrings, formulas, ranking logic)
    "src/pipeline/grid_impact_ranker.py",
    "src/pipeline/score_asset_risk.py",
    "src/pipeline/maintenance_plan.py",
    # RAG chatbot documentation
    "rag-chatbot/README.md",
    # Backend source (docstrings and endpoints -- no secrets)
    "src/backend/main.py",
    # Requirements
    "src/requirements.txt",
    "rag-chatbot/requirements.txt",
]

# DOCX files are loaded separately via _load_docx_file() below.
# Add .docx paths here (relative to repo root) to index them.
PROJECT_DOCX_FILES: List[str] = [
    "VOLTRA_MODEL_FORMULAS_AND_SPECS.docx",
]

# ==============================================================================
# EXCLUDED DIRECTORIES / PATTERNS (safety net)
# ==============================================================================
EXCLUDED_DIR_NAMES = {
    "node_modules", ".git", ".venv", "__pycache__",
    ".next", "dist", "build", ".turbo", ".cache",
    "qdrant_storage", "processed",
}

EXCLUDED_EXTENSIONS = {
    ".pkl", ".bin", ".model", ".csv", ".ipynb",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
    ".pdf", ".zip", ".tar", ".gz",
    ".lock",  # package-lock.json / yarn.lock / uv.lock
}

EXCLUDED_FILENAMES = {
    ".env", ".env.example", ".env.local", ".env.production",
    ".gitignore", ".dockerignore",
}


class ProjectDocument:
    """A single chunk of project knowledge ready to embed and store in Qdrant."""

    def __init__(self, text: str, metadata: Dict[str, Any], doc_id: str):
        self.text = text
        self.metadata = metadata
        self.doc_id = doc_id

    def __repr__(self) -> str:
        return (
            f"<ProjectDocument id={self.doc_id!r} "
            f"source={self.metadata.get('source_file')!r} "
            f"chunk={self.metadata.get('chunk_index')}>"
        )


def _is_safe_file(path: Path) -> bool:
    """Return True if this file is safe to index (not a secret or binary)."""
    # Reject by filename
    if path.name in EXCLUDED_FILENAMES:
        return False
    # Reject by extension
    if path.suffix.lower() in EXCLUDED_EXTENSIONS:
        return False
    # Reject if any ancestor directory is excluded
    for part in path.parts:
        if part in EXCLUDED_DIR_NAMES:
            return False
    return True


def _detect_section(text: str) -> str:
    """
    Extract the nearest markdown heading from the chunk text as a section label.
    Falls back to empty string if no heading is found.
    """
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            return stripped.lstrip("#").strip()
    return ""


def _infer_doc_type(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in (".md", ".markdown"):
        return "markdown"
    if ext == ".py":
        return "python"
    if ext in (".txt", ".rst"):
        return "text"
    if ext == ".docx":
        return "docx"
    return "text"


def _load_docx_text(path: Path) -> Optional[str]:
    """
    Extract plain text from a .docx file using python-docx.
    Returns None if python-docx is not installed or the file cannot be read.
    """
    try:
        from docx import Document  # type: ignore
        doc = Document(str(path))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        # Also extract text from tables
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    paragraphs.append(row_text)
        return "\n\n".join(paragraphs) if paragraphs else None
    except ImportError:
        print("  [WARN] python-docx not installed. Install with: pip install python-docx")
        return None
    except Exception as e:
        print(f"  [WARN] Could not read DOCX {path.name}: {e}")
        return None


def load_project_documents(
    repo_root: Optional[Path] = None,
    chunk_size: int = 300,
    chunk_overlap: int = 60,
) -> List[ProjectDocument]:
    """
    Load and chunk all safe project knowledge files into ProjectDocument objects.

    Args:
        repo_root: Root of the repository. Defaults to the parent of rag-chatbot/.
        chunk_size: Word-level chunk size for SlidingWindowChunker.
        chunk_overlap: Word-level overlap for SlidingWindowChunker.

    Returns:
        List of ProjectDocument objects ready for embedding and upsert.
    """
    root = repo_root or REPO_ROOT
    chunker = SlidingWindowChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    documents: List[ProjectDocument] = []

    # ── 1. Text / Markdown / Python files ────────────────────────────────────
    for rel_path_str in PROJECT_KNOWLEDGE_FILES:
        file_path = root / rel_path_str
        if not file_path.exists():
            print(f"  [SKIP] Not found: {rel_path_str}")
            continue
        if not _is_safe_file(file_path):
            print(f"  [SKIP] Excluded by safety rules: {rel_path_str}")
            continue

        try:
            text = file_path.read_text(encoding="utf-8", errors="ignore").strip()
        except Exception as e:
            print(f"  [SKIP] Could not read {rel_path_str}: {e}")
            continue

        if not text:
            print(f"  [SKIP] Empty file: {rel_path_str}")
            continue

        doc_type = _infer_doc_type(file_path)
        # Use a relative path from repo root for clean display
        rel_display = str(file_path.relative_to(root)).replace("\\", "/")

        base_metadata: Dict[str, Any] = {
            "knowledge_type": "project",
            "source_file": rel_display,
            "doc_type": doc_type,
        }

        chunks = chunker.chunk_text(text, metadata=base_metadata)

        for chunk in chunks:
            chunk_text = chunk["text"]
            chunk_meta = dict(chunk["metadata"])
            # Detect nearest heading for context
            section = _detect_section(chunk_text)
            if section:
                chunk_meta["section"] = section

            chunk_idx = chunk_meta.get("chunk_index", 0)
            # Deterministic ID: proj_{relative_path}_{chunk_index}
            safe_name = rel_display.replace("/", "_").replace(".", "_")
            doc_id = f"proj_{safe_name}_c{chunk_idx}"

            documents.append(
                ProjectDocument(
                    text=chunk_text,
                    metadata=chunk_meta,
                    doc_id=doc_id,
                )
            )

        print(f"  [OK] {rel_display} -> {len(chunks)} chunk(s)")

    # ── 2. DOCX files (python-docx extraction) ────────────────────────────────
    for rel_path_str in PROJECT_DOCX_FILES:
        file_path = root / rel_path_str
        if not file_path.exists():
            print(f"  [SKIP] DOCX not found: {rel_path_str}")
            continue

        rel_display = str(file_path.relative_to(root)).replace("\\", "/")
        text = _load_docx_text(file_path)

        if not text:
            print(f"  [SKIP] DOCX empty or unreadable: {rel_path_str}")
            continue

        base_metadata: Dict[str, Any] = {
            "knowledge_type": "project",
            "source_file": rel_display,
            "doc_type": "docx",
        }

        chunks = chunker.chunk_text(text, metadata=base_metadata)

        for chunk in chunks:
            chunk_text = chunk["text"]
            chunk_meta = dict(chunk["metadata"])
            section = _detect_section(chunk_text)
            if section:
                chunk_meta["section"] = section

            chunk_idx = chunk_meta.get("chunk_index", 0)
            safe_name = rel_display.replace("/", "_").replace(".", "_")
            doc_id = f"proj_{safe_name}_c{chunk_idx}"

            documents.append(
                ProjectDocument(
                    text=chunk_text,
                    metadata=chunk_meta,
                    doc_id=doc_id,
                )
            )

        print(f"  [OK] {rel_display} (DOCX) -> {len(chunks)} chunk(s)")

    return documents


if __name__ == "__main__":
    print("=" * 60)
    print("PROJECT KNOWLEDGE LOADER -- Self Test")
    print("=" * 60)
    docs = load_project_documents()
    print(f"\nTotal project chunks: {len(docs)}")
    for d in docs[:5]:
        print(f"\n  {d}")
        print(f"  Text preview: {d.text[:120].strip()!r}")
        print(f"  Metadata: {d.metadata}")
