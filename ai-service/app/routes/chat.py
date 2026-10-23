from __future__ import annotations

import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, Request

from ..config import Settings, get_settings
from ..errors import AppError, request_id_of
from ..models import ChatRequest, ChatResponse
from ..openapi_examples import CHAT_EXAMPLE, CHAT_REFUSAL_EXAMPLE, errors, ok
from ..services.chat_service import answer_question
from ..services.gemini_client import GeminiLike
from ..services.karwan_api_client import KarwanApiClient, KarwanLike
from .intake import get_gemini

router = APIRouter()

_karwan: KarwanApiClient | None = None


def get_karwan(settings: Annotated[Settings, Depends(get_settings)]) -> KarwanLike:
    global _karwan
    if _karwan is None:
        _karwan = KarwanApiClient(settings)
    return _karwan


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Explain live Karwan data (read-only; fixed refusal when off-topic)",
    responses={
        200: {"description": "In-scope answer, or the fixed refusal with inScope=false",
              "content": {"application/json": {"examples": {
                  "inScope": {"value": CHAT_EXAMPLE}, "refusal": {"value": CHAT_REFUSAL_EXAMPLE}}}}},
        **errors("VALIDATION_ERROR", "AI_QUOTA_EXCEEDED", "AI_INVALID_OUTPUT",
                 "AI_UNAVAILABLE", "KARWAN_API_UNAVAILABLE", "AI_TIMEOUT"),
    },
)
async def chat(
    body: ChatRequest,
    request: Request,
    gemini: Annotated[GeminiLike, Depends(get_gemini)],
    karwan: Annotated[KarwanLike, Depends(get_karwan)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ChatResponse:
    try:
        # 20 s total server budget for the whole question.
        return await asyncio.wait_for(
            answer_question(gemini, karwan, question=body.question, ui_language=body.uiLanguage,
                            request_id=request_id_of(request)),
            timeout=settings.request_timeout_seconds,
        )
    except asyncio.TimeoutError:
        raise AppError("AI_TIMEOUT") from None
