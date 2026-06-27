// Auth configuration loaded once at app bootstrap from /api/auth/config.
// Password login is always available. Google is controlled by AUTH_MODE.
//
//   authMode = 'otp'    → legacy value; treated as password-only
//   authMode = 'google' → Google OAuth only (no password login shown)
//   authMode = 'both'   → Password + Google shown

export type AuthMode = "otp" | "google" | "both";

let _authMode: AuthMode = "otp";
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

/** OTP login is removed — always returns false */
export function showOtpLogin(): boolean {
  return false;
}

/** Password login is available whenever Google-only mode is NOT active */
export function showPasswordLogin(): boolean {
  return _authMode !== "google";
}
