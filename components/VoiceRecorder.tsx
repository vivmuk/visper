"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/lib/toast/ToastContext";
import { apiFetch, errorMessage, haptic } from "@/lib/client/api";
import { MicIcon, StopIcon } from "./ui/Icons";

const MAX_SECONDS = 5 * 60;

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

/** Tap to record a voice note; the transcript is handed back as text. */
export default function VoiceRecorder({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [state, setState] = useState<"idle" | "recording" | "transcribing">("idle");
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Decided after mount so server and browser render the same markup.
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(!!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined");
    return () => cleanup();
  }, []);

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      recorder.onstop = () => transcribe(recorder.mimeType || mimeType || "audio/webm");
      recorder.start(1000);
      recorderRef.current = recorder;
      setSeconds(0);
      setState("recording");
      haptic(20);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stop();
          return s + 1;
        });
      }, 1000);
    } catch (error) {
      showToast(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in your browser settings to record voice notes."
          : "Couldn't start recording on this device",
        "error"
      );
    }
  }

  function stop() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    cleanup();
    haptic(10);
  }

  async function transcribe(mimeType: string) {
    setState("transcribing");
    try {
      const blob = new Blob(chunksRef.current, { type: mimeType.split(";")[0] });
      if (blob.size < 2000) throw new Error("That recording was too short");
      const form = new FormData();
      form.append("audio", blob, "voice-note");
      const { text } = await apiFetch<{ text: string }>(user, "/api/transcribe", {
        method: "POST",
        body: form,
      });
      onTranscript(text);
      showToast("Voice note transcribed", "success");
    } catch (error) {
      showToast(errorMessage(error, "Transcription failed"), "error");
    } finally {
      setState("idle");
    }
  }

  if (!supported) return null;

  if (state === "recording") {
    const mm = Math.floor(seconds / 60);
    const ss = String(seconds % 60).padStart(2, "0");
    return (
      <button
        type="button"
        onClick={stop}
        className="h-11 pl-3 pr-4 rounded-full bg-rose-500 text-white flex items-center gap-2 shadow-md"
        aria-label="Stop recording"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
        </span>
        <span className="tabular-nums text-sm font-medium">
          {mm}:{ss}
        </span>
        <StopIcon size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled || state === "transcribing"}
      className="h-11 px-3.5 rounded-full bg-white/80 border border-teal-200 text-slate-700 flex items-center gap-1.5 hover:bg-teal-50 disabled:opacity-50"
      aria-label="Record a voice note"
    >
      {state === "transcribing" ? (
        <>
          <span className="h-4 w-4 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
          <span className="text-sm">Listening…</span>
        </>
      ) : (
        <>
          <MicIcon size={19} />
          <span className="text-sm">Voice</span>
        </>
      )}
    </button>
  );
}
