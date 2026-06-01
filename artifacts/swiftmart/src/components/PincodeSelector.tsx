import { useState } from "react";
import { MapPin, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";

const SUPPORTED_PINCODES = [
  { code: "733101", city: "Balurghat", district: "South Dinajpur, West Bengal" },
  { code: "733103", city: "Gangarampur", district: "South Dinajpur, West Bengal" },
];

interface PincodeSelectorProps {
  onDone?: () => void;
  compact?: boolean;
}

export function PincodeSelector({ onDone, compact = false }: PincodeSelectorProps) {
  const { updatePincode, user } = useAuth();
  const [selected, setSelected] = useState(user?.pincode || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selected) { toast.error("Please select your area"); return; }
    setSaving(true);
    try {
      await updatePincode(selected);
      toast.success("Location set successfully!");
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
        <div className="grid gap-2">
          {SUPPORTED_PINCODES.map(p => (
            <button
              key={p.code}
              onClick={() => setSelected(p.code)}
              className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${
                selected === p.code
                  ? "border-primary bg-primary/5 neu-inset"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              <div>
                <div className="font-semibold text-foreground text-sm">{p.city}</div>
                <div className="text-xs text-muted-foreground">{p.code} · {p.district}</div>
              </div>
              {selected === p.code && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
            </button>
          ))}
        </div>
        <Button onClick={handleSave} disabled={saving || !selected} className="w-full rounded-xl shadow-none neu-card">
          {saving ? "Saving..." : "Save Location"}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto neu-inset mb-4">
            <MapPin className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Select Your Area</h1>
          <p className="text-muted-foreground text-sm">
            SwiftMart is available in select pincodes. Choose your area to see shops and products near you.
          </p>
        </div>

        <div className="grid gap-3">
          {SUPPORTED_PINCODES.map(p => (
            <button
              key={p.code}
              onClick={() => setSelected(p.code)}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                selected === p.code
                  ? "border-primary bg-primary/5 neu-inset"
                  : "border-border bg-card hover:border-primary/40 neu-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selected === p.code ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-foreground">{p.city}</div>
                  <div className="text-xs text-muted-foreground">{p.code} · {p.district}</div>
                </div>
              </div>
              {selected === p.code && <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />}
            </button>
          ))}
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !selected}
          className="w-full h-12 rounded-2xl text-base font-bold shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saving ? "Setting Location..." : "Continue to SwiftMart"}
        </Button>
      </motion.div>
    </div>
  );
}
