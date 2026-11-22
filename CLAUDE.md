# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Whisper** (also called "Wisper") is a mobile-first journal application that captures thoughts, URLs, and images, enriches them with AI metadata using Venice AI, and stores them in Firebase Firestore with rich searchability.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Authentication**: Firebase Auth (Google OAuth)
- **AI Provider**: Venice AI — writing/Ask/reflections: `claude-sonnet-5-5`; tagging + photo analysis: `claude-haiku-5-5`; embeddings: `text-embedding-qwen3-8b` (1024 dims); speech-to-text: `elevenlabs/scribe-v2`; scraping: Venice Augment Scrape API; art: `flux-3-image`
- **Styling**: Tailwind CSS
- **Deployment**: Railway, built from the repo `Dockerfile` (Node 22)
- **PWA**: installable, offline-capable (`public/sw.js`, `public/manifest.json`)

## Development Commands

```bash
# Development server (port 3001)
npm run dev

# Development server on port 3000 (alternative)
npm run dev:3000

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Deploy Firestore + Storage rules
firebase deploy --only firestore:rules,storage

# Regenerate decorative art with Venice (needs VENICE_API_KEY) and optimize it
npm run art:generate
npm run art:optimize
```

## Architecture Overview

### Directory Structure

```
app/
├── api/                  # Next.js API routes (server-side)
│   ├── entries/         # Entry CRUD operations
│   │   ├── route.ts    # GET (list), POST (create)
│   │   ├── [id]/       # PATCH (edit text/tags), DELETE (also deletes photos + embedding)
│   │   ├── improve/    # POST - AI text improvement
│   │   ├── export/     # GET - Export entries as HTML
│   │   └── backup/     # GET - Download full ZIP backup (entries.json + HTML timeline + original images)
│   ├── urls/
│   │   └── summarize/  # POST - Scrape and summarize URLs (public http(s) hosts only)
│   ├── upload/         # POST - Upload one image to the user's private folder
│   ├── search/         # GET - Keyword (+ optional semantic) search with filters
│   ├── ask/            # POST - "Ask my journal" (RAG over the user's entries)
│   ├── reflect/        # POST - Weekly/monthly AI reflection
│   ├── transcribe/     # POST - Voice note -> text (audio is not stored)
│   ├── embeddings/backfill/ # POST - Index entries that lack an up-to-date embedding
│   ├── images/secure/  # GET count / POST migrate legacy public images to private URLs
│   └── health/         # GET - Firestore / Storage / Venice balance status
├── layout.tsx          # Root layout (auth, toasts, service worker)
└── page.tsx            # App shell: header, bottom tab bar, offline/health banners

components/
├── CaptureForm.tsx           # Write tab: text, multiple photos, voice, polish, draft autosave, offline outbox
├── UrlSummarizer.tsx         # Link tab: summarize + save links
├── EntryHistory.tsx          # Journal tab: search, filters, month jump, tags, export
├── EntryCard.tsx             # One entry in the journal
├── EditEntrySheet.tsx        # Edit text + tags
├── ImageGallery.tsx          # Photos tab
├── ImageViewer.tsx           # Full-screen swipeable photo viewer
├── AskJournal.tsx            # Ask tab: questions + reflections
├── VoiceRecorder.tsx         # MediaRecorder -> /api/transcribe
├── UserMenu.tsx              # Account sheet: system status, secure old photos, install, sign out
├── ServiceWorkerRegister.tsx
├── ui/                       # BottomSheet, EmptyState (Venice art), Icons
├── DeleteConfirmationDialog.tsx, LoginButton.tsx, Toast.tsx

lib/
├── firebase/
│   ├── client.ts       # Client-side Firebase SDK (auth, db, storage)
│   └── admin.ts        # Server-side Firebase Admin SDK
├── venice/
│   └── client.ts       # Venice AI integration (all models)
├── firebase/storage.ts # Private image storage (download-token URLs), path checks, deletes
├── auth/
│   └── middleware.ts   # getUserIdFromRequest() / requireUser() for API routes
├── entries/
│   ├── shared.ts       # Pure helpers (toDate, entryImages) for server + browser
│   └── server.ts       # entryToText, embeddings upsert/backfill, semantic ranking
├── client/             # Browser helpers: apiFetch (auth + readable errors), image compression,
│                       # offline outbox, date formatting
├── export/
│   └── buildHistoryExportHtml.ts  # HTML export generation
└── utils/
    └── url-scraper.ts  # Web scraping utility

public/
├── art/                # Venice-generated watercolor art (WebP); raw PNGs in art/_raw are git-ignored
├── icons/              # PWA icons built from logo.png
├── sw.js               # Service worker
└── manifest.json

scripts/
├── generate-art.mjs    # Generates art with the Venice image API (`npm run art:generate`)
└── optimize-art.py     # Resizes art to WebP + builds icons (`npm run art:optimize`)

types/
└── index.ts            # TypeScript type definitions
```

### Data Flow

