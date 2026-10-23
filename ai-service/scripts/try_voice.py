"""LIVE voice test: sends a real audio file to Gemini through the same code the API uses.

Run from ai-service/:   python scripts/try_voice.py path/to/recording.webm [en|ur]
Supported: .webm .ogg .wav .m4a/.mp4 (max 10 MB, ~30 s). Record one with your phone or the app itself.
"""
import asyncio
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252 and cannot print Urdu

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings  # noqa: E402
from app.errors import AppError  # noqa: E402
from app.services.audio import AudioClip  # noqa: E402
from app.services.gemini_client import GeminiClient  # noqa: E402
from app.services.intake_service import analyse_report  # noqa: E402
from app.services.transcribe_service import transcribe  # noqa: E402

MIME = {".webm": "audio/webm", ".ogg": "audio/ogg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".mp4": "audio/mp4"}


async def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = Path(sys.argv[1])
    lang = sys.argv[2] if len(sys.argv) > 2 else "en"
    mime = MIME.get(path.suffix.lower())
    if not mime:
        sys.exit(f"Unsupported extension {path.suffix}")
    settings = get_settings()
    if not settings.gemini_keys:
        sys.exit("No GEMINI_KEY_A found in ai-service/.env")
    clip = AudioClip(data=path.read_bytes(), mime_type=mime)
    client = GeminiClient(settings)
    try:
        print("=== /transcribe ===")
        print((await transcribe(client, clip, None)).model_dump_json(indent=2))
        print("\n=== /intake (voice) ===")
        print((await analyse_report(client, lang, audio=clip)).model_dump_json(indent=2))
    except AppError as err:
        print(f"ERROR {err.code}: {err.message}")


asyncio.run(main())
