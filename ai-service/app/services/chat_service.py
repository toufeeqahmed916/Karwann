"""Scoped assistant: live Karwan facts + Gemini explanation. Read-only, decides nothing."""
from __future__ import annotations

from ..models import ChatModelOutput, ChatResponse
from ..prompts.chat import CHAT_SYSTEM_PROMPT, FIXED_REFUSAL, chat_user_prompt
from .chat_context import build_context
from .gemini_client import GeminiLike
from .karwan_api_client import KarwanLike
from .structured import generate_validated

MAX_SOURCES = 6


def refusal() -> ChatResponse:
    return ChatResponse(inScope=False, answer=FIXED_REFUSAL, sources=[])


async def answer_question(
    gemini: GeminiLike, karwan: KarwanLike, *, question: str, ui_language: str, request_id: str
) -> ChatResponse:
    # Fail with KARWAN_API_UNAVAILABLE rather than letting Gemini guess without facts.
    data = await karwan.fetch_context(request_id)
    data_json, known = build_context(data, question)

    out = await generate_validated(
        gemini,
        system=CHAT_SYSTEM_PROMPT,
        user=chat_user_prompt(question, ui_language, data_json),
        schema=ChatModelOutput,
    )
    if not out.inScope or not out.answer.strip():
        return refusal()  # the exact fixed refusal, never the model's wording

    seen: set[tuple[str, str]] = set()
    sources = []
    for ref in out.sourceIds:
        key = (ref.type, ref.id)
        if key in known and key not in seen:  # drop ids the model made up
            seen.add(key)
            sources.append(ref)
    return ChatResponse(inScope=True, answer=out.answer.strip(), sources=sources[:MAX_SOURCES])
