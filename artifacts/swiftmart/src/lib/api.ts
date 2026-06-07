const BASE = "/api";

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

async function refreshTokens(): Promise<string | null> {
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

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const { access } = getTokens();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers ?? {}) as Record<string, string>),
  };
  if (access) headers["Authorization"] = `Bearer ${access}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const newToken = await refreshTokens();
    if (newToken) return request<T>(path, options, false);
    clearTokens();
    window.location.href = "/auth";
    throw new Error("Session expired");
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
};
