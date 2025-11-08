// API Route: GET /api/search
// Search entries by text, tags, sentiment, date range, and semantic similarity
import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic since it uses searchParams
export const dynamic = 'force-dynamic';
import { adminDb } from "@/lib/firebase/admin";
import type { SearchRequest, Entry } from "@/types";

export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication middleware
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    const q = searchParams.get("q");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const tag = searchParams.get("tag");
    const sentiment = searchParams.get("sentiment");
    const type = searchParams.get("type");
    const semantic = searchParams.get("semantic") === "true";
    const topK = parseInt(searchParams.get("topK") || "20");

    // For now, implement basic text search
    // Semantic search with pgvector will be added later
    let query: FirebaseFirestore.Query = adminDb
      .collection("entries")
      .where("userId", "==", userId);

    // Apply filters
    if (type && (type === "note" || type === "url")) {
      query = query.where("type", "==", type);
    }

    if (tag) {
      query = query.where("tags", "array-contains", tag);
    }

    if (sentiment && ["negative", "neutral", "positive"].includes(sentiment)) {
      query = query.where("sentiment", "==", sentiment);
    }

    // Order by createdAt descending
    query = query.orderBy("createdAt", "desc").limit(topK);

    const snapshot = await query.get();
    let entries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Entry[];

    // Basic text search (client-side filtering for now)
    // In production, use Firestore text search or semantic search
    if (q && q.trim()) {
      const searchTerm = q.toLowerCase();
      entries = entries.filter((entry) => {
        const searchableText = [
          entry.rawText,
          entry.improvedText,
          entry.summary,
          ...entry.tags,
          entry.urlTitle,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchableText.includes(searchTerm);
      });
    }

    // Date range filtering
    if (from) {
      const fromDate = new Date(from);
      entries = entries.filter((entry) => {
        const entryDate = entry.createdAt.toDate();
        return entryDate >= fromDate;
      });
    }

    if (to) {
      const toDate = new Date(to);
      entries = entries.filter((entry) => {
        const entryDate = entry.createdAt.toDate();
        return entryDate <= toDate;
      });
    }

    return NextResponse.json({
      entries,
      total: entries.length,
    });
  } catch (error) {
    console.error("Error searching entries:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to search entries",
      },
      { status: 500 }
    );
  }
}

