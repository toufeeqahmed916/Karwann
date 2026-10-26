from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from ..models import TranslateRequest, TranslateResult
from ..openapi_examples import errors, ok
from ..services.gemini_client import GeminiLike
from ..services.translate_service import translate
from .intake import get_gemini

router = APIRouter()

_EXAMPLE = {"text": "بدين کي 350 يونٽ پاڻي گهربل هو ۽ 320 يونٽ مليا."}


@router.post(
    "/translate",
    response_model=TranslateResult,
    summary="Translate a short text between English, Urdu and Sindhi",
    responses={**ok(_EXAMPLE), **errors("VALIDATION_ERROR", "AI_QUOTA_EXCEEDED", "AI_INVALID_OUTPUT", "AI_UNAVAILABLE", "AI_TIMEOUT")},
)
async def translate_text(body: TranslateRequest, gemini: Annotated[GeminiLike, Depends(get_gemini)]) -> TranslateResult:
    return TranslateResult(text=await translate(gemini, body.text, body.targetLanguage))
