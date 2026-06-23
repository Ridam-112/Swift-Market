import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthConfig, type AuthMode } from "./lib/authConfig";
import { initFirebase } from "./lib/firebase";
import { setBaseUrl } from "@workspace/api-client-react";

// When deployed to a separate host (e.g. Cloudflare Pages), VITE_API_URL must
// point to the backend (e.g. https://your-app.onrender.com).
// In Replit dev the Vite proxy rewrites /api → localhost:8080, so no base URL needed.
const API_BASE = import.meta.env.VITE_API_URL
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
    };
    authMode = data.authMode ?? "otp";
    googleClientId = data.googleClientId ?? "";

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
