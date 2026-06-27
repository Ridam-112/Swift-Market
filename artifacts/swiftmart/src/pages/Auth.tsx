import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { openGoogleSigninWindow } from "@/lib/googleGIS";
import { showGoogleLogin, getGoogleClientId } from "@/lib/authConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { isServicePincode, getServiceAreaName } from "@/lib/serviceArea";

// ─── Step machine ─────────────────────────────────────────────────────────────
// phone        → initial: enter mobile number, check account status
// password     → existing user with password: enter password to login
// create-pwd   → existing user WITHOUT password (OTP migration): create new password
// signup       → new user: full name + password
// forgot       → enter phone to receive reset token
// reset        → enter token + new password
// onboarding   → new user: collect name + first address
// address      → returning user with no address: collect address
type Step =
  | 'phone'
  | 'password'
  | 'create-pwd'
  | 'signup'
  | 'forgot'
  | 'reset'
  | 'onboarding'
  | 'address';

const slide = {
  initial: { x: 24, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.22, ease: "easeOut" as const } },
  exit: { x: -24, opacity: 0, transition: { duration: 0.18, ease: "easeIn" as const } },
};

// ─── Re-usable sub-components ─────────────────────────────────────────────────

function GoogleButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return loading ? (
    <div className="w-full h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center gap-3 text-gray-700 font-medium text-sm">
      <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
      Signing in with Google…
    </div>
  ) : (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white text-gray-800 font-medium text-sm rounded-xl px-4 h-12 border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fillRule="evenodd">
          <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </g>
      </svg>
      <span className="flex-1 text-center">Continue with Google</span>
    </button>
  );
}

function PasswordInput({ value, onChange, placeholder, id, className, autoComplete }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  id?: string; className?: string; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "Enter password"}
        className={cn("pr-11", className)}
        autoComplete={autoComplete ?? "current-password"}
      />
      <button type="button" onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function PhoneDisplay({ phone, onEdit }: { phone: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-2.5">
      <span className="text-sm text-muted-foreground">Mobile</span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">+91 {phone}</span>
        <button type="button" onClick={onEdit} className="text-xs text-primary hover:underline">change</button>
      </div>
    </div>
  );
}

function PasswordStrength({ password, confirm }: { password: string; confirm: string }) {
  if (!confirm) return null;
  return password === confirm && password.length >= 8 ? (
    <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Passwords match</p>
  ) : (
    <p className="text-xs text-destructive flex items-center gap-1"><XCircle className="w-3 h-3" />
      {password !== confirm ? "Passwords do not match" : "At least 8 characters required"}
    </p>
  );
}

const inputCls = "bg-background neu-inset border-none h-12 rounded-xl";

// ─── Main component ───────────────────────────────────────────────────────────

