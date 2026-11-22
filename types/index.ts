// Core data types for Visper journal app

export type EntryType = "note" | "url" | "image";
export type EntrySource = "raw" | "improved" | "both";
export type Sentiment = "negative" | "neutral" | "positive";

export interface EntryImage {
  url: string; // Private download-token URL (or legacy public URL)
  storagePath: string; // e.g. entries/{userId}/{uuid}.jpg
  filename?: string;
  size?: number;
  contentType?: string;
  width?: number;
  height?: number;
  description?: string; // AI description of this specific image
}

export interface Entry {
  id: string;
  userId: string;
  type: EntryType;
  source: EntrySource;
  
  // Text content
  rawText?: string;
  improvedText?: string;
  
  // AI metadata
  aiModel?: string; // Venice model used for tagging, e.g. "claude-haiku-5-5"
  aiPromptTemplateId?: string;
  
  // Timestamps
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  timezone?: string;
  device?: string;
  
  // Metadata
  tags: string[];
  entities: string[];
  sentiment?: Sentiment;
  qualityScore?: number; // 0-1
  
  // Enriched metadata (AI-extracted)
  topics?: string[]; // Main themes or topics
  keywords?: string[]; // Important keywords
  category?: string; // Entry category (work, personal, travel, etc.)
  
  // Image-specific enriched metadata (AI-extracted, from the first image)
  imageDescription?: string; // Detailed image description
  imageObjects?: string[]; // Objects detected in image
  imageScene?: string; // Scene description
  imageMood?: string; // Mood/atmosphere
  imageColors?: string[]; // Dominant colors
  
  // URL-specific fields
  url?: string;
  urlTitle?: string;
  urlDomain?: string;
  urlAuthor?: string;
  urlFetchedAt?: FirebaseFirestore.Timestamp;
  urlChecksum?: string; // SHA-256
  
  // URL summary fields
  summary?: string;
  keyPoints?: string[];
  quotes?: Array<{
    text: string;
    locator?: string; // e.g., "paragraph 3"
  }>;
  
  // Image-specific fields
  // All images attached to the entry. imageUrl/imageStoragePath/imageMetadata
  // mirror the first image for older entries and the HTML export.
  images?: EntryImage[];
  imageUrl?: string;
  imageStoragePath?: string;
  imageMetadata?: {
    filename: string;
    size: number;
    contentType: string;
    width?: number;
    height?: number;
  };
  
  // Provenance
  provenance?: {
    improvedFromEntryId?: string;
    urlScrapeHash?: string;
    aiRunId?: string;
  };
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: FirebaseFirestore.Timestamp;
  lastLoginAt?: FirebaseFirestore.Timestamp;
}

// Stored in the `embeddings` collection, keyed by entry ID.
export interface Embedding {
  entryId: string;
  userId: string;
  vector: number[]; // VENICE_EMBEDDING_DIMENSIONS of VENICE_EMBEDDING_MODEL
  model: string;
  textHash: string; // Detects when the entry text changed
  updatedAt: FirebaseFirestore.Timestamp;
}

// API Request/Response types

export interface ImproveEntryRequest {
  rawText: string;
}

export interface ImproveEntryResponse {
  improvedText: string;
  qualityScore: number;
  tags: string[];
  entities: string[];
  sentiment: Sentiment;
}

export interface CreateEntryRequest {
  type: EntryType;
  source: EntrySource;
  rawText?: string;
  improvedText?: string;
  url?: string;
  // URL-specific fields
  summary?: string;
  keyPoints?: string[];
  quotes?: Array<{
    text: string;
    locator?: string;
  }>;
  urlTitle?: string;
  urlDomain?: string;
  urlAuthor?: string;
  urlChecksum?: string;
  images?: EntryImage[];
  // Legacy single-image fields (still accepted)
  imageUrl?: string;
  imageStoragePath?: string;
  imageMetadata?: {
    filename: string;
    size: number;
    contentType: string;
    width?: number;
    height?: number;
  };
  tags?: string[];
  timezone?: string;
  device?: string;
  writtenAt?: string; // ISO time an offline entry was written
}

export interface CreateEntryResponse {
  id: string;
  entry: Entry;
}

export interface SummarizeUrlRequest {
  url: string;
}

export interface SummarizeUrlResponse {
  summary: string;
  keyPoints: string[];
  quotes: Array<{
    text: string;
    locator?: string;
  }>;
  meta: {
    title: string;
    domain: string;
    author?: string;
    checksum: string;
  };
}

export interface SearchRequest {
  q?: string;
  from?: string; // ISO date string
  to?: string; // ISO date string
  tag?: string;
  sentiment?: Sentiment;
  type?: EntryType;
  semantic?: boolean;
  topK?: number;
}

export interface SearchResponse {
  entries: Entry[];
  total: number;
}

export interface UpdateEntryRequest {
  rawText?: string;
  improvedText?: string;
  tags?: string[];
}

export interface AskSource {
  id: string;
  date: string | null;
  snippet: string;
  type: EntryType;
}

export interface AskResponse {
  answer: string;
  sources: AskSource[];
}

export interface Reflection {
  title: string;
  summary: string;
  themes: string[];
  mood: string;
  highlights: string[];
  prompt: string;
  entryCount: number;
  period: "week" | "month";
}

export interface HealthCheck {
  ok: boolean;
  message?: string;
}

export interface HealthResponse {
  ok: boolean;
  checks: {
    firestore: HealthCheck;
    storage: HealthCheck;
    venice: HealthCheck & { balanceUsd?: number; balanceDiem?: number };
  };
}

