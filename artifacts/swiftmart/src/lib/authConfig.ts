// Auth configuration loaded once at app bootstrap from /api/auth/config.
// Controls which login methods are shown in the UI.
//
//   authMode = 'otp'    → Phone OTP only (default until domain + Google OAuth is set up)
//   authMode = 'google' → Google OAuth only
//   authMode = 'both'   → Both methods shown
//
// To switch to Google Auth after connecting your domain:
//   1. Set AUTH_MODE=both (or =google) in your server environment.
//   2. Set GOOGLE_CLIENT_ID in server env — the UI reads it from /api/auth/config.
//   3. No frontend code change required; the Google button appears automatically.

export type AuthMode = "otp" | "google" | "both";

let _authMode: AuthMode = "otp"; // safe default — OTP always works
let _googleClientId = "placeholder";

export function setAuthConfig(mode: AuthMode, clientId: string) {
  _authMode = mode;
  _googleClientId = clientId || "placeholder";
}

export function getAuthMode(): AuthMode {
  return _authMode;
}

export function getGoogleClientId(): string {
  return _googleClientId;
}

/** Returns true if Google login should be shown in the UI */
export function showGoogleLogin(): boolean {
  return _authMode === "google" || _authMode === "both";
}

/** Returns true if Phone OTP login should be shown in the UI */
export function showOtpLogin(): boolean {
  return _authMode === "otp" || _authMode === "both";
}
