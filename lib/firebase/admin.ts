// Firebase Admin SDK (server-side only)
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import { getStorage, Storage } from "firebase-admin/storage";
import * as path from "path";
import * as fs from "fs";

let _app: App | undefined;
let _adminDb: Firestore | undefined;
let _adminAuth: Auth | undefined;
let _adminStorage: Storage | undefined;

// Initialize Firebase Admin (singleton pattern, lazy)
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    _app = getApps()[0];
  } else {
    // Try to load service account from file path or environment
    const serviceAccountPath = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH;
    
    if (serviceAccountPath) {
      // Load from file
      const fullPath = path.resolve(process.cwd(), serviceAccountPath);
      if (fs.existsSync(fullPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(fullPath, "utf8"));
        _app = initializeApp({
          credential: cert(serviceAccount),
        });
      } else {
        throw new Error(`Service account file not found at: ${fullPath}`);
      }
    } else if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      // Load from environment variables
      // Handle different newline formats that Railway might use
      let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
      
      // Replace various newline representations with actual newlines
      // Railway might store it as: \n, \\n, or actual newlines
      privateKey = privateKey.replace(/\\n/g, "\n");
      privateKey = privateKey.replace(/\\\\n/g, "\n");
      
      // Ensure the private key has proper BEGIN/END markers
      if (!privateKey.includes("BEGIN PRIVATE KEY")) {
        throw new Error(
          "Private key must include BEGIN PRIVATE KEY marker. " +
          "Make sure you copied the entire key from the JSON file."
        );
      }
      if (!privateKey.includes("END PRIVATE KEY")) {
        throw new Error(
          "Private key must include END PRIVATE KEY marker. " +
          "Make sure you copied the entire key from the JSON file."
        );
      }
      
      try {
        _app = initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: privateKey,
          }),
        });
      } catch (certError) {
        console.error("Error initializing Firebase Admin with certificate:", certError);
        throw new Error(
          `Failed to parse private key: ${certError instanceof Error ? certError.message : "Unknown error"}. ` +
          "Please check that FIREBASE_ADMIN_PRIVATE_KEY is set correctly in Railway. " +
          "The key should include -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY----- markers, " +
          "and newlines should be represented as \\n (not actual line breaks)."
        );
      }
    } else {
      throw new Error(
        "Firebase Admin credentials not found. Set FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH or provide credentials via env vars."
      );
    }
  }

  if (!_adminDb) _adminDb = getFirestore(_app);
  if (!_adminAuth) _adminAuth = getAuth(_app);
  if (!_adminStorage) _adminStorage = getStorage(_app);
}

// Getters that initialize on first access
export function getAdminApp(): App {
  if (!_app) initializeFirebaseAdmin();
  return _app!;
}

export function getAdminDb(): Firestore {
  if (!_adminDb) initializeFirebaseAdmin();
  return _adminDb!;
}

export function getAdminAuth(): Auth {
  if (!_adminAuth) initializeFirebaseAdmin();
  return _adminAuth!;
}

export function getAdminStorage(): Storage {
  if (!_adminStorage) initializeFirebaseAdmin();
  return _adminStorage!;
}

// Legacy exports for backward compatibility
export const adminDb = new Proxy({} as Firestore, {
  get: (target, prop) => {
    const db = getAdminDb();
    return (db as any)[prop];
  }
});

export const adminAuth = new Proxy({} as Auth, {
  get: (target, prop) => {
    const auth = getAdminAuth();
    return (auth as any)[prop];
  }
});

export const adminStorage = new Proxy({} as Storage, {
  get: (target, prop) => {
    const storage = getAdminStorage();
    return (storage as any)[prop];
  }
});

export const app = new Proxy({} as App, {
  get: (target, prop) => {
    const appInstance = getAdminApp();
    return (appInstance as any)[prop];
  }
});
