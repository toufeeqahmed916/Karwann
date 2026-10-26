"""OpenAPI examples shown in /docs and exported to docs/openapi.json (hand-off for the frontend)."""
from __future__ import annotations

from typing import Any

from .errors import ERROR_TABLE
from .models import ErrorEnvelope

INTAKE_EXAMPLE = {
    "area": "Dadu", "people": 240, "peopleIsEstimate": True, "urgency": "high",
    "vulnerable": ["children", "medical"], "supplies": [{"item": "water", "qty": 500}], "access": "hard",
    "detectedLanguage": "ur", "englishText": "About forty houses near Dadu are flooded.", "transcript": "",
    "confidence": {"area": 0.95, "people": 0.65, "urgency": 0.8, "vulnerable": 0.9, "supplies": 0.4, "access": 0.3},
}
TRANSCRIBE_EXAMPLE = {"text": "Dadu needs water and medicine.", "detectedLanguage": "ur"}
CHAT_EXAMPLE = {
    "inScope": True,
    "answer": "Badin needed 500 units of water and received 320. Available stock was limited, so it was shared according to priority score and remaining need.",
    "sources": [{"type": "allocation", "id": "alc_123"}],
}
CHAT_REFUSAL_EXAMPLE = {
    "inScope": False,
    "answer": "I can only answer questions about Karwan's requests, stock, allocations, and deliveries.",
    "sources": [],
}


def ok(example: Any, description: str = "Success") -> dict:
    return {200: {"description": description, "content": {"application/json": {"example": example}}}}


def errors(*codes: str) -> dict:
    """Documented error responses, grouped by HTTP status."""
    out: dict[int, dict] = {}
    for code in codes:
        status, message, retryable = ERROR_TABLE[code]
        example = {"error": {"code": code, "message": message, "retryable": retryable, "details": None},
                   "requestId": "req_trace_123"}
        entry = out.setdefault(
            status,
            {"model": ErrorEnvelope, "description": "", "content": {"application/json": {"examples": {}}}},
        )
        entry["description"] = (entry["description"] + ", " if entry["description"] else "") + code
        entry["content"]["application/json"]["examples"][code] = {"value": example}
    return out
