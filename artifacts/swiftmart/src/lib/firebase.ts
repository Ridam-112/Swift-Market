import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, type Auth } from "firebase/auth";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

let _config: FirebaseConfig | null = null;
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

/** Called once at bootstrap with config fetched from /api/auth/config */
export function initFirebase(config: FirebaseConfig): void {
  _config = config;
}

export const isFirebaseConfigured = (): boolean =>
  !!(_config?.apiKey && _config?.authDomain && _config?.projectId && _config?.appId);

function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  if (!isFirebaseConfigured()) throw new Error("Firebase is not configured. Set VITE_FIREBASE_* env vars in Replit.");
  _app = getApps().length > 0 ? getApps()[0]! : initializeApp(_config!);
  return _app;
}

function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  return _auth;
}

/**
 * Opens a Firebase Google sign-in popup and returns the Google ID token.
 * The ID token is sent to POST /api/auth/google for server-side verification.
 * Domain-safe: works on any domain added to Firebase Authorized Domains.
 *
 * IMPORTANT — if the popup closes immediately with no login:
 *   Add the app's hostname to Firebase Console → Authentication → Settings → Authorized domains.
 *   The current hostname is: window.location.hostname
 */
export async function signInWithGoogle(): Promise<string> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.idToken) {
      throw new Error("Google sign-in succeeded but no ID token was returned.");
    }
    // Sign out from Firebase immediately — we use our own JWT session, not Firebase sessions
    await auth.signOut();
    return credential.idToken;
  } catch (err: unknown) {
    // Translate common Firebase error codes into actionable messages
    const code = (err as { code?: string })?.code ?? "";
    if (code === "auth/unauthorized-domain") {
      const domain = window.location.hostname;
      throw new Error(
        `This domain is not authorized for Google sign-in.\n` +
        `Go to Firebase Console → Authentication → Settings → Authorized domains and add:\n` +
        `"${domain}"`
      );
    }
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      throw new Error("Sign-in cancelled. Please try again.");
    }
    if (code === "auth/popup-blocked") {
      throw new Error("Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.");
    }
    throw err;
  }
}
