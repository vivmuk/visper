// API Route: POST /api/urls/summarize
// Scrapes a URL and summarizes it using Venice AI
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/middleware";
import { scrapeUrl } from "@/lib/utils/url-scraper";
import { summarizeUrl } from "@/lib/venice/client";
import type { SummarizeUrlRequest, SummarizeUrlResponse } from "@/types";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body: SummarizeUrlRequest = await request.json();

    if (!body.url || !body.url.trim()) {
      return NextResponse.json(
        { error: "url is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Validate URL format and refuse internal/private addresses (SSRF guard)
    let parsed: URL;
    try {
      parsed = new URL(body.url.trim());
    } catch {
      return NextResponse.json({ error: "That doesn't look like a valid link" }, { status: 400 });
    }
    if (!["http:", "https:"].includes(parsed.protocol) || isPrivateHost(parsed.hostname)) {
      return NextResponse.json({ error: "Only public http(s) links can be summarized" }, { status: 400 });
    }

    // Scrape the URL
    const scraped = await scrapeUrl(parsed.toString());

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


function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) {
    return true;
  }
  // IPv4 literals in private, loopback, link-local and CGNAT ranges
  const v4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  // IPv6 loopback / unique-local / link-local
  return host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80");
}
