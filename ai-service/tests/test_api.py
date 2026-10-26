"""Offline tests: Gemini is replaced by a fake, so no key or internet is needed."""
import json

import pytest
from fastapi.testclient import TestClient

from app.errors import AppError
from app.main import app
from app.routes.intake import get_gemini

GOOD = {
    "area": "Dadu",
    "people": 240,
    "peopleIsEstimate": True,
    "urgency": "high",
    "vulnerable": ["children", "medical"],
    "supplies": [{"item": "water", "qty": 500}],
    "access": "hard",
    "detectedLanguage": "ur",
    "englishText": "Forty houses near Dadu are flooded.", "transcript": "",
    "confidence": {"area": 0.95, "people": 0.65, "urgency": 0.8, "vulnerable": 0.9, "supplies": 0.4, "access": 0.3},
}


class FakeGemini:
    def __init__(self, *replies):
        self.replies = list(replies)
        self.calls = 0

    async def generate_json(self, *, system, user, schema, audio=None):
        self.last_audio = audio
        self.calls += 1
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply if isinstance(reply, str) else json.dumps(reply)


@pytest.fixture
def client():
    yield TestClient(app)
    app.dependency_overrides.clear()


def use(fake):
    app.dependency_overrides[get_gemini] = lambda: fake
    return fake


def post(client, **form):
    form.setdefault("ui_language", "en")
    return client.post("/intake", data=form)


def test_health_never_calls_gemini(client):
    fake = use(FakeGemini())
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "service": "karwan-ai"}
    assert fake.calls == 0
    assert r.headers["x-request-id"].startswith("req_")


def test_english_text_returns_structured_fields(client):
    use(FakeGemini(GOOD))
    r = post(client, text="40 houses near Dadu flooded, need water")
    assert r.status_code == 200
    body = r.json()
    assert body["area"] == "Dadu" and body["people"] == 240
    assert body["supplies"] == [{"item": "water", "qty": 500}]
    assert set(body["confidence"]) == {"area", "people", "urgency", "vulnerable", "supplies", "access"}


def test_urdu_text_accepted(client):
    use(FakeGemini(GOOD))
    r = post(client, text="دادو میں سیلاب ہے، پانی چاہیے", ui_language="ur")
    assert r.status_code == 200
    assert r.json()["detectedLanguage"] == "ur"


def test_unknown_facts_stay_empty(client):
    empty = {**GOOD, "area": None, "people": None, "peopleIsEstimate": True, "urgency": None,
             "vulnerable": [], "supplies": [], "access": None,
             "confidence": {"area": 0.9, "people": 0.9, "urgency": 0.9, "vulnerable": 0.9, "supplies": 0.9, "access": 0.9}}
    use(FakeGemini(empty))
    body = post(client, text="help us please").json()
    assert body["area"] is None and body["people"] is None
    assert body["vulnerable"] == [] and body["supplies"] == []
    assert body["peopleIsEstimate"] is False
    assert all(v == 0.0 for v in body["confidence"].values())  # confidence forced to 0


def test_confidence_percentages_are_normalised(client):
    odd = {**GOOD, "confidence": {**GOOD["confidence"], "area": 95, "people": 1.2}}
    use(FakeGemini(odd))
    body = post(client, text="Dadu flood").json()
    assert body["confidence"]["area"] == 0.95
    assert body["confidence"]["people"] == 1.0


def test_malformed_output_is_repaired_once(client):
    fake = use(FakeGemini("not json at all", GOOD))
    assert post(client, text="Dadu flood").status_code == 200
    assert fake.calls == 2


def test_malformed_twice_returns_ai_invalid_output(client):
    fake = use(FakeGemini("nope", {"area": "x"}))
    r = post(client, text="Dadu flood")
    assert r.status_code == 502
    assert r.json()["error"]["code"] == "AI_INVALID_OUTPUT"
    assert r.json()["requestId"].startswith("req_")
    assert fake.calls == 2  # never a third attempt


def test_requires_exactly_one_of_text_or_audio(client):
    use(FakeGemini())
    assert post(client).json()["error"]["code"] == "VALIDATION_ERROR"
    r = client.post("/intake", data={"ui_language": "en", "text": "x"},
                    files={"audio": ("a.webm", b"123", "audio/webm")})
    assert r.status_code == 400


def test_text_longer_than_5000_rejected(client):
    use(FakeGemini())
    r = post(client, text="a" * 5001)
    assert r.status_code == 400 and r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_bad_ui_language_rejected(client):
    use(FakeGemini())
    r = post(client, text="hello", ui_language="fr")
    assert r.status_code == 400 and r.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.parametrize("code,status,retryable", [
    ("AI_QUOTA_EXCEEDED", 429, True),
    ("AI_TIMEOUT", 504, True),
    ("AI_UNAVAILABLE", 503, True),
])
def test_gemini_failures_become_friendly_errors(client, code, status, retryable):
    use(FakeGemini(AppError(code)))
    r = post(client, text="Dadu flood")
    assert r.status_code == status
    err = r.json()["error"]
    assert err["code"] == code and err["retryable"] is retryable
    assert "manual form" in err["message"]


def test_unexpected_crash_is_a_clean_envelope():
    app.dependency_overrides[get_gemini] = lambda: FakeGemini(RuntimeError("boom with secret"))
    r = TestClient(app, raise_server_exceptions=False).post("/intake", data={"ui_language": "en", "text": "x"})
    app.dependency_overrides.clear()
    assert r.status_code == 503
    assert "boom" not in r.text and "secret" not in r.text


def test_cors_allows_local_dev_and_rejects_strangers(client):
    ok = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    bad = client.get("/health", headers={"Origin": "https://evil.example.com"})
    assert "access-control-allow-origin" not in bad.headers
