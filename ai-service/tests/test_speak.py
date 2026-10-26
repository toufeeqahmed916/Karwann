"""Text to speech (/speak) and Sindhi support across the AI endpoints. Gemini is faked: no key or internet needed."""
import asyncio
import base64
import json

import pytest
from fastapi.testclient import TestClient
from google.genai import errors as genai_errors

from app.config import Settings
from app.errors import AppError
from app.main import app
from app.routes.intake import get_gemini
from app.services import gemini_client as gc
from app.services.speech_service import clean_for_speech, clear_cache

WAV = b"RIFF$\x00\x00\x00WAVEfmt " + b"\x00" * 40
KEY_A = "AI" + "zaSy" + "A" * 33
KEY_B = "AI" + "zaSy" + "B" * 33

GOOD_SD = {
    "area": "دادو", "people": 240, "peopleIsEstimate": True, "urgency": "high", "vulnerable": ["children"],
    "supplies": [{"item": "water", "qty": 0}], "access": "hard", "detectedLanguage": "sd",
    "englishText": "About forty houses near Dadu are flooded.", "transcript": "",
    "confidence": {"area": 0.95, "people": 0.6, "urgency": 0.8, "vulnerable": 0.9, "supplies": 0.3, "access": 0.4},
}


class Fake:
    def __init__(self, *replies, speech=WAV):
        self.replies, self.speech, self.speech_calls, self.systems, self.users = list(replies), speech, [], [], []

    async def generate_json(self, *, system, user, schema, audio=None):
        self.systems.append(system)
        self.users.append(user)
        r = self.replies.pop(0)
        return r if isinstance(r, str) else json.dumps(r)

    async def generate_speech(self, *, text):
        self.speech_calls.append(text)
        if isinstance(self.speech, Exception):
            raise self.speech
        return self.speech


@pytest.fixture
def client():
    clear_cache()
    yield TestClient(app)
    app.dependency_overrides.clear()


def wire(fake):
    app.dependency_overrides[get_gemini] = lambda: fake
    return fake


# ---------- /speak ----------
@pytest.mark.parametrize("language", ["en", "ur", "sd"])
def test_speak_returns_wav_in_all_three_languages(client, language):
    fake = wire(Fake())
    r = client.post("/speak", json={"text": "Dadu needs water", "language": language})
    assert r.status_code == 200 and r.headers["content-type"] == "audio/wav" and r.content == WAV
    assert fake.speech_calls == ["Dadu needs water"]


def test_repeat_speak_is_served_from_cache(client):
    fake = wire(Fake())
    for _ in range(3):
        assert client.post("/speak", json={"text": "پاڻي منظور ٿي ويو", "language": "sd"}).status_code == 200
    assert len(fake.speech_calls) == 1


def test_markdown_marks_are_not_read_aloud(client):
    fake = wire(Fake())
    client.post("/speak", json={"text": "**Badin** needed *500* units", "language": "en"})
    assert fake.speech_calls == ["Badin needed 500 units"]
    assert clean_for_speech("  a\n\n b  ") == "a b"


@pytest.mark.parametrize("body", [
    {"text": "", "language": "en"}, {"text": "   ", "language": "en"}, {"text": "hi", "language": "fr"},
    {"text": "x" * 1201, "language": "en"}, {"text": "***", "language": "en"}, {"language": "en"},
])
def test_speak_rejects_bad_input(client, body):
    wire(Fake())
    r = client.post("/speak", json=body)
    assert r.status_code == 400 and r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_speak_errors_use_the_friendly_envelope(client):
    wire(Fake(speech=AppError("AI_QUOTA_EXCEEDED")))
    r = client.post("/speak", json={"text": "hello", "language": "en"})
    assert r.status_code == 429 and r.json()["error"]["code"] == "AI_QUOTA_EXCEEDED" and r.json()["error"]["retryable"]


# ---------- real client: speech with key fail-over ----------
class FakeInteraction:
    def __init__(self, data):
        self.output_audio = type("A", (), {"data": data})()


