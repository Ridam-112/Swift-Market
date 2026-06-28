import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, User, Phone, MapPin, ChevronRight } from "lucide-react";
import { api, setTokens } from "@/lib/api";

interface Address {
  label: "Home" | "Work" | "Other";
  line1: string;
  line2: string;
  city: string;
  pincode: string;
}

export default function CompleteProfile() {
  const { user, updateUser, refreshUser } = useAuth();
  const [, setLocation] = useLocation();

  const [name, setName] = useState(user?.name && user.name !== "User" ? user.name : "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState(user?.pincode || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      toast.error("Enter a valid 10-digit Indian mobile number");
      return;
    }
    if (pincode && !/^\d{6}$/.test(pincode)) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = { name: name.trim() };
      if (phone) payload.phone = phone;
      if (pincode) payload.pincode = pincode;

      if (line1.trim() && city.trim() && pincode) {
        const address: Address = {
          label: "Home",
          line1: line1.trim(),
          line2: "",
          city: city.trim(),
          pincode,
        };
        payload.address = address;
      }

      const result = await api.post<{
        success: boolean;
        merged?: boolean;
        accessToken?: string;
        refreshToken?: string;
        user: Record<string, unknown>;
      }>("/auth/complete-profile", payload);

      if (result.merged && result.accessToken && result.refreshToken) {
        // Phone matched an existing account — swap tokens then reload full user (preserves role/vendorStatus/etc.)
        setTokens(result.accessToken, result.refreshToken);
        await refreshUser();
        toast.success("Account linked! Welcome back.");
      } else {
        updateUser({
          name: name.trim(),
          phone: phone || undefined,
          pincode: pincode || undefined,
        });
        toast.success("Profile saved! Welcome to SwiftMart.");
      }
      setLocation("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-3xl mx-auto mb-4 shadow-lg">
              S
            </div>
            <h1 className="text-2xl font-bold text-foreground">Complete your profile</h1>
            <p className="text-muted-foreground text-sm mt-1">
              A few details to get you started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
                <User className="w-4 h-4 text-muted-foreground" />
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Rahul Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="h-12 rounded-xl text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Mobile number <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                  +91
                </span>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="h-12 rounded-xl text-base pl-12"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Delivery address <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                type="text"
                placeholder="Street / Building / Locality"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className="h-12 rounded-xl text-base"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-12 rounded-xl text-base"
                />
                <Input
                  type="text"
                  placeholder="Pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-12 rounded-xl text-base"
                  inputMode="numeric"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full h-12 rounded-xl text-base font-semibold gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Start shopping
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => setLocation("/")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Skip for now
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
