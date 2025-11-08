// URL scraping utility with readability-like parsing
import * as crypto from "crypto";

export interface ScrapedContent {
  title: string;
  content: string;
  author?: string;
  domain: string;
  checksum: string;
}

/**
 * Scrapes a URL and extracts main content
 * Uses a simple fetch + basic parsing approach
 * For production, consider using libraries like @mozilla/readability or cheerio
 */
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  try {
    // Validate URL
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Fetch the URL with a user agent
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      // Timeout after 8 seconds
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Basic content extraction (simplified - in production use a proper parser)
    // This is a minimal implementation - you'd want to use @mozilla/readability or similar
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    const finalTitle = ogTitleMatch?.[1] || titleMatch?.[1] || "Untitled";

    // Try to extract main content (very basic - strip HTML tags)
    // In production, use a proper HTML parser
    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Limit content length (for API efficiency)
    if (content.length > 50000) {
      content = content.substring(0, 50000) + "...";
    }

    // Extract author if available
    const authorMatch = html.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i);
    const author = authorMatch?.[1];

    // Calculate checksum
    const checksum = crypto.createHash("sha256").update(content).digest("hex");

    return {
      title: finalTitle,
      content,
      author,
      domain,
      checksum,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to scrape URL: ${error.message}`);
    }
    throw error;
  }
}

