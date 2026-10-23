from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from ..models import ChatRequest, SiteChatResponse
from ..openapi_examples import errors
from ..services.gemini_client import GeminiLike
from ..services.site_chat_service import answer_site_question
from .intake import get_gemini

router = APIRouter()

_EXAMPLES = {
    "inScope": {"value": {"inScope": True, "answer": "Open New request, describe the situation, check the form, drop a pin on the map and press Confirm request."}},
    "refusal": {"value": {"inScope": False, "answer": "I can only answer questions about how to use the Karwan website."}},
}


@router.post(
    "/site-chat",
    response_model=SiteChatResponse,
    summary="Public help bot: how to use the Karwan website (no live data)",
    responses={
        200: {"description": "Answer, or the fixed refusal with inScope=false",
              "content": {"application/json": {"examples": _EXAMPLES}}},
        **errors("VALIDATION_ERROR", "AI_QUOTA_EXCEEDED", "AI_INVALID_OUTPUT", "AI_UNAVAILABLE", "AI_TIMEOUT"),
    },
)
async def site_chat(body: ChatRequest, gemini: Annotated[GeminiLike, Depends(get_gemini)]) -> SiteChatResponse:
    return await answer_site_question(gemini, question=body.question, ui_language=body.uiLanguage)
