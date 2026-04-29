import { Address } from "@/types";
import { Home, Briefcase, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddressCardProps {
  address: Address;
  selected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

export function AddressCard({ address, selected, onClick, onDelete }: AddressCardProps) {
  const Icon = address.label === 'Home' ? Home : address.label === 'Work' ? Briefcase : MapPin;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-4 rounded-2xl cursor-pointer transition-all duration-200 border-2 relative",
        selected 
          ? "neu-card border-primary/50 bg-primary/5" 
          : "bg-card border-transparent hover:border-primary/20",
        !selected && onClick && "neu-card"
      )}
    >
      <div className="flex gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 neu-inset",
          selected ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm flex items-center gap-2">
              {address.label}
              {selected && <Check className="w-4 h-4 text-primary" />}
            </h4>
            {onDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-xs text-destructive hover:underline p-1"
              >
                Delete
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {address.line1}{address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.pincode}
          </p>
        </div>
      </div>
    </div>
  );
}
