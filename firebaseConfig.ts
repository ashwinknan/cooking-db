
import { initializeApp, getApps } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

/**
 * These variables are injected during the build process.
 * In Vercel, make sure they are added in the Project Settings -> Environment Variables.
 */
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Validates that we have the necessary production keys
const isConfigured = !!(
  firebaseConfig.projectId && 
  firebaseConfig.apiKey &&
  firebaseConfig.projectId !== "undefined"
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (isConfigured) {
  try {
    // Standard singleton pattern for Firebase initialization
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    
    if (typeof window !== 'undefined') {
      console.info("Cooking Ops: Production Database Connected.");
    }
  } catch (error) {
    console.error("Firebase Production Error:", error);
  }
} else {
  console.warn("Cooking Ops: Database configuration missing. Check Vercel Environment Variables.");
}

export { db, isConfigured };
