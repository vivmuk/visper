// Pure entry helpers shared by the server and the browser.
import type { Entry, EntryImage } from "@/types";

export function toDate(value: any): Date | null {
  if (!value) return null;
  try {
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
    if (typeof value._seconds === "number") return new Date(value._seconds * 1000);
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** All images on an entry, including the legacy single-image fields. */
export function entryImages(entry: Partial<Entry>): EntryImage[] {
  if (entry.images && entry.images.length > 0) return entry.images;
  if (entry.imageUrl) {
    return [
      {
        url: entry.imageUrl,
        storagePath: entry.imageStoragePath || "",
        filename: entry.imageMetadata?.filename,
        size: entry.imageMetadata?.size,
        contentType: entry.imageMetadata?.contentType,
        description: entry.imageDescription,
      },
    ];
  }
  return [];
}
