// API Route: POST /api/entries - Create a new entry
// API Route: GET /api/entries - List entries (with optional filters)
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { requireUser } from "@/lib/auth/middleware";
import {
  extractTextMetadata,
  extractImageMetadata,
  VENICE_CHAT_MODEL,
} from "@/lib/venice/client";
import {
  buildDownloadUrl,
  downloadAsDataUrl,
  isUserPath,
  MAX_IMAGES_PER_ENTRY,
} from "@/lib/firebase/storage";
import { ENTRIES, normalizeTags, toDate, tryEmbedEntry } from "@/lib/entries/server";
import type { CreateEntryRequest, Entry, EntryImage } from "@/types";

/** Validates images from the client: they must live in the user's folder. */
function sanitizeImages(userId: string, body: CreateEntryRequest): EntryImage[] | string {
  const incoming: Partial<EntryImage>[] = body.images?.length
    ? body.images
    : body.imageUrl
    ? [
        {
          url: body.imageUrl,
          storagePath: body.imageStoragePath,
          filename: body.imageMetadata?.filename,
          size: body.imageMetadata?.size,
          contentType: body.imageMetadata?.contentType,
        },
      ]
    : [];

  if (incoming.length > MAX_IMAGES_PER_ENTRY) {
    return `An entry can have at most ${MAX_IMAGES_PER_ENTRY} images`;
  }

  const images: EntryImage[] = [];
  for (const img of incoming) {
    if (!isUserPath(userId, img.storagePath) || typeof img.url !== "string") {
      return "Invalid image reference";
    }
    // The URL must point at that exact object (token URL from /api/upload).
    if (!img.url.startsWith(buildDownloadUrl(img.storagePath, ""))) {
      return "Invalid image URL";
    }
    images.push({
      url: img.url,
      storagePath: img.storagePath,
      ...(img.filename ? { filename: String(img.filename).slice(0, 200) } : {}),
      ...(typeof img.size === "number" ? { size: img.size } : {}),
      ...(img.contentType ? { contentType: String(img.contentType) } : {}),
      ...(typeof img.width === "number" ? { width: img.width } : {}),
      ...(typeof img.height === "number" ? { height: img.height } : {}),
    });
  }
  return images;
}

/**
 * Entries written offline are synced later; keep the time they were written
 * (accepted only if it's in the last 30 days and not in the future).
 */
function writtenAt(body: CreateEntryRequest): Timestamp | null {
  if (!body.writtenAt) return null;
  const d = new Date(body.writtenAt);
  const now = Date.now();
  if (isNaN(d.getTime()) || d.getTime() > now + 60_000 || d.getTime() < now - 30 * 86400000) {
    return null;
  }
  return Timestamp.fromDate(d);
}

