import { createRoot } from "react-dom/client";
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
    console.log("[SwiftMart] /api/auth/config bootstrap response:", {
      authMode: data.authMode,
      googleClientIdPresent: !!data.googleClientId,
      googleClientIdLength: data.googleClientId?.length ?? 0,
    });
    authMode = data.authMode ?? "otp";
    googleClientId = data.googleClientId ?? "";

    if (Array.isArray(data.servicePincodes) && data.servicePincodes.length > 0) {
      setServicePincodes(data.servicePincodes);
    }

    if (data.firebaseConfig?.apiKey) {
      initFirebase({
        ...data.firebaseConfig,
        messagingSenderId: data.firebaseConfig.messagingSenderId ?? "",
      });
    }
  } catch {
    // non-fatal — falls back to OTP-only mode
  }

  setAuthConfig(authMode, googleClientId);

  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
