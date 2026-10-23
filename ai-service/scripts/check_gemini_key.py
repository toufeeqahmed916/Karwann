"""Diagnose your Gemini keys. Run from ai-service/:   python scripts/check_gemini_key.py

Prints only the SHAPE of each key (never the key) and tries each key on BOTH Google endpoints:
  studio = Gemini Developer API (AI Studio)     vertex = Vertex AI (Google Cloud)
Then tells you exactly what to put in .env.
"""
import asyncio
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252 and cannot print Urdu

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings  # noqa: E402
from app.services.gemini_client import _make_client  # noqa: E402

HINTS = {
    400: "Bad request: usually a wrong model name or an invalid key.",
    401: "Google rejected the key on this endpoint (wrong key type for it, deleted, or mistyped).",
    403: "Key is recognised but this API is disabled for its project (or not allowed).",
    404: "The MODEL name is not available on this endpoint. Check GEMINI_MODEL.",
    429: "Key works but quota is used up. Wait, or use another key/project.",
}


async def try_backend(genai, errors, key: str, backend: str, model: str) -> tuple[bool, str]:
    try:
        client = _make_client(genai, key, backend)
        r = await asyncio.wait_for(
            client.aio.models.generate_content(model=model, contents="Reply with the single word: ok"), timeout=25
        )
        return True, f"WORKS (replied {(r.text or '').strip()[:20]!r})"
    except errors.APIError as e:
        code = getattr(e, "code", None)
        msg = str(getattr(e, "message", None) or e).replace(key, "***")[:140]
        return False, f"code={code}: {msg}  -> {HINTS.get(code, '')}"
    except Exception as e:  # network, timeout...
        return False, f"{type(e).__name__}: {str(e).replace(key, '***')[:120]}"


async def main() -> None:
    from google import genai
    from google.genai import errors

    s = get_settings()
    if not s.gemini_keys:
        sys.exit("No GEMINI_KEY_A found in ai-service/.env")
    print(f"Model: {s.gemini_model} | GEMINI_BACKEND in .env: {s.gemini_backend}\n")
    working: dict[int, str] = {}
    for i, key in enumerate(s.gemini_keys):
        shape = "AIza (AI Studio style)" if key.startswith("AIza") else "AQ. (Google Cloud style)" if key.startswith("AQ.") else "unknown style"
        print(f"Key #{i}: length={len(key)}, {shape}")
        for backend in ("studio", "vertex"):
            ok, text = await try_backend(genai, errors, key, backend, s.gemini_model)
            print(f"   {backend:6} -> {text}")
            if ok and i not in working:
                working[i] = backend
        print()
    if not working:
        print("RESULT: no key works yet.\n  Easiest free fix: create a key at https://aistudio.google.com/apikey and use it as GEMINI_KEY_A.")
        return
    chosen = set(working.values())
    print("RESULT: working keys ->", {f"#{k}": v for k, v in working.items()})
    if chosen == {"studio"}:
        print("  Put GEMINI_BACKEND=studio in ai-service/.env (or leave it empty if keys start with AIza).")
    elif chosen == {"vertex"}:
        print("  Put GEMINI_BACKEND=vertex in ai-service/.env.")
    else:
        print("  Keys need different endpoints; use keys of one type for simplicity.")


asyncio.run(main())
