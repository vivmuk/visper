# Whisper Setup Instructions

## Step 1: Install Dependencies

Run this command in your project directory:

```bash
npm install
```

## Step 2: Configure Environment Variables

Create a `.env.local` file in the root directory with the following content:

```env
# Firebase Client Configuration (from Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAOtJ-mu-DfOkX2lb2_8IFXDMljP4osYCE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=wisper-vivek.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=wisper-vivek
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=wisper-vivek.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=900654614613
NEXT_PUBLIC_FIREBASE_APP_ID=1:900654614613:web:8619cb472c087d8139ecdc
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-66YWY2EVEP

# Firebase Admin - Path to your service account JSON file
FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH=./wisper-vivek-firebase-adminsdk-fbsvc-af4804705a.json

# Venice AI API Key
VENICE_API_KEY=lnWNeSg0pA_rQUooNpbfpPDBaj2vJnWol5WqKWrIEF
```

**Important:** Make sure the service account JSON file (`wisper-vivek-firebase-adminsdk-fbsvc-af4804705a.json`) is in the root directory of your project.

## Step 3: Deploy Firestore Security Rules

1. Make sure you're logged into Firebase CLI:
   ```bash
   firebase login
   ```

2. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your existing project: `wisper-vivek`
   - Use the existing `firestore.rules` file
   - Use the existing `firestore.indexes.json` file (or create a new one)

3. Deploy the security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Step 4: Create Firestore Indexes

The app needs composite indexes for efficient queries. You can create them in two ways:

### Option A: Via Firebase Console (Recommended for beginners)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `wisper-vivek`
3. Go to **Firestore Database** → **Indexes** tab
4. Click **"Create index"** and create these indexes:

   **Index 1:**
   - Collection ID: `entries`
   - Fields:
     - `userId` (Ascending)
     - `createdAt` (Descending)
   
   **Index 2:**
   - Collection ID: `entries`
   - Fields:
     - `userId` (Ascending)
     - `type` (Ascending)
     - `createdAt` (Descending)
   
   **Index 3:**
   - Collection ID: `entries`
   - Fields:
     - `userId` (Ascending)
     - `tags` (Array)
     - `createdAt` (Descending)

### Option B: Via Firebase CLI

Create a `firestore.indexes.json` file:

```json
{
  "indexes": [
    {
      "collectionGroup": "entries",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "entries",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "entries",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "tags", "arrayConfig": "CONTAINS" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Then deploy:
```bash
firebase deploy --only firestore:indexes
```

## Step 5: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 6: Test the Application

1. **Test Journal Entry:**
   - Type some text in the "Write" tab
   - Click "Improve" to see AI-improved version
   - Click "Save Improved" or "Save Both"

2. **Test URL Summarization:**
   - Switch to "URL" tab
   - Paste a URL (e.g., `https://example.com`)
   - Click "Summarize"
   - Review the summary and click "Save"

## Troubleshooting

### Error: "Firebase Admin credentials not found"
- Make sure `FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH` in `.env.local` points to the correct file path
- Verify the service account JSON file exists in your project root

### Error: "VENICE_API_KEY environment variable is not set"
- Make sure `.env.local` exists and contains `VENICE_API_KEY`
- Restart your development server after adding environment variables

### Error: "Missing or insufficient permissions" in Firestore
- Make sure you've deployed the security rules: `firebase deploy --only firestore:rules`
- Verify the rules in `firestore.rules` match your data structure

### Error: "The query requires an index"
- Create the required Firestore indexes (see Step 4)
- Indexes may take a few minutes to build

## Next Steps

- [ ] Set up Firebase Authentication (Google Sign-In, Email/Password)
- [ ] Replace temporary `userId` with real authentication
- [ ] Add search UI with filters
- [ ] Create entry list/timeline view
- [ ] Set up PWA manifest for installable app
- [ ] Add offline support with service worker

## Need Help?

Check the main `README.md` for more details about the project structure and API endpoints.

