"""One shared 'ask Gemini for JSON, validate with Pydantic, repair at most once' helper."""
from __future__ import annotations

import logging
from typing import TypeVar

from pydantic import BaseModel, ValidationError

from ..errors import AppError
from ..prompts.intake import repair_prompt
from .gemini_client import GeminiLike

log = logging.getLogger("karwan-ai")
M = TypeVar("M", bound=BaseModel)


async def generate_validated(
    gemini: GeminiLike,
    *,
    system: str,
    user: str,
    schema: type[M],
    audio: tuple[bytes, str] | None = None,
) -> M:
    last_error = ""
    for attempt in (1, 2):  # first try + at most ONE repair retry
        prompt = user if attempt == 1 else f"{user}\n\n{repair_prompt(last_error)}"
        raw = await gemini.generate_json(system=system, user=prompt, schema=schema, audio=audio)
        try:
            return schema.model_validate_json(raw)
        except (ValidationError, ValueError) as exc:
            last_error = type(exc).__name__
            log.warning("%s output invalid on attempt %d (%s)", schema.__name__, attempt, last_error)
    raise AppError("AI_INVALID_OUTPUT")
