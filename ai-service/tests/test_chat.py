import asyncio
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.errors import AppError
from app.main import app
from app.prompts.chat import FIXED_REFUSAL
from app.routes.chat import get_karwan
from app.routes.intake import get_gemini
from app.services import karwan_api_client
from app.services.chat_context import build_context
from app.services.karwan_api_client import KarwanApiClient

DATA = {
    "requests": [
        {"id": "req_badin", "area": "Badin", "population": 3000, "urgency": "high", "vulnerable": True,
         "accessibility": "medium", "status": "partially_allocated", "hoursWaiting": 10, "fulfilmentPct": 64,
         "score": {"total": 80, "parts": {}}, "items": [{"item": "water", "qtyNeeded": 500, "qtyAllocated": 320}]},
        {"id": "req_dadu", "area": "Dadu", "population": 4200, "urgency": "critical", "vulnerable": True,
         "accessibility": "hard", "status": "pending", "hoursWaiting": 18, "fulfilmentPct": 0,
         "score": {"total": 98, "parts": {}}, "items": [{"item": "water", "qtyNeeded": 900, "qtyAllocated": 0}]},
    ],
    "allocation": [
        {"id": "alc_123", "requestId": "req_badin", "area": "Badin", "depotId": "dep_01", "depotName": "Hyderabad Depot",
         "item": "water", "qty": 320, "qtyNeeded": 500, "unfulfilled": 180, "fulfilmentPct": 64,
         "status": "approved", "reason": "Stock was limited; shared by priority score."},
    ],
    "depots": [{"id": "dep_01", "name": "Hyderabad Depot", "dailyCapacity": 2000,
                "stock": [{"item": "water", "qty": 0, "lowThreshold": 300, "isLow": True}],
                "vehicles": [{"id": "v1", "status": "available"}]}],
    "dashboard": {"activeRequests": 2},
    "deliveries": [{"allocationId": "alc_123", "requestId": "req_badin", "area": "Badin", "depotName": "Hyderabad Depot",
                    "status": "in_transit", "progressPct": 40, "items": [{"item": "water", "qty": 320}],
                    "route": [[1, 2]] * 500, "lat": 1.0, "lng": 2.0}],
}


class FakeKarwan:
    def __init__(self, data=None, error=None):
        self.data, self.error, self.calls = data if data is not None else DATA, error, 0

    async def fetch_context(self, request_id):
        self.calls += 1
        if self.error:
            raise self.error
        return self.data


class FakeGemini:
    def __init__(self, *replies):
        self.replies, self.calls, self.users = list(replies), 0, []

    async def generate_json(self, *, system, user, schema, audio=None):
        self.calls += 1
        self.users.append(user)
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply if isinstance(reply, str) else json.dumps(reply)


IN_SCOPE = {"inScope": True,
            "answer": "Badin needed 500 units of water and received 320. Stock was limited.",
            "sourceIds": [{"type": "allocation", "id": "alc_123"}, {"type": "allocation", "id": "alc_FAKE"}]}


@pytest.fixture
def client():
    yield TestClient(app)
    app.dependency_overrides.clear()


def wire(gemini, karwan=None):
    app.dependency_overrides[get_gemini] = lambda: gemini
    app.dependency_overrides[get_karwan] = lambda: karwan or FakeKarwan()
    return gemini


def ask(client, question="Why did Badin receive less water?", lang="en"):
    return client.post("/chat", json={"question": question, "uiLanguage": lang})


def test_known_allocation_question_returns_exact_numbers_and_real_sources(client):
    g = wire(FakeGemini(IN_SCOPE))
    r = ask(client)
    assert r.status_code == 200
    body = r.json()
    assert body["inScope"] is True and "500" in body["answer"] and "320" in body["answer"]
    assert body["sources"] == [{"type": "allocation", "id": "alc_123"}]  # invented id dropped
    prompt = g.users[0]
    assert "alc_123" in prompt and "Stock was limited; shared by priority score." in prompt  # stored reason sent
    assert "req_dadu" not in prompt  # focused on Badin only
    assert '"route"' not in prompt and "[[1,2]" not in prompt  # polyline stripped


def test_off_topic_returns_exact_fixed_refusal_even_if_model_words_it_differently(client):
    wire(FakeGemini({"inScope": False, "answer": "Paris is the capital of France.", "sourceIds": []}))
    body = ask(client, "What is the capital of France?").json()
    assert body == {"inScope": False, "answer": FIXED_REFUSAL, "sources": []}
    assert FIXED_REFUSAL == "I can only answer questions about Karwan's requests, stock, allocations, and deliveries."


