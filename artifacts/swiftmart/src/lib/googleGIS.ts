/**
 * Google sign-in via a dedicated standalone window + BroadcastChannel.
 *
 * Why this approach:
 *  - signInWithPopup  → Firebase popup postMessage is dropped by Replit's iframe proxy.
 *  - signInWithRedirect → Firebase IndexedDB state lost when an iframe navigates away/back.
 *  - GIS renderButton  → accounts.google.com iframe violates Replit outer iframe's CSP
 *                         (frame-ancestors 'self'); Chrome FedCM also needs
 *                         allow="identity-credentials-read" on the hosting iframe.
 *
 *  Opening a NEW TOP-LEVEL WINDOW (/google-signin.html) bypasses all iframe restrictions.
 *  GIS renders its button there with no ancestor-frame constraints.
 *  The credential is delivered back via BroadcastChannel (same-origin, works across windows).
 */

const CHANNEL_NAME = "swiftmart-google-auth";
const POPUP_NAME   = "swiftmart_google_signin";

/**
 * Opens the Google sign-in helper window and returns the Google ID token via
 * the provided callback once the user completes sign-in.
 *
 * Resolves with the id_token string, or rejects on timeout / window closed.
 */
export function openGoogleSigninWindow(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url =
      `/google-signin.html?client_id=${encodeURIComponent(clientId)}`;

    const popup = window.open(
      url,
      POPUP_NAME,
      "width=440,height=520,top=100,left=100,toolbar=no,menubar=no,scrollbars=no,resizable=no",
    );

    if (!popup) {
      reject(new Error("Pop-up was blocked by your browser. Please allow pop-ups for this site and try again."));
      return;
    }

    const channel = new BroadcastChannel(CHANNEL_NAME);

    // Listen for the credential from the helper window.
    const onMessage = (event: MessageEvent<{ idToken?: string; error?: string }>) => {
      cleanup();
      if (event.data?.idToken) {
        resolve(event.data.idToken);
      } else {
        reject(new Error(event.data?.error ?? "Google sign-in failed"));
      }
    };

    // Detect if the user simply closed the window without completing sign-in.
    const pollClosed = setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error("Sign-in cancelled. Please try again."));
      }
    }, 500);

    // Timeout after 5 minutes.
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Google sign-in timed out. Please try again."));
    }, 5 * 60 * 1000);

    function cleanup() {
      channel.removeEventListener("message", onMessage);
      channel.close();
      clearInterval(pollClosed);
      clearTimeout(timeout);
      if (!popup.closed) popup.close();
    }

    channel.addEventListener("message", onMessage);
  });
}
