"use client";
/* eslint-disable @next/next/no-img-element */

import { memo, useState } from "react";
import { entryImages } from "@/lib/entries/shared";
import { friendlyDate } from "@/lib/client/format";
import { CopyIcon, EditIcon, ExternalIcon, TrashIcon } from "./ui/Icons";
import type { Entry } from "@/types";

const SENTIMENT: Record<string, { dot: string; label: string }> = {
  positive: { dot: "bg-emerald-400", label: "Positive" },
  neutral: { dot: "bg-slate-300", label: "Neutral" },
  negative: { dot: "bg-rose-400", label: "Heavy" },
};

const TYPE_BADGE: Record<string, string> = {
  note: "bg-teal-100/80 text-teal-800",
  url: "bg-purple-100/80 text-purple-800",
  image: "bg-pink-100/80 text-pink-800",
};

interface EntryCardProps {
  entry: Entry;
  onTagClick: (tag: string) => void;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onCopy: (entry: Entry) => void;
  onOpenImage: (entry: Entry, index: number) => void;
  /** Show a relative label like "1 year ago" instead of the friendly date */
  dateLabel?: string;
}

function EntryCard({ entry, onTagClick, onEdit, onDelete, onCopy, onOpenImage, dateLabel }: EntryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const images = entryImages(entry);
  const body = entry.improvedText || entry.rawText || (entry.type !== "url" ? entry.summary : "") || "";
  const isLong = body.length > 420 || body.split("\n").length > 8;
  const sentiment = entry.sentiment ? SENTIMENT[entry.sentiment] : null;
  const hasDetails =
    !!entry.category || !!entry.topics?.length || !!entry.keywords?.length || !!entry.imageScene || !!entry.imageMood;

  return (
    <article className="watercolor-card rounded-3xl border border-white/70 overflow-hidden">
      <header className="flex items-center justify-between px-4 pt-3.5">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <time>{dateLabel || friendlyDate(entry.createdAt)}</time>
          {sentiment && (
            <span className="inline-flex items-center gap-1" title={`Mood: ${sentiment.label}`}>
              <span className={`h-2 w-2 rounded-full ${sentiment.dot}`} />
            </span>
          )}
        </div>
        <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${TYPE_BADGE[entry.type] || TYPE_BADGE.note}`}>
          {entry.type === "url" ? "Link" : entry.type === "image" ? "Photo" : "Note"}
        </span>
      </header>

      {images.length > 0 && (
        <div className={`mt-3 px-3 grid gap-1.5 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {images.slice(0, 4).map((img, i) => (
            <button
              key={img.url}
              onClick={() => onOpenImage(entry, i)}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-50 to-pink-50 ${
                images.length === 1 ? "max-h-[420px]" : "aspect-square"
              } ${images.length === 3 && i === 0 ? "row-span-2 aspect-auto" : ""}`}
              aria-label={`Open photo ${i + 1}`}
            >
              <img
                src={img.url}
                alt={img.description || entry.imageDescription || "Journal photo"}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              {i === 3 && images.length > 4 && (
                <span className="absolute inset-0 grid place-items-center bg-black/40 text-white text-xl font-semibold">
                  +{images.length - 4}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 pt-3">
        {entry.type === "url" && (
          <a
            href={entry.url && /^https?:\/\//i.test(entry.url) ? entry.url : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl border border-purple-100 bg-white/70 p-3.5 mb-3 hover:border-purple-200"
          >
            <span className="flex items-start justify-between gap-2">
              <span className="font-semibold text-slate-800 leading-snug">{entry.urlTitle || entry.url}</span>
              <ExternalIcon size={16} className="mt-1 shrink-0 text-purple-400" />
            </span>
            <span className="block text-xs text-purple-600 mt-1">{entry.urlDomain || (entry.url && safeHost(entry.url))}</span>
            {entry.summary && <span className="block mt-2 text-sm text-slate-600 line-clamp-3">{entry.summary}</span>}
          </a>
        )}

        {body && (
          <div>
            <p className={`whitespace-pre-wrap text-[16px] leading-relaxed text-slate-800 ${isLong && !expanded ? "line-clamp-8" : ""}`}>
              {body}
            </p>
            {isLong && (
              <button onClick={() => setExpanded(!expanded)} className="mt-1 text-sm font-medium text-purple-600 py-1">
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}

        {entry.type === "url" && entry.keyPoints && entry.keyPoints.length > 0 && (
          <details className="mt-2 group">
            <summary className="text-sm font-medium text-slate-600 cursor-pointer py-1 list-none flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform">›</span> Key points ({entry.keyPoints.length})
            </summary>
            <ul className="mt-1 space-y-1.5 text-sm text-slate-600 pl-4 list-disc">
              {entry.keyPoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </details>
        )}

        {!body && entry.imageDescription && (
          <p className="text-sm text-slate-600 italic">{entry.imageDescription}</p>
        )}

        {entry.tags && entry.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {entry.tags.slice(0, expanded ? undefined : 6).map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick(tag)}
                className="text-xs px-2.5 h-7 rounded-full bg-gradient-to-r from-teal-50 to-purple-50 border border-teal-200/70 text-teal-800 hover:from-teal-100 hover:to-purple-100"
              >
                #{tag}
              </button>
            ))}
            {!expanded && entry.tags.length > 6 && (
              <button onClick={() => setExpanded(true)} className="text-xs px-2 h-7 text-slate-500">
                +{entry.tags.length - 6}
              </button>
            )}
          </div>
        )}

        {showDetails && hasDetails && (
          <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs text-slate-600 animate-fade-in">
            {entry.category && (<><dt className="text-slate-400">Category</dt><dd>{entry.category}</dd></>)}
            {entry.topics?.length ? (<><dt className="text-slate-400">Topics</dt><dd>{entry.topics.join(", ")}</dd></>) : null}
            {entry.keywords?.length ? (<><dt className="text-slate-400">Keywords</dt><dd>{entry.keywords.join(", ")}</dd></>) : null}
            {entry.imageScene && (<><dt className="text-slate-400">Scene</dt><dd>{entry.imageScene}</dd></>)}
            {entry.imageMood && (<><dt className="text-slate-400">Mood</dt><dd>{entry.imageMood}</dd></>)}
          </dl>
        )}
      </div>

      <footer className="mt-2 flex items-center justify-between px-2 pb-1.5 border-t border-teal-50">
        {hasDetails ? (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="h-10 px-2.5 text-xs font-medium text-slate-500 rounded-full hover:bg-white/70"
          >
            {showDetails ? "Hide details" : "AI details"}
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center">
          <IconButton label="Copy text" onClick={() => onCopy(entry)}>
            <CopyIcon size={18} />
          </IconButton>
          <IconButton label="Edit entry" onClick={() => onEdit(entry)}>
            <EditIcon size={18} />
          </IconButton>
          <IconButton label="Delete entry" onClick={() => onDelete(entry)} danger>
            <TrashIcon size={18} />
          </IconButton>
        </div>
      </footer>
    </article>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`h-11 w-11 grid place-items-center rounded-full transition-colors ${
        danger ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" : "text-slate-400 hover:text-slate-700 hover:bg-white/80"
      }`}
    >
      {children}
    </button>
  );
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default memo(EntryCard);
