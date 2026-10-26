// When a person switches language, text that is already on screen follows: answers in the assistant and help bot,
// and the "what we understood" summary of a report. The AI service translates it (POST /translate) and the result
// is remembered, so switching back and forth costs nothing extra.
import { useEffect, useRef, useState } from "react";
import { translateText } from "./aiApi.js";

const cache = new Map(); // `${language}\n${text}` -> translated text, shared by every screen

export async function translateCached(text, language) {
  const key = `${language}\n${text}`;
  if (cache.has(key)) return cache.get(key);
  const translated = await translateText({ text, targetLanguage: language });
  cache.set(key, translated);
  return translated;
}

// ---- chat messages ----
// A message looks like { id, role, text, lang, error?, translations?, failed? }:
// `text` is the original answer in `lang`; `translations[code]` holds it in another language once it is ready.
export const shownText = (message, lang) => message.translations?.[lang] ?? message.text;
export const shownLang = (message, lang) => (message.translations?.[lang] ? lang : message.lang);
export const needsTranslation = (message, lang) =>
  message.role !== "user" && !message.error && !!message.text && !!message.lang && message.lang !== lang;
export const isTranslating = (message, lang) =>
  needsTranslation(message, lang) && !message.translations?.[lang] && !message.failed?.[lang];

/** Translates every answer that is not yet in `lang`, one at a time (it is a free-tier service). */
export function useAutoTranslate(messages, setMessages, lang) {
  const inFlight = useRef(new Set());
  useEffect(() => {
    const todo = messages.filter((m) => isTranslating(m, lang) && !inFlight.current.has(`${m.id}:${lang}`));
    if (!todo.length) return;
    todo.forEach((m) => inFlight.current.add(`${m.id}:${lang}`));
    (async () => {
      for (const m of todo) {
        let patch;
        try {
          patch = { translations: { ...m.translations, [lang]: await translateCached(m.text, lang) } };
        } catch {
          patch = { failed: { ...m.failed, [lang]: true } };
        }
        setMessages((previous) => previous.map((x) => (x.id === m.id ? { ...x, ...patch, translations: { ...x.translations, ...patch.translations }, failed: { ...x.failed, ...patch.failed } } : x)));
        inFlight.current.delete(`${m.id}:${lang}`);
      }
    })();
  }, [messages, lang, setMessages]);
}

/** Lets the person try again after a failed translation. */
export const clearFailure = (message, lang) => ({ ...message, failed: { ...message.failed, [lang]: false } });

// ---- one piece of text (the report summary) ----
/** `text` is written in English. Returns it in `lang` ({ text, pending, failed }); `enabled=false` returns it as is. */
export function useTranslatedText(text, lang, enabled = true) {
  const [state, setState] = useState({ key: "", value: "", failed: false });
  const key = `${lang}\n${text}`;
  useEffect(() => {
    if (!enabled || !text || lang === "en") return undefined;
    let cancelled = false;
    translateCached(text, lang)
      .then((value) => !cancelled && setState({ key, value, failed: false }))
      .catch(() => !cancelled && setState({ key, value: "", failed: true }));
    return () => { cancelled = true; };
  }, [key, enabled, text, lang]);

  if (!enabled || !text || lang === "en") return { text, pending: false, failed: false };
  if (state.key === key) return { text: state.failed ? text : state.value, pending: false, failed: state.failed };
  return { text, pending: true, failed: false };
}
