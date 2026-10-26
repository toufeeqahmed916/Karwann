from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from ..errors import AppError
from ..models import SpeakRequest
from ..openapi_examples import errors
from ..services.gemini_client import GeminiLike
from ..services.speech_service import clean_for_speech, speak
from .intake import get_gemini

router = APIRouter()


@router.post(
    "/speak",
    summary="Read text aloud in English, Urdu or Sindhi (returns a WAV recording)",
    response_class=Response,
    responses={
        200: {"description": "audio/wav, 24 kHz mono", "content": {"audio/wav": {}}},
        **errors("VALIDATION_ERROR", "AI_QUOTA_EXCEEDED", "AI_UNAVAILABLE", "AI_TIMEOUT"),
    },
)
async def speak_text(body: SpeakRequest, gemini: Annotated[GeminiLike, Depends(get_gemini)]) -> Response:
    if not clean_for_speech(body.text):
        raise AppError("VALIDATION_ERROR", "There is nothing to read aloud.")
    audio = await speak(gemini, body.text, body.language)
    return Response(content=audio, media_type="audio/wav", headers={"Cache-Control": "private, max-age=3600"})
