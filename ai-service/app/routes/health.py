from fastapi import APIRouter

from ..models import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    # Deliberately does NOT touch Gemini or Karwan - safe for wake-up pings.
    return HealthResponse()
