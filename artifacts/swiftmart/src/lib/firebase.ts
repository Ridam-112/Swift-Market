import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  type Auth,
} from "firebase/auth";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId: string;
  storageBucket?: string;
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

export function getFirebaseApp(): FirebaseApp {
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
 * Initiates Google sign-in via a full-page redirect.
 * Works in all environments including Replit iframes where signInWithPopup
 * fails because window.opener postMessage is blocked by the iframe proxy.
 *
 * After Google authentication, the user is redirected back to the app.
 * Call getGoogleRedirectResult() on page load to complete the sign-in.
 */
export async function startGoogleSignIn(): Promise<void> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithRedirect(auth, provider);
}

/**
 * Called on page load to pick up the Google redirect result.
 * Returns the Google ID token if the user just completed Google sign-in,
 * or null if there is no pending redirect result.
 */
export async function getGoogleRedirectResult(): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;
  try {
    const auth = getFirebaseAuth();
    const result = await getRedirectResult(auth);
    if (!result) return null;
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.idToken) return null;
    // Sign out from Firebase immediately — we use our own JWT session, not Firebase sessions
    await auth.signOut();
    return credential.idToken;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? "";
    if (code === "auth/unauthorized-domain") {
      const domain = window.location.hostname;
      throw new Error(
        `This domain is not authorized for Google sign-in. ` +
        `Add "${domain}" to Firebase Console → Authentication → Settings → Authorized domains.`
      );
    }
    // No pending redirect — treat as null (not an error)
    if (code === "auth/no-auth-event" || code === "auth/null-user") return null;
    throw err;
  }
}