def test_karwan_down_returns_503_and_never_calls_gemini(client):
    g = wire(FakeGemini(), FakeKarwan(error=AppError("KARWAN_API_UNAVAILABLE")))
    r = ask(client)
    assert r.status_code == 503 and r.json()["error"]["code"] == "KARWAN_API_UNAVAILABLE"
    assert g.calls == 0


def test_gemini_quota_and_bad_output(client):
    wire(FakeGemini(AppError("AI_QUOTA_EXCEEDED")))
    assert ask(client).status_code == 429
    g = wire(FakeGemini("junk", "still junk"))
    r = ask(client)
    assert r.status_code == 502 and g.calls == 2


def test_timeout_budget(client, monkeypatch):
    class Slow(FakeKarwan):
        async def fetch_context(self, request_id):
            await asyncio.sleep(1)
    app.dependency_overrides[get_gemini] = lambda: FakeGemini()
    app.dependency_overrides[get_karwan] = lambda: Slow()
    from app.config import get_settings
    app.dependency_overrides[get_settings] = lambda: Settings(request_timeout_seconds=0.05)
    r = ask(client)
    assert r.status_code == 504 and r.json()["error"]["code"] == "AI_TIMEOUT"


@pytest.mark.parametrize("body", [
    {"question": "", "uiLanguage": "en"},
    {"question": "   ", "uiLanguage": "en"},
    {"question": "x" * 501, "uiLanguage": "en"},
    {"question": "ok", "uiLanguage": "fr"},
    {"uiLanguage": "en"},
])
def test_invalid_chat_requests(client, body):
    wire(FakeGemini())
    r = client.post("/chat", json=body)
    assert r.status_code == 400 and r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_general_question_limits_to_top_ranked_active_requests():
    many = [{"id": f"r{i}", "area": f"Town{i}", "status": "pending", "score": {"total": i}, "items": []} for i in range(40)]
    text, known = build_context({**DATA, "requests": many, "allocation": [], "deliveries": []}, "Which areas are most critical?")
    ctx = json.loads(text)
    assert len(ctx["requests"]) == 15 and ctx["requests"][0]["id"] == "r39"
    assert ctx["totals"]["requests"] == 40
    assert ("request", "r39") in known and ("request", "r0") not in known


def test_context_is_size_capped():
    many = [{"id": f"a{i}", "area": "X", "reason": "long reason " * 40} for i in range(40)]
    text, _ = build_context({**DATA, "allocation": many}, "anything")
    assert len(text) <= 14000


# ---- the real Express client, against a fake Express ----
def _patch_http(monkeypatch, handler):
    real = httpx.AsyncClient
    monkeypatch.setattr(karwan_api_client.httpx, "AsyncClient",
                        lambda **kw: real(transport=httpx.MockTransport(handler), **kw))


def test_karwan_client_unwraps_envelope_sends_headers_and_only_reads(monkeypatch):
    seen = []

    def handler(req: httpx.Request):
        seen.append(req)
        return httpx.Response(200, json={"data": [{"path": req.url.path}]})

    _patch_http(monkeypatch, handler)
    c = KarwanApiClient(Settings(karwan_api_url="http://express.test"))
    data = asyncio.run(c.fetch_context("req_abc"))
    assert data["requests"] == [{"path": "/api/requests"}]
    assert {r.url.path for r in seen} == {"/api/requests", "/api/allocation", "/api/depots", "/api/dashboard", "/api/deliveries"}
    assert all(r.method == "GET" for r in seen)
    assert all(r.headers["x-request-id"] == "req_abc" and r.headers["accept"] == "application/json" for r in seen)
    n = len(seen)
    asyncio.run(c.fetch_context("req_abc"))  # served from the 10 s cache
    assert len(seen) == n


def test_karwan_client_failure_and_unconfigured(monkeypatch):
    _patch_http(monkeypatch, lambda req: httpx.Response(500, json={}))
    with pytest.raises(AppError) as e:
        asyncio.run(KarwanApiClient(Settings(karwan_api_url="http://express.test")).fetch_context("r"))
    assert e.value.code == "KARWAN_API_UNAVAILABLE"
    with pytest.raises(AppError) as e:
        asyncio.run(KarwanApiClient(Settings()).fetch_context("r"))
    assert e.value.code == "KARWAN_API_UNAVAILABLE"