def install_tts(monkeypatch, behaviours):
    calls = []

    class FakeInteractions:
        def __init__(self, key):
            self.key = key

        async def create(self, **kw):
            calls.append((self.key, kw["model"]))
            result = behaviours[self.key]()
            if asyncio.iscoroutine(result):
                result = await result
            return result

    class FakeClient:
        def __init__(self, api_key):
            self.aio = type("Aio", (), {"interactions": FakeInteractions(api_key)})()

    import google.genai as genai
    monkeypatch.setattr(genai, "Client", FakeClient)
    return calls


def tts_client(keys=(KEY_A, KEY_B), timeout=5.0):
    return gc.GeminiClient(Settings(gemini_keys=list(keys), request_timeout_seconds=timeout, tts_timeout_seconds=timeout, gemini_tts_model="tts-model", gemini_tts_fallback_model=""))


def test_speech_decodes_audio_and_uses_configured_model(monkeypatch):
    calls = install_tts(monkeypatch, {KEY_A: lambda: FakeInteraction(base64.b64encode(WAV).decode())})
    assert asyncio.run(tts_client().generate_speech(text="x")) == WAV
    assert calls == [(KEY_A, "tts-model")]


def test_speech_fails_over_on_quota_then_reports_quota(monkeypatch):
    def quota():
        raise genai_errors.ClientError(429, {"error": {"message": "quota"}})

    calls = install_tts(monkeypatch, {KEY_A: quota, KEY_B: lambda: FakeInteraction(base64.b64encode(WAV).decode())})
    assert asyncio.run(tts_client().generate_speech(text="x")) == WAV
    assert [c[0] for c in calls] == [KEY_A, KEY_B]
    install_tts(monkeypatch, {KEY_A: quota, KEY_B: quota})
    with pytest.raises(AppError) as e:
        asyncio.run(tts_client().generate_speech(text="x"))
    assert e.value.code == "AI_QUOTA_EXCEEDED"


def test_speech_without_audio_or_timeout_is_a_clean_error(monkeypatch):
    install_tts(monkeypatch, {KEY_A: lambda: FakeInteraction(None)})
    with pytest.raises(AppError) as e:
        asyncio.run(tts_client(keys=(KEY_A,)).generate_speech(text="x"))
    assert e.value.code == "AI_UNAVAILABLE"

    async def slow():
        await asyncio.sleep(1)

    install_tts(monkeypatch, {KEY_A: slow})
    with pytest.raises(AppError) as e:
        asyncio.run(tts_client(keys=(KEY_A,), timeout=0.05).generate_speech(text="x"))
    assert e.value.code == "AI_TIMEOUT"


# ---------- Sindhi across the other endpoints ----------
def test_intake_accepts_sindhi_interface_and_returns_sindhi_detected(client):
    fake = wire(Fake(GOOD_SD))
    r = client.post("/intake", data={"ui_language": "sd", "text": "دادو ڀرسان اٽڪل 40 گهر پاڻي ۾ آهن"})
    assert r.status_code == 200 and r.json()["detectedLanguage"] == "sd"
    assert "Sindhi" in fake.systems[0] and "sd" in fake.users[0]


def test_transcribe_and_site_chat_accept_sindhi(client):
    fake = wire(Fake({"text": "بدين کي گهٽ پاڻي ڇو مليو؟", "detectedLanguage": "sd"}))
    r = client.post("/transcribe", files={"audio": ("a.webm", b"x" * 400, "audio/webm")}, data={"target_language": "sd"})
    assert r.status_code == 200 and r.json()["detectedLanguage"] == "sd"
    assert "Sindhi" in fake.systems[0]

    fake = wire(Fake({"inScope": True, "answer": "ويب سائيٽ جي مدد لاءِ نئين درخواست کوليو."}))
    r = client.post("/site-chat", json={"question": "مدد ڪيئن گهرجي؟", "uiLanguage": "sd"})
    assert r.status_code == 200 and "Answer language: sd" in fake.users[0]
    assert "Sindhi" in fake.systems[0]


def test_unknown_language_is_still_rejected(client):
    wire(Fake())
    assert client.post("/site-chat", json={"question": "hi", "uiLanguage": "fr"}).status_code == 400
    assert client.post("/intake", data={"ui_language": "fr", "text": "x"}).status_code == 400


