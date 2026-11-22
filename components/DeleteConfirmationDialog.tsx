"use client";

import BottomSheet from "./ui/BottomSheet";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entryTitle?: string;
  isDeleting?: boolean;
}

export default function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  entryTitle,
  isDeleting,
}: DeleteConfirmationDialogProps) {
  return (
    <BottomSheet open={isOpen} onClose={onClose} title="Delete this entry?">
      {entryTitle && (
        <p className="text-sm text-slate-500 italic line-clamp-2 mb-2">&ldquo;{entryTitle}&rdquo;</p>
      )}
      <p className="text-slate-600">
        It will be removed from your journal along with its photos. This can&apos;t be undone.
      </p>
      <div className="mt-6 mb-2 flex flex-col-reverse sm:flex-row gap-3">
        <button
          onClick={onClose}
          className="h-12 flex-1 rounded-2xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200"
        >
          Keep it
        </button>
        <button
          onClick={onConfirm}
          disabled={isDeleting}
          className="h-12 flex-1 rounded-2xl bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-60"
        >
          {isDeleting ? "Deleting…" : "Delete forever"}
        </button>
      </div>
    </BottomSheet>
  );
}
