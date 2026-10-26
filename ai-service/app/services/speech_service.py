"""Text to speech: read an answer aloud in English, Urdu or Sindhi (Gemini TTS)."""
from __future__ import annotations

import re
from collections import OrderedDict

from .gemini_client import GeminiLike

_CACHE_MAX = 64
_cache: OrderedDict[tuple[str, str], bytes] = OrderedDict()  # repeat plays and demo replays cost no quota


def clean_for_speech(text: str) -> str:
    """Remove markdown marks and extra whitespace so they are not read out loud."""
    text = re.sub(r"[*_`#>]+", "", text)
    return re.sub(r"\s+", " ", text).strip()


async def speak(gemini: GeminiLike, text: str, language: str) -> bytes:
    cleaned = clean_for_speech(text)
    key = (language, cleaned)
    if key in _cache:
        _cache.move_to_end(key)
        return _cache[key]
    audio = await gemini.generate_speech(text=cleaned)
    _cache[key] = audio
    while len(_cache) > _CACHE_MAX:
        _cache.popitem(last=False)
    return audio


def clear_cache() -> None:
    _cache.clear()
