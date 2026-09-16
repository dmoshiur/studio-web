/**
 * Promote a user to owner by email (server-side, uses Admin SDK).
 *
 * Usage:
 *   OWNER_EMAIL=user@example.com npx tsx scripts/set-owner.ts user@example.com
 *
 * This is the escape hatch if /setup bootstrap is unavailable.
 * Requires Firebase Admin env vars in .env.local.
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const email = process.argv[2];
if (!email || !email.includes("@")) {
  console.error("Usage: npx tsx scripts/set-owner.ts user@example.com");
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

async function main() {
  const auth = getAuth();
  const db = getFirestore();
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { role: "owner" });
  const now = FieldValue.serverTimestamp();
  await db.collection("users").doc(user.uid).set(
    { uid: user.uid, email: user.email, displayName: user.displayName ?? null, photoURL: user.photoURL ?? null, role: "owner", updatedAt: now },
    { merge: true }
  );
  await db.collection("admins").doc(user.uid).set(
    { uid: user.uid, email: user.email, role: "owner", updatedAt: now },
    { merge: true }
  );
  await auth.revokeRefreshTokens(user.uid);
  console.log(`✓ ${email} is now an owner (uid: ${user.uid}). Ask them to sign out and back in.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
