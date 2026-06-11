/**
 * Google Identity Services (GIS) integration.
 *
 * Why GIS instead of Firebase signInWithPopup / signInWithRedirect:
 *  - signInWithPopup  → relies on window.opener postMessage; silently fails inside Replit's
 *                        proxied iframe because the cross-origin postMessage is dropped.
 *  - signInWithRedirect → relies on IndexedDB state surviving an iframe navigation;
 *                          state is lost when the iframe navigates to Google and back.
 *  - GIS renderButton  → Google renders its own button and delivers the credential as a
 *                          plain JS callback in the same page context. No popup, no redirect,
 *                          no cross-origin messaging. Works everywhere.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: GISConfig) => void;
          renderButton: (parent: HTMLElement, cfg: GISButtonConfig) => void;
          prompt: (fn?: (n: GISMoment) => void) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

interface GISConfig {
  client_id: string;
  callback: (resp: { credential: string }) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  itp_support?: boolean;
}

interface GISButtonConfig {
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  width?: number;
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  logo_alignment?: "left" | "center";
  shape?: "rectangular" | "pill" | "circle" | "square";
}

interface GISMoment {
  getMomentType: () => string;
  getDismissedReason: () => string;
  getNotDisplayedReason: () => string;
}

let _loadPromise: Promise<void> | null = null;

/** Injects the GIS script tag once; resolves when the library is ready. */
export function loadGoogleGIS(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (_loadPromise) return _loadPromise;

  _loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("google-gis-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.id = "google-gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });

  return _loadPromise;
}

/** Initialise GIS with a client ID and credential callback. */
export function initGoogleGIS(
  clientId: string,
  onCredential: (idToken: string) => void,
): void {
  window.google!.accounts.id.initialize({
    client_id: clientId,
    callback: (resp) => onCredential(resp.credential),
    auto_select: false,
    cancel_on_tap_outside: true,
    itp_support: true,
  });
}

/**
 * Renders Google's official Sign-In button into `parent`.
 * The button delivers the credential via the callback registered in initGoogleGIS.
 */
export function renderGoogleSignInButton(parent: HTMLElement): void {
  const width = parent.offsetWidth || 360;
  window.google!.accounts.id.renderButton(parent, {
    theme: "filled_black",
    size: "large",
    text: "continue_with",
    width,
    logo_alignment: "left",
    shape: "pill",
  });
}
