# Karwan AI Service (FastAPI + Gemini)

Understands reports and explains data. It never saves requests, scores, allocates or touches stock.

Status: `/health`, text + voice `/intake`, `/transcribe` and `/chat` are done.

## Run locally (Windows, Git Bash)

```bash
cd ai-service
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt   # requirements.txt = production only
cp .env.example .env        # then edit .env and paste your Gemini key
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

Interactive docs: http://localhost:8000/docs

## Check your keys first
```bash
.venv/Scripts/python scripts/check_gemini_key.py
```
Prints each key's type and makes one tiny test call (never prints the key). Fixes for common results:
- **401 / "API key not valid"**: wrong or mistyped key. Use a key from AI Studio (starts with `AIza`, 39 characters).
- **403 "API has not been used / disabled"**: the key's Google Cloud project has the API switched off. Use an AI Studio key, or enable the API from the link in the message.
- **404**: wrong `GEMINI_MODEL` name.
- **429**: quota used up.

Keys starting with `AQ.` (Google Cloud / Vertex express mode) are supported automatically, but need the Vertex AI API enabled on their project. Keys starting with `AIza` (AI Studio) are the simplest.

## Get a Gemini key
1. Open https://aistudio.google.com/apikey and sign in with a Google account.
2. Click **Create API key**, copy it.
3. Paste into `ai-service/.env` as `GEMINI_KEY_A=...` (optionally a second key from another project as `GEMINI_KEY_B`; used automatically if A hits quota).
4. Never paste the key in chat, frontend `.env`, or commit it (`.env` is git-ignored).

## Test it
| What | Command | Needs key? |
|---|---|---|
| All automated tests | `.venv/Scripts/python -m pytest -q` | No |
| Health | `curl localhost:8000/health` | No |
| Live Gemini check (4 sample reports) | `.venv/Scripts/python scripts/try_intake.py` | Yes |
| Live chat (real Express + Gemini) | `.venv/Scripts/python scripts/try_chat.py "Why did Badin receive less water?"` | Yes + running Express |
| Voice file via Gemini | `.venv/Scripts/python scripts/try_voice.py recording.webm ur` | Yes |
| One request via HTTP | `curl -X POST localhost:8000/intake -F ui_language=en -F "text=40 houses near Dadu flooded, need water"` | Yes |

## Chat needs Express
Set `KARWAN_API_URL` in `.env` to your running Express backend (e.g. `http://localhost:4000`). Hand-off list of fields read: `docs/chat-reads.md`.

## Sample responses
See `docs/samples/` (success EN/UR, unknown fields, quota error). The frontend mock copy lives in `frontend/src/mocks/ai/`.

## Deploy on Railway
1. Push the repo to GitHub. In Railway: **New Project -> Deploy from GitHub repo**.
2. Service **Settings -> Root Directory** = `ai-service`. Railway builds the `Dockerfile`.
3. **Variables**: `GEMINI_KEY_A`, `GEMINI_KEY_B` (optional), `GEMINI_MODEL`, `KARWAN_API_URL`, `FRONTEND_ORIGIN` (your Vercel URL, no trailing slash), `AI_REQUEST_TIMEOUT_SECONDS=20`.
4. **Settings -> Networking -> Generate Domain**. Open `https://<domain>/health`.
5. Put that URL in the frontend as `VITE_AI_API_URL` (and in Vercel env vars).
