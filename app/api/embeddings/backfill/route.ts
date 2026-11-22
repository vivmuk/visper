// API Route: POST /api/embeddings/backfill
// Indexes (embeds) entries that don't have an up-to-date embedding yet, a
// batch at a time. The client calls it repeatedly until remaining === 0.
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/middleware";
import { backfillEmbeddings } from "@/lib/entries/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await backfillEmbeddings(auth.userId, 96);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error indexing entries:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Indexing failed" },
      { status: 500 }
    );
  }
}
