"""Thin wrapper around google-genai: key fail-over, timeout, error mapping.

Routes and services depend on `GeminiLike`, so tests can swap in a fake.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Protocol

from ..config import Settings
from ..errors import AppError

log = logging.getLogger("karwan-ai")


class GeminiLike(Protocol):
    async def generate_json(
        self, *, system: str, user: str, schema: Any, audio: tuple[bytes, str] | None = None
    ) -> str: ...


def _make_client(genai: Any, key: str, backend: str = "auto") -> Any:
    """Default ('auto' / 'studio') is the Gemini Developer API used by AI Studio keys. Google now issues AI Studio
    keys in more than one format (AIza... and AQ....), so the key prefix says nothing about the endpoint.
    Only set GEMINI_BACKEND=vertex if you deliberately use a Google Cloud Vertex AI key."""
    if backend == "vertex":
        return genai.Client(vertexai=True, api_key=key)
    return genai.Client(api_key=key)


class GeminiClient:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._clients: list[Any] = []

    def _get_clients(self) -> list[Any]:
        if not self._settings.gemini_keys:
            log.error("GEMINI_KEY_A is not configured")
            raise AppError("AI_UNAVAILABLE")
        if not self._clients:
            from google import genai  # imported lazily so /health and tests never need it

            self._clients = [_make_client(genai, k, self._settings.gemini_backend) for k in self._settings.gemini_keys]
        return self._clients

    async def generate_json(
        self, *, system: str, user: str, schema: Any, audio: tuple[bytes, str] | None = None
    ) -> str:
        from google.genai import errors as genai_errors
        from google.genai import types

        config = types.GenerateContentConfig(
            system_instruction=system,
            response_mime_type="application/json",
            response_schema=schema,
            temperature=0,
            thinking_config=(
                types.ThinkingConfig(thinking_level=self._settings.gemini_thinking_level)
                if self._settings.gemini_thinking_level else None
            ),
        )
        contents: Any = user
        if audio is not None:
            data, mime = audio
            contents = [types.Part.from_bytes(data=data, mime_type=mime), user]
        quota_hit = False
        for index, client in enumerate(self._get_clients()):
            try:
                response = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=self._settings.gemini_model, contents=contents, config=config
                    ),
                    timeout=self._settings.request_timeout_seconds,
                )
                return response.text or ""
            except asyncio.TimeoutError:
                raise AppError("AI_TIMEOUT") from None
            except genai_errors.APIError as exc:
                code = getattr(exc, "code", None)
                reason = self._redact(str(getattr(exc, "message", None) or exc))[:300]
                if code in (401, 403, 429):  # key rejected or out of quota: try the next key
                    log.warning("Gemini key #%d failed (code=%s): %s", index, code, reason)
                    quota_hit = quota_hit or code == 429
                    continue
                log.error("Gemini API error code=%s: %s", code, reason)
                raise AppError("AI_UNAVAILABLE") from None
        if quota_hit:
            raise AppError("AI_QUOTA_EXCEEDED")
        log.error("All Gemini keys were rejected. Check the key type and that the model name is valid for it.")
        raise AppError("AI_UNAVAILABLE")

    def _redact(self, text: str) -> str:
        for key in self._settings.gemini_keys:
            text = text.replace(key, "***")
        return text
