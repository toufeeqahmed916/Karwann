import { useEffect, useState } from "react";
import { useLanguage } from "../lib/i18n.jsx";

const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;

function pickVoice(lang) {
  const voices = synth?.getVoices() ?? [];
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
}

/** Reads an answer aloud with the browser's own voices. Hidden when the browser has no suitable voice. */
export default function SpeakerButton({ text, lang = "en" }) {
  const { t } = useLanguage();
  const [voice, setVoice] = useState(() => pickVoice(lang));
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!synth) return undefined;
    const update = () => setVoice(pickVoice(lang));
    update();
    synth.addEventListener?.("voiceschanged", update); // voices load asynchronously in Chrome
    return () => {
      synth.removeEventListener?.("voiceschanged", update);
      if (speaking) synth.cancel();
    };
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!synth || !voice) return null;

  function toggle() {
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.onend = utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utterance);
  }

  return (
    <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={toggle} aria-pressed={speaking}
      aria-label={speaking ? t("speaker.stopLabel") : t("speaker.listenLabel")}>
      <span aria-hidden="true">{speaking ? "■" : "🔊"}</span> {speaking ? t("speaker.stop") : t("speaker.listen")}
    </button>
  );
}
