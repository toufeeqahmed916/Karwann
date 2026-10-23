// ALL calls to the Karwan AI service (FastAPI) live here. Operational calls stay in api.js.
// Mock mode: VITE_AI_USE_MOCKS=true returns fixed responses so UI work never waits on the AI service.
// Never put Gemini keys in VITE_* variables - only the service URL.
import intakeEn from "../mocks/ai/intake_en.json";
import intakeUnknown from "../mocks/ai/intake_unknown.json";

const USE_MOCKS = import.meta.env.VITE_AI_USE_MOCKS === "true";
const AI_URL = import.meta.env.VITE_AI_API_URL?.replace(/\/$/, "");
const TIMEOUT_MS = { intake: 30000, chat: 30000, transcribe: 20000 };

const wait = (ms = 600) => new Promise((r) => setTimeout(r, ms));
const clone = (x) => JSON.parse(JSON.stringify(x));

export class AiError extends Error {
  constructor({ code, message, retryable = false, requestId = null }) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.requestId = requestId;
  }
}

async function aiFetch(path, { timeoutMs, ...opts }) {
  if (!AI_URL) {
    throw new AiError({ code: "AI_UNAVAILABLE", message: "AI service is not configured. Use the manual form." });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(AI_URL + path, { ...opts, signal: controller.signal });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new AiError({
        code: json.error?.code || "AI_UNAVAILABLE",
        message: json.error?.message || "The AI assistant is unavailable. You can continue with the manual form.",
        retryable: !!json.error?.retryable,
        requestId: json.requestId,
      });
    }
    return json;
  } catch (e) {
    if (e instanceof AiError) throw e;
    const timedOut = e.name === "AbortError";
    throw new AiError({
      code: timedOut ? "AI_TIMEOUT" : "AI_UNAVAILABLE",
      message: timedOut
        ? "The AI assistant is busy. You can continue with the manual form."
        : "Could not reach the AI assistant. You can continue with the manual form.",
      retryable: true,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Wake-up ping. Safe to call on page load; never uses Gemini. */
export async function aiHealth() {
  if (USE_MOCKS) return { status: "ok", service: "karwan-ai" };
  return aiFetch("/health", { method: "GET", timeoutMs: 60000 });
}

/**
 * Text report -> editable structured fields. Does NOT save anything.
 * Retries automatically ONCE when the service says retryable=true.
 * Mock triggers: text containing "error" fails; very short text returns an all-unknown result.
 */
export async function analyseReport({ text, uiLanguage }) {
  if (USE_MOCKS) {
    await wait();
    if (/error/i.test(text)) {
      throw new AiError({ code: "AI_TIMEOUT", message: "The AI assistant is busy. You can continue with the manual form.", retryable: true });
    }
    return clone(text.trim().length < 25 ? intakeUnknown : intakeEn);
  }
  const send = () => {
    const form = new FormData(); // browser sets the multipart boundary
    form.append("text", text);
    form.append("ui_language", uiLanguage);
    return aiFetch("/intake", { method: "POST", body: form, timeoutMs: TIMEOUT_MS.intake });
  };
  try {
    return await send();
  } catch (e) {
    if (e instanceof AiError && e.retryable) return send();
    throw e;
  }
}

const AUDIO_EXT = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/wav": "wav", "audio/mp4": "m4a" };
function audioFile(blob) {
  const base = (blob.type || "audio/webm").split(";")[0];
  return new File([blob], `report.${AUDIO_EXT[base] || "webm"}`, { type: blob.type || base });
}

/** Voice report (<= ~30 s) -> editable structured fields. Never auto-retried: an ambiguous upload could be double-processed. */
export async function analyseAudio({ blob, uiLanguage }) {
  if (USE_MOCKS) {
    await wait(900);
    return { ...clone(intakeEn), detectedLanguage: uiLanguage };
  }
  const form = new FormData();
  form.append("audio", audioFile(blob));
  form.append("ui_language", uiLanguage);
  return aiFetch("/intake", { method: "POST", body: form, timeoutMs: TIMEOUT_MS.intake });
}

/** Short audio -> text. Used by the assistant (Phase 6). */
export async function transcribeAudio({ blob, targetLanguage }) {
  if (USE_MOCKS) {
    await wait(700);
    return { text: "Why did Badin receive less water?", detectedLanguage: "en" };
  }
  const form = new FormData();
  form.append("audio", audioFile(blob));
  if (targetLanguage) form.append("target_language", targetLanguage);
  return aiFetch("/transcribe", { method: "POST", body: form, timeoutMs: TIMEOUT_MS.transcribe });
}

export const FIXED_REFUSAL = "I can only answer questions about Karwan's requests, stock, allocations, and deliveries.";

const OFF_TOPIC = /capital|weather|recipe|joke|football|cricket|movie|president|bitcoin/i;

/**
 * Ask the scoped assistant. The service reads live Karwan data and explains it; React never computes quantities.
 * Read-only, so one automatic retry on retryable errors is safe.
 * Mock triggers: "error" -> timeout, "unavailable" -> Karwan API down, "capital"/"weather"/... -> refusal, "badin" -> factual answer.
 */
export async function askAssistant({ question, uiLanguage }) {
  if (USE_MOCKS) {
    await wait(800);
    if (/unavailable/i.test(question)) {
      throw new AiError({ code: "KARWAN_API_UNAVAILABLE", message: "Karwan data is unavailable right now. Please try again shortly.", retryable: true });
    }
    if (/error/i.test(question)) {
      throw new AiError({ code: "AI_TIMEOUT", message: "The AI assistant is busy. Please try again in a moment.", retryable: true });
    }
    if (OFF_TOPIC.test(question)) return { inScope: false, answer: FIXED_REFUSAL, sources: [] };
    if (/badin/i.test(question)) {
      return {
        inScope: true,
        answer: "Badin needed 500 units of water and received 320. Available stock was limited, so it was shared according to priority score and remaining need.",
        sources: [{ type: "allocation", id: "alc_123" }],
      };
    }
    return { inScope: true, answer: "Mock answer: two critical areas still have unmet water needs.", sources: [{ type: "request", id: "req_01" }] };
  }
  const send = () => aiFetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, uiLanguage }),
    timeoutMs: TIMEOUT_MS.chat,
  });
  try {
    return await send();
  } catch (e) {
    if (e instanceof AiError && e.retryable) return send();
    throw e;
  }
}

const SITE_REFUSAL = "I can only answer questions about how to use the Karwan website.";

/**
 * Public website help bot (no staff login, no live data). Mock triggers: "capital"/"weather"/... -> refusal, "error" -> failure.
 */
export async function askSiteHelper({ question, uiLanguage }) {
  if (USE_MOCKS) {
    await wait(600);
    if (/error/i.test(question)) throw new AiError({ code: "AI_TIMEOUT", message: "Busy.", retryable: true });
    if (OFF_TOPIC.test(question)) return { inScope: false, answer: SITE_REFUSAL };
    return { inScope: true, answer: "Open New request, describe the situation, check the form, drop a pin on the map and press Confirm request." };
  }
  const send = () => aiFetch("/site-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, uiLanguage }),
    timeoutMs: TIMEOUT_MS.chat,
  });
  try {
    return await send();
  } catch (e) {
    if (e instanceof AiError && e.retryable) return send();
    throw e;
  }
}
