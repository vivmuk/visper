"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/lib/toast/ToastContext";
import { apiFetch, errorMessage, haptic } from "@/lib/client/api";
import { prepareImage } from "@/lib/client/images";
import { queueEntry } from "@/lib/client/outbox";
import { dailyPrompt, greeting, wordCount } from "@/lib/client/format";
import VoiceRecorder from "./VoiceRecorder";
import { CameraIcon, SparkleIcon, XIcon } from "./ui/Icons";
import type { EntryImage } from "@/types";

export const DRAFT_KEY = "visper:draft";
const MAX_IMAGES = 6;

interface PendingImage {
  id: string;
  file: File;
  preview: string;
}

interface CaptureFormProps {
  onSaved?: () => void;
}

export default function CaptureForm({ onSaved }: CaptureFormProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [improvedText, setImprovedText] = useState<string | null>(null);
  const [isImproving, setIsImproving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Photos already uploaded in a previous (failed) save attempt are reused.
  const uploadedRef = useRef<Map<string, EntryImage>>(new Map());
  const isSaving = saveStatus !== null;
  // Time-of-day text is set after mount (server and phone clocks differ).
  const [hello, setHello] = useState("");
  const [prompt, setPrompt] = useState("What's on your mind?");
  useEffect(() => {
    setHello(greeting());
    setPrompt(dailyPrompt());
  }, []);

  // Restore the draft (also used by "Write about this" from reflections).
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) setText(draft);
    } catch {
      // Storage unavailable
    }
  }, []);

  // Autosave the draft as you type.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (text) localStorage.setItem(DRAFT_KEY, text);
        else localStorage.removeItem(DRAFT_KEY);
        setDraftSaved(!!text);
      } catch {
        // Storage unavailable
      }
    }, 500);
    setDraftSaved(false);
    return () => clearTimeout(t);
  }, [text]);

  // Grow the textarea with its content.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 180)}px`;
  }, [text]);

  // Free preview URLs.
  useEffect(() => () => images.forEach((img) => URL.revokeObjectURL(img.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (incoming.length === 0) return;
      setImages((current) => {
        const room = MAX_IMAGES - current.length;
        if (incoming.length > room) {
          showToast(`You can add up to ${MAX_IMAGES} photos per entry`, "info");
        }
        const tooBig = incoming.filter((f) => f.size > 40 * 1024 * 1024);
        if (tooBig.length) showToast("Photos over 40 MB were skipped", "error");
        return [
          ...current,
          ...incoming
            .filter((f) => f.size <= 40 * 1024 * 1024)
            .slice(0, Math.max(0, room))
            .map((file) => ({
              id: Math.random().toString(36).slice(2),
              file,
              preview: URL.createObjectURL(file),
            })),
        ];
      });
    },
    [showToast]
  );

  const removeImage = (id: string) => {
    setImages((current) => {
      const img = current.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return current.filter((i) => i.id !== id);
    });
  };

  const handleImprove = async () => {
    if (!text.trim()) return;
    setIsImproving(true);
    try {
      const data = await apiFetch<{ improvedText: string }>(user, "/api/entries/improve", {
        method: "POST",
        body: JSON.stringify({ rawText: text }),
      });
      setImprovedText(data.improvedText);
    } catch (error) {
      showToast(errorMessage(error, "Couldn't polish that right now"), "error");
    } finally {
      setIsImproving(false);
    }
  };

  const reset = () => {
    setText("");
    setImprovedText(null);
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    uploadedRef.current.clear();
    if (fileInputRef.current) fileInputRef.current.value = "";
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Storage unavailable
    }
  };

  const handleSave = async (source: "raw" | "improved" | "both") => {
    if (!user || isSaving) return;
    if (!text.trim() && images.length === 0) return;

    const payload: Record<string, any> = {
      type: images.length ? "image" : "note",
      source,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      device: navigator.userAgent,
    };
    if (source === "raw" || source === "both") payload.rawText = text;
    if ((source === "improved" || source === "both") && improvedText) payload.improvedText = improvedText;

    // Offline: text entries wait in the outbox; photos need a connection.
    if (!navigator.onLine) {
      if (images.length) {
        showToast("Photos need a connection. Remove them to save this offline.", "error");
        return;
      }
      queueEntry(user.uid, payload);
      haptic([10, 40, 10]);
      showToast("Saved on this device — it will sync when you're back online", "info");
      reset();
      return;
    }

    try {
      let uploaded: EntryImage[] = [];
      if (images.length) {
        let done = 0;
        setSaveStatus(`Preparing ${images.length} photo${images.length > 1 ? "s" : ""}…`);
        uploaded = await Promise.all(
          images.map(async (img) => {
            const already = uploadedRef.current.get(img.id);
            if (already) {
              done++;
              return already;
            }
            const prepared = await prepareImage(img.file);
            const form = new FormData();
            form.append("file", prepared.file);
            if (prepared.width) form.append("width", String(prepared.width));
            if (prepared.height) form.append("height", String(prepared.height));
            const { image } = await apiFetch<{ image: EntryImage }>(user, "/api/upload", {
              method: "POST",
              body: form,
            });
            uploadedRef.current.set(img.id, image);
            done++;
            setSaveStatus(`Uploading photos ${done}/${images.length}…`);
            return image;
          })
        );
        payload.images = uploaded;
      }

      setSaveStatus("Saving & tagging…");
      await apiFetch(user, "/api/entries", { method: "POST", body: JSON.stringify(payload) });
      haptic([10, 40, 10]);
      showToast("Saved to your journal ✨", "success");
      reset();
      onSaved?.();
    } catch (error) {
      showToast(errorMessage(error, "Couldn't save. Your draft is still here."), "error");
    } finally {
      setSaveStatus(null);
    }
  };

  const canSave = (text.trim().length > 0 || images.length > 0) && !isSaving;
  const words = wordCount(text);

  return (
    <div
      className="animate-rise-in"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setIsDragging(true);
        }
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      <p className="text-sm text-slate-500 mb-2 px-1 min-h-5">
        {hello}
        {hello && user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}
      </p>

      <div
        className={`watercolor-card rounded-3xl border transition-colors ${
          isDragging ? "border-purple-400 ring-4 ring-purple-200/60" : "border-white/70"
        }`}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSave(improvedText ? "improved" : "raw");
            }
          }}
          onPaste={(e) => {
            if (e.clipboardData.files.length) {
              e.preventDefault();
              addFiles(e.clipboardData.files);
            }
          }}
          placeholder={prompt}
          aria-label="Journal entry"
          className="w-full min-h-[180px] bg-transparent px-5 pt-5 pb-2 text-[17px] leading-relaxed resize-none focus:outline-none placeholder:text-slate-400"
          disabled={isSaving}
        />

        {images.length > 0 && (
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
            {images.map((img) => (
              <div key={img.id} className="relative shrink-0">
                <img
                  src={img.preview}
                  alt=""
                  className="h-24 w-24 object-cover rounded-2xl border border-white shadow-sm"
                />
                {!isSaving && (
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute -top-1.5 -right-1.5 h-7 w-7 grid place-items-center rounded-full bg-slate-800/80 text-white shadow"
                    aria-label="Remove photo"
                  >
                    <XIcon size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
              className="hidden"
              id="image-upload"
              disabled={isSaving}
            />
            <label
              htmlFor="image-upload"
              className={`h-11 px-3.5 rounded-full bg-white/80 border border-teal-200 text-slate-700 flex items-center gap-1.5 cursor-pointer hover:bg-teal-50 ${
                isSaving || images.length >= MAX_IMAGES ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <CameraIcon size={19} />
              <span className="text-sm">Photo</span>
            </label>
            <VoiceRecorder
              disabled={isSaving}
              onTranscript={(t) => setText((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${t}` : t))}
            />
          </div>
          <span className="text-xs text-slate-400 tabular-nums pr-1">
            {words > 0 && `${words} word${words === 1 ? "" : "s"}`}
            {draftSaved && words > 0 && " · draft saved"}
          </span>
        </div>
      </div>

      {improvedText ? (
        <div className="mt-4 rounded-3xl border border-purple-200 bg-gradient-to-br from-teal-50/90 via-purple-50/90 to-pink-50/90 p-5 animate-rise-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-800 flex items-center gap-1.5">
              <SparkleIcon size={18} className="text-purple-500" /> Polished version
            </h3>
            <button
              onClick={() => setImprovedText(null)}
              className="text-sm text-slate-500 px-2 py-1 rounded-full hover:bg-white/70"
            >
              Discard
            </button>
          </div>
          <p className="text-[16px] leading-relaxed text-slate-800 whitespace-pre-wrap">{improvedText}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              onClick={() => handleSave("raw")}
              disabled={!canSave}
              className="h-12 rounded-2xl bg-white/90 border border-teal-200 text-slate-700 text-sm font-medium disabled:opacity-50"
            >
              Keep mine
            </button>
            <button
              onClick={() => handleSave("improved")}
              disabled={!canSave}
              className="h-12 rounded-2xl btn-gradient text-sm font-semibold shadow-md disabled:opacity-50"
            >
              Use polished
            </button>
            <button
              onClick={() => handleSave("both")}
              disabled={!canSave}
              className="h-12 rounded-2xl bg-white/90 border border-purple-200 text-slate-700 text-sm font-medium disabled:opacity-50"
            >
              Keep both
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleImprove}
            disabled={!text.trim() || isImproving || isSaving}
            className="h-14 px-5 rounded-2xl bg-white/85 border border-purple-200 text-purple-700 font-medium flex items-center gap-2 disabled:opacity-50 hover:bg-purple-50"
          >
            {isImproving ? (
              <span className="h-4 w-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
            ) : (
              <SparkleIcon size={19} />
            )}
            {isImproving ? "Polishing…" : "Polish"}
          </button>
          <button
            onClick={() => handleSave("raw")}
            disabled={!canSave}
            className="flex-1 h-14 rounded-2xl btn-gradient font-semibold text-[17px] shadow-lg shadow-purple-200/60 disabled:opacity-40 disabled:shadow-none active:scale-[0.99] transition"
          >
            {saveStatus || "Save entry"}
          </button>
        </div>
      )}

      {improvedText && saveStatus && (
        <p className="mt-3 text-center text-sm text-slate-500">{saveStatus}</p>
      )}

      <p className="mt-4 text-center text-xs text-slate-400 hidden md:block">
        Tip: paste or drop photos straight into the box · ⌘/Ctrl + Enter to save
      </p>
    </div>
  );
}
