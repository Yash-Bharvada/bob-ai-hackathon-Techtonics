import unittest
from pathlib import Path
import sys

# Ensure rag-chatbot root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from ingestion.loader import load_csv, calculate_deviation_pct, COLUMN_MAP


class TestCSVLoader(unittest.TestCase):
    def setUp(self):
        self.sample_csv = BASE_DIR / "data" / "raw" / "sample_grid_data.csv"

    def test_deviation_calculation(self):
        # Normal
        self.assertAlmostEqual(calculate_deviation_pct(100.0, 100.0), 0.0)
        # Positive deviation
        self.assertAlmostEqual(calculate_deviation_pct(120.0, 100.0), 20.0)
        # Negative deviation
        self.assertAlmostEqual(calculate_deviation_pct(80.0, 100.0), -20.0)
        # Zero expected
        self.assertEqual(calculate_deviation_pct(0.0, 0.0), 0.0)
        self.assertEqual(calculate_deviation_pct(50.0, 0.0), 100.0)

    def test_load_sample_csv(self):
        docs = load_csv(self.sample_csv)
        # In sample data, there are 8 distinct (asset_id, date) pairs:
        # SOL-001: 2026-09-15, 2026-09-16
        # SOL-002: 2026-09-15, 2026-09-16
        # WND-101: 2026-09-15, 2026-09-16
        # WND-102: 2026-09-16, 2026-09-17
        self.assertEqual(len(docs), 8)

        # Check SOL-001 on 2026-09-15 (Underperformance scenario)
        sol1_day1 = next(d for d in docs if d.metadata["asset_id"] == "SOL-001" and d.metadata["date"] == "2026-09-15")
        self.assertEqual(sol1_day1.metadata["actual_kwh"], 4980.0)
        self.assertEqual(sol1_day1.metadata["expected_kwh"], 6750.0)
        self.assertAlmostEqual(sol1_day1.metadata["deviation_pct"], -26.22, places=2)
        self.assertIn("UNDERPERFORMING", sol1_day1.text)
        self.assertIn("Inverter Derating", sol1_day1.metadata["weather"])

        # Check WND-101 on 2026-09-15 (Surge scenario)
        wnd1_day1 = next(d for d in docs if d.metadata["asset_id"] == "WND-101" and d.metadata["date"] == "2026-09-15")
        self.assertEqual(wnd1_day1.metadata["actual_kwh"], 14200.0)
        self.assertEqual(wnd1_day1.metadata["expected_kwh"], 12400.0)
        self.assertAlmostEqual(wnd1_day1.metadata["deviation_pct"], 14.52, places=2)
        self.assertIn("SURGE", wnd1_day1.text)


if __name__ == "__main__":
    unittest.main()
