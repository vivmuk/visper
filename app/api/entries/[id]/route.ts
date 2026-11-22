// API Route: PATCH /api/entries/[id] - Edit an entry's text or tags
// API Route: DELETE /api/entries/[id] - Delete an entry (and its images)
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/auth/middleware";
import { deleteStorageFiles, isUserPath } from "@/lib/firebase/storage";
import {
  EMBEDDINGS,
  entryImages,
  getOwnedEntry,
  normalizeTags,
  tryEmbedEntry,
} from "@/lib/entries/server";
import type { Entry, UpdateEntryRequest } from "@/types";

type Params = { params: { id: string } };

function ownershipError(status: 403 | 404) {
  return NextResponse.json(
    { error: status === 404 ? "Entry not found" : "You don't have access to this entry" },
    { status }
  );
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { ref, entry, status } = await getOwnedEntry(auth.userId, params.id);
    if (!entry) return ownershipError(status as 403 | 404);

    const body: UpdateEntryRequest = await request.json();
    const updates: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };

    if (typeof body.rawText === "string") updates.rawText = body.rawText;
    if (typeof body.improvedText === "string") updates.improvedText = body.improvedText;
    if (body.tags !== undefined) updates.tags = normalizeTags(body.tags);

    const nextText =
      (updates.improvedText ?? entry.improvedText ?? "") + (updates.rawText ?? entry.rawText ?? "");
    if (entry.type === "note" && !nextText.trim()) {
      return NextResponse.json({ error: "An entry can't be empty" }, { status: 400 });
    }

    await ref.update(updates);
    const updated = { id: entry.id, ...(await ref.get()).data() } as Entry;
    await tryEmbedEntry(updated);

    return NextResponse.json({ entry: updated });
  } catch (error) {
    console.error("Error updating entry:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { ref, entry, status } = await getOwnedEntry(auth.userId, params.id);
    if (!entry) return ownershipError(status as 403 | 404);

    await ref.delete();
    await adminDb.collection(EMBEDDINGS).doc(entry.id).delete().catch(() => undefined);

    // Remove the entry's photos from storage too (only files in the user's folder).
    const paths = entryImages(entry)
      .map((img) => img.storagePath)
      .filter((p) => isUserPath(auth.userId, p));
    await deleteStorageFiles(paths);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting entry:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete entry" },
      { status: 500 }
    );
  }
}
