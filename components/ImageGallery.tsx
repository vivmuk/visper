"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { friendlyDate, monthKey } from "@/lib/client/format";
import { entryImages } from "@/lib/entries/shared";
import ImageViewer from "./ImageViewer";
import EmptyState from "./ui/EmptyState";
import type { Entry } from "@/types";

interface Photo {
  key: string;
  url: string;
  description?: string;
  entry: Entry;
}

export default function ImageGallery({ onWrite }: { userId?: string; onWrite?: () => void }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<"grid" | "masonry">("grid");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ entries: Entry[] }>(user, "/api/entries?limit=2000");
        setPhotos(
          (data.entries || []).flatMap((entry) =>
            entryImages(entry).map((img, i) => ({
              key: `${entry.id}-${i}`,
              url: img.url,
              description: img.description || (i === 0 ? entry.imageDescription : undefined),
              entry,
            }))
          )
        );
      } catch (err) {
        setError(errorMessage(err, "Couldn't load your photos"));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user]);

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: { photo: Photo; index: number }[] }[] = [];
    photos.forEach((photo, index) => {
      const { key, label } = monthKey(photo.entry.createdAt);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push({ photo, index });
      else out.push({ key, label, items: [{ photo, index }] });
    });
    return out;
  }, [photos]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-1.5" aria-busy="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="skeleton aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <EmptyState art="offline" title="Couldn't load your photos">{error}</EmptyState>;
  }

  if (photos.length === 0) {
    return (
      <EmptyState
        art="empty-gallery"
        title="No photos yet"
        action={
          onWrite && (
            <button onClick={onWrite} className="h-12 px-6 rounded-2xl btn-gradient font-semibold shadow-md">
              Add a photo
            </button>
          )
        }
      >
        Photos you add to entries collect here, with AI descriptions you can search.
      </EmptyState>
    );
  }

  return (
    <div className="animate-rise-in">
      <div className="flex items-center justify-between mb-4 px-1">
        <p className="text-sm text-slate-500">
          {photos.length} photo{photos.length === 1 ? "" : "s"}
        </p>
        <div className="flex p-1 rounded-full bg-white/70 border border-white">
          {(["grid", "masonry"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLayout(l)}
              aria-pressed={layout === l}
              className={`h-8 px-3.5 rounded-full text-sm ${
                layout === l ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-sm" : "text-slate-600"
              }`}
            >
              {l === "grid" ? "Grid" : "Collage"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.key}>
            <h3 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wider text-slate-500">
              {group.label} <span className="font-normal normal-case tracking-normal text-slate-400">· {group.items.length}</span>
            </h3>
            {layout === "grid" ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                {group.items.map(({ photo, index }) => (
                  <button
                    key={photo.key}
                    onClick={() => setOpenIndex(index)}
                    className="relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-teal-50 to-pink-50"
                    aria-label={photo.description || "Open photo"}
                  >
                    <img src={photo.url} alt={photo.description || ""} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="columns-2 md:columns-3 gap-2 [&>*]:mb-2">
                {group.items.map(({ photo, index }) => (
                  <button
                    key={photo.key}
                    onClick={() => setOpenIndex(index)}
                    className="block w-full break-inside-avoid overflow-hidden rounded-2xl bg-gradient-to-br from-teal-50 to-pink-50 shadow-sm"
                    aria-label={photo.description || "Open photo"}
                  >
                    <img src={photo.url} alt={photo.description || ""} loading="lazy" decoding="async" className="w-full h-auto" />
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {openIndex !== null && (
        <ImageViewer
          startIndex={openIndex}
          onClose={() => setOpenIndex(null)}
          images={photos.map((p) => ({
            url: p.url,
            description: p.description,
            caption: friendlyDate(p.entry.createdAt),
            details: <PhotoDetails entry={p.entry} />,
          }))}
        />
      )}
    </div>
  );
}

function PhotoDetails({ entry }: { entry: Entry }) {
  const text = entry.improvedText || entry.rawText;
  return (
    <div className="mt-3 space-y-2 text-white/80">
      {text && <p className="whitespace-pre-wrap text-white/90">{text}</p>}
      {entry.imageMood && <p><span className="text-white/50">Mood · </span>{entry.imageMood}</p>}
      {entry.imageScene && <p><span className="text-white/50">Scene · </span>{entry.imageScene}</p>}
      {entry.tags?.length ? (
        <p className="flex flex-wrap gap-1.5 pt-1">
          {entry.tags.map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full bg-white/15 text-xs">#{t}</span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
