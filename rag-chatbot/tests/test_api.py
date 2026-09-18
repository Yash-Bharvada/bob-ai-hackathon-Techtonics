import unittest
from pathlib import Path
import sys
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from api.main import app


class TestAPIEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        """GET /health should return 200 and {'status': 'ok'}"""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_docs_endpoints(self):
        """Swagger documentation /docs and /openapi.json should be accessible"""
        docs_res = self.client.get("/docs")
        self.assertEqual(docs_res.status_code, 200)
        openapi_res = self.client.get("/openapi.json")
        self.assertEqual(openapi_res.status_code, 200)
        self.assertIn("Grid Load & Renewable Energy Advisor", openapi_res.json()["info"]["title"])

    def test_chat_empty_message(self):
        """POST /chat with empty message should return 422 Unprocessable Entity"""
        response = self.client.post("/chat", json={"message": ""})
        self.assertEqual(response.status_code, 422)

    def test_chat_whitespace_only(self):
        """POST /chat with whitespace-only message should return 422 Unprocessable Entity"""
        response = self.client.post("/chat", json={"message": "    "})
        self.assertEqual(response.status_code, 422)

    def test_chat_missing_field(self):
        """POST /chat with missing message field should return 422"""
        response = self.client.post("/chat", json={})
        self.assertEqual(response.status_code, 422)

    @patch("api.main.chain_instance")
    def test_chat_endpoint_success(self, mock_chain):
        """POST /chat returns correct answer and structured sources"""
        mock_chain.answer_question.return_value = {
            "answer": "SOL-001 at Kutch Solar Park underperformed on 2026-09-15 with a -26.22% deviation due to cloud cover.",
            "sources": [
                {
                    "asset_id": "SOL-001",
                    "asset_type": "Solar",
                    "site_name": "Kutch Solar Park",
                    "date": "2026-09-15",
                    "actual_kwh": 4980.0,
                    "expected_kwh": 6750.0,
                    "deviation_pct": -26.22,
                    "relevance_score": 0.9421,
                }
            ],
        }

        response = self.client.post(
            "/chat",
            json={"message": "Why is SOL-001 underperforming?"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("answer", data)
        self.assertIn("sources", data)
        self.assertIn("SOL-001", data["answer"])
        self.assertEqual(len(data["sources"]), 1)
        self.assertEqual(data["sources"][0]["asset_id"], "SOL-001")
        self.assertEqual(data["sources"][0]["site_name"], "Kutch Solar Park")


if __name__ == "__main__":
    unittest.main()
