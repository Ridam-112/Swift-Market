import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Mail, Lock, User, ShoppingBag, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { setAuthConfig } from "@/lib/authConfig";

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd">
        <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </g>
    </svg>
  );
}

function TruecallerLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none">
      <circle cx="20" cy="20" r="20" fill="#009BBD"/>
      <text x="20" y="27" textAnchor="middle" fontSize="22" fontWeight="bold" fill="white" fontFamily="Arial, sans-serif">T</text>
    </svg>
  );
}

export function AuthModal() {
  const {
    isLoginModalOpen,
    loginModalMessage,
    closeLoginModal,
    signInWithEmail,
    signUpWithEmail,
    refreshUser,
  } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [truecallerAppKey, setTruecallerAppKey] = useState("");

  const isAndroidPhone = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

  useEffect(() => {
    if (!isLoginModalOpen) return;
    fetch(`${api.BASE}/auth/config`)
      .then(r => r.json())
      .then((d: { authMode?: string; googleClientId?: string; truecallerAppKey?: string }) => {
        setAuthConfig((d.authMode ?? "both") as any, d.googleClientId ?? "");
        if (d.truecallerAppKey) setTruecallerAppKey(d.truecallerAppKey);
      })
      .catch(() => {});
  }, [isLoginModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!password || (mode === "signup" && password.length < 8)) {
      toast.error(mode === "signup" ? "Password must be at least 8 characters" : "Please enter your password");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(cleanEmail, password);
        toast.success("Logged in successfully! Welcome back.");
      } else {
        await signUpWithEmail(name.trim(), cleanEmail, password);
        toast.success("Account created successfully! Welcome to SwiftMart.");
      }
      await refreshUser();
      closeLoginModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    if (api.isCapacitorNative) {
      try {
        const mod = await import("@/lib/googleNativeAuth");
        const idToken = await mod.nativeGoogleSignIn();
        const res = await fetch(`${api.BASE}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: idToken }),
        });
        const data = await res.json() as any;
        if (data.success && data.accessToken && data.refreshToken) {
          setTokens(data.accessToken, data.refreshToken);
          await refreshUser();
          closeLoginModal();
          toast.success("Signed in with Google!");
        } else {
          toast.error(data.message || "Google sign-in failed");
        }
      } catch (e: any) {
        toast.error(e.message || "Google sign-in failed");
      } finally {
        setGoogleLoading(false);
      }
    } else {
      const returnPath = window.location.pathname + window.location.search;
      if (returnPath && returnPath !== "/auth") {
        sessionStorage.setItem("auth_next", returnPath);
      }
      window.location.href = `${api.BASE}/auth/google/redirect`;
    }
  };

  const handleTruecallerSignIn = () => {
    if (!truecallerAppKey) {
      toast.error("Truecaller login is not configured on this server");
      return;
    }
    const requestId = "tc_" + Math.random().toString(36).substring(2, 10);
    const callbackUrl = window.location.origin + "/auth";
    const deeplink = `truecallersdk://truesdk/web_verify?requestNonce=${requestId}&partnerKey=${encodeURIComponent(truecallerAppKey)}&partnerName=SwiftMart&lang=en&title=Login%20to%20SwiftMart&callbackUrl=${encodeURIComponent(callbackUrl)}`;
    window.location.href = deeplink;
  };

  return (
    <Dialog open={isLoginModalOpen} onOpenChange={(open) => !open && closeLoginModal()}>
      <DialogContent className="sm:max-w-md p-6 rounded-3xl bg-background border border-border shadow-2xl overflow-hidden">
        <DialogHeader className="text-center sm:text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-black text-foreground">
            {mode === "signin" ? "Login to SwiftMart" : "Create SwiftMart Account"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-medium">
            {loginModalMessage || "Please log in to add items to your cart & place orders"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Quick 1-Click Social Logins */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-card text-foreground font-bold text-sm rounded-2xl px-4 h-11 border border-border/80 hover:bg-muted/50 active:scale-[0.98] transition-all shadow-sm cursor-pointer disabled:opacity-60"
            >
              {googleLoading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <GoogleLogo />}
              <span>Continue with Google</span>
            </button>

            {isAndroidPhone && truecallerAppKey && (
              <button
                type="button"
                onClick={handleTruecallerSignIn}
                className="w-full flex items-center justify-center gap-3 bg-[#009BBD] text-white font-bold text-sm rounded-2xl px-4 h-11 hover:bg-[#0089a8] active:scale-[0.98] transition-all shadow-sm cursor-pointer"
              >
                <TruecallerLogo />
                <span>Continue with Truecaller</span>
              </button>
            )}
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-border w-full" />
            <span className="bg-background px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider absolute">
              or email
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Full Name</Label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 h-10 rounded-xl text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Email Address</Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-10 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "signup" ? "At least 8 characters" : "Enter password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10 h-10 rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-2xl font-black text-sm bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all shadow-md mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "signin" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          {/* Toggle between Sign In and Sign Up */}
          <div className="text-center pt-1">
            {mode === "signin" ? (
              <p className="text-xs text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-bold text-primary hover:underline cursor-pointer"
                >
                  Sign Up
                </button>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-bold text-primary hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
