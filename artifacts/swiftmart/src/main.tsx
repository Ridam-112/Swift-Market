import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./index.css";

async function bootstrap() {
  let googleClientId = "placeholder";
  try {
    const res = await fetch("/api/auth/config");
    const data = await res.json() as { success: boolean; googleClientId?: string };
    googleClientId = data.googleClientId || "placeholder";
  } catch {
    // non-fatal — Google login will be unavailable
  }

  createRoot(document.getElementById("root")!).render(
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  );
}

void bootstrap();
