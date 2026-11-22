// Venice AI API client
const VENICE_API_URL = "https://api.venice.ai/api/v1";

// Models used across the app. Stored on entries as `aiModel`.
export const VENICE_CHAT_MODEL = "grok-4-3";
export const VENICE_EMBEDDING_MODEL = "text-embedding-bge-m3";
export const VENICE_TRANSCRIPTION_MODEL = "openai/whisper-large-v3";

function getVeniceApiKey(): string {
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) {
    throw new Error("VENICE_API_KEY environment variable is not set");
  }
  return apiKey;
}

export type VeniceContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface VeniceChatMessage {
  role: "system" | "user" | "assistant";
  content: string | VeniceContentPart[];
}

export interface VeniceChatRequest {
  model: string;
  messages: VeniceChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
        additionalProperties: boolean;
      };
    };
  };
}

export interface VeniceChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callVeniceAPI(
  request: VeniceChatRequest
): Promise<VeniceChatResponse> {
  const apiKey = getVeniceApiKey();
  const response = await fetch(`${VENICE_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Try to extract a meaningful error message
    let errorMessage = `Venice API error: ${response.status}`;
    if (errorText && !errorText.includes("<!DOCTYPE html>")) {
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        // If not JSON, use first 200 chars of error text
        errorMessage = errorText.length > 200 ? errorText.substring(0, 200) + "..." : errorText;
      }
    } else if (response.status === 500) {
      errorMessage = "Venice API is temporarily unavailable. Please try again in a few minutes.";
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// Helper to improve journal entry text
export async function improveEntry(rawText: string): Promise<{
  improvedText: string;
  qualityScore: number;
  tags: string[];
  entities: string[];
  sentiment: "negative" | "neutral" | "positive";
}> {
  const request: VeniceChatRequest = {
    model: VENICE_CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an editor that preserves the writer's voice while improving clarity and concision. Return JSON with: improved_text, quality_score (0-1), tags (array of strings), entities (array of strings), sentiment (one of: negative, neutral, positive). Keep 10-25% shorter, no new facts, no change of meaning.",
      },
      {
        role: "user",
        content: rawText,
      },
    ],
    temperature: 0.7,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "improve_entry_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            improved_text: {
              type: "string",
            },
            quality_score: {
              type: "number",
            },
            tags: {
              type: "array",
              items: {
                type: "string",
              },
            },
            entities: {
              type: "array",
              items: {
                type: "string",
              },
            },
            sentiment: {
              type: "string",
              enum: ["negative", "neutral", "positive"],
            },
          },
          required: ["improved_text", "quality_score", "tags", "entities", "sentiment"],
          additionalProperties: false,
        },
      },
    },
  };

  const response = await callVeniceAPI(request);
  const content = response.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in Venice API response");
  }

  const parsed = JSON.parse(content);
  return {
    improvedText: parsed.improved_text,
    qualityScore: parsed.quality_score,
    tags: parsed.tags || [],
    entities: parsed.entities || [],
    sentiment: parsed.sentiment,
  };
}

// Helper to summarize URL content
export async function summarizeUrl(
  content: string
): Promise<{
  tldr: string;
  keyPoints: string[];
  quotes: Array<{ text: string }>;
  tags: string[];
}> {
  const request: VeniceChatRequest = {
    model: VENICE_CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "Summarize the article into: 1) 5 bullet key points; 2) 3 short quotes with exact text; 3) 2-3 suggested tags; 4) one-sentence TL;DR. Keep neutral tone.",
      },
      {
        role: "user",
        content: content,
      },
    ],
    temperature: 0.6,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "url_summary_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            tldr: {
              type: "string",
            },
            key_points: {
              type: "array",
              items: {
                type: "string",
              },
            },
            quotes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: {
                    type: "string",
                  },
                },
                required: ["text"],
                additionalProperties: false,
              },
            },
            tags: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
          required: ["tldr", "key_points", "quotes", "tags"],
          additionalProperties: false,
        },
      },
    },
  };

  const response = await callVeniceAPI(request);
  const responseContent = response.choices[0]?.message?.content;
  
  if (!responseContent) {
    throw new Error("No content in Venice API response");
  }

  const parsed = JSON.parse(responseContent);
  return {
    tldr: parsed.tldr,
    keyPoints: parsed.key_points || [],
    quotes: parsed.quotes || [],
    tags: parsed.tags || [],
  };
}

// Extract enriched metadata from text using Mistral
export async function extractTextMetadata(text: string): Promise<{
  tags: string[];
  entities: string[];
  topics: string[];
  keywords: string[];
  summary: string;
  sentiment: "negative" | "neutral" | "positive";
  category?: string;
}> {
  const request: VeniceChatRequest = {
    model: VENICE_CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an expert content analyst specializing in extracting rich, meaningful metadata from diverse types of written content. Your task is to analyze text comprehensively and extract metadata that captures both surface-level information and deeper insights.\n\n" +
          "CONTENT TYPES TO HANDLE:\n" +
          "1. Personal Journal Entries: Emotional reflections, personal experiences, thoughts, feelings\n" +
          "2. Educational/Informational Content: Articles, summaries, key takeaways, research notes\n" +
          "3. Professional Content: Work notes, business insights, industry analysis\n" +
          "4. Creative Content: Ideas, inspiration, creative projects\n" +
          "5. Research/Reference: Book notes, video summaries, learning materials\n\n" +
          "ANALYSIS FRAMEWORK:\n" +
          "For Personal Content:\n" +
          "- Emotional journey and underlying feelings (beyond surface sentiment)\n" +
          "- Personal growth, insights, or realizations\n" +
          "- Relationships, connections, and social dynamics\n" +
          "- Values, beliefs, and personal philosophy\n" +
          "- Challenges, struggles, or obstacles\n" +
          "- Aspirations, goals, and dreams\n" +
          "- Moments of gratitude, joy, or appreciation\n\n" +
          "For Informational/Educational Content:\n" +
          "- Main subject matter and domain (e.g., 'AI', 'business-strategy', 'technology')\n" +
          "- Key concepts, theories, or frameworks discussed\n" +
          "- Important insights, takeaways, or conclusions\n" +
          "- Industry or field context\n" +
          "- Practical applications or implications\n" +
          "- Related topics or adjacent concepts\n\n" +
          "METADATA EXTRACTION REQUIREMENTS:\n" +
          "- Tags (5-10): Must be meaningful, specific, and relevant. Use kebab-case for multi-word tags.\n" +
          "  Examples: 'ai-disruption', 'consulting-industry', 'self-reflection', 'career-growth', 'business-strategy'\n" +
          "- Entities: People, places, organizations, companies, products, technologies mentioned\n" +
          "- Topics: Main themes, subject areas, or domains covered (e.g., 'artificial-intelligence', 'work-life-balance')\n" +
          "- Keywords: Important terms, concepts, or phrases that are central to the content\n" +
          "- Summary: A concise 1-2 sentence summary capturing the essence\n" +
          "- Sentiment: Overall emotional tone (negative, neutral, positive) - consider context carefully\n" +
          "- Category: Broad category (work, personal, education, business, technology, health, creativity, reflection, etc.)\n\n" +
          "QUALITY STANDARDS:\n" +
          "- Tags should be specific enough to be useful for filtering/searching, but not overly narrow\n" +
          "- Avoid generic tags like 'thoughts', 'notes', 'content' unless truly appropriate\n" +
          "- Extract ALL relevant entities - don't miss important names, places, or organizations\n" +
          "- Topics should represent the main subject areas, not just keywords\n" +
          "- Be thorough but precise - aim for quality over quantity\n\n" +
          "Return comprehensive metadata that enables effective content discovery, pattern recognition, and knowledge organization.",
      },
      {
        role: "user",
        content: text,
      },
    ],
    temperature: 0.5,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "text_metadata_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            tags: {
              type: "array",
              items: { type: "string" },
              description: "5-10 relevant tags for categorization",
            },
            entities: {
              type: "array",
              items: { type: "string" },
              description: "Named entities (people, places, organizations)",
            },
            topics: {
              type: "array",
              items: { type: "string" },
              description: "Main themes or topics discussed",
            },
            keywords: {
              type: "array",
              items: { type: "string" },
              description: "Important keywords or terms",
            },
            summary: {
              type: "string",
              description: "Brief summary of the content",
            },
            sentiment: {
              type: "string",
              enum: ["negative", "neutral", "positive"],
            },
            category: {
              type: "string",
              description: "Optional category (e.g., 'work', 'personal', 'travel', 'reflection')",
            },
          },
          required: ["tags", "entities", "topics", "keywords", "summary", "sentiment"],
          additionalProperties: false,
        },
      },
    },
  };

  const response = await callVeniceAPI(request);
  const content = response.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in Venice API response");
  }

  const parsed = JSON.parse(content);
  return {
    tags: parsed.tags || [],
    entities: parsed.entities || [],
    topics: parsed.topics || [],
    keywords: parsed.keywords || [],
    summary: parsed.summary || "",
    sentiment: parsed.sentiment,
    category: parsed.category,
  };
}

// Extract enriched metadata from image using Mistral
export async function extractImageMetadata(imageUrl: string): Promise<{
  tags: string[];
  description: string;
  objects: string[];
  scene: string;
  mood?: string;
  colors?: string[];
  category?: string;
}> {
  const request: VeniceChatRequest = {
    model: VENICE_CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an expert at analyzing images and extracting rich metadata. Look closely at the actual pixel content of the provided image and return comprehensive metadata including: tags (5-10 relevant tags), a detailed description, objects detected, scene description, mood, dominant colors, and category. Base every field strictly on what is visibly present in the image - if the image is a screenshot, diagram, or document, describe its actual text and layout rather than guessing a generic photo scene.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this image and extract comprehensive metadata for searchability and categorization.",
          },
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
        ],
      },
    ],
    temperature: 0.5,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "image_metadata_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            tags: {
              type: "array",
              items: { type: "string" },
              description: "5-10 relevant tags for categorization",
            },
            description: {
              type: "string",
              description: "Detailed description of the image",
            },
            objects: {
              type: "array",
              items: { type: "string" },
              description: "Objects, people, or elements detected in the image",
            },
            scene: {
              type: "string",
              description: "Description of the scene or setting",
            },
            mood: {
              type: "string",
              description: "Mood or atmosphere of the image",
            },
            colors: {
              type: "array",
              items: { type: "string" },
              description: "Dominant colors in the image",
            },
            category: {
              type: "string",
              description: "Category (e.g., 'nature', 'portrait', 'food', 'document', 'screenshot')",
            },
          },
          required: ["tags", "description", "objects", "scene"],
          additionalProperties: false,
        },
      },
    },
  };

  const response = await callVeniceAPI(request);
  const content = response.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in Venice API response");
  }

  const parsed = JSON.parse(content);
  return {
    tags: parsed.tags || [],
    description: parsed.description || "",
    objects: parsed.objects || [],
    scene: parsed.scene || "",
    mood: parsed.mood,
    colors: parsed.colors || [],
    category: parsed.category,
  };
}

export interface VeniceScrapeResult {
  url: string;
  content: string;
  format: string;
}

// Scrape a URL's readable content via Venice's Augment API (more robust than
// a local regex-based fetch: handles JS-rendered pages, paywalls, redirects).
export async function scrapeUrlWithVenice(url: string): Promise<VeniceScrapeResult> {
  const apiKey = getVeniceApiKey();
  const response = await fetch(`${VENICE_API_URL}/augment/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Venice scrape error: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
    } catch {
      if (errorText) {
        errorMessage = errorText.length > 200 ? errorText.substring(0, 200) + "..." : errorText;
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}


function veniceErrorMessage(status: number, body: string, label: string) {
  try {
    const json = JSON.parse(body);
    return json.error?.message || json.error || json.message || `${label}: ${status}`;
  } catch {
    return body && !body.includes("<!DOCTYPE") ? body.slice(0, 200) : `${label}: ${status}`;
  }
}

function parseChatJson<T>(response: VeniceChatResponse): T {
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No content in Venice API response");
  return JSON.parse(content) as T;
}

// ---------------------------------------------------------------------------
// Embeddings (semantic search / "Ask my journal")
// ---------------------------------------------------------------------------

/** Embeds up to ~64 texts in one call. Returns one vector per input. */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const response = await fetch(`${VENICE_API_URL}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getVeniceApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VENICE_EMBEDDING_MODEL,
      // bge-m3 handles ~8k tokens; trim very long entries to keep calls fast.
      input: texts.map((t) => t.slice(0, 8000)),
      encoding_format: "float",
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(veniceErrorMessage(response.status, await response.text(), "Venice embeddings error"));
  }
  const data = await response.json();
  return (data.data as Array<{ index: number; embedding: number[] }>)
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

// ---------------------------------------------------------------------------
// Speech to text (voice notes)
// ---------------------------------------------------------------------------

export async function transcribeAudio(audio: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", VENICE_TRANSCRIPTION_MODEL);
  form.append("response_format", "json");
  const response = await fetch(`${VENICE_API_URL}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getVeniceApiKey()}` },
    body: form,
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    throw new Error(veniceErrorMessage(response.status, await response.text(), "Venice transcription error"));
  }
  const data = await response.json();
  return (data.text || "").trim();
}

// ---------------------------------------------------------------------------
// Ask my journal
// ---------------------------------------------------------------------------

export interface JournalContextEntry {
  id: string;
  date: string;
  text: string;
}

export async function answerFromJournal(
  question: string,
  context: JournalContextEntry[]
): Promise<{ answer: string; sourceIds: string[] }> {
  const today = new Date().toISOString().slice(0, 10);
  const contextText = context
    .map((c) => `[${c.id}] (${c.date})\n${c.text}`)
    .join("\n\n---\n\n");

  const response = await callVeniceAPI({
    model: VENICE_CHAT_MODEL,
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          `You are a warm, perceptive companion helping someone understand their own private journal. Today is ${today}. ` +
          "Answer ONLY from the journal entries provided. Speak to the writer as \"you\". " +
          "Be specific: mention dates and concrete details from the entries. If the entries don't contain the answer, say so kindly and suggest what they might write about. " +
          "Keep answers concise (under 180 words) and use short paragraphs or a short list when helpful. " +
          "Return the IDs of the entries you actually relied on in source_ids.",
      },
      {
        role: "user",
        content: `Journal entries:\n\n${contextText || "(no entries found)"}\n\nQuestion: ${question}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "journal_answer",
        strict: true,
        schema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            source_ids: { type: "array", items: { type: "string" } },
          },
          required: ["answer", "source_ids"],
          additionalProperties: false,
        },
      },
    },
  });

  const parsed = parseChatJson<{ answer: string; source_ids: string[] }>(response);
  return { answer: parsed.answer, sourceIds: parsed.source_ids || [] };
}

