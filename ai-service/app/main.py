import logging
import re

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .errors import AppError, error_response, new_request_id, register_error_handlers
from .routes import chat, health, intake, site_chat, transcribe

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
# These libraries can log full URLs / headers at INFO. Keep them quiet so no key or audio detail leaks into logs.
for noisy in ("httpx", "httpcore", "google_genai", "google.genai", "urllib3"):
    logging.getLogger(noisy).setLevel(logging.WARNING)

log = logging.getLogger("karwan-ai")

MAX_BODY_BYTES = 11 * 1024 * 1024  # 10 MB audio + multipart overhead
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9_.\-]{1,64}$")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(
        title="Karwan AI Service",
        version="2.0.0",
        description=(
            "Understands Karwan reports and explains Karwan data. It never saves requests, "
            "calculates scores, allocates supplies or changes stock - the Express backend does that."
        ),
    )

    # Added FIRST so it sits INSIDE the CORS layer: even an unexpected crash is answered with a clean
    # JSON error that still carries CORS headers (otherwise the browser would show a confusing CORS error).
    @app.middleware("http")
    async def guard(request: Request, call_next):
        incoming = request.headers.get("x-request-id", "")
        request.state.request_id = incoming if _SAFE_REQUEST_ID.match(incoming) else new_request_id()
        try:
            length = int(request.headers.get("content-length", "0") or 0)
        except ValueError:
            length = 0
        if length > MAX_BODY_BYTES:
            response = error_response(request, AppError("AUDIO_TOO_LARGE", "The request is too large."))
        else:
            try:
                response = await call_next(request)
            except Exception as exc:  # last line of defence; log the type only, never bodies or keys
                log.error("Unhandled %s on %s", type(exc).__name__, request.url.path)
                response = error_response(request, AppError("AI_UNAVAILABLE"))
        response.headers["X-Request-Id"] = request.state.request_id
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,  # production frontend + local dev ONLY
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-Request-Id"],
        expose_headers=["X-Request-Id"],
    )

    register_error_handlers(app)
    app.include_router(health.router)
    app.include_router(intake.router)
    app.include_router(transcribe.router)
    app.include_router(chat.router)
    app.include_router(site_chat.router)
    return app


app = create_app()
