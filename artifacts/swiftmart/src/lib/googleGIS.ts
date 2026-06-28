/**
 * Google Sign-In via Google Identity Services (GIS) One Tap.
 *
 * Renders the GIS prompt directly on the current page — no popup window needed.
 * This works at any top-level origin (swiftmart.space, etc.).
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

let loadPromise: Promise<void> | null = null;

function loadGIS(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Sign-In library")));
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Sign-In library. Check your internet connection."));
    document.head.appendChild(s);
  });
  return loadPromise;
}

/**
 * Sign in with Google using GIS One Tap on the current page.
 * Returns the Google ID token string on success.
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
        settle(() => reject(new Error(
          reason === "suppressed_by_user"
            ? "Google sign-in was suppressed. Please clear site cookies and try again."
            : reason === "opt_out_or_no_session"
              ? "No Google session found. Please sign into Google in your browser first."
              : "Google sign-in could not be shown. Please use email login instead."
        )));
      } else if (n.isDismissedMoment()) {
        if (n.getDismissedReason() !== "credential_returned") {
          settle(() => reject(new Error("Sign-in cancelled. Please try again.")));
        }
      }
    });
  });
}
