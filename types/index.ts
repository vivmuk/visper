// Core data types for Visper journal app

export type EntryType = "note" | "url" | "image";
export type EntrySource = "raw" | "improved" | "both";
export type Sentiment = "negative" | "neutral" | "positive";

export interface Entry {
  id: string;
  userId: string;
  type: EntryType;
  source: EntrySource;
  
  // Text content
  rawText?: string;
  improvedText?: string;
  
  // AI metadata
  aiModel?: string; // e.g., "venice:gpt-X"
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
  
  // Enriched metadata (from GLM 4.6 / Mistral)
  topics?: string[]; // Main themes or topics
  keywords?: string[]; // Important keywords
  category?: string; // Entry category (work, personal, travel, etc.)
  
  // Image-specific enriched metadata (from Mistral)
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

export interface Embedding {
  id: string;
  entryId: string;
  vector: number[]; // 1536 dimensions for OpenAI-compatible embeddings
  createdAt: FirebaseFirestore.Timestamp;
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

