
import { initializeApp, getApps } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const isConfigured = !!(
  firebaseConfig.projectId && 
  firebaseConfig.apiKey &&
  firebaseConfig.projectId !== "undefined" &&
  firebaseConfig.apiKey !== ""
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: any = null;
const googleProvider = new GoogleAuthProvider();

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
    
    if (typeof window !== 'undefined') {
      console.info("Buddy: Services Connected.");
    }
  } catch (error) {
    console.error("Firebase Error:", error);
  }
}

export const loginWithGoogle = async () => {
  if (!isConfigured) {
    // Return a mock user for previewing in development environments
    return { user: { uid: 'preview-user', displayName: 'Buddy Preview' } };
  }
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Login failed", error);
    throw error;
  }
};

export const logout = () => {
  if (!isConfigured) {
    window.location.reload();
    return;
  }
  return auth?.signOut();
};

export { db, auth, isConfigured };
