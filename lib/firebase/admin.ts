// Firebase Admin SDK (server-side only)
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import * as path from "path";
import * as fs from "fs";

let app: App;
let adminDb: Firestore;
let adminAuth: Auth;

// Initialize Firebase Admin (singleton pattern)
if (!getApps().length) {
  // Try to load service account from file path or environment
  const serviceAccountPath = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH;
  
  if (serviceAccountPath) {
    // Load from file
    const fullPath = path.resolve(process.cwd(), serviceAccountPath);
    if (fs.existsSync(fullPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(fullPath, "utf8"));
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      throw new Error(`Service account file not found at: ${fullPath}`);
    }
  } else if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    // Load from environment variables
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  } else {
    throw new Error(
      "Firebase Admin credentials not found. Set FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH or provide credentials via env vars."
    );
  }
} else {
  app = getApps()[0];
}

adminDb = getFirestore(app);
adminAuth = getAuth(app);

export { app, adminDb, adminAuth };

