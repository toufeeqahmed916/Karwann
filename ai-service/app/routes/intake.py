from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile

from ..config import Settings, get_settings
from ..errors import AppError
from ..models import IntakeResult, Language
from ..openapi_examples import INTAKE_EXAMPLE, errors, ok
from ..services.audio import read_audio
from ..services.gemini_client import GeminiClient, GeminiLike
from ..services.intake_service import analyse_report

router = APIRouter()

MAX_TEXT_CHARS = 5000

_client: GeminiClient | None = None


def get_gemini(settings: Annotated[Settings, Depends(get_settings)]) -> GeminiLike:
    global _client
    if _client is None:
        _client = GeminiClient(settings)
    return _client


@router.post(
    "/intake",
    response_model=IntakeResult,
    summary="Analyse a text or voice report (does not save anything)",
    responses={**ok(INTAKE_EXAMPLE), **errors("VALIDATION_ERROR", "AUDIO_TOO_LARGE", "UNSUPPORTED_AUDIO", "AI_QUOTA_EXCEEDED",
                 "AI_INVALID_OUTPUT", "AI_UNAVAILABLE", "AI_TIMEOUT")},
)
async def intake(
    ui_language: Annotated[Language, Form()],
    gemini: Annotated[GeminiLike, Depends(get_gemini)],
    text: Annotated[str | None, Form()] = None,
    audio: Annotated[UploadFile | None, File()] = None,
) -> IntakeResult:
    text = (text or "").strip() or None
    has_audio = audio is not None and bool(audio.filename)

    if bool(text) == has_audio:  # both or neither
        raise AppError("VALIDATION_ERROR", "Send exactly one of text or audio.")

    if has_audio:
        clip = await read_audio(audio)
        return await analyse_report(gemini, ui_language, audio=clip)

    if len(text) > MAX_TEXT_CHARS:
        raise AppError("VALIDATION_ERROR", f"The report is too long (maximum {MAX_TEXT_CHARS} characters).")
    return await analyse_report(gemini, ui_language, text=text)
