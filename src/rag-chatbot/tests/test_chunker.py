import unittest
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from ingestion.chunker import SlidingWindowChunker


class TestChunker(unittest.TestCase):
    def test_chunking_short_text(self):
        chunker = SlidingWindowChunker(chunk_size=100, chunk_overlap=20)
        chunks = chunker.chunk_text("Small operational incident note.", metadata={"source": "log"})
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]["metadata"]["total_chunks"], 1)

    def test_chunking_long_text(self):
        text = " ".join([f"word{i}" for i in range(120)])
        chunker = SlidingWindowChunker(chunk_size=50, chunk_overlap=10)
        chunks = chunker.chunk_text(text)
        self.assertGreater(len(chunks), 1)
        self.assertEqual(chunks[0]["metadata"]["chunk_index"], 0)


if __name__ == "__main__":
    unittest.main()
