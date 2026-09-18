import unittest
from pathlib import Path
import sys
from unittest.mock import MagicMock

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from chatbot.prompt_templates import format_context, build_user_prompt, SYSTEM_PROMPT
from chatbot.chain import RAGChatbotChain


class TestPromptAndChain(unittest.TestCase):
    def test_context_formatting(self):
        sample_items = [
            {
                "text": "OPERATIONAL ASSET SUMMARY: SOL-001\nDeviation: -26.22%",
                "score": 0.92,
                "metadata": {"asset_id": "SOL-001", "deviation_pct": -26.22},
            }
        ]
        context_str = format_context(sample_items)
        self.assertIn("SOL-001", context_str)
        self.assertIn("0.920", context_str)

    def test_chain_execution_with_mock_llm(self):
        mock_retriever = MagicMock()
        mock_retriever.retrieve.return_value = [
            {
                "text": "OPERATIONAL ASSET SUMMARY: SOL-001\nSite: Kutch Solar Park\nDate: 2026-09-15\nDeviation: -26.22%",
                "score": 0.95,
                "metadata": {
                    "asset_id": "SOL-001",
                    "site_name": "Kutch Solar Park",
                    "date": "2026-09-15",
                    "actual_kwh": 4980.0,
                    "expected_kwh": 6750.0,
                    "deviation_pct": -26.22,
                },
            }
        ]

        mock_groq = MagicMock()
        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "SOL-001 at Kutch Solar Park underperformed by -26.22% on 2026-09-15 due to inverter derating."
        mock_response.choices = [mock_choice]
        mock_groq.chat.completions.create.return_value = mock_response

        chain = RAGChatbotChain(retriever=mock_retriever, groq_client=mock_groq)
        result = chain.answer_question("Why did SOL-001 underperform?")

        self.assertIn("SOL-001", result["answer"])
        self.assertEqual(len(result["sources"]), 1)
        self.assertEqual(result["sources"][0]["asset_id"], "SOL-001")
        self.assertEqual(result["sources"][0]["deviation_pct"], -26.22)


if __name__ == "__main__":
    unittest.main()
