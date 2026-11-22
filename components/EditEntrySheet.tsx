"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/lib/toast/ToastContext";
import { apiFetch, errorMessage } from "@/lib/client/api";
import BottomSheet from "./ui/BottomSheet";
import { XIcon } from "./ui/Icons";
import type { Entry } from "@/types";

/** Edit an entry's text and tags. */
export default function EditEntrySheet({
  entry,
  onClose,
  onSaved,
}: {
  entry: Entry | null;
  onClose: () => void;
  onSaved: (entry: Entry) => void;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  // Edit the version that's displayed: the polished text if there is one.
  const field: "improvedText" | "rawText" = entry?.improvedText ? "improvedText" : "rawText";
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setText(entry[field] || "");
      setTags(entry.tags || []);
      setNewTag("");
    }
  }, [entry, field]);

  const addTag = () => {
    const tag = newTag.trim().replace(/^#/, "");
    if (tag && !tags.some((t) => t.toLowerCase() === tag.toLowerCase())) setTags([...tags, tag]);
    setNewTag("");
  };

  const save = async () => {
    if (!entry) return;
    setSaving(true);
    try {
      const { entry: updated } = await apiFetch<{ entry: Entry }>(user, `/api/entries/${entry.id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: text, tags }),
      });
      onSaved(updated);
      showToast("Entry updated", "success");
      onClose();
    } catch (error) {
      showToast(errorMessage(error, "Couldn't save your changes"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={!!entry}
      onClose={onClose}
      title="Edit entry"
      tall
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="h-12 px-5 rounded-2xl bg-slate-100 text-slate-700 font-medium">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 h-12 rounded-2xl btn-gradient font-semibold shadow-md disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      }
    >
      {entry?.type === "url" && entry.urlTitle && (
        <p className="text-sm text-slate-500 mb-2">Your notes on “{entry.urlTitle}”</p>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        aria-label="Entry text"
        className="w-full rounded-2xl bg-white border border-teal-100 p-4 leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-300"
      />
      {entry?.improvedText && entry?.rawText && (
        <details className="mt-2 text-sm text-slate-500">
          <summary className="cursor-pointer py-1">Your original words</summary>
          <p className="mt-1 whitespace-pre-wrap">{entry.rawText}</p>
        </details>
      )}

      <h3 className="mt-5 mb-2 text-sm font-medium text-slate-600">Tags</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 pl-3 pr-1 h-8 rounded-full bg-gradient-to-r from-teal-50 to-purple-50 border border-teal-200 text-sm text-teal-800"
          >
            #{tag}
            <button
              onClick={() => setTags(tags.filter((t) => t !== tag))}
              className="h-6 w-6 grid place-items-center rounded-full hover:bg-white"
              aria-label={`Remove tag ${tag}`}
            >
              <XIcon size={13} />
            </button>
          </span>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addTag();
          }}
          className="inline-flex"
        >
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onBlur={addTag}
            placeholder="+ add tag"
            aria-label="Add a tag"
            className="h-8 w-28 px-3 rounded-full border border-dashed border-teal-300 bg-transparent text-sm focus:outline-none focus:border-teal-500"
          />
        </form>
      </div>
    </BottomSheet>
  );
}
