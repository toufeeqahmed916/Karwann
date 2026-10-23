from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.routes.intake import get_gemini

PROD = "https://karwan-demo.vercel.app"


def make_client(**kw):
    return TestClient(create_app(Settings(frontend_origins=[PROD], **kw)), raise_server_exceptions=False)


def test_production_origin_allowed_unrelated_origin_rejected():
    c = make_client()
    assert c.get("/health", headers={"Origin": PROD}).headers["access-control-allow-origin"] == PROD
    assert c.get("/health", headers={"Origin": "http://localhost:5173"}).headers["access-control-allow-origin"] == "http://localhost:5173"
    for evil in ("https://evil.example.com", "https://karwan-demo.vercel.app.evil.com", "http://localhost:3000"):
        assert "access-control-allow-origin" not in c.get("/health", headers={"Origin": evil}).headers


def test_preflight_for_post_endpoints():
    c = make_client()
    ok = c.options("/intake", headers={"Origin": PROD, "Access-Control-Request-Method": "POST",
                                       "Access-Control-Request-Headers": "content-type"})
    assert ok.status_code == 200 and ok.headers["access-control-allow-origin"] == PROD
    bad = c.options("/chat", headers={"Origin": "https://evil.example.com", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in bad.headers


def test_unexpected_crash_is_clean_json_with_cors_and_no_leak():
    app = create_app(Settings(frontend_origins=[PROD]))

    class Boom:
        async def generate_json(self, **kw):
            raise RuntimeError("secret " + "AI" + "zaSy" + "L" * 33 + " inside")

    app.dependency_overrides[get_gemini] = lambda: Boom()
    r = TestClient(app, raise_server_exceptions=False).post(
        "/intake", data={"ui_language": "en", "text": "x"}, headers={"Origin": PROD})
    assert r.status_code == 503 and r.json()["error"]["code"] == "AI_UNAVAILABLE"
    assert r.headers["access-control-allow-origin"] == PROD  # browser shows the friendly message, not a CORS error
    assert "AIza" not in r.text and "secret" not in r.text
    assert r.json()["requestId"].startswith("req_")


def test_oversized_body_rejected_before_reading():
    c = make_client()
    r = c.post("/intake", content=b"x", headers={"Content-Length": str(50 * 1024 * 1024), "Content-Type": "multipart/form-data; boundary=x"})
    assert r.status_code == 413 and r.json()["error"]["code"] == "AUDIO_TOO_LARGE"


def test_request_id_echoed_only_when_safe():
    c = make_client()
    assert c.get("/health", headers={"X-Request-Id": "req_trace_123"}).headers["x-request-id"] == "req_trace_123"
    weird = c.get("/health", headers={"X-Request-Id": "bad id with spaces <script>"})
    assert weird.headers["x-request-id"].startswith("req_") and "script" not in weird.headers["x-request-id"]


def test_service_exposes_only_the_documented_endpoints():
    spec = create_app(Settings()).openapi()  # lists every real API operation (no PUT/PATCH/DELETE exist)
    api = {(method.upper(), path) for path, ops in spec["paths"].items() for method in ops}
    assert api =={("GET", "/health"), ("POST", "/intake"), ("POST", "/transcribe"), ("POST", "/chat"), ("POST", "/site-chat")}


def test_openapi_documents_examples_for_every_endpoint():
    spec = create_app(Settings()).openapi()
    assert set(spec["paths"]) == {"/health", "/intake", "/transcribe", "/chat", "/site-chat"}
    for path in ("/intake", "/transcribe", "/chat"):
        responses = spec["paths"][path]["post"]["responses"]
        assert "200" in responses and ("429" in responses or "503" in responses)
