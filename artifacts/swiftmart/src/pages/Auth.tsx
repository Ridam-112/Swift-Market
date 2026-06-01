import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isServicePincode, getServiceAreaName } from "@/lib/serviceArea";

type Step = 'login' | 'otp' | 'onboarding';

export default function Auth() {
  const [, setLocation] = useLocation();
  const { user, loginWithPhone, verifyOtp, loginWithGoogle, completeOnboarding } = useAuth();

  const [step, setStep] = useState<Step>('login');
  const [phone, setPhone] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(30);
  const [otpError, setOtpError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [authMethod, setAuthMethod] = useState<'phone' | 'google'>('phone');
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [addressLabel, setAddressLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [addressLine1, setAddressLine1] = useState("");
  const [addressArea, setAddressArea] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const pincodeValid = pincode.length === 6 && isServicePincode(pincode);
  const pincodeOutOfArea = pincode.length === 6 && !isServicePincode(pincode);
  const areaName = getServiceAreaName(pincode);

  useEffect(() => {
    if (user) setLocation("/");
  }, [user, setLocation]);

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

  const handleGoogleLogin = () => {
    // Google OAuth not yet configured
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
      } else {
        toast.success("Welcome back!");
        setLocation("/");
      }
    } catch (err: unknown) {
      setOtpError(true);
      const msg = err instanceof Error ? err.message : "Invalid OTP";
      toast.error(msg.includes("Invalid") ? "Invalid OTP. Use 123456 for demo." : msg);
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
    <div className="min-h-[100dvh] flex flex-col justify-center px-4 py-12 max-w-md mx-auto relative overflow-hidden bg-background">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

      <div className="text-center mb-10 relative z-10">
        <div className="w-20 h-20 bg-primary mx-auto rounded-3xl neu-card flex items-center justify-center text-white font-bold text-4xl mb-6 shadow-xl">
          S
        </div>
        <h1 className="text-3xl font-bold mb-2 text-foreground">SwiftMart</h1>
        <p className="text-muted-foreground">Delivery in 10 minutes</p>
      </div>

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {step === 'login' && (
            <motion.div key="login" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="bg-card p-6 md:p-8 rounded-[2rem] neu-card space-y-6">
              <Button
                onClick={handleGoogleLogin}
                variant="outline"
                disabled
                className="w-full rounded-2xl h-14 text-lg font-bold bg-white text-black border border-gray-200 shadow-sm opacity-50 cursor-not-allowed flex items-center gap-3 relative"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
                <span className="absolute right-4 text-xs font-normal text-gray-400">Coming soon</span>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
              </div>

              <form onSubmit={handlePhoneSubmit} className="space-y-6">
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
              </form>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div key="otp" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="bg-card p-6 md:p-8 rounded-[2rem] neu-card space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Verification</h2>
                <p className="text-muted-foreground">
                  Enter 6-digit OTP sent to +91 {phone.slice(0, 2)}XXXXX{phone.slice(-3)}
                </p>
              </div>

              <div className="space-y-4">
                <motion.div
                  className="flex justify-between gap-2"
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
                        "w-12 h-14 text-center text-xl font-bold bg-background neu-inset border-none rounded-xl focus-visible:ring-2 focus-visible:ring-primary",
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

                <p className="text-xs text-muted-foreground text-center">
                  Use <strong className="text-foreground">123456</strong> for demo
                </p>
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
            <motion.div key="onboarding" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="bg-card p-6 md:p-8 rounded-[2rem] neu-card space-y-6">
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
                  disabled={isSavingProfile || pincodeOutOfArea}
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
        </AnimatePresence>
      </div>
    </div>
  );
}
