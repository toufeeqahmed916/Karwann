"""LIVE chat test: reads your REAL Express API (KARWAN_API_URL) and asks real Gemini.

Run from ai-service/:   python scripts/try_chat.py ["your question"] [en|ur]
With no question it runs a few defaults, including an off-topic one (must be refused).
Generate + approve an allocation in the app first, otherwise the assistant will say none exists.
"""
import asyncio
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252 and cannot print Urdu

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings  # noqa: E402
from app.errors import AppError  # noqa: E402
from app.services.chat_service import answer_question  # noqa: E402
from app.services.gemini_client import GeminiClient  # noqa: E402
from app.services.karwan_api_client import KarwanApiClient  # noqa: E402

DEFAULTS = [
    "Which critical areas remain under-supplied?",
    "Which depot has the most medicine?",
    "Why did Badin receive less water?",
    "What is the capital of France?",
]


async def main() -> None:
    s = get_settings()
    if not s.gemini_keys or not s.karwan_api_url:
        sys.exit("Set GEMINI_KEY_A and KARWAN_API_URL in ai-service/.env first.")
    lang = sys.argv[2] if len(sys.argv) > 2 else "en"
    questions = [sys.argv[1]] if len(sys.argv) > 1 else DEFAULTS
    gemini, karwan = GeminiClient(s), KarwanApiClient(s)
    for q in questions:
        print(f"\nQ: {q}")
        try:
            r = await answer_question(gemini, karwan, question=q, ui_language=lang, request_id="req_manual")
            print(r.model_dump_json(indent=2))
        except AppError as err:
            print(f"ERROR {err.code}: {err.message}")


asyncio.run(main())
