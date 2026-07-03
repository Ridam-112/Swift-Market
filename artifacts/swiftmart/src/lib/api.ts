declare global {
  interface Window {
    Capacitor?: { isNative?: boolean };
  }
}

// Detect Capacitor native runtime via both reliable signals:
// 1. window.Capacitor.isNative — injected by the Capacitor bridge (most reliable)
// 2. window.location.protocol === "capacitor:" — the WebView origin protocol
const isCapacitorNative =
  typeof window !== "undefined" &&
  (window.Capacitor?.isNative === true ||
    window.location.protocol === "capacitor:");

// VITE_API_URL must be the domain only — e.g. "https://swiftmart.space" (NO trailing /api).
// api.ts appends "/api" itself. This avoids double /api bugs.
//
// Native Android → VITE_API_URL domain + "/api", or fallback hardcoded production URL.
// Browser dev    → relative "/api" (proxied by Vite → localhost:3001).
// Browser prod   → relative "/api" (proxied by reverse proxy at the same origin).
const BASE: string = isCapacitorNative
  ? ((import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "https://swiftmart.space") + "/api"
  : "/api";

// ── Startup diagnostic log ──────────────────────────────────────────────────
// Visible in Android logcat (filter tag "Capacitor/Console") and browser devtools.
console.log(
  "[SwiftMart API] Initialized",
  JSON.stringify({
    BASE,
    isCapacitorNative,
    protocol: typeof window !== "undefined" ? window.location.protocol : "N/A",
    VITE_API_URL: (import.meta.env.VITE_API_URL as string | undefined) ?? "(not set)",
  })
);

function getTokens() {
  return {
    access: localStorage.getItem("sm_at"),
    refresh: localStorage.getItem("sm_rt"),
  };
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("sm_at", access);
  localStorage.setItem("sm_rt", refresh);
}

export function clearTokens() {
  localStorage.removeItem("sm_at");
  localStorage.removeItem("sm_rt");
  localStorage.removeItem("sm_user");
  localStorage.removeItem("sm_role");
}

// Singleton promise to prevent concurrent refresh races
let refreshInFlight: Promise<string | null> | null = null;

async function refreshTokens(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = doRefreshTokens().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

async function doRefreshTokens(): Promise<string | null> {
  const { refresh } = getTokens();
  if (!refresh) return null;
  try {
    const url = `${BASE}/auth/refresh`;
    console.log("[API] POST", url);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json() as { accessToken: string; refreshToken: string };
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

function redirectToAuth() {
  if (isCapacitorNative) {
    window.location.replace("index.html");
  } else {
    window.location.href = "/auth";
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const { access } = getTokens();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers ?? {}) as Record<string, string>),
  };
  if (access) headers["Authorization"] = `Bearer ${access}`;

  const fullUrl = `${BASE}${path}`;
  console.log("[API]", options.method ?? "GET", fullUrl);

  const res = await fetch(fullUrl, { ...options, headers });

  // Skip token-refresh for auth endpoints that return 401 to mean "wrong credentials"
  // (not for protected routes like /auth/me that return 401 for "session expired")
  const isLoginEndpoint =
    path.startsWith("/auth/") && path !== "/auth/me" && path !== "/auth/logout";
  if (res.status === 401 && retry && !isLoginEndpoint) {
    const newToken = await refreshTokens();
    if (newToken) return request<T>(path, options, false);
    clearTokens();
    redirectToAuth();
    throw new Error("Session expired");
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    // Clone the response to read the body for diagnostics without consuming it
    const bodyText = await res.clone().text().catch(() => "(unreadable)");
    console.error(
      `[API] Non-JSON response — status=${res.status} content-type="${contentType}" url="${fullUrl}"`,
      "\nFirst 300 chars of body:", bodyText.substring(0, 300)
    );
    throw new Error(`Server error (${res.status}) — unexpected response format`);
  }
  const data = (await res.json()) as T & { message?: string };
  if (!res.ok) throw new Error((data as { message?: string }).message ?? "Request failed");
  return data;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { cache: "no-store" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  getTokens,
  setTokens,
  clearTokens,
  BASE,
  isCapacitorNative,
};
