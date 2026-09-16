import "server-only";
import {
  initializeApp,
  getApps,
  cert,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { LocalFirestore } from "@/lib/db/local-store";

/**
 * Firebase Admin SDK — SERVER ONLY. Never import from client components.
 * Lazily initialized; safe to import when env vars are missing (returns null).
 */

function buildCredential() {
  // Option 1: base64-encoded full service account JSON
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    try {
      const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      return cert(json);
    } catch {
      console.error("[admin] Invalid FIREBASE_SERVICE_ACCOUNT_BASE64");
      return null;
    }
  }
  // Option 2: individual fields
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  try {
    return cert({ projectId, clientEmail, privateKey });
  } catch {
    console.error("[admin] Invalid Firebase Admin credentials");
    return null;
  }
}

let cachedApp: App | null = null;

/**
 * Which persistence backend is active.
 *  - "firebase" → Firebase Admin SDK (Firestore/Storage/Auth)
 *  - "local"    → embedded SQLite store (Firestore-compatible API)
 * Automatic: Firebase wins when credentials exist, otherwise the embedded
 * store keeps the whole platform (public site + admin + owner console)
 * fully functional with zero external services. Force with DATA_BACKEND.
 */
export function getDataBackend(): "firebase" | "local" {
  const forced = (process.env.DATA_BACKEND ?? "").trim().toLowerCase();
  if (forced === "local" || forced === "sqlite") return "local";
  if (forced === "firebase" || forced === "firestore") return "firebase";
  return hasFirebaseCredentials() ? "firebase" : "local";
}

function hasFirebaseCredentials(): boolean {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) return true;
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

let cachedLocalDb: LocalFirestore | null = null;

/** Embedded SQLite adapter, presented through the Firestore API surface. */
function getLocalDbInstance(): LocalFirestore {
  if (!cachedLocalDb) cachedLocalDb = new LocalFirestore();
  return cachedLocalDb;
}

export function getAdminApp(): App | null {
  if (getDataBackend() === "local") return null;
  if (cachedApp) return cachedApp;
  if (getApps().length) {
    cachedApp = getApps()[0];
    return cachedApp;
  }
  const credential = buildCredential();
  if (!credential) return null;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    (projectId ? `${projectId}.appspot.com` : undefined);
  try {
    cachedApp = initializeApp({ credential, projectId, storageBucket });
    return cachedApp;
  } catch (err) {
    console.error("[admin] Failed to initialize Firebase Admin:", err);
    return null;
  }
}

export function isAdminConfigured(): boolean {
  if (getDataBackend() === "local") return true; // embedded store is always available
  return getAdminApp() !== null;
}

export function getAdminAuth(): Auth | null {
  if (getDataBackend() === "local") return null; // local identity handled by lib/server/identity
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export function getAdminDb(): Firestore | null {
  if (getDataBackend() === "local") return getLocalDbInstance() as unknown as Firestore;
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export function getAdminStorage(): Storage | null {
  const app = getAdminApp();
  return app ? getStorage(app) : null;
}

export function getAdminBucketName(): string | null {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    (process.env.FIREBASE_PROJECT_ID
      ? `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
      : null)
  );
}
