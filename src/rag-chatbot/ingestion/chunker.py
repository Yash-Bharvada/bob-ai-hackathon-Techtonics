from typing import List, Dict, Any


class SlidingWindowChunker:
    """
    A lightweight sliding-window text chunker for unstructured documents
    (e.g., maintenance reports, grid incident post-mortems, operator logbooks).
    """

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 100):
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be strictly less than chunk_size")
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.step_size = chunk_size - chunk_overlap

    def chunk_text(self, text: str, metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Splits text into overlapping chunks and attaches metadata with chunk indices.
        """
        if not text or not text.strip():
            return []

        clean_text = text.strip()
        words = clean_text.split()
        if not words:
            return []

        base_meta = metadata or {}
        chunks = []

        # If total word count is smaller than chunk size, return single chunk
        if len(words) <= self.chunk_size:
            return [{
                "text": clean_text,
                "metadata": {**base_meta, "chunk_index": 0, "total_chunks": 1}
            }]

        start_idx = 0
        chunk_idx = 0
        while start_idx < len(words):
            end_idx = min(start_idx + self.chunk_size, len(words))
            chunk_words = words[start_idx:end_idx]
            chunk_content = " ".join(chunk_words)

            chunks.append({
                "text": chunk_content,
                "metadata": {**base_meta, "chunk_index": chunk_idx}
            })

            if end_idx == len(words):
                break
            start_idx += self.step_size
            chunk_idx += 1

        total = len(chunks)
        for c in chunks:
            c["metadata"]["total_chunks"] = total

        return chunks
