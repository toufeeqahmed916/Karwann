import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../lib/i18n.jsx";

export const MAX_RECORD_SECONDS = 30;
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];

const supported = () =>
  typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
const clock = (s) => `0:${String(s).padStart(2, "0")}`;

/** Record up to 30 s, then hand the audio blob to the page. The page decides what to do with it. */
export default function MicButton({ onRecorded, onError, disabled = false, label }) {
  const { t } = useLanguage();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef(null);
  const stream = useRef(null);
  const timer = useRef(null);
  const cancelled = useRef(false);

  function cleanup() {
    clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    recorder.current = null;
    setRecording(false);
    setSeconds(0);
  }

  useEffect(() => () => {
    cancelled.current = true; // leaving the page discards the recording
    if (recorder.current?.state === "recording") recorder.current.stop();
    cleanup();
  }, []);

  async function start() {
    cancelled.current = false;
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError?.({ key: "mic.blocked" });
      return;
    }
    const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m));
    const chunks = [];
    const rec = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const type = rec.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunks, { type });
      const wasCancelled = cancelled.current;
      cleanup();
      if (wasCancelled) return;
      if (blob.size < 1000) onError?.({ key: "mic.silent" });
      else onRecorded(blob);
    };
    recorder.current = rec;
    rec.start();
    setRecording(true);
    let elapsed = 0;
    timer.current = setInterval(() => {
      elapsed += 1;
      setSeconds(elapsed);
      if (elapsed >= MAX_RECORD_SECONDS && rec.state === "recording") rec.stop(); // hard cap
    }, 1000);
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  if (!supported()) {
    return <p className="text-sm text-mute">{t("mic.unsupported")}</p>;
  }

  return recording ? (
    <button type="button" className="btn-primary" onClick={stop} aria-pressed="true">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-crit" />
      {t("mic.stop", { time: clock(seconds), max: clock(MAX_RECORD_SECONDS) })}
    </button>
  ) : (
    <button type="button" className="btn-ghost" onClick={start} disabled={disabled}>
      <span aria-hidden="true">🎙</span> {label ?? t("mic.record")}
    </button>
  );
}
