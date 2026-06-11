import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { loadGoogleGIS, initGoogleGIS, renderGoogleSignInButton } from "@/lib/googleGIS";
import { showGoogleLogin, showOtpLogin, getGoogleClientId } from "@/lib/authConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isServicePincode, getServiceAreaName } from "@/lib/serviceArea";

type Step = 'login' | 'otp' | 'onboarding' | 'address';

export default function Auth() {
  const [, setLocation] = useLocation();
  const { user, loginWithPhone, verifyOtp, loginWithGoogle, completeOnboarding, addAddress } = useAuth();

  const [step, setStep] = useState<Step>('login');
  const [phone, setPhone] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(30);
  const [otpError, setOtpError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'phone' | 'google'>('phone');
  const googleButtonRef = useRef<HTMLDivElement>(null);
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

  // On mount: load GIS, initialise with the Google client ID, render the official button.
  // GIS delivers the credential via JS callback — no popup, no redirect, no cross-origin
  // postMessage. Works reliably inside Replit's proxied iframe where Firebase flows fail.
  useEffect(() => {
    if (!showGoogleLogin()) return;
    const clientId = getGoogleClientId();
    if (!clientId || clientId === "placeholder") return;

    let cancelled = false;

    const onCredential = async (idToken: string) => {
      if (cancelled) return;
      setIsGoogleLoading(true);
      setAuthMethod("google");
      try {
        const result = await loginWithGoogle(idToken, "credential");
        if (cancelled) return;
        if (result.isNewUser) {
          setStep("onboarding");
        } else if (!result.user?.addresses?.length) {
          setStep("address");
        } else {
          toast.success("Welcome back!");
          setLocation("/");
        }
      } catch (err) {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      } finally {
        if (!cancelled) setIsGoogleLoading(false);
      }
    };

    loadGoogleGIS()
      .then(() => {
        if (cancelled) return;
        initGoogleGIS(clientId, onCredential);
        if (googleButtonRef.current) {
          renderGoogleSignInButton(googleButtonRef.current);
        }
      })
      .catch(() => {
        // GIS script failed to load — Google button won't appear
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    // New users are created with name "User" — if this default hasn't been replaced yet
    // the user hasn't completed onboarding. Restore the onboarding step on refresh (L6).
    const needsOnboarding = !user.name || user.name === "User";
    if (needsOnboarding) {
      if (step === 'login') setStep('onboarding');
      return;
    }
    if (step !== 'onboarding' && step !== 'address') setLocation("/");
  }, [user, step, setLocation]);

  useEffect(() => {
    if (step === 'otp' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [step, countdown]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    setIsSendingOtp(true);
    try {
      await loginWithPhone(phone);
      setAuthMethod('phone');
      setStep('otp');
      setCountdown(30);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send OTP";
      toast.error(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };


  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError(false);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (newOtp.every(d => d !== "")) verifyOtpSubmit(newOtp.join(""));
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtpSubmit = async (otpString: string) => {
    if (isVerifyingOtp) return;
    setIsVerifyingOtp(true);
    try {
      const result = await verifyOtp(otpString, phone);
      if (result.isNewUser) {
        setStep('onboarding');
      } else if (!result.user?.addresses?.length) {
        setStep('address');
      } else {
        toast.success("Welcome back!");
        setLocation("/");
      }
    } catch (err: unknown) {
      setOtpError(true);
      const msg = err instanceof Error ? err.message : "Invalid OTP";
      toast.error(msg.includes("Invalid") ? "Invalid OTP. Please try again." : msg);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    try {
      await loginWithPhone(phone);
      setCountdown(30);
      toast.success("OTP resent successfully!");
    } catch {
      toast.error("Failed to resend OTP");
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (!addressLine1.trim()) { toast.error("Please enter your address"); return; }
    if (!addressArea.trim()) { toast.error("Please enter your area/locality"); return; }
    if (!city.trim()) { toast.error("Please enter your city"); return; }
    if (pincode.length !== 6) { toast.error("Please enter a 6-digit pincode"); return; }
    if (pincodeOutOfArea) {
      toast.error("SwiftMart is not available in your area yet.");
      return;
    }
    if (!pincodeValid) { toast.error("Please enter a valid service-area pincode"); return; }

    setIsSavingProfile(true);
    try {
      await completeOnboarding(name, phone, {
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

  const slideVariants = {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" as const } },
    exit: { x: -20, opacity: 0, transition: { duration: 0.2, ease: "easeIn" as const } },
  };

  return (
    <div className="h-[100dvh] flex flex-col justify-center px-4 py-4 w-full max-w-md mx-auto relative bg-background overflow-x-hidden overflow-y-auto">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

      <div className="text-center mb-5 relative z-10">
        <img src="/logo.png" alt="SwiftMart" className="h-16 w-auto object-contain mx-auto mb-1" />
        <p className="text-muted-foreground text-sm">Delivery in 10 minutes</p>
      </div>

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {step === 'login' && (
            <motion.div key="login" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="bg-card p-5 rounded-[2rem] neu-card space-y-4">
              {/* Google login — only shown when AUTH_MODE=google or AUTH_MODE=both */}
              {showGoogleLogin() && (
                <>
                  {/* GIS renders Google's official button into this div via renderGoogleSignInButton().
                      We overlay a loading spinner while loginWithGoogle() completes after credential delivery. */}
                  <div className="relative w-full" style={{ minHeight: 44 }}>
                    <div ref={googleButtonRef} className="w-full" />
                    {isGoogleLoading && (
                      <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-full bg-[#131314] text-white text-sm font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing in with Google…
                      </div>
                    )}
                  </div>

                  {showOtpLogin() && (
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                    </div>
                  )}
                </>
              )}

              {/* Phone OTP login — only shown when AUTH_MODE=otp or AUTH_MODE=both */}
              {showOtpLogin() && <form onSubmit={handlePhoneSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
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
                      className="bg-background neu-inset border-none h-14 rounded-xl text-lg flex-1 font-medium"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSendingOtp || phone.length !== 10}
                  className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card"
                >
                  {isSendingOtp ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
                </Button>
              </form>}
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div key="otp" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="bg-card p-5 rounded-[2rem] neu-card space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold">Verification</h2>
                <p className="text-muted-foreground text-sm">
                  You will receive a voice call on +91 {phone.slice(0, 2)}XXXXX{phone.slice(-3)} with your OTP
                </p>
              </div>

              <div className="space-y-3">
                <motion.div
                  className="grid grid-cols-6 gap-1.5 w-full"
                  animate={otpError ? { x: [-10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  {otp.map((digit, i) => (
                    <Input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      disabled={isVerifyingOtp}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className={cn(
                        "w-full h-11 text-center text-lg font-bold bg-background neu-inset border-none rounded-xl focus-visible:ring-2 focus-visible:ring-primary",
                        otpError && "ring-2 ring-destructive"
                      )}
                    />
                  ))}
                </motion.div>

                {isVerifyingOtp && (
                  <div className="flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}

              </div>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={handleResendOtp}
                  disabled={countdown > 0}
                  className="text-primary font-medium"
                >
                  {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
                </Button>
              </div>

              <Button
                onClick={() => setStep('login')}
                variant="ghost"
                className="w-full text-muted-foreground"
              >
                Change Number
              </Button>
            </motion.div>
          )}

          {step === 'onboarding' && (
            <motion.div key="onboarding" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="bg-card p-5 rounded-[2rem] neu-card space-y-4 max-h-[calc(100dvh-9rem)] overflow-y-auto">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Almost there!</h2>
                <p className="text-muted-foreground">Tell us about yourself and where to deliver.</p>
              </div>

              <form onSubmit={handleOnboardingSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    className="bg-background neu-inset border-none h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={phone}
                    disabled={authMethod === 'phone'}
                    placeholder="10-digit number"
                    maxLength={10}
                    className="bg-background neu-inset border-none h-12 rounded-xl disabled:opacity-50"
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  />
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

                  <Input
                    placeholder="House/Flat No., Building Name, Street"
                    value={addressLine1}
                    onChange={e => setAddressLine1(e.target.value)}
                    className="bg-background neu-inset border-none h-12 rounded-xl"
                  />

                  <Input
                    placeholder="Area / Locality / Mohalla"
                    value={addressArea}
                    onChange={e => setAddressArea(e.target.value)}
                    className="bg-background neu-inset border-none h-12 rounded-xl"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="City"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="bg-background neu-inset border-none h-12 rounded-xl"
                    />
                    <div className="relative">
                      <Input
                        placeholder="Pincode"
                        value={pincode}
                        onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                        maxLength={6}
                        className="bg-background neu-inset border-none h-12 rounded-xl pr-9"
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
                      <p className="text-xs mt-0.5">You can buy from another available area (733101 or 733103).</p>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={
                    isSavingProfile ||
                    pincodeOutOfArea ||
                    !name.trim() ||
                    !addressLine1.trim() ||
                    !addressArea.trim() ||
                    !city.trim() ||
                    !pincodeValid
                  }
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

          {step === 'address' && (
            <motion.div key="address" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="bg-card p-5 rounded-[2rem] neu-card space-y-4 max-h-[calc(100dvh-9rem)] overflow-y-auto">
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
                  addAddress({
                    id: `a_${Date.now()}`,
                    label: addressLabel,
                    line1: addressLine1,
                    line2: addressArea,
                    city,
                    pincode,
                  });
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

                <Input
                  placeholder="House/Flat No., Building Name, Street"
                  value={addressLine1}
                  onChange={e => setAddressLine1(e.target.value)}
                  className="bg-background neu-inset border-none h-12 rounded-xl"
                />
                <Input
                  placeholder="Area / Locality / Mohalla"
                  value={addressArea}
                  onChange={e => setAddressArea(e.target.value)}
                  className="bg-background neu-inset border-none h-12 rounded-xl"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="City"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="bg-background neu-inset border-none h-12 rounded-xl"
                  />
                  <div className="relative">
                    <Input
                      placeholder="Pincode"
                      value={pincode}
                      onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                      maxLength={6}
                      className="bg-background neu-inset border-none h-12 rounded-xl pr-9"
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
                    <p className="font-semibold">Sorry, not available in your area yet.</p>
                    <p className="text-xs mt-0.5">Use pincode 733101 or 733103.</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSavingAddress || pincodeOutOfArea || !addressLine1.trim() || !addressArea.trim() || !city.trim() || !pincodeValid}
                  className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card mt-2"
                >
                  {isSavingAddress ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Save & Continue</span> <ArrowRight className="w-5 h-5 ml-2" /></>}
                </Button>
                <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={() => { toast.success("Welcome back!"); setLocation("/"); }}>
                  Skip for now
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
