// API Route: POST /api/ask
// "Ask my journal": answers a question using the user's own entries
// (retrieved by meaning via embeddings, with keyword/recency fallback).
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/middleware";
import { answerFromJournal } from "@/lib/venice/client";
import {
  entryToText,
  formatEntryDate,
  listUserEntries,
  matchesQuery,
  semanticRank,
  toDate,
} from "@/lib/entries/server";
import type { AskResponse, Entry } from "@/types";

export const dynamic = "force-dynamic";

const MAX_CONTEXT_ENTRIES = 14;

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { question } = await request.json();
    if (typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "Ask a question first" }, { status: 400 });
    }
    const q = question.trim().slice(0, 500);

    const entries = await listUserEntries(auth.userId, 2000);
    if (entries.length === 0) {
      return NextResponse.json({
        answer: "Your journal is still empty — write a few entries and I'll be able to answer questions about them.",
        sources: [],
      } satisfies AskResponse);
    }
    const byId = new Map(entries.map((e) => [e.id, e]));

    // 1. Meaning-based matches
    const picked: Entry[] = [];
    const add = (e: Entry | undefined) => {
      if (e && !picked.includes(e) && picked.length < MAX_CONTEXT_ENTRIES) picked.push(e);
    };
    try {
      const ranked = await semanticRank(auth.userId, q, MAX_CONTEXT_ENTRIES);
      ranked.filter((r) => r.score > 0.3).forEach((r) => add(byId.get(r.entryId)));
    } catch (error) {
      console.error("Semantic retrieval failed, falling back to keywords:", error);
    }
    // 2. Keyword matches, 3. most recent entries for time-based questions
    entries.filter((e) => matchesQuery(e, q)).slice(0, 6).forEach(add);
    entries.slice(0, 6).forEach(add);

    picked.sort(
      (a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0)
    );

    const context = picked.map((e) => ({
      id: e.id,
      date: formatEntryDate(e),
      text: entryToText(e).slice(0, 2500),
    }));

    const { answer, sourceIds } = await answerFromJournal(q, context);

    const sources = sourceIds
      .map((id) => byId.get(id))
      .filter((e): e is Entry => Boolean(e))
      .slice(0, 6)
      .map((e) => ({
        id: e.id,
        date: toDate(e.createdAt)?.toISOString() || null,
        snippet: entryToText(e).slice(0, 160),
        type: e.type,
      }));

    return NextResponse.json({ answer, sources } satisfies AskResponse);
  } catch (error) {
    console.error("Error answering question:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't answer that right now" },
      { status: 500 }
    );
  }
}