export default function Auth() {
  const [, setLocation] = useLocation();
  const {
    user, checkPhone, loginWithPassword, setPasswordForOtpUser,
    signup, forgotPassword, resetPassword, loginWithGoogle, completeOnboarding, addAddress, updatePincode,
  } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState("");

  // Password login
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Create / confirm password (shared for create-pwd and signup)
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  // Signup extras
  const [signupName, setSignupName] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Create password (OTP user migration)
  const [isCreatingPwd, setIsCreatingPwd] = useState(false);

  // Phone check
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  // Forgot / reset
  const [resetToken, setResetToken] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetPhone, setResetPhone] = useState("");

  // Google
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Onboarding / Address
  const [name, setName] = useState("");
  const [addressLabel, setAddressLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [addressLine1, setAddressLine1] = useState("");
  const [addressArea, setAddressArea] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const pincodeValid = pincode.length === 6 && isServicePincode(pincode);
  const pincodeOutOfArea = pincode.length === 6 && !isServicePincode(pincode);
  const areaName = getServiceAreaName(pincode);

  // Redirect when already logged in
  useEffect(() => {
    if (!user) return;
    const needsOnboarding = !user.name || user.name === "User";
    if (needsOnboarding) {
      if (step === 'phone' || step === 'password' || step === 'create-pwd' || step === 'signup') {
        setStep('onboarding');
      }
      return;
    }
    if (step !== 'onboarding' && step !== 'address') setLocation("/");
  }, [user, step, setLocation]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const goToPhone = () => {
    setStep('phone');
    setPassword("");
    setNewPwd("");
    setConfirmPwd("");
  };

  const afterLogin = (result: { isNewUser?: boolean; user?: { addresses?: unknown[] } }) => {
    if (result.isNewUser || !result.user?.addresses?.length) {
      setStep(result.isNewUser ? 'onboarding' : 'address');
    } else {
      toast.success("Welcome back!");
      setLocation("/");
    }
  };

  // ─── Step 1: Phone check ────────────────────────────────────────────────────

  const handlePhoneCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setIsCheckingPhone(true);
    try {
      const { exists, hasPassword } = await checkPhone(phone);
      if (!exists) {
        // Phone not registered — take them to signup with phone pre-filled
        setSignupName("");
        setNewPwd("");
        setConfirmPwd("");
        setStep('signup');
      } else if (hasPassword) {
        // User has a password — show password login
        setPassword("");
        setStep('password');
      } else {
        // OTP user with no password — show create-password form
        setNewPwd("");
        setConfirmPwd("");
        setStep('create-pwd');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not check account. Please try again.");
    } finally {
      setIsCheckingPhone(false);
    }
  };

  // ─── Step 2a: Password login ─────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { toast.error("Enter your password"); return; }
    setIsLoggingIn(true);
    try {
      const result = await loginWithPassword(phone, password);
      afterLogin(result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Incorrect password. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ─── Step 2b: Create password (OTP user migration) ───────────────────────────

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPwd !== confirmPwd) { toast.error("Passwords do not match"); return; }
    setIsCreatingPwd(true);
    try {
      const result = await setPasswordForOtpUser(phone, newPwd);
      toast.success("Password created! You are now logged in.");
      afterLogin({ isNewUser: false, user: result.user as { addresses?: unknown[] } | undefined });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create password. Please try again.";
      // If password was already set (e.g. double-submit or retry after a crash), go straight to login
      if (/already set|use login|forgot password/i.test(msg)) {
        toast.info("Password already set. Please log in.");
        setPassword("");
        setNewPwd("");
        setConfirmPwd("");
        setStep('password');
      } else {
        toast.error(msg);
      }
    } finally {
      setIsCreatingPwd(false);
    }
  };

  // ─── Signup ──────────────────────────────────────────────────────────────────

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupName.trim().length < 2) { toast.error("Enter your full name"); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { toast.error("Enter a valid 10-digit mobile number"); return; }
    if (newPwd.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPwd !== confirmPwd) { toast.error("Passwords do not match"); return; }
    setIsSigningUp(true);
    try {
      const result = await signup(signupName.trim(), phone, newPwd);
      afterLogin(result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Signup failed. Please try again.");
    } finally {
      setIsSigningUp(false);
    }
  };

  // ─── Google ──────────────────────────────────────────────────────────────────

  const handleGoogleSignIn = async () => {
    const clientId = getGoogleClientId();
    if (!clientId || clientId === "placeholder") { toast.error("Google sign-in is not configured yet."); return; }
    setIsGoogleLoading(true);
    try {
      const idToken = await openGoogleSigninWindow(clientId);
      const result = await loginWithGoogle(idToken, "credential");
      afterLogin(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      if (/popup|blocked|window.*open/i.test(msg)) {
        toast.error("Popup blocked by your browser", { description: "Allow popups for this site in your browser settings, then try again.", duration: 7000 });
      } else {
        toast.error(msg);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // ─── Forgot / reset password ─────────────────────────────────────────────────

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(resetPhone)) { toast.error("Enter a valid 10-digit mobile number"); return; }
    setIsSendingReset(true);
    try {
      await forgotPassword(resetPhone);
      toast.success("6-digit code sent to your mobile number");
      setResetToken("");
      setNewPwd("");
      setConfirmPwd("");
      setStep('reset');
    } catch {
      toast.error("Request failed. Please try again.");
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim()) { toast.error("Enter the reset token"); return; }
    if (newPwd.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPwd !== confirmPwd) { toast.error("Passwords do not match"); return; }
    setIsResetting(true);
    try {
      const result = await resetPassword(resetPhone, resetToken.trim(), newPwd);
      toast.success("Password updated! You are now logged in.");
      afterLogin({ isNewUser: false, user: result.user as { addresses?: unknown[] } | undefined });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired token. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  // ─── Onboarding ──────────────────────────────────────────────────────────────

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2) { toast.error("Please enter your full name"); return; }
    if (/^user$/i.test(trimmedName)) { toast.error('Please enter your real name'); return; }
    if (!addressLine1.trim()) { toast.error("Please enter your address"); return; }
    if (!addressArea.trim()) { toast.error("Please enter your area/locality"); return; }
    if (!city.trim()) { toast.error("Please enter your city"); return; }
    if (pincodeOutOfArea) { toast.error("SwiftMart is not available in your area yet."); return; }
    if (!pincodeValid) { toast.error("Please enter a valid service-area pincode"); return; }
    setIsSavingProfile(true);
    try {
      await completeOnboarding(name, phone || "", {
        id: `a_${Date.now()}`, label: addressLabel, line1: addressLine1, line2: addressArea, city, pincode,
      });
      toast.success("Welcome to SwiftMart!");
      setLocation("/");
    } catch {
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-[100dvh] flex flex-col justify-center px-4 py-4 w-full max-w-md mx-auto relative bg-background overflow-x-hidden overflow-y-auto">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

      <div className="text-center mb-5 relative z-10">
        <img src="/logo.png" alt="SwiftMart" className="h-16 w-auto object-contain mx-auto mb-1" />
        <p className="text-muted-foreground text-sm">Delivery in 10 minutes</p>
      </div>

      <div className="relative z-10">
        <AnimatePresence mode="wait">

          {/* ── STEP: phone ──────────────────────────────────────────────── */}
          {step === 'phone' && (
            <motion.div key="phone" variants={slide} initial="initial" animate="animate" exit="exit"
              className="bg-card p-5 rounded-[2rem] neu-card space-y-4">

              {showGoogleLogin() && (
                <>
                  <GoogleButton onClick={() => void handleGoogleSignIn()} loading={isGoogleLoading} />
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </div>
                </>
              )}

              <form onSubmit={handlePhoneCheck} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number</Label>
                  <div className="flex gap-2">
                    <div className="bg-background neu-inset flex items-center justify-center px-4 rounded-xl font-medium text-muted-foreground border-none shrink-0">
                      +91
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      maxLength={10}
                      placeholder="Enter mobile number"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      className={cn(inputCls, "flex-1 text-lg font-medium")}
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isCheckingPhone || phone.length !== 10}
                  className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card"
                >
                  {isCheckingPhone
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <><span>Continue</span><ArrowRight className="w-5 h-5 ml-2" /></>}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                New here?{" "}
                <button type="button" onClick={() => { setNewPwd(""); setConfirmPwd(""); setSignupName(""); setStep('signup'); }}
                  className="text-primary font-medium hover:underline">
                  Create Account
                </button>
              </p>
            </motion.div>
          )}

          {/* ── STEP: password (existing user with password) ─────────────── */}
          {step === 'password' && (
            <motion.div key="password" variants={slide} initial="initial" animate="animate" exit="exit"
              className="bg-card p-5 rounded-[2rem] neu-card space-y-4">

              <div className="flex items-center gap-3">
                <button type="button" onClick={goToPhone} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold">Welcome back</h2>
                  <p className="text-muted-foreground text-sm">Enter your password to continue</p>
                </div>
              </div>

              <PhoneDisplay phone={phone} onEdit={goToPhone} />

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pwd">Password</Label>
                  <PasswordInput
                    id="pwd"
                    value={password}
                    onChange={setPassword}
                    placeholder="Enter your password"
                    className={inputCls}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setResetPhone(phone); setResetToken(""); setNewPwd(""); setConfirmPwd(""); setStep('forgot'); }}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                <Button type="submit" disabled={isLoggingIn || !password}
                  className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card">
                  {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
                </Button>
              </form>
            </motion.div>
          )}

          {/* ── STEP: create-pwd (OTP user migration — no token needed) ─────── */}
          {step === 'create-pwd' && (
            <motion.div key="create-pwd" variants={slide} initial="initial" animate="animate" exit="exit"
              className="bg-card p-5 rounded-[2rem] neu-card space-y-4">

              <div className="flex items-center gap-3">
                <button type="button" onClick={goToPhone} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold">Create Password</h2>
                  <p className="text-muted-foreground text-sm">Set a password for your account</p>
                </div>
              </div>

              <PhoneDisplay phone={phone} onEdit={goToPhone} />

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium">Setting up your account</p>
                <p className="text-xs mt-0.5">
                  Your account was previously set up with OTP login. Create a password below to continue — your orders, history, and data are all intact.
                </p>
              </div>

              <form onSubmit={handleCreatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <PasswordInput
                    value={newPwd}
                    onChange={setNewPwd}
                    placeholder="At least 8 characters"
                    className={inputCls}
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <PasswordInput
                    value={confirmPwd}
                    onChange={setConfirmPwd}
                    placeholder="Re-enter your password"
                    className={inputCls}
                    autoComplete="new-password"
                  />
                  <PasswordStrength password={newPwd} confirm={confirmPwd} />
                </div>

                <Button
                  type="submit"
                  disabled={isCreatingPwd || newPwd.length < 8 || newPwd !== confirmPwd}
                  className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card"
                >
                  {isCreatingPwd
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <><span>Create Password & Log In</span><ArrowRight className="w-5 h-5 ml-2" /></>}
                </Button>
              </form>
            </motion.div>
          )}

          {/* ── STEP: signup ─────────────────────────────────────────────── */}
          {step === 'signup' && (
            <motion.div key="signup" variants={slide} initial="initial" animate="animate" exit="exit"
              className="bg-card p-5 rounded-[2rem] neu-card space-y-4">

              <div className="flex items-center gap-3">
                <button type="button" onClick={goToPhone} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold">Create Account</h2>
                  <p className="text-muted-foreground text-sm">Join SwiftMart today</p>
                </div>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input placeholder="e.g. Rahul Kumar" value={signupName}
                    onChange={e => setSignupName(e.target.value)} className={inputCls} autoComplete="name" />
                </div>

                <div className="space-y-2">
                  <Label>Mobile Number</Label>
                  <div className="flex gap-2">
                    <div className="bg-background neu-inset flex items-center justify-center px-4 rounded-xl font-medium text-muted-foreground border-none shrink-0">+91</div>
                    <Input type="tel" maxLength={10} placeholder="10-digit number" value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      className={cn(inputCls, "flex-1")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Password</Label>
                  <PasswordInput value={newPwd} onChange={setNewPwd} placeholder="At least 8 characters"
                    className={inputCls} autoComplete="new-password" />
                </div>

                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <PasswordInput value={confirmPwd} onChange={setConfirmPwd} placeholder="Re-enter your password"
                    className={inputCls} autoComplete="new-password" />
                  <PasswordStrength password={newPwd} confirm={confirmPwd} />
                </div>

                <Button type="submit"
                  disabled={isSigningUp || signupName.trim().length < 2 || phone.length !== 10 || newPwd.length < 8 || newPwd !== confirmPwd}
                  className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card">
                  {isSigningUp
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <><span>Create Account</span><ArrowRight className="w-5 h-5 ml-2" /></>}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button type="button" onClick={goToPhone} className="text-primary font-medium hover:underline">Log In</button>
                </p>
              </form>
            </motion.div>
          )}

          {/* ── STEP: forgot password ─────────────────────────────────────── */}
          {step === 'forgot' && (
            <motion.div key="forgot" variants={slide} initial="initial" animate="animate" exit="exit"
              className="bg-card p-5 rounded-[2rem] neu-card space-y-4">

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setStep('password')} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold">Forgot Password</h2>
                  <p className="text-muted-foreground text-sm">We'll send a 6-digit code to your mobile</p>
                </div>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label>Mobile Number</Label>
                  <div className="flex gap-2">
                    <div className="bg-background neu-inset flex items-center justify-center px-4 rounded-xl font-medium text-muted-foreground border-none shrink-0">+91</div>
                    <Input type="tel" maxLength={10} placeholder="Registered number" value={resetPhone}
                      onChange={e => setResetPhone(e.target.value.replace(/\D/g, ''))}
                      className={cn(inputCls, "flex-1")} />
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-medium">SMS verification</p>
                  <p className="text-xs mt-0.5">A 6-digit code will be sent to your registered mobile number via SMS. Valid for 15 minutes.</p>
                </div>

                <Button type="submit" disabled={isSendingReset || resetPhone.length !== 10}
                  className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card">
                  {isSendingReset ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Code via SMS"}
                </Button>

                <button type="button" onClick={() => { setStep('reset'); }}
                  className="w-full text-center text-sm text-primary hover:underline">
                  Already have the code? Enter it here
                </button>
              </form>
            </motion.div>
          )}

          {/* ── STEP: reset password ──────────────────────────────────────── */}
          {step === 'reset' && (
            <motion.div key="reset" variants={slide} initial="initial" animate="animate" exit="exit"
              className="bg-card p-5 rounded-[2rem] neu-card space-y-4">

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setStep('forgot')} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold">Set New Password</h2>
                  <p className="text-muted-foreground text-sm">Enter the 6-digit code sent to your mobile</p>
                </div>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetPhone ? (
                  <PhoneDisplay phone={resetPhone} onEdit={() => setResetPhone("")} />
                ) : (
                  <div className="space-y-2">
                    <Label>Mobile Number</Label>
                    <div className="flex gap-2">
                      <div className="bg-background neu-inset flex items-center justify-center px-4 rounded-xl font-medium text-muted-foreground border-none shrink-0">+91</div>
                      <Input type="tel" maxLength={10} placeholder="Your mobile number" value={resetPhone}
                        onChange={e => setResetPhone(e.target.value.replace(/\D/g, ''))}
                        className={cn(inputCls, "flex-1")} />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>6-Digit SMS Code</Label>
                  <Input placeholder="Enter the code from your SMS" value={resetToken} inputMode="numeric"
                    maxLength={64} onChange={e => setResetToken(e.target.value.trim())} className={cn(inputCls, "font-mono text-lg tracking-widest")} />
                </div>

                <div className="space-y-2">
                  <Label>New Password</Label>
                  <PasswordInput value={newPwd} onChange={setNewPwd} placeholder="At least 8 characters"
                    className={inputCls} autoComplete="new-password" />
                </div>

                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <PasswordInput value={confirmPwd} onChange={setConfirmPwd} placeholder="Re-enter new password"
                    className={inputCls} autoComplete="new-password" />
                  <PasswordStrength password={newPwd} confirm={confirmPwd} />
                </div>

                <Button type="submit"
                  disabled={isResetting || !resetToken.trim() || newPwd.length < 8 || newPwd !== confirmPwd || resetPhone.length !== 10}
                  className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card">
                  {isResetting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Set Password & Log In"}
                </Button>
              </form>
            </motion.div>
          )}

          {/* ── STEP: onboarding ─────────────────────────────────────────── */}
          {step === 'onboarding' && (
            <motion.div key="onboarding" variants={slide} initial="initial" animate="animate" exit="exit"
              className="bg-card p-5 rounded-[2rem] neu-card space-y-4 max-h-[calc(100dvh-9rem)] overflow-y-auto">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Almost there!</h2>
                <p className="text-muted-foreground">Tell us about yourself and where to deliver.</p>
              </div>

              <form onSubmit={handleOnboardingSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label>Full Name <span className="text-destructive">*</span></Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Kumar"
                    className={inputCls} autoComplete="name" />
                  <p className="text-xs text-muted-foreground">Enter your real name — this will appear on your orders and receipts.</p>
                </div>

                <div className="pt-2 border-t border-border space-y-4">
                  <Label className="text-lg font-bold">First Delivery Address</Label>
                  <div className="flex gap-2">
                    {(['Home', 'Work', 'Other'] as const).map(lbl => (
                      <div key={lbl} onClick={() => setAddressLabel(lbl)}
                        className={cn("px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all",
                          addressLabel === lbl ? "bg-primary text-primary-foreground neu-card shadow-none" : "bg-background neu-inset text-muted-foreground")}>
                        {lbl}
                      </div>
                    ))}
                  </div>
                  <Input placeholder="House/Flat No., Building Name, Street" value={addressLine1}
                    onChange={e => setAddressLine1(e.target.value)} className={inputCls} />
                  <Input placeholder="Area / Locality / Mohalla" value={addressArea}
                    onChange={e => setAddressArea(e.target.value)} className={inputCls} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} className={inputCls} />
                    <div className="relative">
                      <Input placeholder="Pincode" value={pincode}
                        onChange={e => setPincode(e.target.value.replace(/\D/g, ''))} maxLength={6}
                        className={cn(inputCls, "pr-9")} />
                      {pincodeValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
                      {pincodeOutOfArea && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />}
                    </div>
                  </div>
                  {pincodeValid && (
                    <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> SwiftMart delivers to {areaName}!
                    </p>
                  )}
                  {pincodeOutOfArea && (
                    <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
                      <p className="font-semibold">Sorry, SwiftMart is not available in your area yet.</p>
                    </div>
                  )}
                </div>

                <Button type="submit"
                  disabled={isSavingProfile || pincodeOutOfArea || !name.trim() || !addressLine1.trim() || !addressArea.trim() || !city.trim() || !pincodeValid}
                  className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card mt-2">
                  {isSavingProfile
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <><span>Start Shopping</span><ArrowRight className="w-5 h-5 ml-2" /></>}
                </Button>
              </form>
            </motion.div>
          )}

          {/* ── STEP: address ─────────────────────────────────────────────── */}
          {step === 'address' && (
            <motion.div key="address" variants={slide} initial="initial" animate="animate" exit="exit"
              className="bg-card p-5 rounded-[2rem] neu-card space-y-4 max-h-[calc(100dvh-9rem)] overflow-y-auto">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Add Delivery Address</h2>
                <p className="text-muted-foreground">Where should we deliver your orders?</p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!addressLine1.trim()) { toast.error("Please enter your address"); return; }
                if (!addressArea.trim()) { toast.error("Please enter your area"); return; }
                if (!city.trim()) { toast.error("Please enter your city"); return; }
                if (pincodeOutOfArea) { toast.error("SwiftMart is not available in your area yet."); return; }
                if (!pincodeValid) { toast.error("Please enter a valid service-area pincode"); return; }
                setIsSavingAddress(true);
                try {
                  addAddress({ id: `a_${Date.now()}`, label: addressLabel, line1: addressLine1, line2: addressArea, city, pincode });
                  await updatePincode(pincode);
                  toast.success("Address saved! Welcome back!");
                  setLocation("/");
                } catch {
                  toast.error("Failed to save address. Please try again.");
                } finally {
                  setIsSavingAddress(false);
                }
              }} className="space-y-4">
                <div className="flex gap-2">
                  {(['Home', 'Work', 'Other'] as const).map(lbl => (
                    <div key={lbl} onClick={() => setAddressLabel(lbl)}
                      className={cn("px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all flex-1 text-center",
                        addressLabel === lbl ? "bg-primary text-primary-foreground neu-card shadow-none" : "bg-background neu-inset text-muted-foreground")}>
                      {lbl}
                    </div>
                  ))}
                </div>
                <Input placeholder="House/Flat No., Building Name, Street" value={addressLine1}
                  onChange={e => setAddressLine1(e.target.value)} className={inputCls} />
                <Input placeholder="Area / Locality / Mohalla" value={addressArea}
                  onChange={e => setAddressArea(e.target.value)} className={inputCls} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} className={inputCls} />
                  <div className="relative">
                    <Input placeholder="Pincode" value={pincode}
                      onChange={e => setPincode(e.target.value.replace(/\D/g, ''))} maxLength={6}
                      className={cn(inputCls, "pr-9")} />
                    {pincodeValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
                    {pincodeOutOfArea && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />}
                  </div>
                </div>
                {pincodeValid && (
                  <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> SwiftMart delivers to {areaName}!
                  </p>
                )}
                {pincodeOutOfArea && (
                  <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
                    <p className="font-semibold">Sorry, SwiftMart is not available in your area yet.</p>
                  </div>
                )}
                <Button type="submit"
                  disabled={isSavingAddress || pincodeOutOfArea || !addressLine1.trim() || !addressArea.trim() || !city.trim() || !pincodeValid}
                  className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card">
                  {isSavingAddress
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <><span>Save Address</span><ArrowRight className="w-5 h-5 ml-2" /></>}
                </Button>
              </form>
            </motion.div>
          )}

        </AnimatePresence>

        {(step === 'phone' || step === 'signup') && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            By continuing you agree to our{" "}
            <a href="/legal/terms" className="underline">Terms</a> &{" "}
            <a href="/legal/privacy" className="underline">Privacy Policy</a>
          </p>
        )}
      </div>
    </div>
  );
}
