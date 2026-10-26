"""Intake: report text OR one voice clip -> validated IntakeResult. Never saves or scores anything."""
from __future__ import annotations

import logging

from ..errors import AppError
from ..models import IntakeResult, Supply
from ..prompts.intake import (
    INTAKE_SYSTEM_PROMPT,
    intake_audio_prompt,
    intake_user_prompt,
)
from .audio import AudioClip
from .gemini_client import GeminiLike
from .place_aliases import canonical_place
from .structured import generate_validated

log = logging.getLogger("karwan-ai")

UNCLEAR_AUDIO_MESSAGE = "We could not hear a clear report. Please record again or type your report."


def _normalise(result: IntakeResult) -> IntakeResult:
    """Deterministic guard rails so the model cannot sneak in invented facts."""
    if not result.area or not result.area.strip():
        result.area = None
        result.confidence.area = 0.0
    else:
        # Areas are always saved in English letters, so every screen can show them in any language.
        result.area = canonical_place(result.area.strip()) or result.area.strip()
    if result.people is None or result.people < 0:
        result.people = None
        result.peopleIsEstimate = False
        result.confidence.people = 0.0
    if result.urgency is None:
        result.confidence.urgency = 0.0
    if result.access is None:
        result.confidence.access = 0.0
    if not result.vulnerable:
        result.confidence.vulnerable = 0.0
    # merge duplicate supply rows; qty can never be negative
    merged: dict[str, int] = {}
    for supply in result.supplies:
        merged[supply.item] = merged.get(supply.item, 0) + max(0, supply.qty)
    result.supplies = [Supply(item=k, qty=v) for k, v in merged.items()]
    result.vulnerable = list(dict.fromkeys(result.vulnerable))
    result.transcript = (result.transcript or "").strip()
    if not result.supplies:
        result.confidence.supplies = 0.0
    return IntakeResult.model_validate(result.model_dump())


def _is_empty(result: IntakeResult) -> bool:
    return (
        not result.englishText.strip()
        and result.area is None
        and result.people is None
        and not result.supplies
    )


async def analyse_report(
    gemini: GeminiLike,
    ui_language: str,
    *,
    text: str | None = None,
    audio: AudioClip | None = None,
) -> IntakeResult:
    if audio is not None:
        user = intake_audio_prompt(ui_language)
        audio_arg = (audio.data, audio.mime_type)
    else:
        user = intake_user_prompt(text or "", ui_language)
        audio_arg = None

    result = _normalise(
        await generate_validated(
            gemini, system=INTAKE_SYSTEM_PROMPT, user=user, schema=IntakeResult, audio=audio_arg
        )
    )
    if audio is None:
        result.transcript = ""  # the typed text is already on the page
    if audio is not None and _is_empty(result):
        raise AppError("UNSUPPORTED_AUDIO", UNCLEAR_AUDIO_MESSAGE)
    return result


async def analyse_text(gemini: GeminiLike, text: str, ui_language: str) -> IntakeResult:
    """Kept for scripts/try_intake.py."""
    return await analyse_report(gemini, ui_language, text=text)
