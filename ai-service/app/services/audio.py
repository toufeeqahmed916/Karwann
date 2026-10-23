"""Audio validation: MIME allow-list, size cap, and a duration cap where it can be checked."""
from __future__ import annotations

import io
import wave
from dataclasses import dataclass

from fastapi import UploadFile

from ..errors import AppError

MAX_AUDIO_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_AUDIO_SECONDS = 35  # ~30 s cap + small grace for encoder padding

# Browsers send e.g. "audio/webm;codecs=opus"; we compare only the base type.
_ALLOWED = {
    "audio/webm": "audio/webm",
    "audio/ogg": "audio/ogg",
    "audio/wav": "audio/wav",
    "audio/x-wav": "audio/wav",
    "audio/wave": "audio/wav",
    "audio/mp4": "audio/mp4",
}


@dataclass(frozen=True)
class AudioClip:
    data: bytes
    mime_type: str


def base_mime(content_type: str | None) -> str:
    return (content_type or "").split(";")[0].strip().lower()


async def read_audio(upload: UploadFile) -> AudioClip:
    mime = _ALLOWED.get(base_mime(upload.content_type))
    if mime is None:
        raise AppError("UNSUPPORTED_AUDIO", details={"allowed": sorted(set(_ALLOWED.values()))})

    data = await upload.read(MAX_AUDIO_BYTES + 1)  # never buffer more than the cap
    if len(data) > MAX_AUDIO_BYTES:
        raise AppError("AUDIO_TOO_LARGE")
    if len(data) < 200:  # no real recording is this small
        raise AppError("VALIDATION_ERROR", "The recording is empty. Please record again or type your report.")

    if mime == "audio/wav":
        try:
            with wave.open(io.BytesIO(data)) as w:
                seconds = w.getnframes() / float(w.getframerate() or 1)
        except (wave.Error, EOFError):
            raise AppError("UNSUPPORTED_AUDIO") from None
        if seconds > MAX_AUDIO_SECONDS:
            raise AppError("AUDIO_TOO_LARGE", "The recording is longer than 30 seconds. Please keep it short.")
    return AudioClip(data=data, mime_type=mime)
