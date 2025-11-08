// API Route: POST /api/entries/improve
// Improves journal entry text using Venice AI
import { NextRequest, NextResponse } from "next/server";
import { improveEntry } from "@/lib/venice/client";
import type { ImproveEntryRequest, ImproveEntryResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: ImproveEntryRequest = await request.json();

    if (!body.rawText || body.rawText.trim().length === 0) {
      return NextResponse.json(
        { error: "rawText is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Call Venice AI to improve the text
    const result = await improveEntry(body.rawText);

    const response: ImproveEntryResponse = {
      improvedText: result.improvedText,
      qualityScore: result.qualityScore,
      tags: result.tags,
      entities: result.entities,
      sentiment: result.sentiment,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error improving entry:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to improve entry",
      },
      { status: 500 }
    );
  }
}

