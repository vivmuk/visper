// API Route: POST /api/entries - Create a new entry
// API Route: GET /api/entries - List entries (with optional filters)
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { CreateEntryRequest, Entry, SearchRequest } from "@/types";

// POST /api/entries - Create entry
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication middleware to get userId from token
    // For now, we'll accept userId in the request body (temporary)
    const body: CreateEntryRequest & { userId: string } = await request.json();

    if (!body.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    if (!body.type) {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }

    if (body.type === "note" && !body.rawText && !body.improvedText) {
      return NextResponse.json(
        { error: "rawText or improvedText is required for note entries" },
        { status: 400 }
      );
    }

    if (body.type === "url" && !body.url) {
      return NextResponse.json(
        { error: "url is required for url entries" },
        { status: 400 }
      );
    }

    // Create entry document
    const entryData: Omit<Entry, "id"> = {
      userId: body.userId,
      type: body.type,
      source: body.source || (body.improvedText ? "improved" : "raw"),
      rawText: body.rawText,
      improvedText: body.improvedText,
      createdAt: FieldValue.serverTimestamp() as any,
      updatedAt: FieldValue.serverTimestamp() as any,
      timezone: body.timezone,
      device: body.device,
      tags: body.tags || [],
      entities: [],
      url: body.url,
    };

    const docRef = await adminDb.collection("entries").add(entryData);

    // Fetch the created document to return it
    const doc = await docRef.get();
    const entry = { id: doc.id, ...doc.data() } as Entry;

    return NextResponse.json({ id: doc.id, entry });
  } catch (error) {
    console.error("Error creating entry:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create entry",
      },
      { status: 500 }
    );
  }
}

// GET /api/entries - List entries with filters
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication middleware
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    // Build query
    let query: FirebaseFirestore.Query = adminDb
      .collection("entries")
      .where("userId", "==", userId);

    // Apply filters
    const type = searchParams.get("type");
    if (type && (type === "note" || type === "url")) {
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

    // Date range
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Order by createdAt descending (newest first)
    query = query.orderBy("createdAt", "desc");

    // Limit results
    const limit = parseInt(searchParams.get("limit") || "50");
    query = query.limit(limit);

    const snapshot = await query.get();
    const entries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Entry[];

    return NextResponse.json({ entries, total: entries.length });
  } catch (error) {
    console.error("Error fetching entries:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch entries",
      },
      { status: 500 }
    );
  }
}

