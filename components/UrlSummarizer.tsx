"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/lib/toast/ToastContext";
import { apiFetch, errorMessage, haptic } from "@/lib/client/api";
import EmptyState from "./ui/EmptyState";
import { ExternalIcon, LinkIcon } from "./ui/Icons";
import type { SummarizeUrlResponse } from "@/types";

export default function UrlSummarizer({ onSaved }: { onSaved?: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [summary, setSummary] = useState<SummarizeUrlResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalized = () => {
    const trimmed = url.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const handleSummarize = async (target = normalized()) => {
    if (!url.trim() && !target) return;
    setIsSummarizing(true);
    setError(null);
    setSummary(null);
    try {
      const data = await apiFetch<SummarizeUrlResponse>(user, "/api/urls/summarize", {
        method: "POST",
        body: JSON.stringify({ url: target }),
      });
      setSummary(data);
    } catch (err) {
      setError(errorMessage(err, "Couldn't read that page"));
    } finally {
      setIsSummarizing(false);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) {
        setUrl(text);
        if (/^https?:\/\//i.test(text)) handleSummarize(text);
      }
    } catch {
      showToast("Clipboard access was blocked — long-press the box to paste", "info");
    }
  };

  const handleSave = async () => {
    if (!summary || !user) return;
    setIsSaving(true);
    try {
      await apiFetch(user, "/api/entries", {
        method: "POST",
        body: JSON.stringify({
          type: "url",
          source: note.trim() ? "both" : "improved",
          url: normalized(),
          urlTitle: summary.meta.title,
          urlDomain: summary.meta.domain,
          urlAuthor: summary.meta.author,
          urlChecksum: summary.meta.checksum,
          summary: summary.summary,
          keyPoints: summary.keyPoints,
          quotes: summary.quotes,
          // Your own thoughts about the link are the entry's main text.
          ...(note.trim() ? { rawText: note.trim() } : {}),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          device: navigator.userAgent,
        }),
      });
      haptic([10, 40, 10]);
      showToast("Link saved to your journal ✨", "success");
      setUrl("");
      setNote("");
      setSummary(null);
      onSaved?.();
    } catch (err) {
      showToast(errorMessage(err, "Couldn't save the link"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-rise-in">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSummarize();
        }}
        className="watercolor-card rounded-3xl border border-white/70 p-2 flex items-center gap-2"
      >
        <span className="pl-2 text-teal-600">
          <LinkIcon size={20} />
        </span>
        <input
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a link to save…"
          aria-label="Link to save"
          className="flex-1 min-w-0 h-12 bg-transparent focus:outline-none"
          disabled={isSummarizing || isSaving}
        />
        {url.trim() ? (
          <button
            type="submit"
            disabled={isSummarizing || isSaving}
            className="h-12 px-5 rounded-2xl btn-gradient font-semibold text-sm shadow-md disabled:opacity-50"
          >
            {isSummarizing ? "Reading…" : "Summarize"}
          </button>
        ) : (
          <button
            type="button"
            onClick={pasteFromClipboard}
            className="h-12 px-4 rounded-2xl bg-white border border-teal-200 text-slate-700 text-sm font-medium"
          >
            Paste
          </button>
        )}
      </form>

      {error && (
        <div className="mt-4 p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-700 text-sm">{error}</div>
      )}

      {isSummarizing && (
        <div className="mt-5 watercolor-card rounded-3xl p-5 space-y-3" aria-busy="true">
          <div className="skeleton h-6 w-3/4" />
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-4/5" />
        </div>
      )}

      {!summary && !isSummarizing && !error && (
        <EmptyState art="link" title="Save anything worth remembering">
          Paste an article, video or recipe link. Visper reads it, summarizes it and files it in your journal.
        </EmptyState>
      )}

      {summary && (
        <div className="mt-5 watercolor-card rounded-3xl border border-white/70 p-5 animate-rise-in">
          <h3 className="text-xl font-semibold leading-snug text-slate-800">{summary.meta.title}</h3>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 flex-wrap">
            <a
              href={normalized()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 inline-flex items-center gap-1"
            >
              {summary.meta.domain} <ExternalIcon size={13} />
            </a>
            {summary.meta.author && <span>by {summary.meta.author}</span>}
          </div>

          <p className="mt-4 text-[16px] leading-relaxed text-slate-700">{summary.summary}</p>

          {summary.keyPoints?.length > 0 && (
            <ul className="mt-4 space-y-2">
              {summary.keyPoints.map((point, idx) => (
                <li key={idx} className="flex gap-2.5 text-slate-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-teal-400 to-purple-400" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}

          {summary.quotes?.length > 0 && (
            <div className="mt-4 space-y-2">
              {summary.quotes.slice(0, 3).map((quote, idx) => (
                <blockquote
                  key={idx}
                  className="pl-3 border-l-2 border-purple-300 italic text-slate-600 text-[15px]"
                >
                  &ldquo;{quote.text}&rdquo;
                </blockquote>
              ))}
            </div>
          )}

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add your own thoughts (optional)"
            rows={2}
            className="mt-5 w-full rounded-2xl bg-white/80 border border-teal-100 p-3 focus:outline-none focus:ring-2 focus:ring-teal-300"
          />

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setSummary(null)}
              className="h-12 px-5 rounded-2xl bg-white/90 border border-slate-200 text-slate-600 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 h-12 rounded-2xl btn-gradient font-semibold shadow-md disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save to journal"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
