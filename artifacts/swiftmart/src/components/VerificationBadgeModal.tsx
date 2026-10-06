import { CheckCircle2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VerificationBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName: string;
}

export function VerificationBadgeModal({ isOpen, onClose, storeName }: VerificationBadgeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-card border border-border/80 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground">Verified by SwiftMart</h3>
            <p className="text-xs text-muted-foreground">Trusted merchant in Balurghat</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">{storeName}</strong> has been verified by the SwiftMart team following on-ground checks:
        </p>

        <div className="space-y-3 bg-muted/40 p-4 rounded-2xl border border-border/50 text-xs">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-foreground">Business Identity Verified</p>
              <p className="text-[11px] text-muted-foreground">Physical premises and merchant ownership verified on-ground.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-foreground">Store Details Checked</p>
              <p className="text-[11px] text-muted-foreground">Address, catalog items, and trade category inspected.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-foreground">Contact Checked</p>
              <p className="text-[11px] text-muted-foreground">Direct mobile and operational customer support numbers confirmed.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-foreground">Partnership Confirmed</p>
              <p className="text-[11px] text-muted-foreground">Active merchant agreement with transparent SwiftMart platform support.</p>
            </div>
          </div>
        </div>

        <Button
          onClick={onClose}
          className="w-full rounded-xl bg-primary text-primary-foreground font-bold text-xs h-10 shadow-xs cursor-pointer"
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
