import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase client (browser) app + Firestore.
 * Config is read from NEXT_PUBLIC_FIREBASE_* env vars so you don't hardcode secrets.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

function assertConfig() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(
      `Missing Firebase env vars: ${missing.join(
        ", "
      )}. Add them to .env.local (and Vercel env vars) as NEXT_PUBLIC_FIREBASE_*`
    );
  }
}

export const app: FirebaseApp = (() => {
  if (typeof window !== "undefined") assertConfig();
  return getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
})();

export const db: Firestore = getFirestore(app);
