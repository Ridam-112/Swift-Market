import { Product } from "@/types";
import { formatINR } from "@/lib/currency";
import { X, CheckCircle2, Wrench, ShieldCheck, Clock, Calendar, MapPin } from "lucide-react";
import { Button } from "./ui/button";

interface ServiceDetailsModalProps {
  product: Product | null;
  storeName: string;
  isOpen: boolean;
  onClose: () => void;
  onBook: (product: Product) => void;
}

export function ServiceDetailsModal({ product, storeName, isOpen, onClose, onBook }: ServiceDetailsModalProps) {
  if (!isOpen || !product) return null;

  const effectivePrice = product.discountedPrice && product.discountedPrice < product.price
    ? product.discountedPrice
    : product.price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-card border border-border/80 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image header */}
        <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-background border border-border/40">
          <img
            src={product.image || "/assets/product-placeholder.png"}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2.5 left-2.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Wrench className="w-3 h-3 text-blue-400" />
            <span>Service Partner: {storeName}</span>
          </div>
        </div>

        {/* Title & Price */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
              Doorstep Service
            </span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
              Available Today
            </span>
          </div>
          <h2 className="text-xl font-black text-foreground">{product.name}</h2>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-foreground">
              Starting {formatINR(effectivePrice)}
            </span>
            <span className="text-xs text-muted-foreground">
              (Includes inspection &amp; basic diagnosis)
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3.5 rounded-2xl border border-border/40">
          <p className="font-bold text-foreground">Service Overview</p>
          <p>{product.description || "Expert doorstep technician inspection, fault diagnostics, cleaning, and genuine parts replacement for all major brands."}</p>
        </div>

        {/* What's included */}
        <div className="space-y-2 text-xs">
          <p className="font-bold text-foreground">What to Expect:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Doorstep visit in Balurghat</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Upfront quote before repairs</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Genuine replacement spares</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Post-service warranty on parts</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            onClick={() => {
              onClose();
              onBook(product);
            }}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm h-11 gap-2 shadow-sm cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Service Slot with {storeName}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
