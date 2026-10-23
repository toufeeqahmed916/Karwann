import io
import json
import wave

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routes.intake import get_gemini
from tests.test_api import GOOD, FakeGemini

AUDIO = b"x" * 1000  # content is never decoded locally; Gemini does that


@pytest.fixture
def client():
    yield TestClient(app)
    app.dependency_overrides.clear()


def use(fake):
    app.dependency_overrides[get_gemini] = lambda: fake
    return fake


def intake(client, data=AUDIO, mime="audio/webm", **form):
    form.setdefault("ui_language", "ur")
    return client.post("/intake", data=form, files={"audio": ("r.webm", data, mime)})


def test_voice_intake_returns_structured_fields(client):
    fake = use(FakeGemini(GOOD))
    r = intake(client)
    assert r.status_code == 200 and r.json()["area"] == "Dadu"
    assert fake.last_audio == (AUDIO, "audio/webm")


@pytest.mark.parametrize("mime", ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/x-wav"])
def test_browser_mime_types_with_parameters_are_accepted(client, mime):
    use(FakeGemini(GOOD))
    data = AUDIO
    if mime == "audio/x-wav":
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(8000); w.writeframes(b"\0\0" * 8000)
        data = buf.getvalue()
    assert intake(client, data=data, mime=mime).status_code == 200


def test_unsupported_mime_gets_415(client):
    use(FakeGemini())
    r = intake(client, mime="video/mp4")
    assert r.status_code == 415 and r.json()["error"]["code"] == "UNSUPPORTED_AUDIO"


def test_oversize_audio_gets_413(client):
    use(FakeGemini())
    r = intake(client, data=b"x" * (10 * 1024 * 1024 + 1))
    assert r.status_code == 413 and r.json()["error"]["code"] == "AUDIO_TOO_LARGE"


def test_empty_recording_is_friendly_400(client):
    use(FakeGemini())
    r = intake(client, data=b"x" * 10)
    assert r.status_code == 400 and r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_wav_longer_than_30s_rejected(client):
    use(FakeGemini())
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(8000); w.writeframes(b"\0\0" * 8000 * 40)
    r = intake(client, data=buf.getvalue(), mime="audio/wav")
    assert r.status_code == 413


def test_unintelligible_audio_gets_friendly_error(client):
    blank = {**GOOD, "area": None, "people": None, "supplies": [], "englishText": ""}
    use(FakeGemini(blank))
    r = intake(client)
    assert r.status_code == 415
    assert "record again" in r.json()["error"]["message"]


def test_transcribe_returns_text_and_language(client):
    fake = use(FakeGemini({"text": "Dadu needs water and medicine.", "detectedLanguage": "ur"}))
    r = client.post("/transcribe", data={"target_language": "en"},
                    files={"audio": ("q.webm", AUDIO, "audio/webm;codecs=opus")})
    assert r.status_code == 200
    assert r.json() == {"text": "Dadu needs water and medicine.", "detectedLanguage": "ur"}
    assert fake.last_audio[1] == "audio/webm"


def test_transcribe_requires_audio_and_valid_language(client):
    use(FakeGemini())
    assert client.post("/transcribe").json()["error"]["code"] == "VALIDATION_ERROR"
    r = client.post("/transcribe", data={"target_language": "fr"}, files={"audio": ("q.webm", AUDIO, "audio/webm")})
    assert r.status_code == 400


def test_transcribe_empty_speech_is_friendly(client):
    use(FakeGemini({"text": "  ", "detectedLanguage": "en"}))
    r = client.post("/transcribe", files={"audio": ("q.webm", AUDIO, "audio/webm")})
    assert r.status_code == 415


def test_transcribe_repairs_once_then_fails(client):
    fake = use(FakeGemini("garbage", json.dumps({"nope": 1})))
    r = client.post("/transcribe", files={"audio": ("q.webm", AUDIO, "audio/webm")})
    assert r.status_code == 502 and fake.calls == 2
