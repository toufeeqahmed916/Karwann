"""The real GeminiClient wrapper (key fail-over, timeout, error mapping) with the google SDK faked out."""
import asyncio
import logging

import pytest
from google.genai import errors as genai_errors

from app.config import Settings
from app.errors import AppError
from app.models import TranscribeResult
from app.services import gemini_client as gc

KEY_A = "AI" + "zaSy" + "A" * 33  # built at runtime so the secret scanner never sees a key-shaped literal
KEY_B = "AI" + "zaSy" + "B" * 33


class FakeResponse:
    def __init__(self, text):
        self.text = text


def install(monkeypatch, behaviours):
    """behaviours: {api_key: callable()} - callable returns text or raises."""
    calls = []

    class FakeModels:
        def __init__(self, key):
            self.key = key

        async def generate_content(self, **kw):
            calls.append(self.key)
            result = behaviours[self.key]()
            if asyncio.iscoroutine(result):
                result = await result
            return FakeResponse(result)

    class FakeClient:
        def __init__(self, api_key):
            self.aio = type("Aio", (), {"models": FakeModels(api_key)})()

    import google.genai as genai
    monkeypatch.setattr(genai, "Client", FakeClient)
    return calls


def client(timeout=5.0, keys=(KEY_A, KEY_B)):
    return gc.GeminiClient(Settings(gemini_keys=list(keys), request_timeout_seconds=timeout))


def run(coro):
    return asyncio.run(coro)


def ask(c):
    return run(c.generate_json(system="s", user="u", schema=TranscribeResult))


def quota():
    raise genai_errors.ClientError(429, {"error": {"message": "quota"}})


def test_fails_over_to_second_key_on_quota(monkeypatch):
    calls = install(monkeypatch, {KEY_A: quota, KEY_B: lambda: '{"ok": true}'})
    assert ask(client()) == '{"ok": true}'
    assert calls == [KEY_A, KEY_B]


def test_both_keys_over_quota_gives_friendly_quota_error(monkeypatch):
    install(monkeypatch, {KEY_A: quota, KEY_B: quota})
    with pytest.raises(AppError) as e:
        ask(client())
    assert e.value.code == "AI_QUOTA_EXCEEDED" and e.value.status == 429 and e.value.retryable


def test_timeout_maps_to_ai_timeout(monkeypatch):
    async def slow():
        await asyncio.sleep(1)
    install(monkeypatch, {KEY_A: slow})
    with pytest.raises(AppError) as e:
        ask(client(timeout=0.05, keys=(KEY_A,)))
    assert e.value.code == "AI_TIMEOUT" and e.value.status == 504


def test_other_api_errors_map_to_unavailable_without_leaking_key(monkeypatch, caplog):
    def broken():
        raise genai_errors.ServerError(500, {"error": {"message": f"boom key={KEY_A}"}})
    install(monkeypatch, {KEY_A: broken})
    with caplog.at_level(logging.DEBUG):
        with pytest.raises(AppError) as e:
            ask(client(keys=(KEY_A,)))
    assert e.value.code == "AI_UNAVAILABLE"
    assert KEY_A not in caplog.text and KEY_A not in e.value.message


def test_missing_key_is_unavailable_not_a_crash():
    with pytest.raises(AppError) as e:
        ask(client(keys=()))
    assert e.value.code == "AI_UNAVAILABLE"


def test_auth_failure_on_first_key_fails_over_to_second(monkeypatch):
    def rejected():
        raise genai_errors.ClientError(401, {"error": {"message": "API key not valid"}})
    calls = install(monkeypatch, {KEY_A: rejected, KEY_B: lambda: "{}"})
    assert ask(client()) == "{}"
    assert calls == [KEY_A, KEY_B]


def test_all_keys_rejected_is_unavailable_not_quota(monkeypatch):
    def rejected():
        raise genai_errors.ClientError(403, {"error": {"message": "API disabled"}})
    install(monkeypatch, {KEY_A: rejected, KEY_B: rejected})
    with pytest.raises(AppError) as e:
        ask(client())
    assert e.value.code == "AI_UNAVAILABLE"


def test_backend_selection_ignores_key_prefix():
    class G:
        @staticmethod
        def Client(**kw):
            return kw
    # AI Studio issues several key formats (AIza..., AQ....): both use the Developer API by default.
    assert gc._make_client(G, "AQ.something") == {"api_key": "AQ.something"}
    assert gc._make_client(G, "AIzaSomething", "auto") == {"api_key": "AIzaSomething"}
    assert gc._make_client(G, "AQ.something", "vertex") == {"vertexai": True, "api_key": "AQ.something"}
