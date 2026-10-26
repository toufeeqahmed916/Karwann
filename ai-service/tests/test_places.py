"""Questions in Urdu and Sindhi find the right places, so the assistant is given the right records."""
import json

import pytest

from app.services.chat_context import build_context
from app.services.place_aliases import normalise, place_in_text

DATA = {
    "requests": [
        {"id": "req_badin", "area": "Badin", "score": {"total": 40}, "items": []},
        {"id": "req_dadu", "area": "Dadu", "score": {"total": 90}, "items": []},
    ],
    "allocation": [
        {"id": "alc_badin", "requestId": "req_badin", "area": "Badin", "item": "water", "qty": 320, "qtyNeeded": 500},
        {"id": "alc_dadu", "requestId": "req_dadu", "area": "Dadu", "item": "water", "qty": 500, "qtyNeeded": 500},
    ],
    "depots": [{"id": "dep_hyd", "name": "Hyderabad Depot", "stock": [], "vehicles": []}],
    "deliveries": [],
}


@pytest.mark.parametrize("question", [
    "Why did Badin receive less water?",
    "بدین کو کم پانی کیوں ملا؟",          # Urdu
    "بدين کي گهٽ پاڻي ڇو مليو؟",          # Sindhi
])
def test_question_in_any_language_selects_badin(question):
    text, known = build_context(DATA, question)
    payload = json.loads(text)
    assert [r["id"] for r in payload["requests"]] == ["req_badin"]
    assert [a["id"] for a in payload["allocations"]] == ["alc_badin"]
    assert ("allocation", "alc_badin") in known and ("allocation", "alc_dadu") not in known


def test_depot_named_in_sindhi_or_urdu_is_found():
    for question in ("حيدرآباد ڊپو ۾ ڪيترو پاڻي آهي؟", "حیدرآباد ڈپو میں کتنا پانی ہے؟"):
        payload = json.loads(build_context(DATA, question)[0])
        assert payload["contextScope"].startswith("focused")


def test_unrelated_question_stays_general():
    payload = json.loads(build_context(DATA, "ڪهڙا نازڪ علائقا باقي آهن؟")[0])
    assert payload["contextScope"].startswith("general")


def test_letter_normalisation_and_all_places_match_their_own_spellings():
    assert normalise("ڪراچي") == normalise("کراچی")
    assert place_in_text("larkana", "لاڙڪاڻو ۾ مدد") and place_in_text("thatta", "ٺٽو")
    assert not place_in_text("badin", "دادو ۾ پاڻي")


# ---------- the area of a report is always saved in English letters ----------
import json as _json

from fastapi.testclient import TestClient

from app.main import app
from app.routes.intake import get_gemini
from app.services.place_aliases import canonical_place


def test_known_places_in_any_script_become_the_english_name():
    assert canonical_place("دادو") == "Dadu"
    assert canonical_place("ٽنڊو الهيار") == "Tando Allahyar"
    assert canonical_place("حیدرآباد") == "Hyderabad"
    assert canonical_place("ڪراچي") == "Karachi"
    assert canonical_place("Gambat") == "Gambat"
    assert canonical_place("گمبٽ") == "Gambat"
    assert canonical_place("gambar") == "Gambat"
    assert canonical_place("Mirpurkhas") == "Mirpurkhas"
    assert canonical_place("some small village") is None and canonical_place("") is None and canonical_place(None) is None


class FakeGemini:
    def __init__(self, area, transcript):
        self.area, self.transcript = area, transcript

    async def generate_json(self, *, system, user, schema, audio=None):
        return _json.dumps({
            "area": self.area, "people": 50, "peopleIsEstimate": True, "urgency": "high", "vulnerable": ["children"],
            "supplies": [{"item": "food", "qty": 0}], "access": None, "detectedLanguage": "sd",
            "englishText": "About fifty houses are in the water.", "transcript": self.transcript,
            "confidence": {"area": 0.9, "people": 0.6, "urgency": 0.7, "vulnerable": 0.8, "supplies": 0.3, "access": 0.0},
        })


def _post(fake, **kwargs):
    app.dependency_overrides[get_gemini] = lambda: fake
    try:
        return TestClient(app).post("/intake", **kwargs)
    finally:
        app.dependency_overrides.clear()


def test_spoken_sindhi_area_is_saved_in_english_and_the_transcript_is_kept():
    r = _post(FakeGemini("ٽنڊو الهيار", "اٽڪل پنجاهه گهر پاڻي ۾ آهن"), data={"ui_language": "en"},
              files={"audio": ("a.webm", b"x" * 400, "audio/webm")})
    body = r.json()
    assert r.status_code == 200 and body["area"] == "Tando Allahyar"
    assert body["transcript"] == "اٽڪل پنجاهه گهر پاڻي ۾ آهن" and body["detectedLanguage"] == "sd"


def test_unknown_village_is_left_as_the_model_wrote_it_and_typed_text_has_no_transcript():
    r = _post(FakeGemini("Pir Jo Goth", "should be dropped"), data={"ui_language": "sd", "text": "پير جو ڳوٺ ۾ ٻوڏ آهي"})
    body = r.json()
    assert body["area"] == "Pir Jo Goth" and body["transcript"] == ""
