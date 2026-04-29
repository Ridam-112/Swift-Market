import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface QuantityStepperProps {
  qty: number;
  onChange: (qty: number) => void;
  size?: "sm" | "md";
}

export function QuantityStepper({ qty, onChange, size = "md" }: QuantityStepperProps) {
  const isSm = size === "sm";

  const handleDecrease = () => {
    if (qty === 1) {
      onChange(0);
      toast("Item removed from cart", {
        action: {
          label: "Undo",
          onClick: () => onChange(1)
        }
      });
    } else {
      onChange(qty - 1);
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between bg-primary text-primary-foreground neu-card rounded-full overflow-hidden",
      isSm ? "h-8 w-[84px]" : "h-10 w-[110px]"
    )}>
      <Button 
        variant="ghost" 
        size="icon"
        className={cn("hover:bg-primary-foreground/20 text-primary-foreground rounded-none", isSm ? "w-8 h-8" : "w-10 h-10")}
        onClick={handleDecrease}
      >
        {qty === 1 ? <Trash2 className={isSm ? "w-3.5 h-3.5" : "w-4 h-4"} /> : <Minus className={isSm ? "w-3.5 h-3.5" : "w-4 h-4"} />}
      </Button>
      
      <div className={cn("font-bold text-center flex-1 overflow-hidden relative", isSm ? "text-xs" : "text-sm")}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={qty}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {qty}
          </motion.span>
        </AnimatePresence>
        <span className="invisible">{qty}</span>
      </div>

      <Button 
        variant="ghost" 
        size="icon"
        className={cn("hover:bg-primary-foreground/20 text-primary-foreground rounded-none", isSm ? "w-8 h-8" : "w-10 h-10")}
        onClick={() => onChange(qty + 1)}
      >
        <Plus className={isSm ? "w-3.5 h-3.5" : "w-4 h-4"} />
      </Button>
    </div>
  );
}
