"""Public website guide bot: static knowledge only. No Karwan data is read, so nothing private can leak."""
from __future__ import annotations

from ..models import SiteChatOutput, SiteChatResponse
from ..prompts.site_help import SITE_REFUSAL, SITE_REFUSALS, SITE_SYSTEM_PROMPT, site_user_prompt
from .gemini_client import GeminiLike
from .structured import generate_validated
from .text_clean import strip_stray_scripts


async def answer_site_question(gemini: GeminiLike, *, question: str, ui_language: str) -> SiteChatResponse:
    out = await generate_validated(
        gemini,
        system=SITE_SYSTEM_PROMPT,
        user=site_user_prompt(question, ui_language),
        schema=SiteChatOutput,
    )
    if not out.inScope or not out.answer.strip():
        return SiteChatResponse(inScope=False, answer=SITE_REFUSALS.get(ui_language, SITE_REFUSAL))  # fixed wording, never the model's
    return SiteChatResponse(inScope=True, answer=strip_stray_scripts(out.answer).strip())
