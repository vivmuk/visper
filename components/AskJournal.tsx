"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/lib/toast/ToastContext";
import { apiFetch, errorMessage, haptic } from "@/lib/client/api";
import { friendlyDate } from "@/lib/client/format";
import { DRAFT_KEY } from "./CaptureForm";
import { MoonIcon, PenIcon, SendIcon, SparkleIcon } from "./ui/Icons";
import type { AskResponse, Reflection } from "@/types";

const SUGGESTIONS = [
  "What made me happiest this month?",
  "What have I been worried about lately?",
  "What patterns do you notice in my energy?",
  "What did I write about work recently?",
  "Which people show up most in my journal?",
];

interface Exchange {
  id: string;
  question: string;
  answer?: AskResponse;
  error?: string;
}

const INDEXED_KEY = "visper:indexed-at";

export default function AskJournal({ onWrite }: { onWrite: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [asking, setAsking] = useState(false);
  const [indexing, setIndexing] = useState<{ done: number; total: number } | null>(null);
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [reflecting, setReflecting] = useState<"week" | "month" | null>(null);
  const [savingReflection, setSavingReflection] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Make sure every entry is indexed for meaning-based search (once a day is
  // plenty; new and edited entries are indexed as they're saved).
  useEffect(() => {
    if (!user || !navigator.onLine) return;
    try {
      const last = Number(localStorage.getItem(INDEXED_KEY) || 0);
      if (Date.now() - last < 24 * 60 * 60 * 1000) return;
    } catch {
      // Storage unavailable: index anyway
    }
    let cancelled = false;
    (async () => {
      let processedTotal = 0;
      try {
        for (let round = 0; round < 30 && !cancelled; round++) {
          const r = await apiFetch<{ processed: number; remaining: number }>(user, "/api/embeddings/backfill", {
            method: "POST",
          });
          processedTotal += r.processed;
          if (r.remaining === 0) break;
          setIndexing({ done: processedTotal, total: processedTotal + r.remaining });
        }
        localStorage.setItem(INDEXED_KEY, String(Date.now()));
      } catch (error) {
        console.warn("Indexing failed:", error);
      } finally {
        if (!cancelled) setIndexing(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || asking) return;
    const id = Math.random().toString(36).slice(2);
    setExchanges((list) => [...list, { id, question: text }]);
    setQuestion("");
    setAsking(true);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
    try {
      const answer = await apiFetch<AskResponse>(user, "/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: text }),
      });
      setExchanges((list) => list.map((x) => (x.id === id ? { ...x, answer } : x)));
      haptic(10);
    } catch (error) {
      setExchanges((list) => list.map((x) => (x.id === id ? { ...x, error: errorMessage(error) } : x)));
    } finally {
      setAsking(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
    }
  };

  const reflect = async (period: "week" | "month") => {
    setReflecting(period);
    setReflection(null);
    try {
      const { reflection } = await apiFetch<{ reflection: Reflection }>(user, "/api/reflect", {
        method: "POST",
        body: JSON.stringify({ period }),
      });
      setReflection(reflection);
    } catch (error) {
      showToast(errorMessage(error, "Couldn't create a reflection"), "error");
    } finally {
      setReflecting(null);
    }
  };

  const saveReflection = async () => {
    if (!reflection) return;
    setSavingReflection(true);
    const text = [
      `${reflection.title}`,
      reflection.summary,
      `Themes: ${reflection.themes.join(", ")}`,
      `Mood: ${reflection.mood}`,
      reflection.highlights.length ? `Moments:\n${reflection.highlights.map((h) => `• ${h}`).join("\n")}` : "",
      `Question for next ${reflection.period}: ${reflection.prompt}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      await apiFetch(user, "/api/entries", {
        method: "POST",
        body: JSON.stringify({
          type: "note",
          source: "improved",
          improvedText: text,
          tags: ["reflection", `${reflection.period}ly-reflection`],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      showToast("Reflection saved to your journal", "success");
    } catch (error) {
      showToast(errorMessage(error, "Couldn't save the reflection"), "error");
    } finally {
      setSavingReflection(false);
    }
  };

  const writeAbout = (prompt: string) => {
    try {
      const existing = localStorage.getItem(DRAFT_KEY);
      localStorage.setItem(DRAFT_KEY, existing ? `${existing}\n\n${prompt}\n` : `${prompt}\n\n`);
    } catch {
      // Storage unavailable
    }
    onWrite();
  };

  // The question box: inline under the intro at first, then pinned above the
  // tab bar once a conversation has started.
  const askForm = (pinned: boolean) => (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className={pinned ? "sticky bottom-nav-offset md:bottom-6 mt-6 z-10" : "mt-5"}
      >
        <div className="glass rounded-3xl border border-white shadow-lg p-1.5 flex items-center gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about your journal…"
            aria-label="Ask a question about your journal"
            enterKeyHint="send"
            className="flex-1 min-w-0 h-12 px-3.5 bg-transparent focus:outline-none"
          />
          <button
            type="submit"
            disabled={!question.trim() || asking}
            className="h-12 w-12 grid place-items-center rounded-2xl btn-gradient shadow-md disabled:opacity-40"
            aria-label="Ask"
          >
            <SendIcon size={19} />
          </button>
        </div>
      </form>
  );

  return (
    <div className="animate-rise-in">
      {/* Reflections */}
      <section className="watercolor-card rounded-3xl border border-white/70 p-5 overflow-hidden relative">
        <img src="/art/reflect.webp" alt="" className="art-blend absolute -right-6 -top-6 w-36 h-36 opacity-90 pointer-events-none" />
        <h2 className="text-lg font-semibold text-slate-800 relative">Reflect</h2>
        <p className="text-sm text-slate-500 mt-0.5 pr-24 relative">A gentle look back at what you&apos;ve been writing.</p>
        <div className="mt-4 flex gap-2 relative">
          {(["week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => reflect(p)}
              disabled={!!reflecting}
              className="h-11 px-4 rounded-2xl bg-white/90 border border-purple-200 text-purple-700 text-sm font-medium flex items-center gap-1.5 disabled:opacity-60"
            >
              {reflecting === p ? (
                <span className="h-4 w-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
              ) : (
                <MoonIcon size={17} />
              )}
              My {p}
            </button>
          ))}
        </div>

        {reflection && (
          <div className="mt-5 relative animate-rise-in">
            <p className="text-xs uppercase tracking-wider text-purple-500 font-semibold">
              Your {reflection.period} · {reflection.entryCount} entr{reflection.entryCount === 1 ? "y" : "ies"}
            </p>
            <h3 className="mt-1 text-xl font-semibold gradient-text leading-snug">{reflection.title}</h3>
            <p className="mt-2 text-[16px] leading-relaxed text-slate-700">{reflection.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {reflection.themes.map((t) => (
                <span key={t} className="px-3 h-7 inline-flex items-center rounded-full bg-gradient-to-r from-teal-50 to-purple-50 border border-teal-200 text-sm text-teal-800">
                  {t}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-600"><span className="text-slate-400">Mood · </span>{reflection.mood}</p>
            {reflection.highlights.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {reflection.highlights.map((h, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <span className="text-amber-500">✦</span>
                    {h}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 rounded-2xl bg-gradient-to-r from-teal-50 via-purple-50 to-pink-50 border border-purple-100 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">A question for you</p>
              <p className="mt-1 font-medium text-slate-800">{reflection.prompt}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => writeAbout(reflection.prompt)} className="h-10 px-4 rounded-xl btn-gradient text-sm font-semibold flex items-center gap-1.5 shadow whitespace-nowrap">
                  <PenIcon size={16} /> Write about this
                </button>
                <button onClick={saveReflection} disabled={savingReflection} className="h-10 px-4 rounded-xl bg-white border border-purple-200 text-sm text-purple-700 whitespace-nowrap disabled:opacity-60">
                  {savingReflection ? "Saving…" : "Save reflection"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Ask */}
      <section className="mt-6">
        {exchanges.length === 0 ? (
          <div className="text-center px-2">
            <img src="/art/ask.webp" alt="" width={200} height={200} className="mx-auto w-36 h-36 art-blend" />
            <h2 className="mt-1 text-xl font-semibold text-slate-800">Ask your journal</h2>
            <p className="mt-1 text-sm text-slate-500 max-w-xs mx-auto">
              Ask anything about what you&apos;ve written. Answers come only from your own entries.
            </p>
            {indexing && (
              <p className="mt-3 text-xs text-purple-600">
                Getting to know your journal… {indexing.done}/{indexing.total}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {exchanges.map((x) => (
              <div key={x.id} className="space-y-2.5">
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-gradient-to-r from-teal-500 to-purple-500 text-white px-4 py-2.5 shadow-sm">
                    {x.question}
                  </p>
                </div>
                <div className="max-w-[92%] watercolor-card rounded-3xl rounded-bl-lg border border-white/70 px-4 py-3">
                  {x.answer ? (
                    <>
                      <p className="whitespace-pre-wrap leading-relaxed text-slate-800">{x.answer.answer}</p>
                      {x.answer.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-teal-50">
                          <p className="text-xs text-slate-400 mb-1.5">From your entries</p>
                          <div className="space-y-1.5">
                            {x.answer.sources.map((s) => (
                              <div key={s.id} className="text-xs text-slate-600 rounded-xl bg-white/70 px-3 py-2">
                                <span className="font-medium text-purple-600">{friendlyDate(s.date)}</span> · {s.snippet}
                                {s.snippet.length >= 160 && "…"}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : x.error ? (
                    <p className="text-rose-600 text-sm">{x.error}</p>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-500 text-sm py-1">
                      <SparkleIcon size={16} className="animate-pulse text-purple-500" /> Reading your journal…
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {exchanges.length === 0 && askForm(false)}
        {exchanges.length === 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="px-3.5 py-2 rounded-2xl bg-white/80 border border-white text-sm text-slate-700 hover:bg-white text-left"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </section>

      {exchanges.length > 0 && askForm(true)}
    </div>
  );
}
