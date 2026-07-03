import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import { setAuthConfig, type AuthMode } from "./lib/authConfig";
import { initFirebase } from "./lib/firebase";
import { setBaseUrl } from "@workspace/api-client-react";
import { setServicePincodes } from "./lib/serviceArea";

// VITE_API_URL is only used when running inside a Capacitor native shell (Android/iOS),
// where window.location.protocol === "capacitor:" and relative /api paths don't work.
// In any browser context (dev or production), relative /api is always correct.
const _isCapacitorShell =
  typeof window !== "undefined" && window.location.protocol === "capacitor:";
const API_BASE =
  _isCapacitorShell && import.meta.env.VITE_API_URL
    ? `${(import.meta.env.VITE_API_URL as string).replace(/\/+$/, "")}`
    : "";

if (API_BASE) setBaseUrl(API_BASE);

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId?: string;
}

async function bootstrap() {
  let authMode: AuthMode = "otp";
  let googleClientId = "";

  try {
    const configUrl = API_BASE ? `${API_BASE}/api/auth/config` : "/api/auth/config";
    const res = await fetch(configUrl);
    const data = await res.json() as {
      success: boolean;
      authMode?: AuthMode;
      googleClientId?: string;
      firebaseConfig?: FirebaseConfig | null;
      servicePincodes?: Array<{ pincode: string; area: string; state: string }>;
    };
    const fc = data.firebaseConfig;
    console.log("[SwiftMart] /api/auth/config bootstrap:", {
      authMode: data.authMode,
      googleClientIdPresent: !!data.googleClientId,
      firebaseConfigPresent: !!fc,
      firebaseApiKey: fc?.apiKey ? fc.apiKey.substring(0, 10) + "..." : "MISSING",
      firebaseProjectId: fc?.projectId ?? "MISSING",
      firebaseAppId: fc?.appId ? fc.appId.substring(0, 25) + "..." : "MISSING",
      firebaseMessagingSenderId: fc?.messagingSenderId ?? "MISSING",
    });
    authMode = data.authMode ?? "otp";
    googleClientId = data.googleClientId ?? "";

    if (Array.isArray(data.servicePincodes) && data.servicePincodes.length > 0) {
      setServicePincodes(data.servicePincodes);
    }

    // ── Native Google Sign-In for Capacitor Android ───────────────────────────
    // Initialise the plugin with the web client ID fetched from the server.
    // This must happen before the user can tap "Continue with Google" in the app.
    if (_isCapacitorShell && googleClientId) {
      try {
        const { initNativeGoogleAuth } = await import('./lib/googleNativeAuth');
        await initNativeGoogleAuth(googleClientId);
      } catch (err) {
        console.warn('[SwiftMart] Native Google Auth init failed (Google login unavailable):', err);
      }
    }

    if (fc?.apiKey) {
      const config = {
        ...fc,
        messagingSenderId: fc.messagingSenderId ?? "",
      };
      initFirebase(config);
      console.log("[SwiftMart] Firebase initialised ✅ projectId:", config.projectId, "| messagingSenderId:", config.messagingSenderId);
    } else {
      console.warn("[SwiftMart] Firebase config missing from /api/auth/config — push notifications will not work");
    }
  } catch (err) {
    console.error("[SwiftMart] bootstrap /api/auth/config error:", err);
    // non-fatal — falls back to OTP-only mode
  }

  setAuthConfig(authMode, googleClientId);

  createRoot(document.getElementById("root")!).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );

  // Dismiss the PWA splash screen after first render
  requestAnimationFrame(() => {
    const splash = document.getElementById("swm-splash");
    if (!splash) return;
    splash.classList.add("swm-hidden");
    const remove = () => splash.remove();
    splash.addEventListener("transitionend", remove, { once: true });
    setTimeout(remove, 600);
  });
}

void bootstrap();
