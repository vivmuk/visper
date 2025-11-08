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

// Extract enriched metadata from text using GLM 4.6
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
    model: "glm-4-6", // GLM 4.6 model for text analysis
    messages: [
      {
        role: "system",
        content:
          "You are an expert at analyzing text and extracting rich metadata. Analyze the text and return comprehensive metadata including: tags (5-10 relevant tags), entities (people, places, organizations mentioned), topics (main themes), keywords (important terms), a brief summary, sentiment, and category (if applicable).",
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
    model: "mistral-large-latest", // Mistral model for image analysis
    messages: [
      {
        role: "system",
        content:
          "You are an expert at analyzing images and extracting rich metadata. Analyze the image at the provided URL and return comprehensive metadata including: tags (5-10 relevant tags), a detailed description, objects detected, scene description, mood, dominant colors, and category.",
      },
      {
        role: "user",
        content: `Please analyze this image: ${imageUrl}. Extract comprehensive metadata for searchability and categorization.`,
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

