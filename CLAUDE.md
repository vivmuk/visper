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
- **AI Provider**: Venice AI (models: `venice-uncensored`, `glm-4-6`, `mistral-large-latest`)
- **Styling**: Tailwind CSS
- **Deployment**: Railway (configured for production)

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

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

## Architecture Overview

### Directory Structure

```
app/
├── api/                  # Next.js API routes (server-side)
│   ├── entries/         # Entry CRUD operations
│   │   ├── route.ts    # GET (list), POST (create)
│   │   ├── [id]/       # GET, PATCH, DELETE specific entry
│   │   ├── improve/    # POST - AI text improvement
│   │   ├── metadata/   # POST - Extract AI metadata
│   │   └── export/     # GET - Export entries as HTML
│   ├── urls/
│   │   └── summarize/  # POST - Scrape and summarize URLs
│   ├── upload/         # POST - Upload images to Firebase Storage
│   └── search/         # GET - Search entries with filters
├── layout.tsx          # Root layout with auth state
└── page.tsx            # Main UI (CaptureForm + EntryHistory)

components/
├── CaptureForm.tsx           # Main journal input (text, URL, image)
├── EntryHistory.tsx          # Display and manage entries
├── UrlSummarizer.tsx         # URL preview and summarization
├── DeleteConfirmationDialog.tsx
├── LoginButton.tsx
├── UserMenu.tsx
└── Toast.tsx

lib/
├── firebase/
│   ├── client.ts       # Client-side Firebase SDK (auth, db, storage)
│   └── admin.ts        # Server-side Firebase Admin SDK
├── venice/
│   └── client.ts       # Venice AI integration (all models)
├── auth/
│   └── middleware.ts   # JWT token verification for API routes
├── export/
│   └── buildHistoryExportHtml.ts  # HTML export generation
└── utils/
    └── url-scraper.ts  # Web scraping utility

types/
└── index.ts            # TypeScript type definitions
```

### Data Flow

1. **Entry Creation Flow**:
   - User types text/URL/uploads image → `CaptureForm.tsx`
   - Text entries: Optional AI improvement via `/api/entries/improve` (venice-uncensored model)
   - URL entries: Scrape + summarize via `/api/urls/summarize` (venice-uncensored model)
   - Image entries: Upload to Firebase Storage via `/api/upload`
   - Final save: `/api/entries` POST → Extracts metadata using GLM 4.6 (text) or Mistral (images) → Saves to Firestore
   - Client refetches entries to update UI

2. **Authentication Flow**:
   - Google OAuth via Firebase Auth (`lib/firebase/client.ts`)
   - Client obtains ID token on login
   - All API requests include `Authorization: Bearer <token>` header
   - Server validates token via `getUserIdFromRequest()` in `lib/auth/middleware.ts`
   - Firestore rules enforce user-level isolation

3. **AI Metadata Extraction**:
   - **Text/URL entries**: GLM 4.6 model extracts tags, entities, topics, keywords, summary, sentiment, category
   - **Image entries**: Mistral Large model extracts tags, description, objects, scene, mood, colors, category
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

All AI operations use Venice AI with structured JSON schema responses:

1. **Text Improvement** (`improveEntry()`):
   - Model: `venice-uncensored`
   - Returns: improved_text, quality_score, tags, entities, sentiment

2. **URL Summarization** (`summarizeUrl()`):
   - Model: `venice-uncensored`
   - Returns: tldr, key_points, quotes, tags

3. **Text Metadata Extraction** (`extractTextMetadata()`):
   - Model: `glm-4-6`
   - Comprehensive prompt for personal/educational/professional/creative content
   - Returns: tags, entities, topics, keywords, summary, sentiment, category

4. **Image Metadata Extraction** (`extractImageMetadata()`):
   - Model: `mistral-large-latest`
   - Returns: tags, description, objects, scene, mood, colors, category

All functions use `response_format: { type: "json_schema" }` with strict schemas.

## Important Implementation Details

### TypeScript Path Aliases
- Use `@/` for imports (e.g., `import { db } from "@/lib/firebase/client"`)
- Configured in `tsconfig.json` paths

### Firestore Timestamp Handling
- Server creates timestamps with `FieldValue.serverTimestamp()`
- When reading, handle both Firestore Timestamp objects and serialized forms
- See `app/api/entries/route.ts` GET handler for date filtering examples

### Authentication Middleware
- All API routes should call `getUserIdFromRequest(request)` first
- Return 401 if `userId` is null
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
1. User selects image in `CaptureForm.tsx`
2. Upload to Firebase Storage via `/api/upload` (returns URL and storage path)
3. Extract metadata via `/api/entries/metadata` (Mistral model)
4. Create entry via `/api/entries` with imageUrl, imageStoragePath, and AI metadata

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

## Known Issues / TODO

- Semantic search with pgvector not yet implemented (planned)
- Offline support / PWA features not yet implemented
- Date range filtering in GET `/api/entries` is done client-side (Firestore ordering limitation)
- Image upload size limits not enforced yet

## Additional Documentation

- `README.md` - Quick start and features overview
- `FIREBASE_SETUP_GUIDE.md` - Firebase project setup
- `GOOGLE_LOGIN_SETUP.md` - Google OAuth configuration
- `DEPLOYMENT.md` - Railway deployment guide
- `RAILWAY_ENV_SETUP.md` - Environment variable configuration for Railway
