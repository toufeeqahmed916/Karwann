"""Pydantic models = the frozen Phase 1 contract (camelCase on the wire)."""
from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, StringConstraints

Urgency = Literal["low", "medium", "high", "critical"]
Access = Literal["easy", "medium", "hard"]
Vulnerable = Literal["children", "elderly", "medical"]
SupplyItem = Literal["food", "water", "medicine", "shelter"]
Language = Literal["en", "ur"]


def _clamp01(value):
    """Gemini sometimes returns 85 instead of 0.85, or null. Normalise, never fail."""
    if value is None:
        return 0.0
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    if number > 1.5:  # looks like a percentage (85 -> 0.85)
        number = number / 100 if number <= 100 else 1.0
    return max(0.0, min(1.0, number))


Score01 = Annotated[float, BeforeValidator(_clamp01)]


class Supply(BaseModel):
    item: SupplyItem
    qty: int


class Confidence(BaseModel):
    area: Score01
    people: Score01
    urgency: Score01
    vulnerable: Score01
    supplies: Score01
    access: Score01


class IntakeResult(BaseModel):
    """Also used as Gemini's response schema, so it has no defaults on purpose."""

    area: str | None
    people: int | None
    peopleIsEstimate: bool
    urgency: Urgency | None
    vulnerable: list[Vulnerable]
    supplies: list[Supply]
    access: Access | None
    detectedLanguage: Language
    englishText: str
    confidence: Confidence


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "karwan-ai"


class TranscribeResult(BaseModel):
    text: str
    detectedLanguage: Language


# ---- /chat ----
SourceType = Literal["request", "allocation", "depot", "delivery"]


class ChatRequest(BaseModel):
    question: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
    uiLanguage: Language


class SourceRef(BaseModel):
    type: SourceType
    id: str


class ChatModelOutput(BaseModel):
    """Gemini's response schema for /chat (no defaults on purpose)."""

    inScope: bool
    answer: str
    sourceIds: list[SourceRef]


class ChatResponse(BaseModel):
    inScope: bool
    answer: str
    sources: list[SourceRef]


# ---- error envelope (documentation only; never sent to Gemini) ----
class ErrorBody(BaseModel):
    code: str
    message: str
    retryable: bool
    details: object | None = None


class ErrorEnvelope(BaseModel):
    error: ErrorBody
    requestId: str


# ---- /site-chat (public website guide) ----
class SiteChatOutput(BaseModel):
    """Gemini's response schema for /site-chat."""

    inScope: bool
    answer: str


class SiteChatResponse(BaseModel):
    inScope: bool
    answer: str
