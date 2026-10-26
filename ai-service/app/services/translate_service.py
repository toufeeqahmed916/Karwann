"""Translate a short text into English, Urdu or Sindhi. Used when a person switches language after an answer is on screen."""
from __future__ import annotations

from collections import OrderedDict

from ..errors import AppError
from ..models import TranslateResult
from ..prompts.translate import TRANSLATE_SYSTEM_PROMPT, translate_user_prompt
from .gemini_client import GeminiLike
from .structured import generate_validated
from .text_clean import strip_stray_scripts

_CACHE_MAX = 128
_cache: OrderedDict[tuple[str, str], str] = OrderedDict()  # switching back and forth costs no extra quota


async def translate(gemini: GeminiLike, text: str, target_language: str) -> str:
    cleaned = text.strip()
    key = (target_language, cleaned)
    if key in _cache:
        _cache.move_to_end(key)
        return _cache[key]
    result = await generate_validated(
        gemini,
        system=TRANSLATE_SYSTEM_PROMPT,
        user=translate_user_prompt(cleaned, target_language),
        schema=TranslateResult,
    )
    translated = strip_stray_scripts(result.text).strip()
    if not translated:
        raise AppError("AI_INVALID_OUTPUT")
    _cache[key] = translated
    while len(_cache) > _CACHE_MAX:
        _cache.popitem(last=False)
    return translated


def clear_cache() -> None:
    _cache.clear()
