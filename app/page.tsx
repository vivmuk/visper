"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import CaptureForm from "@/components/CaptureForm";
import UrlSummarizer from "@/components/UrlSummarizer";
import EntryHistory from "@/components/EntryHistory";
import ImageGallery from "@/components/ImageGallery";
import AskJournal from "@/components/AskJournal";
import LoginButton from "@/components/LoginButton";
import { BookIcon, CloudOffIcon, LinkIcon, PenIcon, PhotoIcon, SparkleIcon, XIcon } from "@/components/ui/Icons";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/lib/toast/ToastContext";
import { apiFetch } from "@/lib/client/api";
import { flushOutbox, outboxCount, OUTBOX_EVENT } from "@/lib/client/outbox";
import type { HealthResponse } from "@/types";

type Tab = "write" | "link" | "journal" | "photos" | "ask";

const TABS: { id: Tab; label: string; Icon: typeof PenIcon }[] = [
  { id: "write", label: "Write", Icon: PenIcon },
  { id: "link", label: "Link", Icon: LinkIcon },
  { id: "journal", label: "Journal", Icon: BookIcon },
  { id: "photos", label: "Photos", Icon: PhotoIcon },
  { id: "ask", label: "Ask", Icon: SparkleIcon },
];

function tabFromHash(): Tab {
  if (typeof window === "undefined") return "write";
  const hash = window.location.hash.replace("#", "") as Tab;
  // Old links used #history / #images
  if ((hash as string) === "history") return "journal";
  if ((hash as string) === "images") return "photos";
  return TABS.some((t) => t.id === hash) ? hash : "write";
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("write");
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [serviceProblems, setServiceProblems] = useState<string[]>([]);

  // Tab state lives in the URL hash so the back button and shortcuts work.
  useEffect(() => {
    setTab(tabFromHash());
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((next: Tab) => {
    if (window.location.hash !== `#${next}`) window.history.pushState(null, "", `#${next}`);
    setTab(next);
    window.scrollTo({ top: 0 });
  }, []);

  // Online/offline + outbox sync.
  useEffect(() => {
    if (!user) return;
    const refreshCount = () => setPending(outboxCount(user.uid));
    const sync = async () => {
      const sent = await flushOutbox(user);
      if (sent > 0) showToast(`Synced ${sent} entr${sent === 1 ? "y" : "ies"} written offline`, "success");
      refreshCount();
    };
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) sync();
    };
    update();
    refreshCount();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener(OUTBOX_EVENT, refreshCount);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener(OUTBOX_EVENT, refreshCount);
    };
  }, [user, showToast]);

  // One health check per session, so outages (e.g. billing) are visible.
  useEffect(() => {
    if (!user || !navigator.onLine) return;
    try {
      if (sessionStorage.getItem("visper:health-checked")) return;
      sessionStorage.setItem("visper:health-checked", "1");
    } catch {
      // Storage unavailable
    }
    apiFetch<HealthResponse>(user, "/api/health")
      .then((h) => {
        const problems: string[] = [];
        if (!h.checks.firestore.ok) problems.push(`Journal database: ${h.checks.firestore.message}`);
        if (!h.checks.storage.ok) problems.push(`Photo storage: ${h.checks.storage.message}`);
        if (!h.checks.venice.ok) problems.push(`Venice AI: ${h.checks.venice.message}`);
        setServiceProblems(problems);
      })
      .catch(() => undefined);
  }, [user]);

  if (authLoading) {
    return (
      <main className="min-h-[100dvh] grid place-items-center">
        <img src="/icons/icon-192.png" alt="Visper" width={96} height={96} className="w-24 h-24 rounded-3xl animate-pulse" />
      </main>
    );
  }

  if (!user) return <Landing />;

  return (
    <div className="min-h-[100dvh]">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-white/60 pt-safe">
        <div className="max-w-3xl mx-auto h-[var(--header-h)] px-4 flex items-center justify-between">
          <button onClick={() => go("write")} className="flex items-center gap-2.5" aria-label="Visper home">
            <img src="/icons/icon-192.png" alt="" width={36} height={36} className="w-9 h-9 rounded-xl object-cover shadow-sm" />
            <span className="text-xl font-bold gradient-text font-[Montserrat]">Visper</span>
          </button>

          {/* Desktop tabs */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-white/60 border border-white" aria-label="Sections">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={tab === id ? "page" : undefined}
                className={`h-9 px-3.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition ${
                  tab === id ? "bg-gradient-to-r from-teal-500 to-purple-500 text-white shadow" : "text-slate-600 hover:bg-white"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>

          <LoginButton />
        </div>
      </header>

      {/* Status banners */}
      {(!online || pending > 0) && (
        <div className="max-w-3xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50/95 border border-amber-200 text-amber-800 text-sm px-3.5 py-2.5">
            <CloudOffIcon size={18} className="shrink-0" />
            {!online
              ? `You're offline. New notes are kept on this device${pending ? ` (${pending} waiting)` : ""} and sync automatically.`
              : `Syncing ${pending} entr${pending === 1 ? "y" : "ies"} written offline…`}
          </div>
        </div>
      )}
      {serviceProblems.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 pt-3">
          <div className="relative rounded-2xl bg-rose-50/95 border border-rose-200 text-rose-800 text-sm px-3.5 py-2.5 pr-10">
            <p className="font-semibold">Something needs attention</p>
            <ul className="mt-0.5 space-y-0.5">
              {serviceProblems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <button
              onClick={() => setServiceProblems([])}
              className="absolute top-1.5 right-1.5 h-8 w-8 grid place-items-center rounded-full hover:bg-rose-100"
              aria-label="Dismiss"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 pt-4 pb-nav md:pb-12">
        {tab === "write" && <CaptureForm />}
        {tab === "link" && <UrlSummarizer />}
        {tab === "journal" && <EntryHistory onWrite={() => go("write")} />}
        {tab === "photos" && <ImageGallery onWrite={() => go("write")} />}
        {tab === "ask" && <AskJournal onWrite={() => go("write")} />}
      </main>

      {/* Mobile tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-white/70 pb-safe"
        aria-label="Sections"
      >
        <div className="h-[var(--nav-h)] grid grid-cols-5 px-1">
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center justify-center gap-1"
              >
                <span
                  className={`h-8 w-14 grid place-items-center rounded-full transition-all ${
                    active ? "bg-gradient-to-r from-teal-500 via-purple-500 to-pink-500 text-white shadow-md shadow-purple-200" : "text-slate-500"
                  }`}
                >
                  <Icon size={20} />
                </span>
                <span className={`text-[11px] font-medium ${active ? "text-purple-700" : "text-slate-500"}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Landing() {
  return (
    <main className="min-h-[100dvh] flex flex-col items-center px-5 pt-safe pb-safe">
      <div className="max-w-md w-full flex-1 flex flex-col justify-center py-8">
        <div className="text-center">
          <img
            src="/icons/icon-192.png"
            alt=""
            width={112}
            height={112}
            className="mx-auto w-28 h-28 rounded-[2rem] shadow-lg shadow-purple-200/60"
          />
          <h1 className="mt-5 text-5xl font-bold gradient-text">Visper</h1>
          <p className="mt-2 text-lg text-slate-600">A thoughtful journal that thinks with you.</p>
        </div>

        <img src="/art/hero.webp" alt="" width={720} height={900} className="mt-6 mx-auto w-64 art-blend" />

        <ul className="mt-6 grid grid-cols-2 gap-3 text-sm">
          {[
            ["✍️", "Write, talk or snap", "Notes, voice and photos"],
            ["✨", "Gently polished", "Clearer, still your voice"],
            ["🔍", "Find anything", "Search by words or meaning"],
            ["🌙", "Reflect", "Ask your journal questions"],
          ].map(([icon, title, sub]) => (
            <li key={title} className="watercolor-card rounded-2xl border border-white/70 p-3.5">
              <div className="text-xl">{icon}</div>
              <p className="mt-1 font-medium text-slate-800">{title}</p>
              <p className="text-slate-500 text-xs">{sub}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex justify-center">
          <LoginButton />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Your entries and photos are private to your account.</p>
      </div>
    </main>
  );
}
