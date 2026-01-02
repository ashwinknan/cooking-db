
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

/**
 * In a Vite project, environment variables are typically accessed via import.meta.env.
 * However, since we defined them in vite.config.ts via process.env, we continue using that 
 * for compatibility with your existing build setup.
 */
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Check if we are still using placeholders or missing keys
const isConfigured = !!(
  firebaseConfig.projectId && 
  firebaseConfig.projectId !== "your-project-id" && 
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY"
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (isConfigured) {
  try {
    // Only initialize if not already initialized
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    console.info("Cooking Ops DB: Connected to Cloud Production.");
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
} else {
  console.warn("Cooking Ops DB: Environment variables missing. App running in offline mode.");
}

export { db, isConfigured };
