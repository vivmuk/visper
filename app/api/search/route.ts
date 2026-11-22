// API Route: GET /api/search
// Search the signed-in user's entries by keywords, tag, type, sentiment and
// date range. With semantic=true, results are ranked by meaning (embeddings)
// as well as keywords.
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/middleware";
import {
  entryImages,
  listUserEntries,
  matchesQuery,
  semanticRank,
  toDate,
} from "@/lib/entries/server";
import type { Entry } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const params = request.nextUrl.searchParams;
    const q = (params.get("q") || "").trim().slice(0, 300);
    const tag = params.get("tag");
    const type = params.get("type");
    const sentiment = params.get("sentiment");
    const from = params.get("from") ? new Date(params.get("from")!) : null;
    const to = params.get("to") ? new Date(params.get("to")!) : null;
    const semantic = params.get("semantic") === "true";
    const limit = Math.min(parseInt(params.get("limit") || "200") || 200, 1000);

    const all = await listUserEntries(auth.userId, 2000);

    const passesFilters = (entry: Entry) => {
      if (tag && !(entry.tags || []).some((t) => t.toLowerCase() === tag.toLowerCase())) return false;
      if (type === "image" && entryImages(entry).length === 0) return false;
      if (type && type !== "image" && entry.type !== type) return false;
      if (sentiment && entry.sentiment !== sentiment) return false;
      if (from || to) {
        const d = toDate(entry.createdAt);
        if (!d || (from && d < from) || (to && d > to)) return false;
      }
      return true;
    };

    const filtered = all.filter(passesFilters);
    let results: Array<Entry & { score?: number }> = q
      ? filtered.filter((e) => matchesQuery(e, q))
      : filtered;

    if (semantic && q) {
      try {
        const ranked = await semanticRank(auth.userId, q, 40);
        const byId = new Map(filtered.map((e) => [e.id, e]));
        const keywordIds = new Set(results.map((e) => e.id));
        const merged: Array<Entry & { score?: number }> = [];
        // Keyword matches first (exact), then meaning-based matches.
        results.forEach((e) => merged.push({ ...e, score: 1 }));
        ranked
          .filter((r) => r.score > 0.45 && !keywordIds.has(r.entryId) && byId.has(r.entryId))
          .forEach((r) => merged.push({ ...byId.get(r.entryId)!, score: r.score }));
        results = merged;
      } catch (error) {
        console.error("Semantic search failed, using keyword results:", error);
      }
    }

    return NextResponse.json({ entries: results.slice(0, limit), total: results.length });
  } catch (error) {
    console.error("Error searching entries:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
