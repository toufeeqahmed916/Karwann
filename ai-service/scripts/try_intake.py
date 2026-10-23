"""LIVE smoke test: calls real Gemini with your key from .env.

Run from ai-service/:   python scripts/try_intake.py
It prints the structured result for a few English/Urdu/vague reports.
"""
import asyncio
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252 and cannot print Urdu

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings  # noqa: E402
from app.errors import AppError  # noqa: E402
from app.services.gemini_client import GeminiClient  # noqa: E402
from app.services.intake_service import analyse_text  # noqa: E402

REPORTS = [
    ("EN full", "en", "About 40 houses near Dadu are flooded. Roads are cut off. Around 240 people, many children and two sick elders. We need 500 litres of water and medicine urgently."),
    ("UR script", "ur", "دادو کے قریب تقریباً چالیس گھر زیر آب ہیں۔ بچے اور بزرگ پھنسے ہوئے ہیں، پینے کا پانی اور دوائیں چاہئیں۔ راستے بند ہیں۔"),
    ("Roman Urdu", "ur", "Badin mein paani aa gaya hai, 150 log hain, khana aur shelter chahiye, sadak theek hai."),
    ("VAGUE (must stay empty)", "en", "Please help us, it is very bad here."),
]


async def main() -> None:
    settings = get_settings()
    if not settings.gemini_keys:
        sys.exit("No GEMINI_KEY_A found. Create ai-service/.env first (see .env.example).")
    print(f"Model: {settings.gemini_model} | keys loaded: {len(settings.gemini_keys)}\n")
    client = GeminiClient(settings)
    for label, lang, text in REPORTS:
        print(f"=== {label} ===")
        try:
            result = await analyse_text(client, text, lang)
            print(result.model_dump_json(indent=2))
        except AppError as err:
            print(f"ERROR {err.code}: {err.message}")
        print()


asyncio.run(main())
