"""Short audio -> text + detected language (used for assistant voice questions)."""
from __future__ import annotations

from ..errors import AppError
from ..models import TranscribeResult
from ..prompts.transcribe import TRANSCRIBE_SYSTEM_PROMPT, transcribe_user_prompt
from .audio import AudioClip
from .gemini_client import GeminiLike
from .intake_service import UNCLEAR_AUDIO_MESSAGE
from .structured import generate_validated


async def transcribe(gemini: GeminiLike, audio: AudioClip, target_language: str | None) -> TranscribeResult:
    result = await generate_validated(
        gemini,
        system=TRANSCRIBE_SYSTEM_PROMPT,
        user=transcribe_user_prompt(target_language),
        schema=TranscribeResult,
        audio=(audio.data, audio.mime_type),
    )
    result.text = result.text.strip()
    if not result.text:
        raise AppError("UNSUPPORTED_AUDIO", UNCLEAR_AUDIO_MESSAGE)
    return result
