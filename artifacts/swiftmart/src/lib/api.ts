declare global {
  interface Window {
    Capacitor?: { isNative?: boolean };
  }
}

// Detect Capacitor native runtime via both reliable signals:
// 1. window.Capacitor.isNative — injected by the Capacitor bridge
// 2. window.location.protocol === "capacitor:" — the WebView origin protocol
const isCapacitorNative =
  typeof window !== "undefined" &&
  (window.Capacitor?.isNative === true ||
    window.location.protocol === "capacitor:");

// Native → use VITE_API_URL if explicitly set, otherwise hardcode production URL.
//          Never use a relative path: relative URLs resolve to capacitor://localhost/api
//          and get intercepted by the Capacitor HTTP bridge instead of reaching the server.
// Browser → always use relative /api so the Vite dev-server proxy handles it.
const BASE: string = isCapacitorNative
  ? ((import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "https://swiftmart.space") + "/api"
  : "/api";

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
    const res = await fetch(`${BASE}/auth/refresh`, {
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

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

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
};
