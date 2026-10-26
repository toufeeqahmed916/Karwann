import { useEffect, useRef, useState } from "react";
import { speakText } from "../lib/aiApi.js";
import { useLanguage } from "../lib/i18n.jsx";

const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;

function pickVoice(lang) {
  const voices = synth?.getVoices() ?? [];
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
}

/**
 * Reads an answer aloud in English, Urdu or Sindhi.
 * English uses the browser's own voice when there is one (instant, free). Urdu and Sindhi use the AI service's
 * natural voice (Gemini speech), because browsers rarely have an Urdu voice and almost never a Sindhi one.
 * The recording is kept after the first play, so listening again is instant. `autoPlay` reads it as soon as it appears.
 */
export default function SpeakerButton({ text, lang = "en", autoPlay = false }) {
  const { t, lang: uiLanguage } = useLanguage();
  const [voice, setVoice] = useState(() => pickVoice(lang));
  const [phase, setPhase] = useState("idle"); // idle | loading | playing
  const [failed, setFailed] = useState(false);
  const audio = useRef(null);
  const url = useRef(null);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!synth) return undefined;
    const update = () => setVoice(pickVoice(lang));
    update();
    synth.addEventListener?.("voiceschanged", update); // voices load asynchronously in Chrome
    return () => synth.removeEventListener?.("voiceschanged", update);
  }, [lang]);

  function stopAll() {
    synth?.cancel();
    audio.current?.pause();
    audio.current = null;
    setPhase("idle");
  }

  // New text or language: forget the old recording. Leaving the page: stop talking.
  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
      synth?.cancel();
      audio.current?.pause();
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = null;
    };
  }, [text, lang]);

  function speakWithBrowser() {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.onend = utterance.onerror = () => setPhase("idle");
    setPhase("playing");
    synth.speak(utterance);
  }

  async function start() {
    stopAll();
    setFailed(false);
    if (lang === "en" && voice) return speakWithBrowser();
    try {
      setPhase("loading");
      if (!url.current) url.current = URL.createObjectURL(await speakText({ text, language: lang }));
      if (cancelled.current) return;
      const player = new Audio(url.current);
      audio.current = player;
      player.onended = player.onerror = () => setPhase("idle");
      await player.play();
      setPhase("playing");
    } catch {
      if (cancelled.current) return;
      if (voice) return speakWithBrowser(); // the natural voice is unavailable: use the browser's if it has one
      setPhase("idle");
      setFailed(true);
    }
  }

  // Changing the interface language stops anything that is being read aloud.
  useEffect(() => () => {
    synth?.cancel();
    audio.current?.pause();
    setPhase("idle");
  }, [uiLanguage]);

  // `autoPlay` reads the answer when it first appears and again when its text changes (for example after a translation).
  const autoPlayRef = useRef(autoPlay);
  autoPlayRef.current = autoPlay;
  useEffect(() => {
    if (autoPlayRef.current) start();
  }, [text, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const playing = phase === "playing";
  const loading = phase === "loading";
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" className="btn-ghost px-2 py-1 text-xs" disabled={loading}
        onClick={playing ? stopAll : start} aria-pressed={playing}
        aria-label={playing ? t("speaker.stopLabel") : t("speaker.listenLabel")}>
        <span aria-hidden="true">{playing ? "■" : "🔊"}</span> {loading ? t("speaker.loading") : playing ? t("speaker.stop") : t("speaker.listen")}
      </button>
      {failed && <span role="alert" className="text-xs text-crit">{t("speaker.error")}</span>}
    </span>
  );
}
