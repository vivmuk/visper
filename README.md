# Whisper - A Thoughtful Journal

A delightfully simple, mobile-first journal that improves your thoughts with Venice AI, saves them with precise metadata in Firebase, and lets you capture/summarize web pages with clean references.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project (see `FIREBASE_SETUP_GUIDE.md`)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   
   Create a `.env.local` file in the root directory with your Firebase configuration:
   ```env
   # Firebase Client Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

   # Firebase Admin (use service account file path)
   FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH=./path-to-your-service-account.json

   # Venice AI
   VENICE_API_KEY=your_venice_api_key
   ```

3. **Deploy Firestore security rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser.

## 📁 Project Structure

```
.
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── entries/       # Entry CRUD operations
│   │   ├── urls/          # URL summarization
│   │   └── search/        # Search functionality
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── CaptureForm.tsx   # Main journal input form
│   └── UrlSummarizer.tsx # URL summarization UI
├── lib/                   # Utilities and services
│   ├── firebase/         # Firebase client & admin
│   ├── venice/           # Venice AI integration
│   └── utils/            # Helper functions
├── types/                 # TypeScript type definitions
└── firestore.rules       # Firestore security rules
```

## 🎯 Features

### ✅ Implemented
- ✅ Next.js 14 with App Router
- ✅ TypeScript configuration
- ✅ Firebase client & admin SDK setup
- ✅ Venice AI integration with structured responses
- ✅ API routes for entries, URL summarization, search
- ✅ Basic UI components (CaptureForm, UrlSummarizer)
- ✅ URL scraping utility
- ✅ Firestore security rules

### 🚧 In Progress / TODO
- [ ] Firebase Authentication integration
- [ ] Search UI with filters
- [ ] Entry list/timeline view
- [ ] PWA manifest and service worker
- [ ] Semantic search with pgvector (Postgres)
- [ ] Export functionality
- [ ] Offline support

## 🔧 API Endpoints

### `POST /api/entries/improve`
Improves journal entry text using Venice AI.

**Request:**
```json
{
  "rawText": "Your raw journal entry text"
}
```

**Response:**
```json
{
  "improvedText": "Improved version",
  "qualityScore": 0.85,
  "tags": ["tag1", "tag2"],
  "entities": ["entity1"],
  "sentiment": "positive"
}
```

### `POST /api/entries`
Creates a new journal entry.

**Request:**
```json
{
  "userId": "user-id",
  "type": "note" | "url",
  "source": "raw" | "improved" | "both",
  "rawText": "Raw text (optional)",
  "improvedText": "Improved text (optional)",
  "url": "URL (for url type)",
  "tags": ["tag1"],
  "timezone": "America/New_York",
  "device": "User agent string"
}
```

### `POST /api/urls/summarize`
Scrapes and summarizes a URL.

**Request:**
```json
{
  "url": "https://example.com/article"
}
```

**Response:**
```json
{
  "summary": "TL;DR summary",
  "keyPoints": ["point1", "point2"],
  "quotes": [{"text": "quote text"}],
  "meta": {
    "title": "Article Title",
    "domain": "example.com",
    "author": "Author Name",
    "checksum": "sha256-hash"
  }
}
```

### `GET /api/search`
Search entries with filters.

**Query Parameters:**
- `userId`: User ID (required)
- `q`: Search query text
- `type`: "note" | "url"
- `tag`: Tag to filter by
- `sentiment`: "negative" | "neutral" | "positive"
- `from`: Start date (ISO string)
- `to`: End date (ISO string)
- `semantic`: "true" | "false" (not yet implemented)
- `topK`: Number of results (default: 20)

## 🔐 Security

- Firestore security rules ensure users can only access their own data
- API routes should validate Firebase ID tokens (TODO: implement auth middleware)
- Service account keys are never committed to git (see `.gitignore`)

## 📝 Notes

- Authentication is currently using a temporary `userId` - needs to be replaced with Firebase Auth
- Semantic search with pgvector is planned but not yet implemented
- URL scraping uses basic HTML parsing - consider upgrading to @mozilla/readability for production

## 🛠️ Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Venice AI Documentation](https://docs.venice.ai)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 📄 License

Private project - All rights reserved

