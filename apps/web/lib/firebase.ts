// lib/firebase.ts
// Firebase initialization for client-side auth in the web app

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// Required Firebase configuration keys
const REQUIRED_CONFIG_KEYS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

// Initialize Firebase with values from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate required environment variables
function validateConfig() {
  const missingKeys: string[] = [];

  for (const key of REQUIRED_CONFIG_KEYS) {
    if (!process.env[key]) {
      missingKeys.push(key);
    }
  }

  if (missingKeys.length > 0) {
    console.error(`[Firebase] Missing required environment variables: ${missingKeys.join(', ')}`);
    console.error('[Firebase] Firebase authentication will not work. Please add these to your .env.local file.');
    return false;
  }

  return true;
}

// Check if Firebase is properly configured
const isConfigured = validateConfig();

// Initialize Firebase only once and only if configured
const app = isConfigured
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
  : null;

// Get Auth instance - will be null if not configured
export const auth: Auth | null = app ? getAuth(app) : null;

export default app;
