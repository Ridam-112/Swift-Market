import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, type Auth } from "firebase/auth";

// Firebase public config — read from env vars only, never hardcoded.
// These are intentionally public: Firebase security is enforced via
// Authorized Domains in the Firebase console, not by keeping config secret.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const isFirebaseConfigured = (): boolean =>
  !!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  if (!isFirebaseConfigured()) throw new Error("Firebase is not configured. Set VITE_FIREBASE_* env vars.");
  _app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
  return _app;
}

function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  return _auth;
}

/**
 * Opens a Firebase Google sign-in popup and returns the Google ID token.
 * The ID token is then sent to POST /api/auth/google for server-side verification.
 * Domain-safe: works on any domain added to Firebase Authorized Domains.
 */
export async function signInWithGoogle(): Promise<string> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.idToken) {
    throw new Error("Google sign-in succeeded but no ID token was returned.");
  }
  // Sign out from Firebase immediately — we use our own JWT session, not Firebase sessions
  await auth.signOut();
  return credential.idToken;
}
