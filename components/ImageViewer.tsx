"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, XIcon } from "./ui/Icons";

export interface ViewerImage {
  url: string;
  description?: string;
  caption?: string; // e.g. date
  details?: React.ReactNode;
}

/** Full-screen photo viewer: swipe or arrow keys to move, swipe down to close. */
export default function ImageViewer({
  images,
  startIndex = 0,
  onClose,
}: {
  images: ViewerImage[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [showInfo, setShowInfo] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const img = images[index];

  const go = (delta: number) => setIndex((i) => (i + delta + images.length) % images.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (!img || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-black/95 flex flex-col animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        const dy = e.changedTouches[0].clientY - touch.current.y;
        touch.current = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && images.length > 1) go(dx < 0 ? 1 : -1);
        else if (dy > 100 && Math.abs(dy) > Math.abs(dx)) onClose();
      }}
    >
      <div className="pt-safe">
        <div className="flex items-center justify-between px-3 h-14 text-white">
          <button onClick={onClose} className="h-11 w-11 grid place-items-center rounded-full hover:bg-white/10" aria-label="Close">
            <XIcon />
          </button>
          <span className="text-sm text-white/80 tabular-nums">
            {images.length > 1 ? `${index + 1} / ${images.length}` : img.caption}
          </span>
          <a
            href={img.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="h-11 w-11 grid place-items-center rounded-full hover:bg-white/10"
            aria-label="Open original"
          >
            <DownloadIcon />
          </a>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2" onClick={() => setShowInfo((v) => !v)}>
        <img
          key={img.url}
          src={img.url}
          alt={img.description || "Photo"}
          className="max-h-full max-w-full object-contain select-none animate-fade-in"
          draggable={false}
        />
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="hidden md:grid absolute left-4 h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Previous photo"
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="hidden md:grid absolute right-4 h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Next photo"
            >
              <ChevronRightIcon />
            </button>
          </>
        )}
      </div>

      {(img.description || img.details) && (
        <div className="pb-safe">
          <div
            className={`mx-3 mb-3 rounded-2xl bg-white/10 text-white/90 backdrop-blur px-4 py-3 text-sm overflow-y-auto transition-all ${
              showInfo ? "max-h-[45dvh]" : "max-h-24"
            }`}
            onClick={() => setShowInfo((v) => !v)}
          >
            {img.caption && images.length > 1 && <p className="text-white/60 text-xs mb-1">{img.caption}</p>}
            {img.description && <p className={showInfo ? "" : "line-clamp-2"}>{img.description}</p>}
            {showInfo && img.details}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
