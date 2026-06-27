import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { openGoogleSigninWindow } from "@/lib/googleGIS";
import { showGoogleLogin, showPasswordLogin, getGoogleClientId } from "@/lib/authConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, CheckCircle2, XCircle, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { isServicePincode, getServiceAreaName } from "@/lib/serviceArea";

type Step =
  | 'login'
  | 'signup'
  | 'forgot-password'
  | 'reset-password'
  | 'onboarding'
  | 'address';

const slideVariants = {
  initial: { x: 20, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.25, ease: "easeOut" as const } },
  exit: { x: -20, opacity: 0, transition: { duration: 0.2, ease: "easeIn" as const } },
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" fillRule="evenodd">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </g>
  </svg>
);

function PasswordInput({ value, onChange, placeholder, id, className }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
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
        autoComplete="current-password"
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function Auth() {
  const [, setLocation] = useLocation();
  const { user, loginWithPassword, signup, forgotPassword, resetPassword, loginWithGoogle, completeOnboarding, addAddress } = useAuth();

  const [step, setStep] = useState<Step>('login');

  // Shared fields
  const [phone, setPhone] = useState("");

  // Login
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Signup
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Forgot / Reset password
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetPhone, setResetPhone] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Google
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Onboarding / Address
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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

  useEffect(() => {
    if (!user) return;
    const needsOnboarding = !user.name || user.name === "User";
    if (needsOnboarding) {
      if (step === 'login' || step === 'signup') setStep('onboarding');
      return;
    }
    if (step !== 'onboarding' && step !== 'address') setLocation("/");
  }, [user, step, setLocation]);

  // ─── Login ──────────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    if (!loginPassword) {
      toast.error("Enter your password");
      return;
    }
    setIsLoggingIn(true);
    try {
      const result = await loginWithPassword(phone, loginPassword);
      if (result.needsPasswordSetup) {
        toast.info("Password not set. Please create a password using Forgot Password.");
        setResetPhone(phone);
        setStep('forgot-password');
        return;
      }
      if (result.isNewUser || !result.user?.addresses?.length) {
        setStep(result.isNewUser ? 'onboarding' : 'address');
      } else {
        toast.success("Welcome back!");
        setLocation("/");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ─── Signup ─────────────────────────────────────────────────────────────────

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupName.trim().length < 2) { toast.error("Enter your full name"); return; }
    if (!/^[6-9]\d{9}$/.test(signupPhone)) { toast.error("Enter a valid 10-digit mobile number"); return; }
    if (signupPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (signupPassword !== signupConfirm) { toast.error("Passwords do not match"); return; }

    setIsSigningUp(true);
    try {
      const result = await signup(signupName.trim(), signupPhone, signupPassword);
      if (!result.user?.addresses?.length) {
        setStep('onboarding');
      } else {
        toast.success("Account created!");
        setLocation("/");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Signup failed. Please try again.");
    } finally {
      setIsSigningUp(false);
    }
  };

  // ─── Forgot password ─────────────────────────────────────────────────────────

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(resetPhone)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setIsSendingReset(true);
    try {
      await forgotPassword(resetPhone);
      toast.success("Reset token generated. Check the server console for the token (dev mode).");
      setStep('reset-password');
    } catch {
      toast.error("Request failed. Please try again.");
    } finally {
      setIsSendingReset(false);
    }
  };

  // ─── Reset password ──────────────────────────────────────────────────────────

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim()) { toast.error("Enter the reset token"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmNewPassword) { toast.error("Passwords do not match"); return; }

    setIsResetting(true);
    try {
      const result = await resetPassword(resetPhone, resetToken.trim(), newPassword);
      toast.success("Password set! You are now logged in.");
      if (!result.user?.addresses?.length) {
        setStep('onboarding');
      } else {
        setLocation("/");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired token. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  // ─── Google ──────────────────────────────────────────────────────────────────

  const handleGoogleSignIn = async () => {
    const clientId = getGoogleClientId();
    if (!clientId || clientId === "placeholder") {
      toast.error("Google sign-in is not configured yet.");
      return;
    }
    setIsGoogleLoading(true);
    try {
      const idToken = await openGoogleSigninWindow(clientId);
      const result = await loginWithGoogle(idToken, "credential");
      if (result.isNewUser) {
        setStep("onboarding");
      } else if (!result.user?.addresses?.length) {
        setStep("address");
      } else {
        toast.success("Welcome back!");
        setLocation("/");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      const isPopupBlocked = /popup|blocked|window.*open/i.test(msg);
      if (isPopupBlocked) {
        toast.error("Popup blocked by your browser", {
          description: "Allow popups for this site in your browser settings, then try again.",
          duration: 7000,
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // ─── Onboarding ──────────────────────────────────────────────────────────────

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) { toast.error("Please enter your full name"); return; }
    if (/^user$/i.test(trimmedName)) { toast.error('Please enter your real name, not "User"'); return; }
    if (!addressLine1.trim()) { toast.error("Please enter your address"); return; }
    if (!addressArea.trim()) { toast.error("Please enter your area/locality"); return; }
    if (!city.trim()) { toast.error("Please enter your city"); return; }
    if (pincodeOutOfArea) { toast.error("SwiftMart is not available in your area yet."); return; }
    if (!pincodeValid) { toast.error("Please enter a valid service-area pincode"); return; }

    setIsSavingProfile(true);
    try {
      await completeOnboarding(name, phone || signupPhone, {
        id: `a_${Date.now()}`,
        label: addressLabel,
        line1: addressLine1,
        line2: addressArea,
        city,
        pincode,
      }, email);
      toast.success("Welcome to SwiftMart!");
      setLocation("/");
    } catch {
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  const inputClass = "bg-background neu-inset border-none h-12 rounded-xl";

  return (
    <div className="h-[100dvh] flex flex-col justify-center px-4 py-4 w-full max-w-md mx-auto relative bg-background overflow-x-hidden overflow-y-auto">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

      <div className="text-center mb-5 relative z-10">
        <img src="/logo.png" alt="SwiftMart" className="h-16 w-auto object-contain mx-auto mb-1" />
        <p className="text-muted-foreground text-sm">Delivery in 10 minutes</p>
      </div>

      <div className="relative z-10">
        <AnimatePresence mode="wait">

          {/* ── LOGIN ─────────────────────────────────────────────────────── */}
          {step === 'login' && (
            <motion.div key="login" variants={slideVariants} initial="initial" animate="animate" exit="exit"
              className="bg-card p-5 rounded-[2rem] neu-card space-y-4">

              {showGoogleLogin() && (
                <>
                  {isGoogleLoading ? (
                    <div className="w-full h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center gap-3 text-gray-700 font-medium text-sm">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                      Signing in with Google…
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleGoogleSignIn()}
                      className="w-full flex items-center gap-3 bg-white text-gray-800 font-medium text-sm rounded-xl px-4 h-12 border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <GoogleIcon />
                      <span className="flex-1 text-center">Continue with Google</span>
                    </button>
                  )}

                  {showPasswordLogin() && (
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {showPasswordLogin() && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile Number</Label>
                    <div className="flex gap-2">
                      <div className="bg-background neu-inset flex items-center justify-center px-4 rounded-xl font-medium text-muted-foreground border-none">
                        +91
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        maxLength={10}
                        placeholder="Enter mobile number"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                        className={cn(inputClass, "flex-1 text-lg font-medium")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <PasswordInput
                      id="login-password"
                      value={loginPassword}
                      onChange={setLoginPassword}
                      placeholder="Enter your password"
                      className={inputClass}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setResetPhone(phone); setStep('forgot-password'); }}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoggingIn || phone.length !== 10 || !loginPassword}
                    className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card"
                  >
                    {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep('signup')}
                    className="w-full text-muted-foreground"
                  >
                    Create Account
                  </Button>
                </form>
              )}
            </motion.div>
          )}

          {/* ── SIGNUP ────────────────────────────────────────────────────── */}
          {step === 'signup' && (
            <motion.div key="signup" variants={slideVariants} initial="initial" animate="animate" exit="exit"
              className="bg-card p-5 rounded-[2rem] neu-card space-y-4">

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setStep('login')} className="text-muted-foreground hover:text-foreground">
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
                  <Input
                    placeholder="e.g. Rahul Kumar"
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    className={inputClass}
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mobile Number</Label>
                  <div className="flex gap-2">
                    <div className="bg-background neu-inset flex items-center justify-center px-4 rounded-xl font-medium text-muted-foreground border-none">
                      +91
                    </div>
                    <Input
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit number"
                      value={signupPhone}
                      onChange={e => setSignupPhone(e.target.value.replace(/\D/g, ''))}
                      className={cn(inputClass, "flex-1")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Password</Label>
                  <PasswordInput
                    value={signupPassword}
                    onChange={setSignupPassword}
                    placeholder="At least 8 characters"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <PasswordInput
                    value={signupConfirm}
                    onChange={setSignupConfirm}
                    placeholder="Re-enter your password"
                    className={inputClass}
                  />
                  {signupConfirm && signupPassword !== signupConfirm && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Passwords do not match
                    </p>
                  )}
                  {signupConfirm && signupPassword === signupConfirm && signupPassword.length >= 8 && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={
                    isSigningUp ||
                    signupName.trim().length < 2 ||
                    signupPhone.length !== 10 ||
                    signupPassword.length < 8 ||
                    signupPassword !== signupConfirm
                  }
                  className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card"
                >
                  {isSigningUp ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create Account <ArrowRight className="w-5 h-5 ml-2" /></>}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button type="button" onClick={() => setStep('login')} className="text-primary hover:underline font-medium">
                    Log In
                  </button>
                </p>
              </form>
            </motion.div>
          )}

          {/* ── FORGOT PASSWORD ───────────────────────────────────────────── */}
          {step === 'forgot-password' && (
            <motion.div key="forgot" variants={slideVariants} initial="initial" animate="animate" exit="exit"
              className="bg-card p-5 rounded-[2rem] neu-card space-y-4">

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setStep('login')} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold">Forgot Password</h2>
                  <p className="text-muted-foreground text-sm">Enter your mobile number to get a reset token</p>
                </div>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label>Mobile Number</Label>
                  <div className="flex gap-2">
                    <div className="bg-background neu-inset flex items-center justify-center px-4 rounded-xl font-medium text-muted-foreground border-none">
                      +91
                    </div>
                    <Input
                      type="tel"
                      maxLength={10}
                      placeholder="Registered mobile number"
                      value={resetPhone}
                      onChange={e => setResetPhone(e.target.value.replace(/\D/g, ''))}
                      className={cn(inputClass, "flex-1")}
                    />
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-medium">Development mode</p>
                  <p className="text-xs mt-0.5">The reset token is printed in the server console log. Check your terminal output.</p>
                </div>

                <Button
                  type="submit"
                  disabled={isSendingReset || resetPhone.length !== 10}
                  className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card"
                >
                  {isSendingReset ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Token"}
                </Button>

                <button
                  type="button"
                  onClick={() => setStep('reset-password')}
                  className="w-full text-center text-sm text-primary hover:underline"
                >
                  Already have a token? Enter it here
                </button>
              </form>
            </motion.div>
          )}

          {/* ── RESET PASSWORD ────────────────────────────────────────────── */}
          {step === 'reset-password' && (
            <motion.div key="reset" variants={slideVariants} initial="initial" animate="animate" exit="exit"
              className="bg-card p-5 rounded-[2rem] neu-card space-y-4">

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setStep('forgot-password')} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold">Set New Password</h2>
                  <p className="text-muted-foreground text-sm">Enter the token from the server console</p>
                </div>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {!resetPhone && (
                  <div className="space-y-2">
                    <Label>Mobile Number</Label>
                    <div className="flex gap-2">
                      <div className="bg-background neu-inset flex items-center justify-center px-4 rounded-xl font-medium text-muted-foreground border-none">
                        +91
                      </div>
                      <Input
                        type="tel"
                        maxLength={10}
                        placeholder="Your mobile number"
                        value={resetPhone}
                        onChange={e => setResetPhone(e.target.value.replace(/\D/g, ''))}
                        className={cn(inputClass, "flex-1")}
                      />
                    </div>
                  </div>
                )}

                {resetPhone && (
                  <div className="bg-muted rounded-xl px-4 py-2.5 text-sm flex items-center justify-between">
                    <span className="text-muted-foreground">Mobile</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">+91 {resetPhone}</span>
                      <button type="button" onClick={() => setResetPhone("")} className="text-xs text-primary hover:underline">change</button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Reset Token</Label>
                  <Input
                    placeholder="Paste the token from server console"
                    value={resetToken}
                    onChange={e => setResetToken(e.target.value.trim())}
                    className={cn(inputClass, "font-mono text-sm")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>New Password</Label>
                  <PasswordInput
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="At least 8 characters"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <PasswordInput
                    value={confirmNewPassword}
                    onChange={setConfirmNewPassword}
                    placeholder="Re-enter new password"
                    className={inputClass}
                  />
                  {confirmNewPassword && newPassword !== confirmNewPassword && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Passwords do not match
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={
                    isResetting ||
                    !resetToken.trim() ||
                    newPassword.length < 8 ||
                    newPassword !== confirmNewPassword ||
                    resetPhone.length !== 10
                  }
                  className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card"
                >
                  {isResetting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Set Password & Log In"}
                </Button>
              </form>
            </motion.div>
          )}

          {/* ── ONBOARDING ────────────────────────────────────────────────── */}
          {step === 'onboarding' && (
            <motion.div key="onboarding" variants={slideVariants} initial="initial" animate="animate" exit="exit"
              className="bg-card p-5 rounded-[2rem] neu-card space-y-4 max-h-[calc(100dvh-9rem)] overflow-y-auto">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Almost there!</h2>
                <p className="text-muted-foreground">Tell us about yourself and where to deliver.</p>
              </div>

              <form onSubmit={handleOnboardingSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label>Full Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Rahul Kumar"
                    className={inputClass}
                    autoComplete="name"
                  />
                  <p className="text-xs text-muted-foreground">Enter your real name — this will appear on your orders and receipts.</p>
                </div>

                <div className="pt-2 border-t border-border space-y-4">
                  <Label className="text-lg font-bold">First Delivery Address</Label>

                  <div className="flex gap-2">
                    {(['Home', 'Work', 'Other'] as const).map(label => (
                      <div
                        key={label}
                        onClick={() => setAddressLabel(label)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all",
                          addressLabel === label ? "bg-primary text-primary-foreground neu-card shadow-none" : "bg-background neu-inset text-muted-foreground"
                        )}
                      >
                        {label}
                      </div>
                    ))}
                  </div>

                  <Input placeholder="House/Flat No., Building Name, Street" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} className={inputClass} />
                  <Input placeholder="Area / Locality / Mohalla" value={addressArea} onChange={e => setAddressArea(e.target.value)} className={inputClass} />

                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
                    <div className="relative">
                      <Input
                        placeholder="Pincode"
                        value={pincode}
                        onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                        maxLength={6}
                        className={cn(inputClass, "pr-9")}
                      />
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

                <Button
                  type="submit"
                  disabled={isSavingProfile || pincodeOutOfArea || !name.trim() || !addressLine1.trim() || !addressArea.trim() || !city.trim() || !pincodeValid}
                  className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card mt-2"
                >
                  {isSavingProfile
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <><span>Start Shopping</span> <ArrowRight className="w-5 h-5 ml-2" /></>
                  }
                </Button>
              </form>
            </motion.div>
          )}

          {/* ── ADDRESS ───────────────────────────────────────────────────── */}
          {step === 'address' && (
            <motion.div key="address" variants={slideVariants} initial="initial" animate="animate" exit="exit"
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
                  toast.success("Address saved! Welcome back!");
                  setLocation("/");
                } catch {
                  toast.error("Failed to save address. Please try again.");
                } finally {
                  setIsSavingAddress(false);
                }
              }} className="space-y-4">
                <div className="flex gap-2">
                  {(['Home', 'Work', 'Other'] as const).map(label => (
                    <div
                      key={label}
                      onClick={() => setAddressLabel(label)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all flex-1 text-center",
                        addressLabel === label ? "bg-primary text-primary-foreground neu-card shadow-none" : "bg-background neu-inset text-muted-foreground"
                      )}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <Input placeholder="House/Flat No., Building Name, Street" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} className={inputClass} />
                <Input placeholder="Area / Locality / Mohalla" value={addressArea} onChange={e => setAddressArea(e.target.value)} className={inputClass} />

                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
                  <div className="relative">
                    <Input
                      placeholder="Pincode"
                      value={pincode}
                      onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                      maxLength={6}
                      className={cn(inputClass, "pr-9")}
                    />
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

                <Button
                  type="submit"
                  disabled={isSavingAddress || pincodeOutOfArea || !addressLine1.trim() || !addressArea.trim() || !city.trim() || !pincodeValid}
                  className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card"
                >
                  {isSavingAddress ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Save Address</span> <ArrowRight className="w-5 h-5 ml-2" /></>}
                </Button>
              </form>
            </motion.div>
          )}

        </AnimatePresence>

        {(step === 'login' || step === 'signup') && (
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
