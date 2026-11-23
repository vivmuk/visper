"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/lib/toast/ToastContext";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { entryImages } from "@/lib/entries/shared";
import BottomSheet from "./ui/BottomSheet";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog";
import EditEntrySheet from "./EditEntrySheet";
import EntryCard from "./EntryCard";
import ImageViewer, { type ViewerImage } from "./ImageViewer";
import type { Entry } from "@/types";

/**
 * A sheet listing a few entries (a calendar day, or a memory) with the same
 * copy / edit / delete / photo actions as the journal.
 */
export default function EntryListSheet({
  open,
  title,
  subtitle,
  entries,
  dateLabel,
  onClose,
  onEdited,
  onDeleted,
  onTagClick,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  entries: Entry[];
  dateLabel?: (entry: Entry) => string | undefined;
  onClose: () => void;
  onEdited?: (entry: Entry) => void;
  onDeleted?: (id: string) => void;
  onTagClick?: (tag: string) => void;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewer, setViewer] = useState<{ images: ViewerImage[]; index: number } | null>(null);

  const copy = async (entry: Entry) => {
    const text = [entry.urlTitle, entry.improvedText || entry.rawText, entry.summary, entry.url]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied to clipboard", "success");
    } catch {
      showToast("Couldn't copy on this device", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await apiFetch(user, `/api/entries/${deleting.id}`, { method: "DELETE" });
      onDeleted?.(deleting.id);
      showToast("Entry deleted", "success");
      setDeleting(null);
    } catch (err) {
      showToast(errorMessage(err, "Couldn't delete the entry"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <BottomSheet open={open && !editing && !deleting && !viewer} onClose={onClose} title={title} tall>
        {subtitle && <p className="-mt-1 mb-3 text-sm text-slate-500">{subtitle}</p>}
        <div className="space-y-4 pb-4">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              dateLabel={dateLabel?.(entry)}
              onTagClick={(tag) => {
                onClose();
                onTagClick?.(tag);
              }}
              onEdit={setEditing}
              onDelete={setDeleting}
              onCopy={copy}
              onOpenImage={(e, index) =>
                setViewer({
                  index,
                  images: entryImages(e).map((img) => ({
                    url: img.url,
                    description: img.description || e.imageDescription,
                  })),
                })
              }
            />
          ))}
          {entries.length === 0 && <p className="text-sm text-slate-500">Nothing here anymore.</p>}
        </div>
      </BottomSheet>

      <EditEntrySheet
        entry={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => onEdited?.(updated)}
      />
      <DeleteConfirmationDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        entryTitle={deleting ? (deleting.urlTitle || deleting.improvedText || deleting.rawText || "").slice(0, 80) : undefined}
      />
      {viewer && <ImageViewer images={viewer.images} startIndex={viewer.index} onClose={() => setViewer(null)} />}
    </>
  );
}
