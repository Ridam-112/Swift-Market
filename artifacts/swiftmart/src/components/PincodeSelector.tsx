import { useState } from "react";
import { MapPin, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { isServicePincode, getServiceAreaName } from "@/lib/serviceArea";

interface PincodeSelectorProps {
  onDone?: () => void;
  compact?: boolean;
}

export function PincodeSelector({ onDone, compact = false }: PincodeSelectorProps) {
  const { updatePincode, addAddress, user } = useAuth();
  const [addressLine, setAddressLine] = useState("");
  const [area, setArea] = useState("");
  const [pincode, setPincode] = useState(user?.pincode || "");
  const [saving, setSaving] = useState(false);

  const pincodeValid = pincode.length === 6 && isServicePincode(pincode);
  const pincodeOutOfArea = pincode.length === 6 && !isServicePincode(pincode);
  const areaName = getServiceAreaName(pincode);

  const handleSave = async () => {
    if (!pincodeValid) return;
    if (compact && !pincode) { toast.error("Please enter your pincode"); return; }
    if (!compact && (!addressLine.trim() || !area.trim())) {
      toast.error("Please fill in your address details");
      return;
    }
    setSaving(true);
    try {
      await updatePincode(pincode);
      if (!compact && addressLine.trim()) {
        addAddress({
          id: `a_${Date.now()}`,
          label: "Home",
          line1: addressLine.trim(),
          line2: area.trim(),
          city: areaName.split(",")[0] || "South Dinajpur",
          pincode,
        });
      }
      toast.success("Location saved!");
      onDone?.();
    } catch {
      toast.error("Failed to save location");
    } finally {
      setSaving(false);
    }
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Pincode</Label>
          <div className="relative">
            <Input
              value={pincode}
              onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit pincode"
              className="bg-background neu-inset border-none h-11 rounded-xl pr-9"
              maxLength={6}
            />
            {pincodeValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
            {pincodeOutOfArea && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />}
          </div>
          {pincodeValid && (
            <p className="text-xs text-green-600 font-medium">✓ SwiftMart delivers to {areaName}</p>
          )}
          {pincodeOutOfArea && (
            <p className="text-xs text-destructive">SwiftMart is not available in this area yet. Try 733101 or 733103.</p>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !pincodeValid}
          className="w-full rounded-xl shadow-none neu-card h-10 text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Location"}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6 py-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto neu-inset mb-4">
            <MapPin className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set Your Delivery Area</h1>
          <p className="text-muted-foreground text-sm">
            Enter your address so we can show shops near you.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full Address</Label>
            <Input
              value={addressLine}
              onChange={e => setAddressLine(e.target.value)}
              placeholder="House No., Building, Street"
              className="bg-background neu-inset border-none h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Area / Locality</Label>
            <Input
              value={area}
              onChange={e => setArea(e.target.value)}
              placeholder="Mohalla, ward, locality name"
              className="bg-background neu-inset border-none h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Pincode</Label>
            <div className="relative">
              <Input
                value={pincode}
                onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit pincode"
                className="bg-background neu-inset border-none h-12 rounded-xl pr-10"
                maxLength={6}
              />
              {pincodeValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />}
              {pincodeOutOfArea && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />}
            </div>

            {pincodeValid && (
              <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> SwiftMart delivers to {areaName}!
              </p>
            )}
            {pincodeOutOfArea && (
              <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
                <p className="font-semibold">Not available in your area yet</p>
                <p className="text-xs mt-1">SwiftMart currently serves 733101 and 733103 (both Balurghat).</p>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !pincodeValid || !addressLine.trim() || !area.trim()}
          className="w-full h-12 rounded-2xl text-base font-bold shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Continue to SwiftMart"}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Available areas: Balurghat (733101 · 733103)
        </p>
      </motion.div>
    </div>
  );
}
