// Venice AI API client
const VENICE_API_URL = "https://api.venice.ai/api/v1";

function getVeniceApiKey(): string {
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) {
    throw new Error("VENICE_API_KEY environment variable is not set");
  }
  return apiKey;
}

export interface VeniceChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
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
    const error = await response.text();
    throw new Error(`Venice API error: ${response.status} - ${error}`);
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
    model: "venice-uncensored", // Using the model that supports response schema
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
    model: "venice-uncensored",
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

