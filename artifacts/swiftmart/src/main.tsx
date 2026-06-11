import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./index.css";
import { setAuthConfig, type AuthMode } from "./lib/authConfig";

async function bootstrap() {
  let googleClientId = "placeholder";
  let authMode: AuthMode = "otp"; // safe default — OTP always works without domain/OAuth

  try {
    const res = await fetch("/api/auth/config");
    const data = await res.json() as { success: boolean; authMode?: AuthMode; googleClientId?: string };
    authMode = data.authMode ?? "otp";
    googleClientId = data.googleClientId || "placeholder";
  } catch {
    // non-fatal — falls back to OTP-only mode
  }

  // Populate the shared auth config module read by Auth.tsx and other components
  setAuthConfig(authMode, googleClientId);

  createRoot(document.getElementById("root")!).render(
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  );
}

void bootstrap();
