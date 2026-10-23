from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile

from ..errors import AppError
from ..models import Language, TranscribeResult
from ..openapi_examples import TRANSCRIBE_EXAMPLE, errors, ok
from ..services.audio import read_audio
from ..services.gemini_client import GeminiLike
from ..services.transcribe_service import transcribe
from .intake import get_gemini

router = APIRouter()


@router.post(
    "/transcribe",
    response_model=TranscribeResult,
    summary="Short audio to text and detected language",
    responses={**ok(TRANSCRIBE_EXAMPLE), **errors("VALIDATION_ERROR", "AUDIO_TOO_LARGE", "UNSUPPORTED_AUDIO", "AI_QUOTA_EXCEEDED",
                 "AI_INVALID_OUTPUT", "AI_UNAVAILABLE", "AI_TIMEOUT")},
)
async def transcribe_audio(
    gemini: Annotated[GeminiLike, Depends(get_gemini)],
    audio: Annotated[UploadFile | None, File()] = None,
    target_language: Annotated[Language | None, Form()] = None,
) -> TranscribeResult:
    if audio is None or not audio.filename:
        raise AppError("VALIDATION_ERROR", "Attach a short audio recording.")
    clip = await read_audio(audio)
    return await transcribe(gemini, clip, target_language)
