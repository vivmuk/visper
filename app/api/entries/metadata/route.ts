// API Route: POST /api/entries/metadata
// Extract enriched metadata from text or image using Venice AI
import { NextRequest, NextResponse } from "next/server";
import { extractTextMetadata, extractImageMetadata } from "@/lib/venice/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, text, imageUrl } = body;

    if (!type || (type !== "text" && type !== "image")) {
      return NextResponse.json(
        { error: "type must be 'text' or 'image'" },
        { status: 400 }
      );
    }

    if (type === "text" && !text) {
      return NextResponse.json(
        { error: "text is required for text type" },
        { status: 400 }
      );
    }

    if (type === "image" && !imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required for image type" },
        { status: 400 }
      );
    }

    let metadata;
    if (type === "text") {
      metadata = await extractTextMetadata(text);
    } else {
      metadata = await extractImageMetadata(imageUrl);
    }

    return NextResponse.json({ metadata });
  } catch (error) {
    console.error("Error extracting metadata:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to extract metadata",
      },
      { status: 500 }
    );
  }
}