1. **Entry Creation Flow**:
   - User types text/URL/uploads image → `CaptureForm.tsx`
   - Text entries: Optional AI improvement via `/api/entries/improve` (chat model)
   - URL entries: Scraped via Venice's Augment Scrape API (falls back to a local regex-based fetch), then summarized via `/api/urls/summarize` (chat model)
   - Photos (up to 6 per entry): compressed in the browser (max 2048px JPEG), uploaded one per request to `/api/upload` → private `entries/{uid}/{uuid}.jpg` with a download-token URL
   - Final save: `/api/entries` POST → validates image paths belong to the user → extracts metadata with the fast model (text + every image, images sent inline as base64 `image_url` parts) → saves to Firestore → stores an embedding
   - Offline: text entries go to a localStorage outbox (`lib/client/outbox.ts`, scoped by uid) and sync on reconnect, keeping their original time (`writtenAt`)

2. **Authentication Flow**:
   - Google OAuth via Firebase Auth (`lib/firebase/client.ts`)
   - Client obtains ID token on login
   - All API requests include `Authorization: Bearer <token>` header
   - Server validates token via `getUserIdFromRequest()` in `lib/auth/middleware.ts`
   - Firestore rules enforce user-level isolation

3. **Images are private**: never call `makePublic()`. `lib/firebase/storage.ts` stores each object with a `firebaseStorageDownloadTokens` token and returns `https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token=...`. Entries store `images: EntryImage[]`; `imageUrl`/`imageStoragePath`/`imageMetadata` mirror the first image for older readers. Older entries may still have public `storage.googleapis.com` URLs and paths without the `entries/` prefix — `/api/images/secure` migrates them.

4. **Embeddings / Ask**: vectors live in the `embeddings` collection (doc id = entry id, `{userId, vector, model, textHash}`), written by the server only. Ranking is in-memory cosine similarity (fine for a personal journal). `/api/embeddings/backfill` is called by the Ask tab at most once a day.

5. **AI Metadata Extraction**:
   - **Text/URL entries**: the fast model extracts tags, entities, topics, keywords, summary, sentiment, category
   - **Image entries**: the fast model (multimodal) extracts tags, description, objects, scene, mood, colors, category — the image is sent as an `image_url` content part, not just a URL string in the prompt
   - All AI calls use structured JSON schema responses via Venice AI
   - Metadata is automatically extracted on entry creation (POST `/api/entries`)

### Firebase Configuration

**Client-side** (public env vars with `NEXT_PUBLIC_` prefix):
- Used in browser for auth, Firestore client SDK, Storage uploads
- Initialized in `lib/firebase/client.ts`

**Server-side Admin** (private credentials):
- Used in API routes for secure operations
- Supports two modes (see `lib/firebase/admin.ts`):
  - **Local dev**: Service account JSON file via `FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH`
  - **Production (Railway)**: Environment variables `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`
- Lazy initialization pattern (initialized on first use)

### Venice AI Integration

All AI operations use Venice AI. Model IDs are constants at the top of `lib/venice/client.ts`, each overridable by an env var of the same name:
- `VENICE_CHAT_MODEL` (`claude-sonnet-5-5`): improve, summarize, Ask, reflect
- `VENICE_FAST_MODEL` (`claude-haiku-5-5`): text + image metadata on every save
- `VENICE_EMBEDDING_MODEL` (`text-embedding-qwen3-8b`, `VENICE_EMBEDDING_DIMENSIONS` = 1024)
- `VENICE_TRANSCRIPTION_MODEL` (`elevenlabs/scribe-v2`)

Changing the embedding model is safe: search ignores vectors from other models and the Ask tab's backfill re-indexes (bump `INDEXED_KEY` in `AskJournal.tsx` so devices re-run it). Strict JSON schemas must list **every** property in `required` (Claude models reject optional fields under strict mode). Quick tasks pass `reasoning_effort: "low"`.

Chat functions use strict JSON schema responses:

1. **Text Improvement** (`improveEntry()`):
   - Returns: improved_text, quality_score, tags, entities, sentiment

2. **URL Summarization** (`summarizeUrl()`):
   - Returns: tldr, key_points, quotes, tags

3. **Text Metadata Extraction** (`extractTextMetadata()`, fast model):
   - Comprehensive prompt for personal/educational/professional/creative content
   - Returns: tags, entities, topics, keywords, summary, sentiment, category

4. **Image Metadata Extraction** (`extractImageMetadata()`, fast model):
   - Sends the image as a multimodal `image_url` content part (not a URL string in the text prompt) so the model actually sees the pixels
   - Returns: tags, description, objects, scene, mood, colors, category

5. **Ask / Reflect** (`answerFromJournal()`, `reflectOnJournal()`): answer questions and write reflections strictly from supplied entry excerpts

6. **Embeddings** (`createEmbeddings()`), **Transcription** (`transcribeAudio()`), **Balance** (`getVeniceBalance()`, used by `/api/health`)

7. **URL Scraping** (`scrapeUrlWithVenice()`):
   - Uses Venice's Augment Scrape API (`POST /augment/scrape`) for robust content extraction (JS-rendered pages, paywalls, redirects)
   - `lib/utils/url-scraper.ts` falls back to a local regex-based fetch if this fails

