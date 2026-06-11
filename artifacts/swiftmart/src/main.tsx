import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthConfig, type AuthMode } from "./lib/authConfig";
import { initFirebase } from "./lib/firebase";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

async function bootstrap() {
  let authMode: AuthMode = "otp"; // safe default — OTP always works without domain/OAuth

  try {
    const res = await fetch("/api/auth/config");
    const data = await res.json() as {
      success: boolean;
      authMode?: AuthMode;
      googleClientId?: string;
      firebaseConfig?: FirebaseConfig | null;
    };
    authMode = data.authMode ?? "otp";

    // Init Firebase with config served from the backend (never from VITE_* build-time vars).
    // This makes the setup domain-migration-safe — no frontend rebuild needed when switching domains.
    if (data.firebaseConfig?.apiKey) {
      initFirebase(data.firebaseConfig);
    }
  } catch {
    // non-fatal — falls back to OTP-only mode
  }

  setAuthConfig(authMode, "");

  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
