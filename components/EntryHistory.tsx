"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/lib/toast/ToastContext";
import { apiDownload, apiFetch, errorMessage } from "@/lib/client/api";
import { monthKey } from "@/lib/client/format";
import { entryImages } from "@/lib/entries/shared";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog";
import EditEntrySheet from "./EditEntrySheet";
import EntryCard from "./EntryCard";
import ImageViewer, { type ViewerImage } from "./ImageViewer";
import BottomSheet from "./ui/BottomSheet";
import EmptyState from "./ui/EmptyState";
import { DownloadIcon, RefreshIcon, SearchIcon, SparkleIcon, TagIcon, XIcon } from "./ui/Icons";
import type { Entry } from "@/types";

type TypeFilter = "all" | "note" | "url" | "image";
type MoodFilter = "all" | "positive" | "neutral" | "negative";

const PAGE = 25;

export default function EntryHistory({ onWrite }: { userId?: string; onWrite?: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [semantic, setSemantic] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [moodFilter, setMoodFilter] = useState<MoodFilter>("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Entry[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [showTags, setShowTags] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [includeImages, setIncludeImages] = useState(true);
  const [exporting, setExporting] = useState<"html" | "zip" | null>(null);

  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewer, setViewer] = useState<{ images: ViewerImage[]; index: number } | null>(null);

  const monthRefs = useRef<Record<string, HTMLElement | null>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ entries: Entry[] }>(user, "/api/entries?limit=2000");
      setAllEntries(data.entries || []);
    } catch (err) {
      setError(errorMessage(err, "Couldn't load your journal"));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Server search when there's a text query (keywords + optional meaning).
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({ q, semantic: String(semantic) });
        const data = await apiFetch<{ entries: Entry[] }>(user, `/api/search?${params}`);
        setSearchResults(data.entries || []);
      } catch (err) {
        // Offline or failed: fall back to searching what we already have.
        const words = q.toLowerCase().split(/\s+/);
        setSearchResults(
          allEntries.filter((e) => {
            const hay = [e.rawText, e.improvedText, e.summary, e.urlTitle, e.imageDescription, ...(e.tags || [])]
              .join(" ")
              .toLowerCase();
            return words.every((w) => hay.includes(w));
          })
        );
        if (navigator.onLine) showToast(errorMessage(err, "Search failed"), "error");
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, semantic, user, allEntries, showToast]);

  const filtersActive = typeFilter !== "all" || moodFilter !== "all" || !!selectedTag;
  const searching = query.trim().length > 0;

  const entries = useMemo(() => {
    const base = searchResults ?? allEntries;
    return base.filter((e) => {
      if (typeFilter === "image" && entryImages(e).length === 0) return false;
      if (typeFilter !== "all" && typeFilter !== "image" && e.type !== typeFilter) return false;
      if (moodFilter !== "all" && e.sentiment !== moodFilter) return false;
      if (selectedTag && !(e.tags || []).includes(selectedTag)) return false;
      return true;
    });
  }, [allEntries, searchResults, typeFilter, moodFilter, selectedTag]);

  // Reset paging when the list changes.
  useEffect(() => setVisibleCount(PAGE), [searchResults, typeFilter, moodFilter, selectedTag]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (items) => items[0].isIntersecting && setVisibleCount((c) => c + PAGE),
      { rootMargin: "800px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [entries.length, visibleCount]);

  const months = useMemo(() => {
    const groups: { key: string; label: string; count: number; firstIndex: number }[] = [];
    entries.forEach((e, i) => {
      const { key, label } = monthKey(e.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.count++;
      else groups.push({ key, label, count: 1, firstIndex: i });
    });
    return groups;
  }, [entries]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allEntries.forEach((e) => (e.tags || []).forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [allEntries]);

  const jumpToMonth = (key: string) => {
    const month = months.find((m) => m.key === key);
    if (!month) return;
    setVisibleCount((c) => Math.max(c, month.firstIndex + month.count + 5));
    requestAnimationFrame(() =>
      setTimeout(() => monthRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" }), 30)
    );
  };

  const handleCopy = useCallback(
    async (entry: Entry) => {
      const text = [entry.urlTitle, entry.improvedText || entry.rawText, entry.summary, entry.url]
        .filter(Boolean)
        .join("\n\n");
      try {
        await navigator.clipboard.writeText(text);
        showToast("Copied to clipboard", "success");
      } catch {
        showToast("Couldn't copy on this device", "error");
      }
    },
    [showToast]
  );

  const openImage = useCallback((entry: Entry, index: number) => {
    setViewer({
      index,
      images: entryImages(entry).map((img) => ({
        url: img.url,
        description: img.description || entry.imageDescription,
      })),
    });
  }, []);

  const handleTag = useCallback((tag: string) => {
    setSelectedTag(tag);
    setShowTags(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await apiFetch(user, `/api/entries/${deleting.id}`, { method: "DELETE" });
      setAllEntries((list) => list.filter((e) => e.id !== deleting.id));
      setSearchResults((list) => list && list.filter((e) => e.id !== deleting.id));
      showToast("Entry deleted", "success");
      setDeleting(null);
    } catch (err) {
      showToast(errorMessage(err, "Couldn't delete the entry"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const onEdited = useCallback((updated: Entry) => {
    const merge = (list: Entry[]) => list.map((e) => (e.id === updated.id ? { ...e, ...updated } : e));
    setAllEntries(merge);
    setSearchResults((list) => list && merge(list));
  }, []);

  const download = async (kind: "html" | "zip") => {
    setExporting(kind);
    try {
      const date = new Date().toISOString().split("T")[0];
      const params = `includeImages=${includeImages}`;
      if (kind === "html") {
        await apiDownload(user, `/api/entries/export?${params}`, `visper-history-${date}.html`);
      } else {
        await apiDownload(user, `/api/entries/backup?${params}`, `visper-backup-${date}.zip`);
      }
      showToast("Download started", "success");
      setShowExport(false);
    } catch (err) {
      showToast(errorMessage(err, "Download failed"), "error");
    } finally {
      setExporting(null);
    }
  };

  const clearFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setMoodFilter("all");
    setSelectedTag(null);
  };

  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading your journal">
        <div className="skeleton h-12 w-full rounded-2xl" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="watercolor-card rounded-3xl p-4 space-y-3">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState art="offline" title="Couldn't load your journal" action={
        <button onClick={fetchAll} className="h-12 px-6 rounded-2xl btn-gradient font-semibold shadow-md">
          Try again
        </button>
      }>
        {error}
      </EmptyState>
    );
  }

  if (allEntries.length === 0) {
    return (
      <EmptyState
        art="empty-journal"
        title="Your journal is waiting"
        action={
          onWrite && (
            <button onClick={onWrite} className="h-12 px-6 rounded-2xl btn-gradient font-semibold shadow-md">
              Write your first entry
            </button>
          )
        }
      >
        Every note, link and photo you save will appear here, tagged and searchable.
      </EmptyState>
    );
  }

  const shown = entries.slice(0, visibleCount);
  const monthStarts = new Set(months.map((m) => m.firstIndex));

  return (
    <div className="animate-rise-in">
      {/* Search + filters (sticky under the header) */}
      <div className="sticky top-[calc(var(--header-h)+var(--safe-top))] z-20 -mx-4 px-4 pt-2 pb-3 glass md:mx-0 md:px-0 md:bg-transparent md:backdrop-blur-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 h-12 px-3.5 rounded-2xl bg-white/90 border border-teal-100 shadow-sm focus-within:ring-2 focus-within:ring-teal-300">
            <SearchIcon size={19} className="text-slate-400 shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={semantic ? "Search by meaning…" : "Search your journal"}
              aria-label="Search your journal"
              enterKeyHint="search"
              className="flex-1 min-w-0 bg-transparent focus:outline-none"
            />
            {isSearching && <span className="h-4 w-4 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />}
            {query && !isSearching && (
              <button onClick={() => setQuery("")} className="h-8 w-8 grid place-items-center rounded-full text-slate-400" aria-label="Clear search">
                <XIcon size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => setSemantic(!semantic)}
            aria-pressed={semantic}
            title="Also find entries with a similar meaning, not just the same words"
            className={`h-12 px-3 rounded-2xl border text-sm font-medium flex items-center gap-1.5 transition ${
              semantic ? "btn-gradient border-transparent shadow-md" : "bg-white/90 border-teal-100 text-slate-600"
            }`}
          >
            <SparkleIcon size={17} />
            <span className="hidden sm:inline">Meaning</span>
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {(["all", "note", "url", "image"] as TypeFilter[]).map((t) => (
            <Chip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
              {t === "all" ? "All" : t === "note" ? "Notes" : t === "url" ? "Links" : "Photos"}
            </Chip>
          ))}
          <span className="h-5 w-px bg-teal-200 shrink-0" />
          {(["positive", "neutral", "negative"] as MoodFilter[]).map((m) => (
            <Chip key={m} active={moodFilter === m} onClick={() => setMoodFilter(moodFilter === m ? "all" : m)}>
              {m === "positive" ? "😊 Bright" : m === "neutral" ? "😌 Calm" : "🌧 Heavy"}
            </Chip>
          ))}
          <span className="h-5 w-px bg-teal-200 shrink-0" />
          <Chip active={showTags} onClick={() => setShowTags(true)}>
            <TagIcon size={14} /> Tags
          </Chip>
        </div>
      </div>

      {/* Summary row */}
      <div className="flex items-center justify-between mt-2 mb-3 px-1">
        <p className="text-sm text-slate-500">
          {searching || filtersActive ? (
            <>
              {entries.length} result{entries.length === 1 ? "" : "s"}
              {selectedTag && (
                <span className="ml-2 inline-flex items-center gap-1 pl-2.5 pr-1 h-7 rounded-full bg-gradient-to-r from-teal-100 to-purple-100 text-teal-800">
                  #{selectedTag}
                  <button onClick={() => setSelectedTag(null)} className="h-5 w-5 grid place-items-center" aria-label="Clear tag">
                    <XIcon size={12} />
                  </button>
                </span>
              )}
            </>
          ) : (
            `${allEntries.length} entries`
          )}
        </p>
        <div className="flex items-center gap-1">
          {(searching || filtersActive) && (
            <button onClick={clearFilters} className="h-9 px-3 text-sm text-purple-600 rounded-full hover:bg-white/70">
              Clear
            </button>
          )}
          <button onClick={fetchAll} className="h-10 w-10 grid place-items-center rounded-full text-slate-500 hover:bg-white/70" aria-label="Refresh">
            <RefreshIcon size={18} />
          </button>
          <button onClick={() => setShowExport(true)} className="h-10 w-10 grid place-items-center rounded-full text-slate-500 hover:bg-white/70" aria-label="Export & backup">
            <DownloadIcon size={18} />
          </button>
        </div>
      </div>

      {/* Month jump */}
      {!searching && !filtersActive && months.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-3 md:mx-0 md:px-0">
          {months.map((m) => (
            <button
              key={m.key}
              onClick={() => jumpToMonth(m.key)}
              className="shrink-0 h-8 px-3 rounded-full bg-white/70 border border-white text-xs text-slate-600 hover:bg-white"
            >
              {m.label} · {m.count}
            </button>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState art="empty-journal" title="Nothing matches" compact action={
          <button onClick={clearFilters} className="h-11 px-5 rounded-2xl bg-white/90 border border-teal-200 text-slate-700 font-medium">
            Clear search & filters
          </button>
        }>
          {semantic ? "Try different words." : "Try turning on “Meaning” to find entries with a similar idea."}
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {shown.map((entry, i) => {
            const startsMonth = !searching && monthStarts.has(i);
            const { key, label } = monthKey(entry.createdAt);
            return (
              <div key={entry.id}>
                {startsMonth && (
                  <h3
                    ref={(el) => {
                      monthRefs.current[key] = el;
                    }}
                    className="pt-3 pb-1 px-1 text-sm font-semibold uppercase tracking-wider text-slate-500 scroll-mt-40"
                  >
                    {label}
                  </h3>
                )}
                <EntryCard
                  entry={entry}
                  onTagClick={handleTag}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                  onCopy={handleCopy}
                  onOpenImage={openImage}
                />
              </div>
            );
          })}
          {visibleCount < entries.length && (
            <div ref={sentinelRef} className="py-6 text-center text-sm text-slate-400">
              Loading more…
            </div>
          )}
        </div>
      )}

      {/* Tag cloud */}
      <BottomSheet open={showTags} onClose={() => setShowTags(false)} title="Your tags">
        {tagCounts.length === 0 ? (
          <p className="text-sm text-slate-500 pb-4">Tags appear automatically as you write.</p>
        ) : (
          <div className="flex flex-wrap gap-2 pb-4">
            {tagCounts.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => handleTag(tag)}
                className={`h-9 px-3 rounded-full text-sm border transition ${
                  selectedTag === tag
                    ? "btn-gradient border-transparent"
                    : "bg-gradient-to-r from-teal-50 to-purple-50 border-teal-200 text-slate-700"
                }`}
              >
                #{tag} <span className="opacity-60">{count}</span>
              </button>
            ))}
          </div>
        )}
      </BottomSheet>

      {/* Export */}
      <BottomSheet open={showExport} onClose={() => setShowExport(false)} title="Export & backup">
        <label className="flex items-center justify-between gap-3 py-3 cursor-pointer">
          <span>
            <span className="block font-medium text-slate-800">Include photos</span>
            <span className="block text-xs text-slate-500">Bigger download, but a complete copy</span>
          </span>
          <input
            type="checkbox"
            checked={includeImages}
            onChange={(e) => setIncludeImages(e.target.checked)}
            className="h-6 w-6 accent-purple-600"
          />
        </label>
        <div className="grid gap-3 py-3">
          <button
            onClick={() => download("html")}
            disabled={!!exporting}
            className="h-14 rounded-2xl bg-white border border-teal-200 text-left px-4 disabled:opacity-60"
          >
            <span className="block font-medium text-slate-800">{exporting === "html" ? "Preparing…" : "Readable journal (.html)"}</span>
            <span className="block text-xs text-slate-500">A beautiful page you can open anywhere</span>
          </button>
          <button
            onClick={() => download("zip")}
            disabled={!!exporting}
            className="h-14 rounded-2xl btn-gradient text-left px-4 shadow-md disabled:opacity-60"
          >
            <span className="block font-semibold">{exporting === "zip" ? "Zipping…" : "Full backup (.zip)"}</span>
            <span className="block text-xs text-white/85">All data as JSON + readable page + original photos</span>
          </button>
        </div>
      </BottomSheet>

      <EditEntrySheet entry={editing} onClose={() => setEditing(null)} onSaved={onEdited} />
      <DeleteConfirmationDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        entryTitle={deleting ? (deleting.urlTitle || deleting.improvedText || deleting.rawText || "").slice(0, 80) : undefined}
      />
      {viewer && <ImageViewer images={viewer.images} startIndex={viewer.index} onClose={() => setViewer(null)} />}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 h-9 px-3.5 rounded-full text-sm flex items-center gap-1.5 border transition ${
        active
          ? "bg-gradient-to-r from-teal-500 to-purple-500 text-white border-transparent shadow-sm"
          : "bg-white/80 border-white text-slate-600 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}
