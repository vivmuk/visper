// Shared server-side helpers for journal entries and their embeddings.
import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { createEmbeddings, VENICE_EMBEDDING_MODEL } from "@/lib/venice/client";
import type { Entry } from "@/types";
import { entryImages, toDate } from "@/lib/entries/shared";

export { entryImages, toDate };

export const ENTRIES = "entries";
export const EMBEDDINGS = "embeddings";

/** The text that represents an entry for search, embeddings and AI context. */
export function entryToText(entry: Partial<Entry>): string {
  const parts: string[] = [];
  if (entry.urlTitle) parts.push(entry.urlTitle);
  const body = entry.improvedText || entry.rawText;
  if (body) parts.push(body);
  if (entry.summary && entry.summary !== body) parts.push(entry.summary);
  if (entry.keyPoints?.length) parts.push(entry.keyPoints.join("\n"));
  const imageDescriptions = entryImages(entry)
    .map((img) => img.description)
    .filter(Boolean);
  if (imageDescriptions.length) parts.push(`Photos: ${imageDescriptions.join(" | ")}`);
  else if (entry.imageDescription) parts.push(`Photo: ${entry.imageDescription}`);
  if (entry.tags?.length) parts.push(`Tags: ${entry.tags.join(", ")}`);
  return parts.join("\n\n").trim();
}

export function normalizeTags(tags: unknown, max = 30): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    if (typeof raw !== "string") continue;
    const tag = raw.trim().replace(/^#/, "").slice(0, 40);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= max) break;
  }
  return out;
}

export async function getOwnedEntry(userId: string, entryId: string) {
  const ref = adminDb.collection(ENTRIES).doc(entryId);
  const doc = await ref.get();
  if (!doc.exists) return { ref, entry: null, status: 404 as const };
  const entry = { id: doc.id, ...doc.data() } as Entry;
  if (entry.userId !== userId) return { ref, entry: null, status: 403 as const };
  return { ref, entry, status: 200 as const };
}

/** Most recent entries for a user (newest first). */
export async function listUserEntries(userId: string, limit = 1000): Promise<Entry[]> {
  const snapshot = await adminDb
    .collection(ENTRIES)
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Entry);
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

function hashText(text: string) {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

/** Creates or refreshes the embeddings for the given entries (same user). */
export async function upsertEmbeddings(entries: Entry[]): Promise<number> {
  const items = entries
    .map((entry) => ({ entry, text: entryToText(entry) }))
    .filter((item) => item.text.length > 0);
  if (items.length === 0) return 0;

  let written = 0;
  for (let i = 0; i < items.length; i += 32) {
    const batchItems = items.slice(i, i + 32);
    const vectors = await createEmbeddings(batchItems.map((item) => item.text));
    const batch = adminDb.batch();
    batchItems.forEach((item, idx) => {
      batch.set(adminDb.collection(EMBEDDINGS).doc(item.entry.id), {
        entryId: item.entry.id,
        userId: item.entry.userId,
        vector: vectors[idx],
        model: VENICE_EMBEDDING_MODEL,
        textHash: hashText(item.text),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    written += batchItems.length;
  }
  return written;
}

/** Embeds a single entry, never throwing (embedding is a nice-to-have). */
export async function tryEmbedEntry(entry: Entry) {
  try {
    await upsertEmbeddings([entry]);
  } catch (error) {
    console.error(`Failed to embed entry ${entry.id}:`, error);
  }
}

/** Embeds entries that have no (or a stale) embedding. */
export async function backfillEmbeddings(userId: string, maxToProcess = 96) {
  const [entries, embeddingSnap] = await Promise.all([
    listUserEntries(userId, 2000),
    adminDb.collection(EMBEDDINGS).where("userId", "==", userId).select("textHash", "model").get(),
  ]);

  const existing = new Map(
    embeddingSnap.docs.map((d) => [d.id, d.data() as { textHash?: string; model?: string }])
  );

  const missing = entries.filter((entry) => {
    const text = entryToText(entry);
    if (!text) return false;
    const current = existing.get(entry.id);
    return !current || current.model !== VENICE_EMBEDDING_MODEL || current.textHash !== hashText(text);
  });

  const processed = await upsertEmbeddings(missing.slice(0, maxToProcess));
  return { processed, remaining: Math.max(0, missing.length - processed), total: entries.length };
}

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/**
 * Ranks the user's entries by semantic similarity to a query. Vectors are
 * compared in memory, which is plenty fast for a personal journal (thousands
 * of entries).
 */
export async function semanticRank(
  userId: string,
  query: string,
  topK = 12
): Promise<Array<{ entryId: string; score: number }>> {
  const [[queryVector], snapshot] = await Promise.all([
    createEmbeddings([query]),
    adminDb.collection(EMBEDDINGS).where("userId", "==", userId).get(),
  ]);
  return snapshot.docs
    .map((doc) => ({ entryId: doc.id, score: cosine(queryVector, doc.data().vector || []) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/** Keyword filter used by search: every word must appear somewhere. */
export function matchesQuery(entry: Entry, q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [
    entryToText(entry),
    entry.url,
    entry.category,
    ...(entry.topics || []),
    ...(entry.keywords || []),
    ...(entry.entities || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return words.every((w) => haystack.includes(w));
}

export function formatEntryDate(entry: Entry) {
  const d = toDate(entry.createdAt);
  return d ? d.toISOString().slice(0, 10) : "unknown date";
}
