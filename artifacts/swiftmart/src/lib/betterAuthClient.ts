import { createAuthClient } from "better-auth/client";

const baseURL = import.meta.env.VITE_NEON_AUTH_URL as string;

if (!baseURL && import.meta.env.DEV) {
  console.warn("[BetterAuth] VITE_NEON_AUTH_URL is not set. Auth will not work.");
}

export const authClient = createAuthClient({ baseURL });
