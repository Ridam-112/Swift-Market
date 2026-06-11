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
  let authMode: AuthMode = "otp";
  let googleClientId = "";

  try {
    const res = await fetch("/api/auth/config");
    const data = await res.json() as {
      success: boolean;
      authMode?: AuthMode;
      googleClientId?: string;
      firebaseConfig?: FirebaseConfig | null;
    };
    authMode = data.authMode ?? "otp";
    googleClientId = data.googleClientId ?? "";

    if (data.firebaseConfig?.apiKey) {
      initFirebase(data.firebaseConfig);
    }
  } catch {
    // non-fatal — falls back to OTP-only mode
  }

  setAuthConfig(authMode, googleClientId);

  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
