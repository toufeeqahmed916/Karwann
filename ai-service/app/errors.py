"""Shared error contract (work plan section D).

Every error leaves the service as:
  {"error": {"code", "message", "retryable", "details"}, "requestId": "..."}
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

log = logging.getLogger("karwan-ai")

# code -> (HTTP status, default message, retryable)
ERROR_TABLE: dict[str, tuple[int, str, bool]] = {
    "VALIDATION_ERROR": (400, "Some fields are missing or invalid. Please check your input.", False),
    "UNSUPPORTED_AUDIO": (415, "That audio format is not supported. Type your report instead.", False),
    "AUDIO_TOO_LARGE": (413, "The recording is too large. Keep it under 30 seconds or type your report.", False),
    "AI_TIMEOUT": (504, "The AI assistant is busy. You can continue with the manual form.", True),
    "AI_QUOTA_EXCEEDED": (429, "The AI assistant has reached its limit for now. You can continue with the manual form.", True),
    "AI_INVALID_OUTPUT": (502, "The AI could not understand that report. Please edit it or use the manual form.", True),
    "AI_UNAVAILABLE": (503, "The AI assistant is unavailable. You can continue with the manual form.", True),
    "KARWAN_API_UNAVAILABLE": (503, "Karwan data is unavailable right now. Please try again shortly.", True),
}


class AppError(Exception):
    def __init__(self, code: str, message: str | None = None, details: Any = None):
        status, default_message, retryable = ERROR_TABLE[code]
        self.code = code
        self.status = status
        self.message = message or default_message
        self.retryable = retryable
        self.details = details
        super().__init__(self.message)


def new_request_id() -> str:
    return "req_" + uuid.uuid4().hex[:12]


def request_id_of(request: Request) -> str:
    return getattr(request.state, "request_id", None) or new_request_id()


def error_response(request: Request, err: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=err.status,
        content={
            "error": {
                "code": err.code,
                "message": err.message,
                "retryable": err.retryable,
                "details": err.details,
            },
            "requestId": request_id_of(request),
        },
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError):
        log.warning("%s %s -> %s", request.method, request.url.path, exc.code)
        return error_response(request, exc)

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        fields = [".".join(str(p) for p in e.get("loc", ())[1:]) or "body" for e in exc.errors()]
        return error_response(request, AppError("VALIDATION_ERROR", details={"fields": fields}))

    @app.exception_handler(Exception)
    async def _unexpected(request: Request, exc: Exception):
        # Log the type only - never bodies, audio or keys.
        log.error("Unhandled %s on %s", type(exc).__name__, request.url.path)
        return error_response(request, AppError("AI_UNAVAILABLE"))