All chat functions use `response_format: { type: "json_schema" }` with strict schemas.

## Important Implementation Details

### TypeScript Path Aliases
- Use `@/` for imports (e.g., `import { db } from "@/lib/firebase/client"`)
- Configured in `tsconfig.json` paths

### Firestore Timestamp Handling
- Server creates timestamps with `FieldValue.serverTimestamp()`
- When reading, handle both Firestore Timestamp objects and serialized forms
- See `app/api/entries/route.ts` GET handler for date filtering examples

### Authentication Middleware
- Every API route must start with `const auth = await requireUser(request); if (auth instanceof NextResponse) return auth;`
- Never trust a `userId` sent by the client (query string or form data)
- Use `userId` for all Firestore queries to enforce user isolation

### Entry Types
- **note**: Text journal entries (can have rawText and/or improvedText)
- **url**: Saved web pages with summary, keyPoints, quotes
- **image**: Uploaded images with AI-extracted metadata

### Entry Source Field
- **raw**: User's original text only
- **improved**: AI-improved text only
- **both**: Both raw and improved text saved

### Image Upload Flow
1. User picks, pastes or drops photos in `CaptureForm.tsx` (up to 6)
2. On save each photo is compressed (`lib/client/images.ts`) and uploaded via `/api/upload` → `{ image: EntryImage }`
3. Entry created via `/api/entries` with `images: EntryImage[]`; the server analyzes each image with the fast model

### HTML Export
- Export functionality generates journal-style HTML with sidebar navigation
- Located in `lib/export/buildHistoryExportHtml.ts`
- API endpoint: GET `/api/entries/export`
- Includes formatting preservation with `whitespace-pre-wrap`

## Environment Variables

Required for local development (`.env.local`):

```bash
# Firebase Client (all public, safe to commit defaults)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Firebase Admin (for local dev - use service account file)
FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH=./wisper-vivek-firebase-adminsdk-fbsvc-af4804705a.json

# Venice AI
VENICE_API_KEY=
```

For Railway deployment, use individual env vars instead of service account file (see `DEPLOYMENT.md`).

## Security Notes

- **Never commit** `.env.local` or service account JSON files (already in `.gitignore`)
- Firestore rules enforce that users can only access their own entries
- API routes verify Firebase ID tokens before processing requests
- Admin SDK credentials are never exposed to client

## Common Patterns

### Creating a New API Route
1. Add route file in `app/api/[route-name]/route.ts`
2. Import and call `getUserIdFromRequest(request)` first
3. Return 401 if no userId
4. Use `adminDb` for Firestore operations (server-side)
5. Follow existing patterns in `app/api/entries/route.ts`

### Adding a New Entry Field
1. Update `Entry` type in `types/index.ts`
2. Update Firestore write in `app/api/entries/route.ts` POST handler
3. Update UI components (`CaptureForm.tsx`, `EntryHistory.tsx`) as needed
4. Consider if field needs indexing (update `firestore.indexes.json`)

### Adding a New Venice AI Function
1. Add function to `lib/venice/client.ts`
2. Define request/response interfaces
3. Use `response_format` with JSON schema for structured responses
4. Set appropriate `temperature` (0.5-0.7 for metadata extraction)
5. Handle errors gracefully (log and continue without metadata)

## Deployment

- **Platform**: Railway (recommended)
- **Buildpack**: Automatically detected (Next.js)
- **Build command**: `npm run build`
- **Start command**: `npm start`
- See `DEPLOYMENT.md` for detailed instructions

### Client API calls
- Use `apiFetch(user, path, init)` from `lib/client/api.ts`: it adds the ID token, sets JSON headers, and throws `ApiError` with the server's message (show it with `errorMessage(err)`).

### UI conventions (mobile-first)
- Keep the watercolor look: `watercolor-card`, `glass`, `btn-gradient`, `gradient-text`, teal → purple → pink gradients
- Tap targets ≥ 44px, inputs 16px (prevents iOS zoom), respect safe areas (`pt-safe`, `pb-safe`, `pb-nav`)
- Use `BottomSheet` for dialogs/menus, `EmptyState` (with `/art/*.webp`) for empty screens
- Spot art uses `art-blend` (multiply + soft mask) so it melts into the background
- New art: add a prompt to `scripts/generate-art.mjs`, run `npm run art:generate <name>` then `npm run art:optimize`

## Known Issues / TODO

- Date range filtering in GET `/api/entries` is done in memory (Firestore ordering limitation)
- Semantic ranking loads all of a user's vectors per query; switch to Firestore vector search (`findNearest`) if journals grow very large
- Deploy `firestore.rules` and `storage.rules` after changes: `firebase deploy --only firestore:rules,storage`

## Additional Documentation

- `README.md` - Quick start and features overview
- `FIREBASE_SETUP_GUIDE.md` - Firebase project setup
- `GOOGLE_LOGIN_SETUP.md` - Google OAuth configuration
- `DEPLOYMENT.md` - Railway deployment guide
- `RAILWAY_ENV_SETUP.md` - Environment variable configuration for Railway
