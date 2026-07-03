import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import HandwritingBackground from "@/components/HandwritingBackground";
import { setAuthConfig, showGoogleLogin } from "@/lib/authConfig";
import { api, setTokens } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Eye, EyeOff, Mail, Lock, User, CheckCircle2, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Step machine ─────────────────────────────────────────────────────────────
// email          → enter email → check if account exists
// signin         → existing user: enter password
// signup         → new user: enter name + password
// forgot         → enter email to receive reset link
// forgot-sent    → success: email sent
// reset          → enter new password (token from URL)
// reset-done     → success: password changed
// google-loading → processing Google OAuth callback
type Step =
  | "email"
  | "signin"
  | "signup"
  | "forgot"
  | "forgot-sent"
  | "reset"
  | "reset-done"
  | "google-loading";

const slide = {
  initial: { x: 24, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.22, ease: "easeOut" as const } },
  exit:    { x: -24, opacity: 0, transition: { duration: 0.18, ease: "easeIn" as const } },
};

function GoogleButton({
  onClick, loading, configFetching,
}: { onClick: () => void; loading: boolean; configFetching?: boolean }) {
  if (loading) {
    return (
      <div className="w-full h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center gap-3 text-gray-700 font-medium text-sm">
        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
        Signing in with Google…
      </div>
    );
  }
  const GoogleLogo = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd">
        <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </g>
    </svg>
  );
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={configFetching}
      className="w-full flex items-center gap-3 bg-white text-gray-800 font-medium text-sm rounded-xl px-4 h-12 border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {configFetching
        ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        : <GoogleLogo />}
      Continue with Google
    </button>
  );
}

function PasswordInput({
  id, value, onChange, placeholder, autoFocus,
}: {
  id: string; value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="h-12 rounded-xl text-base pr-12"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  );
}

import { SEO } from "@/components/SEO";

