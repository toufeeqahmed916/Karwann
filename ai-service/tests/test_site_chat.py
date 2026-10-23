import json

import pytest
from fastapi.testclient import TestClient

from app.errors import AppError
from app.main import app
from app.prompts.site_help import SITE_REFUSAL
from app.routes.intake import get_gemini


class Fake:
    def __init__(self, *replies):
        self.replies, self.systems = list(replies), []

    async def generate_json(self, *, system, user, schema, audio=None):
        self.systems.append(system)
        r = self.replies.pop(0)
        if isinstance(r, Exception):
            raise r
        return r if isinstance(r, str) else json.dumps(r)


@pytest.fixture
def client():
    yield TestClient(app)
    app.dependency_overrides.clear()


def ask(c, q="How do I ask for help?", lang="en"):
    return c.post("/site-chat", json={"question": q, "uiLanguage": lang})


def wire(fake):
    app.dependency_overrides[get_gemini] = lambda: fake
    return fake


def test_in_scope_answer_and_knowledge_in_prompt(client):
    fake = wire(Fake({"inScope": True, "answer": "Open New request and press Confirm."}))
    r = ask(client)
    assert r.status_code == 200 and r.json() == {"inScope": True, "answer": "Open New request and press Confirm."}
    assert "Confirm request" in fake.systems[0]


def test_off_topic_gets_fixed_refusal_not_model_text(client):
    wire(Fake({"inScope": False, "answer": "Paris!"}))
    assert ask(client, "capital of France?").json() == {"inScope": False, "answer": SITE_REFUSAL}


def test_empty_answer_counts_as_refusal(client):
    wire(Fake({"inScope": True, "answer": "  "}))
    assert ask(client).json()["inScope"] is False


def test_works_without_any_karwan_data_source(client):
    # No Karwan/Express client is involved: nothing private can leak through this public bot.
    wire(Fake({"inScope": True, "answer": "ok"}))
    assert ask(client).status_code == 200


@pytest.mark.parametrize("body", [
    {"question": "", "uiLanguage": "en"},
    {"question": "x" * 501, "uiLanguage": "en"},
    {"question": "hi", "uiLanguage": "fr"},
])
def test_validation(client, body):
    wire(Fake())
    assert client.post("/site-chat", json=body).status_code == 400


def test_errors_are_friendly(client):
    wire(Fake(AppError("AI_QUOTA_EXCEEDED")))
    assert ask(client).status_code == 429
    wire(Fake("junk", "junk"))
    assert ask(client).status_code == 502
