import { Product } from "@/types";
import { formatINR } from "@/lib/currency";
import { Wrench, Clock, Home, Info, Calendar } from "lucide-react";
import { Button } from "./ui/button";

interface ServiceCardProps {
  product: Product;
  shopName?: string;
  onViewDetails: (product: Product) => void;
  onBookService: (product: Product) => void;
}

export function ServiceCard({ product, shopName, onViewDetails, onBookService }: ServiceCardProps) {
  const effectivePrice = product.discountedPrice && product.discountedPrice < product.price
    ? product.discountedPrice
    : product.price;

  return (
    <div className="bg-card rounded-2xl border border-border/60 hover:border-blue-500/50 p-4 transition-all flex flex-col justify-between shadow-xs hover:shadow-md group">
      <div>
        {/* Fixed image area */}
        <div
          onClick={() => onViewDetails(product)}
          className="relative h-44 sm:h-48 w-full rounded-xl overflow-hidden bg-background border border-border/40 cursor-pointer"
        >
          <img
            src={product.image || "/assets/product-placeholder.png"}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2.5 left-2.5 bg-blue-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
            <Home className="w-3 h-3" />
            <span>Home Visit Available</span>
          </div>
        </div>

        {/* Content */}
        <div className="mt-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-blue-500 font-semibold">
            <Wrench className="w-3.5 h-3.5 shrink-0" />
            <span>On-site Inspection &amp; Repair</span>
          </div>

          <h3
            onClick={() => onViewDetails(product)}
            className="font-extrabold text-sm sm:text-base text-foreground line-clamp-1 hover:text-blue-500 transition-colors cursor-pointer"
          >
            {product.name}
          </h3>

          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {product.description || "Certified doorstep technician visit, diagnostics, and repairs with genuine spare parts warranty."}
          </p>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground font-medium flex-wrap">
            <span className="flex items-center gap-1 text-emerald-500 font-semibold">
              <Clock className="w-3 h-3" />
              <span>Available Slot: Today</span>
            </span>
            <span>•</span>
            <span>Doorstep Service</span>
          </div>
        </div>
      </div>

      {/* Pricing & Action Buttons */}
      <div className="mt-4 pt-3 border-t border-border/40">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
              Inspection / Service Fee
            </span>
            <span className="text-base sm:text-lg font-black text-foreground">
              Starting {formatINR(effectivePrice)}
            </span>
          </div>
          {product.price > 0 && product.discountedPrice && product.discountedPrice < product.price && (
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Special Price
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(product)}
            className="rounded-xl font-bold text-xs h-9 border-border/80 hover:bg-muted cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 mr-1" />
            <span>View Details</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => onBookService(product)}
            className="rounded-xl font-extrabold text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 mr-1" />
            <span>Book Service</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
