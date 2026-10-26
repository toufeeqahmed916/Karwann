"""DEV ONLY: the REAL AI service (routes, validation, CORS, Express client) with a deterministic stand-in for Gemini.

Run from ai-service/:  .venv/Scripts/python -m uvicorn scripts.dev_stack.stub_ai:app --port 8000
Needs KARWAN_API_URL=http://localhost:4000 (see .env). It checks the plumbing, NOT Gemini's language quality.
"""
import json
import re

from app.main import create_app
from app.routes.intake import get_gemini

AREAS = ["Jacobabad", "Dadu", "Sehwan", "Larkana", "Badin", "Nawabshah", "Sanghar", "Thatta", "Mirpurkhas", "Khairpur"]
KEYWORDS = re.compile(r"request|stock|allocat|deliver|depot|water|food|medicine|shelter|score|rank|receive|supply|truck", re.I)


SINDHI_LETTERS = re.compile(r"[ڄڃڻڏڌڙڪڳٻڀٿٽڇڦ]")


def _silent_wav(seconds: float = 0.4, rate: int = 24000) -> bytes:
    import io
    import wave

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b"\x00\x00" * int(rate * seconds))
    return buffer.getvalue()


class StubGemini:
    async def generate_speech(self, *, text):
        return _silent_wav()

    async def generate_json(self, *, system, user, schema, audio=None):
        name = schema.__name__
        if name == "IntakeResult":
            text = user if audio is None else "Dadu has 240 people, children, need 500 water"
            area = next((a for a in AREAS if a.lower() in text.lower()), None)
            people = re.search(r"(\d{2,5})\s*(people|log|افراد)", text)
            water = re.search(r"(\d{2,5})\s*(litre|water|پانی)", text, re.I)
            has_info = bool(area or people)
            return json.dumps({
                "area": area, "people": int(people.group(1)) if people else None, "peopleIsEstimate": bool(people),
                "urgency": "high" if re.search(r"urgent|critical|emergency", text, re.I) else None,
                "vulnerable": ["children"] if re.search(r"child|بچ", text, re.I) else [],
                "supplies": ([{"item": "water", "qty": int(water.group(1)) if water else 0}] if re.search(r"water|پانی", text, re.I) else []),
                "access": "hard" if re.search(r"cut off|blocked|بند", text, re.I) else None,
                "detectedLanguage": "sd" if SINDHI_LETTERS.search(text) else ("ur" if re.search(r"[؀-ۿ]", text) else "en"),
                "englishText": text.strip()[:200] if has_info else "", "transcript": text.strip()[:300] if audio is not None else "",
                "confidence": {"area": 0.9 if area else 0, "people": 0.6 if people else 0, "urgency": 0.7, "vulnerable": 0.8, "supplies": 0.5, "access": 0.6},
            })
        if name == "TranslateResult":
            return json.dumps({"text": user.split('"""')[1].strip()})
        if name == "TranscribeResult":
            return json.dumps({"text": "Why did Badin receive less water?", "detectedLanguage": "en"})
        if name == "ChatModelOutput":
            q = re.search(r'"""\n(.*?)\n"""', user, re.S).group(1)
            if not KEYWORDS.search(q) and not any(a.lower() in q.lower() for a in AREAS):
                return json.dumps({"inScope": False, "answer": "", "sourceIds": []})
            data = json.loads(user.split("DATA:\n", 1)[1])
            rows = data["allocations"]
            if rows:
                a = rows[0]
                return json.dumps({"inScope": True, "sourceIds": [{"type": "allocation", "id": a["id"]}],
                                   "answer": f"{a['area']} needed {a['qtyNeeded']} units of {a['item']} and received {a['qty']}. {a['reason']}"})
            return json.dumps({"inScope": True, "answer": "No allocation exists yet. Generate and approve one first.", "sourceIds": []})
        raise RuntimeError(f"unexpected schema {name}")


app = create_app()
app.dependency_overrides[get_gemini] = lambda: StubGemini()
