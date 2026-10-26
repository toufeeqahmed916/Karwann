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

    async def generate_speech(self, *, text: str) -> bytes: ...


def _make_client(genai: Any, key: str, backend: str = "auto") -> Any:
    """Default ('auto' / 'studio') is the Gemini Developer API used by AI Studio keys. Google now issues AI Studio
    keys in more than one format (AIza... and AQ....), so the key prefix says nothing about the endpoint.
    Only set GEMINI_BACKEND=vertex if you deliberately use a Google Cloud Vertex AI key."""
    if backend == "vertex":
        return genai.Client(vertexai=True, api_key=key)
    return genai.Client(api_key=key)


def pcm_to_wav(data: bytes, mime: str | None = None) -> bytes:
    """Some speech models return raw 16-bit little-endian PCM ("audio/l16; rate=24000") instead of a WAV file."""
    import io
    import re
    import wave

    if data[:4] == b"RIFF":
        return data
    match = re.search(r"rate=(\d+)", mime or "")
    rate = int(match.group(1)) if match else 24000
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(data)
    return buffer.getvalue()


class GeminiClient:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._clients: list[Any] = []
        self._main_tts_down_until = 0.0

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
                    self._generate_with_retries(client, contents, config),
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

    async def _generate_with_retries(self, client: Any, contents: Any, config: Any) -> Any:
        """One Gemini call. A short outage (500/502/503/504) is retried after a pause instead of failing at once."""
        from google.genai import errors as genai_errors

        delays = self._settings.transient_retry_delays
        for attempt in range(len(delays) + 1):
            try:
                return await client.aio.models.generate_content(
                    model=self._settings.gemini_model, contents=contents, config=config
                )
            except genai_errors.APIError as exc:
                if getattr(exc, "code", None) in (500, 502, 503, 504) and attempt < len(delays):
                    log.warning("Gemini temporarily unavailable (code=%s); retrying in %.1fs", getattr(exc, "code", None), delays[attempt])
                    await asyncio.sleep(delays[attempt])
                    continue
                raise

    async def generate_speech(self, *, text: str) -> bytes:
        """Text to a WAV recording (mono, 16-bit) with Gemini speech. The model detects the language itself (English, Urdu and
        Sindhi). The main model is tried first; if it is slow or down, the fallback model answers instead, and for the next
        few minutes the fallback goes first so people are not kept waiting. Same key fail-over and error mapping as generate_json."""
        import time

        models = [(self._settings.gemini_tts_model, self._settings.tts_timeout_seconds)]
        fallback = (self._settings.gemini_tts_fallback_model or "").strip()
        if fallback and fallback != self._settings.gemini_tts_model:
            models.append((fallback, self._settings.tts_fallback_timeout_seconds))
            if time.monotonic() < self._main_tts_down_until:
                models.reverse()

        last_error: AppError | None = None
        for index, (model, timeout) in enumerate(models):
            try:
                return await self._speak_with(model, text, timeout)
            except AppError as exc:
                last_error = exc
                if index == 0 and model == self._settings.gemini_tts_model and len(models) > 1 and exc.code in ("AI_TIMEOUT", "AI_UNAVAILABLE", "AI_QUOTA_EXCEEDED"):
                    self._main_tts_down_until = time.monotonic() + 300  # skip the slow model for 5 minutes
                log.warning("Speech model %s failed (%s)", model, exc.code)
        raise last_error or AppError("AI_UNAVAILABLE")

    async def _speak_with(self, model: str, text: str, timeout: float) -> bytes:
        import base64

        from google.genai import errors as genai_errors

        quota_hit = False
        for index, client in enumerate(self._get_clients()):
            try:
                interaction = await asyncio.wait_for(
                    client.aio.interactions.create(
                        model=model,
                        input=[{"type": "user_input", "content": [{"type": "text", "text": text}]}],
                        response_format={"type": "audio"},
                        generation_config={"speech_config": [{"voice": self._settings.gemini_tts_voice}]},
                    ),
                    timeout=timeout,
                )
                audio = getattr(interaction, "output_audio", None)
                data = getattr(audio, "data", None)
                if not data:
                    log.error("Gemini TTS (%s) returned no audio", model)
                    raise AppError("AI_UNAVAILABLE")
                return pcm_to_wav(base64.b64decode(data), getattr(audio, "mime_type", None))
            except asyncio.TimeoutError:
                raise AppError("AI_TIMEOUT") from None
            except genai_errors.APIError as exc:
                code = getattr(exc, "code", None)
                reason = self._redact(str(getattr(exc, "message", None) or exc))[:300]
                if code in (401, 403, 429):
                    log.warning("Gemini TTS key #%d failed (code=%s): %s", index, code, reason)
                    quota_hit = quota_hit or code == 429
                    continue
                log.error("Gemini TTS API error code=%s: %s", code, reason)
                raise AppError("AI_UNAVAILABLE") from None
        if quota_hit:
            raise AppError("AI_QUOTA_EXCEEDED")
        raise AppError("AI_UNAVAILABLE")

    def _redact(self, text: str) -> str:
        for key in self._settings.gemini_keys:
            text = text.replace(key, "***")
        return text
