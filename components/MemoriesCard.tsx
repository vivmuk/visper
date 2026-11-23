"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiFetch } from "@/lib/client/api";
import { dayKey, entryImages, localParts, toDate, type MemoryGroup, type Memories } from "@/lib/entries/shared";
import EntryListSheet from "./EntryListSheet";
import { MoonIcon } from "./ui/Icons";
import type { Entry } from "@/types";

export function yearsAgoLabel(n: number) {
  return n === 1 ? "1 year ago" : `${n} years ago`;
}

function memoryDate(entry: Entry) {
  const d = toDate(entry.createdAt);
  return d ? d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "";
}

function snippet(entry: Entry) {
  return (entry.improvedText || entry.rawText || entry.urlTitle || entry.summary || entry.imageDescription || "").trim();
}

/** Horizontal strip of memories from previous years. Renders nothing if there are none. */
export function MemoriesStrip({
  memories,
  onEdited,
  onDeleted,
  onTagClick,
  compact,
}: {
  memories: Memories;
  onEdited?: (entry: Entry) => void;
  onDeleted?: (id: string) => void;
  onTagClick?: (tag: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState<{ title: string; group: MemoryGroup } | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const sections = [
    { title: "On this day", groups: memories.onThisDay },
    { title: "This week in past years", groups: memories.thisWeek },
  ]
    .map((s) => ({
      ...s,
      groups: s.groups
        .map((g) => ({ ...g, entries: g.entries.filter((e) => !removed.has(e.id)) }))
        .filter((g) => g.entries.length > 0),
    }))
    .filter((s) => s.groups.length > 0);

  if (sections.length === 0) return null;

  return (
    <section className={`watercolor-card rounded-3xl border border-white/70 overflow-hidden relative ${compact ? "p-4" : "p-5"} animate-rise-in`}>
      <img src="/art/reflect.webp" alt="" className="art-blend absolute -right-5 -top-5 w-28 h-28 opacity-80 pointer-events-none" />
      {sections.map((section, si) => (
        <div key={section.title} className={si > 0 ? "mt-4" : ""}>
          <h3 className="relative flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <MoonIcon size={16} className="text-purple-500" />
            {section.title}
          </h3>
          <div className="relative mt-2.5 -mx-1 px-1 flex gap-2.5 overflow-x-auto no-scrollbar snap-x">
            {section.groups.flatMap((group) =>
              group.entries.slice(0, 6).map((entry) => {
                const thumb = entryImages(entry)[0];
                return (
                  <button
                    key={entry.id}
                    onClick={() => setOpen({ title: `${section.title} · ${yearsAgoLabel(group.yearsAgo)}`, group })}
                    className="snap-start shrink-0 w-60 text-left rounded-2xl bg-white/85 border border-white p-3 flex gap-3 hover:bg-white shadow-sm"
                  >
                    {thumb && (
                      <img src={thumb.url} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    )}
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-purple-600">
                        {yearsAgoLabel(group.yearsAgo)} · <span className="font-normal text-slate-500">{memoryDate(entry)}</span>
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-700 line-clamp-2">{snippet(entry) || "A moment you saved"}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ))}

      <EntryListSheet
        open={!!open}
        title={open?.title || ""}
        entries={(open?.group.entries || []).filter((e) => !removed.has(e.id))}
        dateLabel={memoryDate}
        onClose={() => setOpen(null)}
        onEdited={onEdited}
        onDeleted={(id) => {
          setRemoved((s) => new Set(s).add(id));
          onDeleted?.(id);
        }}
        onTagClick={onTagClick}
      />
    </section>
  );
}

/** Memories for the Write tab, fetched cheaply from /api/memories (cached per day). */
export default function TodayMemories() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memories | null>(null);

  useEffect(() => {
    if (!user) return;
    const date = dayKey(localParts(new Date()));
    const cacheKey = `visper:memories:${user.uid}:${date}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setMemories(JSON.parse(cached));
        return;
      }
    } catch {
      // Storage unavailable
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    apiFetch<Memories>(user, `/api/memories?date=${date}&tz=${encodeURIComponent(tz)}`)
      .then((m) => {
        setMemories(m);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(m));
        } catch {
          // Storage full: fine
        }
      })
      .catch(() => setMemories(null));
  }, [user]);

  if (!memories) return null;
  return (
    <div className="mt-6">
      <MemoriesStrip memories={memories} compact />
    </div>
  );
}