// POST /api/entries - Create entry
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body: CreateEntryRequest = await request.json();
    const images = sanitizeImages(userId, body);
    if (typeof images === "string") {
      return NextResponse.json({ error: images }, { status: 400 });
    }

    const type = body.type === "url" ? "url" : images.length > 0 ? "image" : "note";
    const rawText = typeof body.rawText === "string" ? body.rawText : undefined;
    const improvedText = typeof body.improvedText === "string" ? body.improvedText : undefined;

    if (type === "note" && !rawText?.trim() && !improvedText?.trim()) {
      return NextResponse.json({ error: "Write something or add a photo first" }, { status: 400 });
    }
    if (type === "url" && !body.url) {
      return NextResponse.json({ error: "url is required for link entries" }, { status: 400 });
    }

    // --- AI enrichment (never blocks saving) --------------------------------
    let textToAnalyze = improvedText || rawText || "";
    if (type === "url" && body.summary) {
      const keyPoints = body.keyPoints?.length ? `\n\nKey Points:\n${body.keyPoints.join("\n")}` : "";
      const note = rawText?.trim() ? `\n\nMy notes: ${rawText.trim()}` : "";
      textToAnalyze = `${body.urlTitle ? body.urlTitle + "\n\n" : ""}${body.summary}${keyPoints}${note}`;
    }

    const [textMeta, imageMetas] = await Promise.all([
      textToAnalyze.trim()
        ? extractTextMetadata(textToAnalyze).catch((error) => {
            console.error("Text metadata extraction failed (continuing):", error);
            return null;
          })
        : Promise.resolve(null),
      Promise.all(
        images.map((img) =>
          downloadAsDataUrl(img.storagePath)
            .then((dataUrl) => extractImageMetadata(dataUrl))
            .catch((error) => {
              console.error(`Image metadata extraction failed for ${img.storagePath}:`, error);
              return null;
            })
        )
      ),
    ]);

    images.forEach((img, i) => {
      if (imageMetas[i]?.description) img.description = imageMetas[i]!.description;
    });
    const firstImageMeta = imageMetas.find(Boolean) || null;

    const tags = normalizeTags([
      ...(body.tags || []),
      ...(textMeta?.tags || []),
      ...imageMetas.flatMap((m) => m?.tags || []),
    ]);

    // --- Build the document --------------------------------------------------
    const entryData: Record<string, any> = {
      userId,
      type,
      source: body.source || (improvedText ? "improved" : "raw"),
      createdAt: writtenAt(body) || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      tags,
      entities: textMeta?.entities || [],
    };

    if (textMeta || firstImageMeta) entryData.aiModel = VENICE_CHAT_MODEL;
    if (textMeta?.topics) entryData.topics = textMeta.topics;
    if (textMeta?.keywords) entryData.keywords = textMeta.keywords;
    if (textMeta?.sentiment) entryData.sentiment = textMeta.sentiment;
    const category = textMeta?.category || firstImageMeta?.category;
    if (category) entryData.category = category;

    if (firstImageMeta) {
      entryData.imageDescription = firstImageMeta.description;
      entryData.imageObjects = firstImageMeta.objects || [];
      entryData.imageScene = firstImageMeta.scene;
      if (firstImageMeta.mood) entryData.imageMood = firstImageMeta.mood;
      entryData.imageColors = firstImageMeta.colors || [];
    }

    if (images.length > 0) {
      entryData.images = images;
      // Mirror the first image into the legacy fields for older readers.
      entryData.imageUrl = images[0].url;
      entryData.imageStoragePath = images[0].storagePath;
      entryData.imageMetadata = {
        filename: images[0].filename || "image",
        size: images[0].size || 0,
        contentType: images[0].contentType || "image/jpeg",
      };
    }

    if (rawText !== undefined) entryData.rawText = rawText;
    if (improvedText !== undefined) entryData.improvedText = improvedText;
    if (body.timezone) entryData.timezone = String(body.timezone).slice(0, 100);
    if (body.device) entryData.device = String(body.device).slice(0, 300);

    if (type === "url") {
      entryData.url = body.url;
      if (body.urlTitle) entryData.urlTitle = body.urlTitle;
      if (body.urlDomain) entryData.urlDomain = body.urlDomain;
      if (body.urlAuthor) entryData.urlAuthor = body.urlAuthor;
      if (body.urlChecksum) entryData.urlChecksum = body.urlChecksum;
      if (body.summary) entryData.summary = body.summary;
      if (body.keyPoints?.length) entryData.keyPoints = body.keyPoints;
      if (body.quotes?.length) entryData.quotes = body.quotes;
      entryData.urlFetchedAt = FieldValue.serverTimestamp();
    }

    const docRef = await adminDb.collection(ENTRIES).add(entryData);
    const doc = await docRef.get();
    const entry = { id: doc.id, ...doc.data() } as Entry;

    await tryEmbedEntry(entry);

    return NextResponse.json({ id: doc.id, entry });
  } catch (error) {
    console.error("Error creating entry:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create entry" },
      { status: 500 }
    );
  }
}

// GET /api/entries - List entries with filters
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const searchParams = request.nextUrl.searchParams;

    let query: FirebaseFirestore.Query = adminDb
      .collection(ENTRIES)
      .where("userId", "==", userId);

    const type = searchParams.get("type");
    if (type && ["note", "url", "image"].includes(type)) {
      query = query.where("type", "==", type);
    }

    const tag = searchParams.get("tag");
    if (tag) {
      query = query.where("tags", "array-contains", tag);
    }

    const sentiment = searchParams.get("sentiment");
    if (sentiment && ["negative", "neutral", "positive"].includes(sentiment)) {
      query = query.where("sentiment", "==", sentiment);
    }

    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50") || 50, 1), 2000);
    query = query.orderBy("createdAt", "desc").limit(limit);

    const snapshot = await query.get();
    let entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Entry[];

    // Date range is filtered in memory (Firestore orderBy/range limitation).
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from || to) {
      const fromDate = from ? new Date(from) : null;
      const toDateLimit = to ? new Date(to) : null;
      entries = entries.filter((entry) => {
        const d = toDate(entry.createdAt);
        if (!d) return false;
        if (fromDate && d < fromDate) return false;
        if (toDateLimit && d > toDateLimit) return false;
        return true;
      });
    }

    return NextResponse.json({ entries, total: entries.length });
  } catch (error) {
    console.error("Error fetching entries:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch entries" },
      { status: 500 }
    );
  }
}
