import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { setTokens } from "@/lib/api";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  status: string;
  vendorStatus?: string;
  pincode?: string;
  addresses?: unknown[];
  profilePhoto?: string | null;
}

import { SEO } from "@/components/SEO";

export default function GoogleCallback() {
  const [, setLocation] = useLocation();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params   = new URLSearchParams(window.location.search);
    const code     = params.get("code");
    const state    = params.get("state");
    const errParam = params.get("error");

    if (errParam) {
      setError(
        errParam === "access_denied"
          ? "You cancelled the Google sign-in. Please try again."
          : `Google returned an error: ${errParam}`,
      );
      return;
    }

    if (!code || !state) {
      setError("Missing parameters from Google. Please try signing in again.");
      return;
    }

    (async () => {
      try {
        console.log("[GoogleCallback] exchanging code with backend…");

        const res = await fetch("/api/auth/google/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, state }),
        });

        const data = await res.json() as {
          success: boolean;
          message?: string;
          accessToken?: string;
          refreshToken?: string;
          needsProfile?: boolean;
          isNewUser?: boolean;
          user?: ApiUser;
        };

        if (!res.ok || !data.success) {
          setError(data.message ?? "Google sign-in failed. Please try again.");
          return;
        }

        if (!data.accessToken || !data.refreshToken || !data.user) {
          setError("Unexpected response from server. Please try again.");
          return;
        }

        console.log("[GoogleCallback] exchange succeeded — saving tokens…");

        // 1. Persist tokens to localStorage so api.ts picks them up.
        setTokens(data.accessToken, data.refreshToken);
        localStorage.setItem("sm_user", JSON.stringify(data.user));
        localStorage.setItem("sm_role", data.user.role);

        console.log("[GoogleCallback] tokens saved — calling refreshUser()…");

        // 2. Hydrate AuthContext React state BEFORE navigating.
        //    Without this, AuthContext.user is still null when we setLocation(),
        //    and AuthGuard immediately bounces us back to /auth.
        await refreshUser();

        console.log("[GoogleCallback] refreshUser() done — determining redirect…");

        const needsProfile =
          data.needsProfile ||
          !data.user.phone ||
          data.user.phone.startsWith("g_");

        const target = needsProfile ? "/complete-profile" : "/";
        console.log("[GoogleCallback] redirecting to:", target);

        setLocation(target);
      } catch (err) {
        console.error("[GoogleCallback] error:", err);
        setError(err instanceof Error ? err.message : "Network error. Please try again.");
      }
    })();
  // refreshUser is stable (defined outside component state) — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm text-center space-y-5">
          <XCircle className="w-14 h-14 text-destructive mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-semibold text-foreground">Sign-in failed</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button
            className="w-full h-12 rounded-xl text-base font-semibold"
            onClick={() => setLocation("/auth")}
          >
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background gap-4">
      <SEO noIndex />
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Completing Google sign-in…</p>
    </div>
  );
}
