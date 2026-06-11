import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthConfig, type AuthMode } from "./lib/authConfig";

async function bootstrap() {
  let authMode: AuthMode = "otp"; // safe default — OTP always works without domain/OAuth

  try {
    const res = await fetch("/api/auth/config");
    const data = await res.json() as { success: boolean; authMode?: AuthMode; googleClientId?: string };
    authMode = data.authMode ?? "otp";
  } catch {
    // non-fatal — falls back to OTP-only mode
  }

  // Populate the shared auth config module read by Auth.tsx and other components
  setAuthConfig(authMode, "");

  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
