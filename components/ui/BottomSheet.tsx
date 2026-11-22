"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "./Icons";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Taller sheet for editors */
  tall?: boolean;
}

/**
 * A sheet that slides up from the bottom on phones and appears as a centered
 * dialog on larger screens. Closes on backdrop tap, Escape, or swipe down on
 * the handle.
 */
export default function BottomSheet({ open, onClose, title, children, footer, tall }: BottomSheetProps) {
  const startY = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null || !panelRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - startY.current);
    panelRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startY.current === null || !panelRef.current) return;
    const dy = e.changedTouches[0].clientY - startY.current;
    panelRef.current.style.transform = "";
    startY.current = null;
    if (dy > 90) onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        ref={panelRef}
        className={`relative w-full md:max-w-lg bg-white/95 backdrop-blur-xl rounded-t-3xl md:rounded-3xl shadow-2xl animate-sheet-up md:animate-rise-in flex flex-col transition-transform ${
          tall ? "max-h-[92dvh]" : "max-h-[85dvh]"
        }`}
      >
        <div
          className="pt-2.5 pb-1 flex justify-center md:hidden cursor-grab"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 pt-2 md:pt-5 pb-2">
            <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
            <button
              onClick={onClose}
              className="-mr-2 h-10 w-10 grid place-items-center rounded-full text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              <XIcon size={20} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-slate-100 px-5 pt-3 pb-safe mb-3">{footer}</div>}
        {!footer && <div className="pb-safe" />}
      </div>
    </div>,
    document.body
  );
}
