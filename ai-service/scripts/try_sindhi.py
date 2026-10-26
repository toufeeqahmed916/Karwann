"""Try Sindhi (and Urdu) end to end with the REAL Gemini key from .env: understand text, answer a help question,
speak Sindhi and Urdu out loud, then listen to the Sindhi recording again (speech to text round trip).

Run from ai-service/:  .venv/Scripts/python scripts/try_sindhi.py
Writes the spoken files to your temp folder so you can play them and judge the pronunciation yourself.
"""
import asyncio
import io
import sys
import tempfile
import wave
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252 and cannot print Sindhi
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.services.audio import AudioClip  # noqa: E402
from app.services.gemini_client import GeminiClient  # noqa: E402
from app.services.intake_service import analyse_report  # noqa: E402
from app.services.site_chat_service import answer_site_question  # noqa: E402
from app.services.speech_service import speak  # noqa: E402
from app.services.transcribe_service import transcribe  # noqa: E402

SINDHI_REPORT = "دادو جي ڀرسان اٽڪل 40 گهر ٻوڏ ۾ آهن. ٻار ۽ بيمار ماڻهو آهن ۽ رستا بند آهن. اسان کي پاڻي ۽ دوائون گهرجن."
SINDHI_QUESTION = "مان مدد جي درخواست ڪيئن موڪليان؟"
SINDHI_ANSWER = "بدين کي 500 يونٽ پاڻي گهربل هو ۽ 320 يونٽ مليا. اسٽاڪ گهٽ هو، تنهنڪري ترجيحي اسڪور مطابق ورهايو ويو."
URDU_ANSWER = "بدین کو 500 یونٹ پانی درکار تھا اور 320 یونٹ ملے۔ ذخیرہ کم تھا، اس لیے ترجیحی اسکور کے مطابق تقسیم کیا گیا۔"


def wav_seconds(data: bytes) -> float:
    with wave.open(io.BytesIO(data)) as w:
        return w.getnframes() / w.getframerate()


async def main() -> None:
    gemini = GeminiClient(get_settings())
    out = Path(tempfile.gettempdir())

    print("1) Sindhi report -> fields")
    result = await analyse_report(gemini, "sd", text=SINDHI_REPORT)
    print("  ", result.model_dump())

    print("2) Help question in Sindhi -> Sindhi answer")
    answer = await answer_site_question(gemini, question=SINDHI_QUESTION, ui_language="sd")
    print("  ", answer.model_dump())

    print("3) Speak Sindhi and Urdu")
    sindhi_wav = await speak(gemini, SINDHI_ANSWER, "sd")
    urdu_wav = await speak(gemini, URDU_ANSWER, "ur")
    (out / "karwan_sindhi.wav").write_bytes(sindhi_wav)
    (out / "karwan_urdu.wav").write_bytes(urdu_wav)
    print(f"   Sindhi {wav_seconds(sindhi_wav):.1f}s, Urdu {wav_seconds(urdu_wav):.1f}s -> {out}")

    print("4) Listen to the Sindhi recording again (speech to text)")
    heard = await transcribe(gemini, AudioClip(data=sindhi_wav, mime_type="audio/wav"), "sd")
    print("  ", heard.model_dump())
    print("   spoken text :", SINDHI_ANSWER)


asyncio.run(main())