// ---------------------------------------------------------------------------
// Weekly / monthly reflection
// ---------------------------------------------------------------------------

export async function reflectOnJournal(
  period: "week" | "month",
  context: JournalContextEntry[]
): Promise<{
  title: string;
  summary: string;
  themes: string[];
  mood: string;
  highlights: string[];
  prompt: string;
}> {
  const contextText = context.map((c) => `(${c.date})\n${c.text}`).join("\n\n---\n\n");
  const response = await callVeniceAPI({
    model: VENICE_CHAT_MODEL,
    temperature: 0.6,
    messages: [
      {
        role: "system",
        content:
          `You write gentle, insightful ${period}ly reflections on someone's private journal. ` +
          "Speak to the writer as \"you\". Notice patterns, recurring themes, emotional shifts, small wins and things they seem to care about. " +
          "Never diagnose or lecture. Be warm, specific and grounded in the entries. " +
          "title: a short evocative title (max 8 words). summary: 2-4 sentences. themes: 3-5 short phrases. " +
          "mood: one short phrase describing the overall emotional arc. highlights: 2-4 specific moments worth remembering. " +
          "prompt: one thoughtful journaling question for the coming " + period + ".",
      },
      { role: "user", content: contextText },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "journal_reflection",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            themes: { type: "array", items: { type: "string" } },
            mood: { type: "string" },
            highlights: { type: "array", items: { type: "string" } },
            prompt: { type: "string" },
          },
          required: ["title", "summary", "themes", "mood", "highlights", "prompt"],
          additionalProperties: false,
        },
      },
    },
  });
  return parseChatJson(response);
}

// ---------------------------------------------------------------------------
// Account health (balance check, no inference cost)
// ---------------------------------------------------------------------------

export async function getVeniceBalance(): Promise<{ usd: number; diem: number }> {
  const response = await fetch(`${VENICE_API_URL}/api_keys/rate_limits`, {
    headers: { Authorization: `Bearer ${getVeniceApiKey()}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(veniceErrorMessage(response.status, await response.text(), "Venice error"));
  }
  const data = await response.json();
  const balances = data?.data?.balances || {};
  return { usd: Number(balances.USD || 0), diem: Number(balances.DIEM || 0) };
}