# ---------- localized fixed refusals and stray-script cleanup ----------
def test_site_chat_refusal_follows_the_chosen_language(client):
    from app.prompts.site_help import SITE_REFUSALS

    for lang in ("en", "ur", "sd"):
        wire(Fake({"inScope": False, "answer": "Paris!"}))
        r = client.post("/site-chat", json={"question": "capital of France?", "uiLanguage": lang})
        assert r.json() == {"inScope": False, "answer": SITE_REFUSALS[lang]}
    assert SITE_REFUSALS["ur"] != SITE_REFUSALS["sd"] != SITE_REFUSALS["en"]


def test_chat_refusal_is_localized_but_english_is_unchanged():
    from app.prompts.chat import FIXED_REFUSAL
    from app.services.chat_service import refusal

    assert refusal().answer == FIXED_REFUSAL == refusal("en").answer
    assert refusal("sd").answer != FIXED_REFUSAL and refusal("ur").answer != refusal("sd").answer
    assert refusal("sd").inScope is False and refusal("sd").sources == []


def test_stray_letters_from_other_scripts_are_removed_from_answers(client):
    wire(Fake({"inScope": True, "answer": "تصديق واري بٽڻ تي ڪ୍لڪ ڪريو."}))
    r = client.post("/site-chat", json={"question": "ڪيئن؟", "uiLanguage": "sd"})
    assert r.json()["answer"] == "تصديق واري بٽڻ تي ڪلڪ ڪريو."


# ---------- fallback speech model and raw audio ----------
import io
import struct
import wave


def test_raw_pcm_is_wrapped_as_a_playable_wav_and_wav_is_left_alone():
    pcm = struct.pack("<4h", 0, 1000, -1000, 5)
    wav = gc.pcm_to_wav(pcm, "audio/l16; rate=24000; channels=1")
    with wave.open(io.BytesIO(wav)) as w:
        assert (w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()) == (1, 2, 24000, 4)
        assert w.readframes(4) == pcm
    assert gc.pcm_to_wav(WAV) == WAV


def make_two_model_client(monkeypatch, behaviours, timeout=0.05):
    calls = []

    class FakeInteractions:
        async def create(self, **kw):
            calls.append(kw["model"])
            result = behaviours[kw["model"]]()
            if asyncio.iscoroutine(result):
                result = await result
            return result

    class FakeClient:
        def __init__(self, api_key):
            self.aio = type("Aio", (), {"interactions": FakeInteractions()})()

    import google.genai as genai
    monkeypatch.setattr(genai, "Client", FakeClient)
    settings = Settings(gemini_keys=[KEY_A], gemini_tts_model="main", gemini_tts_fallback_model="backup",
                        tts_timeout_seconds=timeout, tts_fallback_timeout_seconds=1.0)
    return gc.GeminiClient(settings), calls


def test_slow_main_model_falls_back_and_is_skipped_next_time(monkeypatch):
    async def hang():
        await asyncio.sleep(5)

    ok = lambda: FakeInteraction(base64.b64encode(WAV).decode())  # noqa: E731
    client, calls = make_two_model_client(monkeypatch, {"main": hang, "backup": ok})
    assert asyncio.run(client.generate_speech(text="x")) == WAV
    assert calls == ["main", "backup"]
    assert asyncio.run(client.generate_speech(text="y")) == WAV
    assert calls == ["main", "backup", "backup"]  # the slow model is skipped for a few minutes


def test_both_models_failing_reports_the_error(monkeypatch):
    async def hang():
        await asyncio.sleep(5)

    client, _ = make_two_model_client(monkeypatch, {"main": hang, "backup": hang}, timeout=0.05)
    client._settings = Settings(gemini_keys=[KEY_A], gemini_tts_model="main", gemini_tts_fallback_model="backup",
                                tts_timeout_seconds=0.05, tts_fallback_timeout_seconds=0.05)
    with pytest.raises(AppError) as e:
        asyncio.run(client.generate_speech(text="x"))
    assert e.value.code == "AI_TIMEOUT"
