// API Route: POST /api/urls/summarize
// Scrapes a URL and summarizes it using Venice AI
import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/utils/url-scraper";
import { summarizeUrl } from "@/lib/venice/client";
import type { SummarizeUrlRequest, SummarizeUrlResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: SummarizeUrlRequest = await request.json();

    if (!body.url || !body.url.trim()) {
      return NextResponse.json(
        { error: "url is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Scrape the URL
    const scraped = await scrapeUrl(body.url);

    // Summarize using Venice AI
    const summary = await summarizeUrl(scraped.content);

    const response: SummarizeUrlResponse = {
      summary: summary.tldr,
      keyPoints: summary.keyPoints,
      quotes: summary.quotes,
      meta: {
        title: scraped.title,
        domain: scraped.domain,
        author: scraped.author,
        checksum: scraped.checksum,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error summarizing URL:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to summarize URL",
      },
      { status: 500 }
    );
  }
}

