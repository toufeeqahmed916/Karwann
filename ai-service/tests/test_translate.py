"""/translate: answers on screen follow a language switch. Gemini is faked."""
import json

import pytest
from fastapi.testclient import TestClient

from app.errors import AppError
from app.main import app
from app.routes.intake import get_gemini
from app.services.translate_service import clear_cache


class Fake:
    def __init__(self, *replies):
        self.replies, self.users, self.systems = list(replies), [], []

    async def generate_json(self, *, system, user, schema, audio=None):
        self.users.append(user)
        self.systems.append(system)
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply if isinstance(reply, str) else json.dumps(reply)


@pytest.fixture
def client():
    clear_cache()
    yield TestClient(app)
    app.dependency_overrides.clear()


def wire(fake):
    app.dependency_overrides[get_gemini] = lambda: fake
    return fake


def post(client, text="Badin needed 350 units of water and received 320.", target="sd"):
    return client.post("/translate", json={"text": text, "targetLanguage": target})


@pytest.mark.parametrize("target", ["en", "ur", "sd"])
def test_translates_into_each_language(client, target):
    fake = wire(Fake({"text": "translated"}))
    r = post(client, target=target)
    assert r.status_code == 200 and r.json() == {"text": "translated"}
    assert f"Target language: {target}" in fake.users[0] and "Sindhi" in fake.systems[0]


def test_same_text_and_language_is_cached(client):
    fake = wire(Fake({"text": "بدين کي 350 يونٽ پاڻي گهربل هو."}))
    for _ in range(3):
        assert post(client).json()["text"] == "بدين کي 350 يونٽ پاڻي گهربل هو."
    assert len(fake.users) == 1


def test_stray_letters_from_other_scripts_are_removed(client):
    wire(Fake({"text": "ڪ୍لڪ ڪريو"}))
    assert post(client).json()["text"] == "ڪلڪ ڪريو"


def test_empty_model_answer_is_an_error_not_a_blank_message(client):
    wire(Fake({"text": "   "}, {"text": "   "}))
    r = post(client)
    assert r.status_code == 502 and r.json()["error"]["code"] == "AI_INVALID_OUTPUT"


@pytest.mark.parametrize("body", [
    {"text": "", "targetLanguage": "sd"}, {"text": "hi", "targetLanguage": "fr"}, {"text": "x" * 2001, "targetLanguage": "ur"}, {"targetLanguage": "ur"},
])
def test_bad_input_is_rejected(client, body):
    wire(Fake())
    r = client.post("/translate", json=body)
    assert r.status_code == 400 and r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_service_errors_use_the_friendly_envelope(client):
    wire(Fake(AppError("AI_TIMEOUT")))
    r = post(client)
    assert r.status_code == 504 and r.json()["error"]["code"] == "AI_TIMEOUT"
