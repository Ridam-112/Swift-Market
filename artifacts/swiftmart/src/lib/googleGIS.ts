/**
 * Google sign-in via a dedicated standalone window.
 *
 * Communication strategy (both channels tried in order):
 *  1. window.opener.postMessage — direct and reliable when popup has access to opener.
 *  2. BroadcastChannel — same-origin fallback for browsers that restrict opener access.
 *
 * Why a separate window instead of signInWithPopup / signInWithRedirect / GIS in iframe:
 *  - signInWithPopup  → Firebase popup postMessage blocked by Replit's iframe proxy.
 *  - signInWithRedirect → Firebase IndexedDB state lost when iframe navigates away/back.
 *  - GIS in app iframe → accounts.google.com iframe violates Replit CSP frame-ancestors.
 *
 * Opening /google-signin.html as a NEW TOP-LEVEL WINDOW sidesteps all iframe restrictions.
 */

const CHANNEL_NAME = "swiftmart-google-auth";
const POPUP_NAME   = "swiftmart_google_signin";

export function openGoogleSigninWindow(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const origin = window.location.origin;
    const url = `/google-signin.html?client_id=${encodeURIComponent(clientId)}&origin=${encodeURIComponent(origin)}`;

    const popup = window.open(
      url,
      POPUP_NAME,
      "width=480,height=560,top=100,left=100,toolbar=no,menubar=no,scrollbars=no,resizable=yes",
    );

    if (!popup) {
      reject(new Error("Pop-up was blocked by your browser. Please allow pop-ups for this site and try again."));
      return;
    }

    let done = false;

    function cleanup() {
      window.removeEventListener("message", onPostMessage);
      channel.removeEventListener("message", onBroadcast);
      channel.close();
      clearInterval(pollClosed);
      clearTimeout(timeout);
      if (!popup.closed) popup.close();
    }

    function handlePayload(data: unknown) {
      if (done) return;
      const d = data as Record<string, unknown> | null;
      if (!d || !d["swiftmartGoogle"]) return; // ignore unrelated messages
      done = true;
      cleanup();
      if (d["idToken"]) {
        resolve(d["idToken"] as string);
      } else {
        reject(new Error(typeof d["error"] === "string" ? d["error"] : "Google sign-in failed"));
      }
    }

    // Channel 1: window.opener.postMessage (popup → this window)
    function onPostMessage(e: MessageEvent) {
      if (e.origin !== origin) return;
      handlePayload(e.data);
    }
    window.addEventListener("message", onPostMessage);

    // Channel 2: BroadcastChannel fallback
    const channel = new BroadcastChannel(CHANNEL_NAME);
    function onBroadcast(e: MessageEvent) {
      handlePayload(e.data);
    }
    channel.addEventListener("message", onBroadcast);

    // Detect user closing the popup without completing sign-in
    const pollClosed = setInterval(() => {
      if (popup.closed && !done) {
        done = true;
        cleanup();
        reject(new Error("Sign-in cancelled. Please try again."));
      }
    }, 500);

    // 5-minute timeout
    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        cleanup();
        reject(new Error("Google sign-in timed out. Please try again."));
      }
    }, 5 * 60 * 1000);
  });
}
