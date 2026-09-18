import sys
from pathlib import Path

# Add base dir to path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Ensure utf-8 output in Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from chatbot.chain import RAGChatbotChain


def main():
    print("=" * 70)
    print("  GRID LOAD & RENEWABLE ADVISOR - INTERACTIVE RAG CHATBOT")
    print("=" * 70)
    print("Type your operational question and press Enter.")
    print("Type 'exit' or 'quit' to end the session.\n")

    try:
        chain = RAGChatbotChain()
    except Exception as e:
        print(f"[Error initializing chatbot]: {e}")
        return

    while True:
        try:
            user_input = input("\nOperator >> ").strip()
            if not user_input:
                continue
            if user_input.lower() in ("exit", "quit", "q"):
                print("\nExiting session. Operational advisor offline.")
                break

            print("\n[Searching telemetry & generating evidence-grounded response...]\n")
            result = chain.answer_question(user_input)

            print("-" * 70)
            print("ADVISOR RESPONSE:")
            print(result["answer"])
            print("-" * 70)

            sources = result.get("sources", [])
            if sources:
                print(f"EVIDENCE SOURCES ({len(sources)} records retrieved):")
                for idx, src in enumerate(sources, 1):
                    asset = src.get("asset_id", "N/A")
                    site = src.get("site_name", "N/A")
                    date = src.get("date", "N/A")
                    dev = src.get("deviation_pct", "N/A")
                    score = src.get("relevance_score", 0.0)
                    print(f"  [{idx}] Asset: {asset} ({site}) | Date: {date} | Deviation: {dev}% | Score: {score:.3f}")
            print()

        except KeyboardInterrupt:
            print("\nSession interrupted. Exiting.")
            break
        except Exception as e:
            print(f"[Error processing inquiry]: {e}")


if __name__ == "__main__":
    main()
