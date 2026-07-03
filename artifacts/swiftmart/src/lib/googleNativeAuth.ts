/**
 * Native Google Sign-In for Capacitor Android.
 *
 * Uses @codetrix-studio/capacitor-google-auth which wraps Android's GoogleSignIn SDK.
 * The flow:
 *   1. main.tsx calls initNativeGoogleAuth(webClientId) at bootstrap.
 *   2. Auth.tsx calls nativeGoogleSignIn() on button press.
 *   3. Android shows the native account picker.
 *   4. On success, returns an ID token.
 *   5. Auth.tsx sends the ID token to POST /api/auth/google for verification.
 *
 * This file is only imported in Capacitor contexts — tree-shaken from web builds
 * because it's imported with dynamic import() in main.tsx and Auth.tsx.
 */

import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

let initialized = false;

/**
 * Initialize the native Google Sign-In client with the Web OAuth Client ID.
 * Must be called once at app bootstrap (main.tsx) before any signIn() call.
 * The clientId is the Web Application client ID from Google Cloud Console
 * (same as GOOGLE_CLIENT_ID in Replit Secrets / backend).
 */
export async function initNativeGoogleAuth(webClientId: string): Promise<void> {
  if (initialized) return;
  console.log('[GoogleNativeAuth] Initializing with web client ID…');
  await GoogleAuth.initialize({
    clientId: webClientId,
    scopes: ['profile', 'email'],
    grantOfflineAccess: false,
  });
  initialized = true;
  console.log('[GoogleNativeAuth] Initialized ✅');
}

/**
 * Trigger the native Google account picker and return the Google ID token.
 * The ID token can be verified by the backend at POST /api/auth/google.
 */
export async function nativeGoogleSignIn(): Promise<string> {
  console.log('[GoogleNativeAuth] Launching native account picker…');
  const result = await GoogleAuth.signIn();
  console.log('[GoogleNativeAuth] Sign-in result received:', JSON.stringify({
    hasId: !!result.id,
    hasEmail: !!result.email,
    hasIdToken: !!result.authentication?.idToken,
    hasAccessToken: !!result.authentication?.accessToken,
  }));
  const idToken = result.authentication?.idToken;
  if (!idToken) {
    const msg =
      'Google Sign-In succeeded but no ID token was returned. ' +
      'Ensure your Web OAuth 2.0 Client ID is set correctly and the ' +
      'Android OAuth client (with SHA-1 fingerprint) is registered in ' +
      'Google Cloud Console → APIs & Services → Credentials.';
    console.error('[GoogleNativeAuth] ' + msg, result);
    throw new Error(msg);
  }
  console.log('[GoogleNativeAuth] ID token obtained ✅');
  return idToken;
}

/** Sign out from native Google (best-effort). */
export async function nativeGoogleSignOut(): Promise<void> {
  try { await GoogleAuth.signOut(); } catch { /* ignore */ }
}
