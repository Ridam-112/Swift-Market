/**
 * Google Sign-In via Google Identity Services (GIS) One Tap.
 *
 * Primary path: GIS One Tap prompt (works on desktop browsers at the real domain).
 * Fallback: Signals the caller to try Firebase popup when One Tap is blocked
 * (FedCM disabled in iframes, browser restrictions, etc.).
 */

const GIS_SRC = "https://accounts.google.com/gsi/client";

interface PromptNotification {
  isDisplayMoment(): boolean;
  isDisplayed(): boolean;
  isNotDisplayed(): boolean;
  getNotDisplayedReason(): string;
  isSkippedMoment(): boolean;
  getSkippedReason(): string;
  isDismissedMoment(): boolean;
  getDismissedReason(): string;
}

interface GisCredentialResponse {
  credential?: string;
  select_by?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: Record<string, unknown>): void;
          prompt(cb?: (n: PromptNotification) => void): void;
          cancel(): void;
          renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
          disableAutoSelect(): void;
        };
      };
    };
  }
}

// Sentinel thrown when the browser/context blocks One Tap — caller should use popup.
export class GisNotSupportedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "GisNotSupportedError";
  }
}

let loadPromise: Promise<void> | null = null;

function loadGIS(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new GisNotSupportedError("Failed to load Google Sign-In library")));
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new GisNotSupportedError("Failed to load Google Sign-In library"));
    document.head.appendChild(s);
  });
  return loadPromise;
}

// Reasons GIS gives when One Tap cannot be shown due to browser/context restrictions.
// In these cases we should fall back to a popup flow instead.
const FALLBACK_REASONS = new Set([
  "browser_not_supported",
  "invalid_client",
  "missing_client_id",
  "unknown_reason",
  "suppressed_by_user", // user explicitly dismissed; try popup so they can pick an account
]);

/**
 * Sign in with Google using GIS One Tap on the current page.
 * Returns the Google ID token string on success.
 * Throws GisNotSupportedError if the browser/context blocks One Tap — use popup fallback.
 */
export async function signInWithGoogleGIS(clientId: string): Promise<string> {
  await loadGIS();

  return new Promise<string>((resolve, reject) => {
    let settled = false;

    function settle(fn: () => void) {
      if (settled) return;
      settled = true;
      try { window.google?.accounts.id.cancel(); } catch { /* ignore */ }
      fn();
    }

    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback: (response: GisCredentialResponse) => {
        settle(() => {
          if (response.credential) {
            resolve(response.credential);
          } else {
            reject(new Error("Google sign-in failed. Please try again."));
          }
        });
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true,
      use_fedcm_for_prompt: false,
    });

    window.google!.accounts.id.prompt((n: PromptNotification) => {
      if (n.isNotDisplayed()) {
        const reason = n.getNotDisplayedReason();
        if (FALLBACK_REASONS.has(reason)) {
          // Browser or context doesn't support One Tap — caller should use popup.
          settle(() => reject(new GisNotSupportedError(`One Tap not supported: ${reason}`)));
        } else if (reason === "opt_out_or_no_session") {
          settle(() => reject(new Error("No Google account found. Please sign into Google in your browser first, then try again.")));
        } else {
          // Unknown reason — also try popup fallback.
          settle(() => reject(new GisNotSupportedError(`One Tap unavailable: ${reason}`)));
        }
      } else if (n.isDismissedMoment()) {
        if (n.getDismissedReason() !== "credential_returned") {
          settle(() => reject(new Error("Sign-in cancelled. Please try again.")));
        }
      }
    });
  });
}
