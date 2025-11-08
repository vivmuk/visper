# Firebase Setup Guide for Whisper - Complete Beginner's Walkthrough

This guide will walk you through setting up Firebase from scratch for the Whisper journal app. Follow each step carefully.

---

## Prerequisites
- A Google account (Gmail account works)
- About 15-20 minutes
- A web browser (Chrome, Firefox, Edge, etc.)

---

## Step 1: Create a Firebase Account & Project

### 1.1 Go to Firebase Console
1. Open your browser and go to: **https://console.firebase.google.com/**
2. Sign in with your Google account (the same one you use for Gmail)

### 1.2 Create Your First Project
1. Click the **"Add project"** button (or "Create a project" if this is your first time)
2. **Project name**: Enter `whisper-journal` (or any name you prefer)
   - Note: This name is visible to you only, not your users
3. Click **"Continue"**

### 1.3 Google Analytics (Optional)
1. You'll be asked if you want to enable Google Analytics
2. For now, you can **toggle it OFF** (we can add it later if needed)
3. Click **"Create project"**
4. Wait 30-60 seconds while Firebase sets up your project
5. Click **"Continue"** when it's ready

**✅ You now have a Firebase project!**

---

## Step 2: Register Your Web App

### 2.1 Add a Web App to Your Project
1. In your Firebase project dashboard, you'll see several platform icons (</>, iOS, Android)
2. Click the **"</>" (Web)** icon to add a web app
3. **App nickname**: Enter `Whisper Web` (or any name)
4. **Firebase Hosting**: You can check this box if you want, but it's optional for now
5. Click **"Register app"**

### 2.2 Copy Your Firebase Configuration
1. You'll see a code snippet that looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "whisper-journal.firebaseapp.com",
     projectId: "whisper-journal",
     storageBucket: "whisper-journal.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
2. **IMPORTANT**: Copy this entire configuration object
3. You can either:
   - Click the "Copy" button if available
   - Or manually copy the values
4. **Save this somewhere safe** - we'll need it later!
5. Click **"Continue to console"**

**✅ Your web app is registered!**

---

## Step 3: Set Up Firestore Database

### 3.1 Create the Database
1. In the left sidebar, click **"Firestore Database"** (or "Build" → "Firestore Database")
2. Click **"Create database"** button

### 3.2 Choose Security Mode
1. You'll see two options:
   - **Production mode**: More secure, requires security rules
   - **Test mode**: Open access for 30 days (good for development)
2. **For now, select "Test mode"** (we'll add security rules later)
3. Click **"Next"**

### 3.3 Choose Database Location
1. Select a location closest to you or your users
   - **Recommended**: `us-central1` (Iowa, USA) or `europe-west1` (Belgium)
   - **Important**: This location cannot be changed later!
2. Click **"Enable"**
3. Wait 1-2 minutes for the database to be created

**✅ Your Firestore database is ready!**

---

## Step 4: Set Up Firebase Authentication

### 4.1 Enable Authentication
1. In the left sidebar, click **"Authentication"** (or "Build" → "Authentication")
2. Click **"Get started"** button

### 4.2 Enable Sign-In Methods
You'll see a list of sign-in providers. Enable the ones we need:

#### Google Sign-In (Recommended)
1. Click on **"Google"** in the providers list
2. Toggle **"Enable"** to ON
3. **Project support email**: Select your email from the dropdown
4. Click **"Save"**

#### Email/Password
1. Click on **"Email/Password"** in the providers list
2. Toggle **"Enable"** to ON (the first toggle)
3. **Email link (passwordless sign-in)**: You can leave this OFF for now
4. Click **"Save"**

**✅ Authentication is configured!**

---

## Step 5: Get Your Service Account Key (For Server-Side Access)

This is needed for your backend to access Firestore securely.

### 5.1 Access Project Settings
1. Click the **gear icon (⚙️)** next to "Project Overview" in the left sidebar
2. Click **"Project settings"**

### 5.2 Generate Service Account Key
1. Scroll down to the **"Service accounts"** tab
2. Click **"Generate new private key"** button
3. A popup will appear - click **"Generate key"**
4. A JSON file will download to your computer
   - **IMPORTANT**: This file contains sensitive credentials!
   - **DO NOT** commit this file to GitHub or share it publicly
   - Save it in a secure location (we'll use it later)

**✅ You have your service account key!**

---

## Step 6: Set Up Basic Security Rules

### 6.1 Navigate to Firestore Rules
1. Go to **"Firestore Database"** in the left sidebar
2. Click on the **"Rules"** tab at the top

### 6.2 Add Security Rules
Replace the default rules with these (we'll refine them later):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Entries can only be accessed by their owner
    match /entries/{entryId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // Embeddings follow same rules as entries
    match /embeddings/{embeddingId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **"Publish"** button

**✅ Security rules are set!**

---

## Step 7: Create Firestore Indexes (For Search)

### 7.1 Navigate to Indexes
1. In **"Firestore Database"**, click the **"Indexes"** tab
2. Click **"Create index"**

### 7.2 Create Composite Indexes
We'll need these indexes for efficient searching. Create them one by one:

#### Index 1: Entries by User and Date
- **Collection ID**: `entries`
- **Fields to index**:
  - `userId` (Ascending)
  - `createdAt` (Descending)
- Click **"Create"**

#### Index 2: Entries by User, Type, and Date
- **Collection ID**: `entries`
- **Fields to index**:
  - `userId` (Ascending)
  - `type` (Ascending)
  - `createdAt` (Descending)
- Click **"Create"**

#### Index 3: Entries by User, Tags, and Date
- **Collection ID**: `entries`
- **Fields to index**:
  - `userId` (Ascending)
  - `tags` (Array)
  - `createdAt` (Descending)
- Click **"Create"**

**Note**: These indexes may take a few minutes to build. You can continue while they build.

**✅ Indexes are being created!**

---

## Step 8: Summary - What You Have Now

After completing these steps, you should have:

✅ **Firebase Project**: `whisper-journal` (or your chosen name)  
✅ **Web App Registered**: Configuration object with API keys  
✅ **Firestore Database**: Created and ready to store data  
✅ **Authentication**: Google and Email/Password enabled  
✅ **Service Account Key**: JSON file for server-side access  
✅ **Security Rules**: Basic rules protecting user data  
✅ **Indexes**: Being built for efficient search  

---

## Step 9: Information to Share With Me

Please provide me with the following information:

### 9.1 Firebase Web App Configuration
Copy and paste your `firebaseConfig` object (from Step 2.2):
```javascript
{
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
}
```

### 9.2 Service Account Key
- The JSON file you downloaded (Step 5.2)
- **OR** just tell me the file path and I'll help you set it up securely

### 9.3 Database Location
- Which location did you choose? (e.g., `us-central1`)

### 9.4 Project ID
- Your project ID (visible in the Firebase console URL or in your config)

---

## Common Issues & Solutions

### Issue: "I can't find Firestore Database"
- **Solution**: Click "Build" in the left sidebar, then "Firestore Database"

### Issue: "Service account key download didn't work"
- **Solution**: Try a different browser or check your downloads folder

### Issue: "I don't see Authentication option"
- **Solution**: Make sure you're in the correct Firebase project. Try refreshing the page.

### Issue: "Index creation is taking too long"
- **Solution**: This is normal! Indexes can take 5-10 minutes. You can continue with other setup.

---

## Next Steps

Once you've completed these steps and shared the information from Step 9, I'll:
1. Set up the Firebase configuration in your codebase
2. Create the data models and types
3. Set up the authentication flow
4. Build the API endpoints that connect to Firestore

**Take your time with these steps - there's no rush!** 🚀