export default function Auth() {
  const { user, isLoading: authLoading, signInWithEmail, signUpWithEmail, forgotPassword, resetPassword, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [name, setName]   = useState("");
  const [password, setPassword]       = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [configFetching, setConfigFetching] = useState(true);

  // Detect Capacitor native shell — matches the same logic used in api.ts.
  // Must check BOTH signals because window.location.protocol is "https:" on some Capacitor builds
  // while window.Capacitor.isNative is always injected by the bridge.
  const isCapacitorShell = api.isCapacitorNative;

  // ─── Bootstrap auth config ────────────────────────────────────────────────────
  // Use api.BASE so we always hit the correct absolute URL on Android and the
  // Vite-proxied relative URL in the browser — no manual URL construction needed.
  useEffect(() => {
    setConfigFetching(true);
    console.log("[Auth] Fetching config from", `${api.BASE}/auth/config`);
    fetch(`${api.BASE}/auth/config`)
      .then(r => {
        const ct = r.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          return r.text().then(t => {
            console.error("[Auth] Config fetch got non-JSON:", r.status, t.substring(0, 200));
            throw new Error("non-JSON config response");
          });
        }
        return r.json();
      })
      .then((d: { authMode?: string; googleClientId?: string }) => {
        console.log("[Auth] Config loaded:", JSON.stringify(d));
        setAuthConfig((d.authMode ?? "both") as Parameters<typeof setAuthConfig>[0], d.googleClientId ?? "");
      })
      .catch((err) => {
        console.warn("[Auth] Config fetch failed — defaulting to 'both' mode:", err);
        // Default to showing Google login so the button is always visible.
        // If the backend is reachable, the real config will override this.
        setAuthConfig("both", "");
      })
      .finally(() => setConfigFetching(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect reset-password token in URL query params
  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");
    if (token) {
      setResetToken(token);
      setStep("reset");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) setLocation("/");
  }, [user, authLoading, setLocation]);

  // ─── Email step ─────────────────────────────────────────────────────────────
  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.toLowerCase().trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      // IMPORTANT: use api.post() — never raw fetch() with a relative URL.
      // On Android/Capacitor, relative URLs resolve to capacitor://localhost/api/...
      // which gets intercepted by the bridge and returns an HTML page (status 200, non-JSON).
      console.log("[Auth] Checking email via", `${api.BASE}/auth/check-email`);
      const data = await api.post<{ exists?: boolean }>("/auth/check-email", { email: trimmed });
      setStep(data.exists ? "signin" : "signup");
    } catch {
      // Network error — just go to signin (the backend will give the right error)
      setStep("signin");
    } finally {
      setLoading(false);
    }
  };

  // ─── Sign in ────────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { toast.error("Enter your password"); return; }
    setLoading(true);
    try {
      const result = await signInWithEmail(email.toLowerCase().trim(), password);
      if (result.needsProfile) {
        setLocation("/complete-profile");
      } else {
        setLocation("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Sign up ────────────────────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Enter your full name"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const result = await signUpWithEmail(name.trim(), email.toLowerCase().trim(), password);
      if (result.needsProfile) {
        setLocation("/complete-profile");
      } else {
        setLocation("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-up failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Google sign-in ───────────────────────────────────────────────────────────
  // Capacitor (Android): uses native GoogleSignIn SDK via @codetrix-studio/capacitor-google-auth.
  //   Returns an ID token → exchanged with POST /api/auth/google → backend mints JWT.
  // Web: server-side OAuth2 redirect to /api/auth/google/redirect.
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      if (isCapacitorShell) {
        // ── Native Android Google Sign-In ──────────────────────────────────────
        let nativeGoogleSignIn: () => Promise<string>;
        try {
          const mod = await import("@/lib/googleNativeAuth");
          nativeGoogleSignIn = mod.nativeGoogleSignIn;
        } catch (importErr) {
          console.error("[Auth] Failed to load native Google auth module:", importErr);
          throw new Error(
            "Native Google Sign-In plugin is not installed. " +
            "Run: pnpm add @codetrix-studio/capacitor-google-auth && npx cap sync android"
          );
        }

        console.log("[Auth] Starting native Google Sign-In — BASE:", api.BASE);
        const idToken = await nativeGoogleSignIn();
        console.log("[Auth] Got ID token — exchanging with backend at", `${api.BASE}/auth/google`);

        // Use api.BASE — always correct absolute URL, never relative capacitor:// path
        const res = await fetch(`${api.BASE}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: idToken }),
        });

        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) {
          const text = await res.text().catch(() => "(unreadable)");
          console.error("[Auth] Non-JSON from /auth/google — status:", res.status, "body:", text.substring(0, 300));
          throw new Error(
            `Server error (${res.status}). Ensure:\n` +
            "1. Android OAuth client with correct SHA-1 fingerprint is in Google Cloud Console.\n" +
            "2. Backend is reachable at " + api.BASE
          );
        }

        type GoogleResp = {
          success: boolean; message?: string;
          accessToken?: string; refreshToken?: string;
          needsProfile?: boolean; isNewUser?: boolean;
          user?: { id: string; name: string; phone: string; email?: string; role: string; status: string };
        };
        const data = await res.json() as GoogleResp;
        console.log("[Auth] Backend resp:", JSON.stringify({ success: data.success, isNewUser: data.isNewUser, needsProfile: data.needsProfile }));

        if (!data.success || !data.accessToken || !data.refreshToken || !data.user) {
          throw new Error(data.message ?? "Google Sign-In failed — server returned no tokens.");
        }

        setTokens(data.accessToken, data.refreshToken);
        localStorage.setItem("sm_user", JSON.stringify(data.user));
        localStorage.setItem("sm_role", data.user.role);
        await refreshUser();

        const goTo = (data.needsProfile || !data.user.phone || data.user.phone.startsWith("g_"))
          ? "/complete-profile"
          : "/";
        console.log("[Auth] Native Google login success → navigating to", goTo);
        setLocation(goTo);
      } else {
        // ── Web: server-side OAuth2 redirect ──────────────────────────────────
        // api.BASE is "/api" in browser → redirect goes to /api/auth/google/redirect ✓
        window.location.href = `${api.BASE}/auth/google/redirect`;
      }
    } catch (err) {
      console.error("[Auth] Google Sign-In error:", err);
      toast.error(err instanceof Error ? err.message : "Google Sign-In failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  // ─── Forgot password ─────────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.toLowerCase().trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(trimmed);
      setStep("forgot-sent");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reset email";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Reset password ──────────────────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await resetPassword(newPassword, resetToken);
      setStep("reset-done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset password";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-20 h-20 bg-primary mx-auto rounded-3xl neu-card flex items-center justify-center text-primary-foreground font-bold text-4xl animate-pulse">
          S
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#080808] flex flex-col overflow-hidden">
      <SEO noIndex />
      <HandwritingBackground />

      {/* ── Debug panel — visible on Android/Capacitor to diagnose API issues ── */}
      {(isCapacitorShell || import.meta.env.DEV) && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-black/90 border-b border-green-900 text-green-400 font-mono px-3 py-1.5 space-y-0.5 text-[9px] leading-tight">
          <div className="flex gap-3 flex-wrap">
            <span><span className="text-green-600">isNative:</span> <span className={isCapacitorShell ? "text-green-300 font-bold" : "text-red-400"}>{String(isCapacitorShell)}</span></span>
            <span><span className="text-green-600">protocol:</span> {typeof window !== "undefined" ? window.location.protocol : "?"}</span>
            <span><span className="text-green-600">BASE:</span> <span className="text-yellow-300">{api.BASE}</span></span>
          </div>
        </div>
      )}

      {/* ── Top-left branding ── */}
      <motion.div
        className="relative z-10 pt-14 px-8 flex items-center gap-3"
        initial={{ x: -32, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      >
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg shrink-0">
          S
        </div>
        <div>
          <p className="text-white/45 text-[11px] font-medium uppercase tracking-widest leading-none mb-0.5">Welcome to</p>
          <h1 className="text-white text-xl font-bold leading-none">SwiftMart</h1>
        </div>
      </motion.div>

      {/* ── Spacer lets the animation breathe ── */}
      <div className="flex-1" />

      {/* ── Bottom login form — no card ── */}
      <div className="relative z-10 w-full max-w-sm mx-auto px-8 pb-6">
        <AnimatePresence mode="wait">

            {/* ── EMAIL ── */}
            {step === "email" && (
              <motion.form key="email" {...slide} onSubmit={handleEmailContinue} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    autoComplete="email"
                    className="h-12 rounded-xl text-base"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full h-12 rounded-xl text-base font-semibold"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
                </Button>

                {showGoogleLogin() && (
                  <>
                    <div className={cn("relative my-2")}>
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-transparent px-3 text-muted-foreground">or</span>
                      </div>
                    </div>
                    <GoogleButton onClick={handleGoogleSignIn} loading={googleLoading} configFetching={configFetching} />
                  </>
                )}
              </motion.form>
            )}

            {/* ── SIGN IN ── */}
            {step === "signin" && (
              <motion.form key="signin" {...slide} onSubmit={handleSignIn} className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setStep("email"); setPassword(""); }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {email}
                </button>

                <p className="text-lg font-semibold text-foreground">Welcome back!</p>
                <p className="text-sm text-muted-foreground -mt-2">Enter your password to continue</p>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Password
                  </Label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Your password"
                    autoFocus
                  />
                </div>

                <button
                  type="button"
                  onClick={() => { setStep("forgot"); }}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>

                <Button
                  type="submit"
                  disabled={loading || !password}
                  className="w-full h-12 rounded-xl text-base font-semibold"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  New to SwiftMart?{" "}
                  <button
                    type="button"
                    onClick={() => { setStep("signup"); setPassword(""); }}
                    className="text-primary hover:underline font-medium"
                  >
                    Create account
                  </button>
                </p>
              </motion.form>
            )}

            {/* ── SIGN UP ── */}
            {step === "signup" && (
              <motion.form key="signup" {...slide} onSubmit={handleSignUp} className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setStep("email"); setPassword(""); setName(""); }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {email}
                </button>

                <p className="text-lg font-semibold text-foreground">Create your account</p>
                <p className="text-sm text-muted-foreground -mt-2">Join SwiftMart — it's free</p>

                <div className="space-y-2">
                  <Label htmlFor="fullname" className="flex items-center gap-2 text-sm font-medium">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Full name
                  </Label>
                  <Input
                    id="fullname"
                    type="text"
                    placeholder="Rahul Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    autoComplete="name"
                    className="h-12 rounded-xl text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password" className="flex items-center gap-2 text-sm font-medium">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Password
                  </Label>
                  <PasswordInput
                    id="new-password"
                    value={password}
                    onChange={setPassword}
                    placeholder="At least 8 characters"
                  />
                  <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !name.trim() || password.length < 8}
                  className="w-full h-12 rounded-xl text-base font-semibold"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create account"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setStep("signin"); setPassword(""); setName(""); }}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </motion.form>
            )}

            {/* ── FORGOT PASSWORD ── */}
            {step === "forgot" && (
              <motion.form key="forgot" {...slide} onSubmit={handleForgotPassword} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setStep("signin")}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </button>

                <p className="text-lg font-semibold text-foreground">Reset your password</p>
                <p className="text-sm text-muted-foreground -mt-2">
                  We'll send a reset link to your email
                </p>

                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="flex items-center gap-2 text-sm font-medium">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email address
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    className="h-12 rounded-xl text-base"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full h-12 rounded-xl text-base font-semibold"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send reset link"}
                </Button>
              </motion.form>
            )}

            {/* ── FORGOT SENT ── */}
            {step === "forgot-sent" && (
              <motion.div key="forgot-sent" {...slide} className="text-center space-y-4">
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
                <p className="text-lg font-semibold text-foreground">Check your inbox</p>
                <p className="text-sm text-muted-foreground">
                  We sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
                  Click the link in the email to reset your password.
                </p>
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl"
                  onClick={() => setStep("signin")}
                >
                  Back to sign in
                </Button>
              </motion.div>
            )}

            {/* ── RESET PASSWORD ── */}
            {step === "reset" && (
              <motion.form key="reset" {...slide} onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-lg font-semibold text-foreground">Choose a new password</p>
                <p className="text-sm text-muted-foreground -mt-2">
                  Enter your new password below
                </p>

                <div className="space-y-2">
                  <Label htmlFor="reset-password" className="flex items-center gap-2 text-sm font-medium">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    New password
                  </Label>
                  <PasswordInput
                    id="reset-password"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="At least 8 characters"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || newPassword.length < 8}
                  className="w-full h-12 rounded-xl text-base font-semibold"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset password"}
                </Button>
              </motion.form>
            )}

            {/* ── RESET DONE ── */}
            {step === "reset-done" && (
              <motion.div key="reset-done" {...slide} className="text-center space-y-4">
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
                <p className="text-lg font-semibold text-foreground">Password updated!</p>
                <p className="text-sm text-muted-foreground">
                  You can now sign in with your new password.
                </p>
                <Button
                  className="w-full h-12 rounded-xl text-base font-semibold"
                  onClick={() => { setStep("signin"); setPassword(""); setNewPassword(""); }}
                >
                  Sign in
                </Button>
              </motion.div>
            )}

        </AnimatePresence>

        <p className="text-center text-xs text-white/30 mt-5">
          By continuing, you agree to our{" "}
          <a href="/terms" className="underline hover:text-white/60">Terms</a> and{" "}
          <a href="/privacy" className="underline hover:text-white/60">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
