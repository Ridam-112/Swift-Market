import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatWeight } from "@/lib/weightUtils";

interface WeightStepperProps {
  selectedGrams: number;
  presets: number[];
  maxGrams?: number;
  onChange: (grams: number) => void;
  size?: "sm" | "md";
}

export function WeightStepper({ selectedGrams, presets, maxGrams, onChange, size = "md" }: WeightStepperProps) {
  const isSm = size === "sm";
  const idx = presets.indexOf(selectedGrams);
  const safeIdx = idx === -1 ? 0 : idx;
  const atMin = safeIdx === 0;
  const atMax = maxGrams !== undefined ? selectedGrams >= maxGrams : safeIdx >= presets.length - 1;

  const handleDecrease = () => {
    if (atMin) {
      onChange(0);
      toast("Item removed from cart", {
        action: { label: "Undo", onClick: () => onChange(presets[0]) },
      });
    } else {
      onChange(presets[safeIdx - 1]);
    }
  };

  const handleIncrease = () => {
    if (atMax) {
      toast.warning("You've reached the maximum available quantity", { id: "max-weight" });
      return;
    }
    if (safeIdx < presets.length - 1) {
      onChange(presets[safeIdx + 1]);
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between bg-primary text-primary-foreground neu-card rounded-full overflow-hidden",
      isSm ? "h-8 w-[100px]" : "h-10 w-[120px]"
    )}>
      <Button
        variant="ghost"
        size="icon"
        className="inline-flex items-center justify-center hover:bg-white/20 rounded-none text-white w-8 h-8 shrink-0"
        onClick={handleDecrease}
      >
        {atMin
          ? <Trash2 className={isSm ? "w-3.5 h-3.5" : "w-4 h-4"} />
          : <Minus className={isSm ? "w-3.5 h-3.5" : "w-4 h-4"} />
        }
      </Button>

      <div className={cn("font-bold text-center flex-1 overflow-hidden relative", isSm ? "text-[10px]" : "text-xs")}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={selectedGrams}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
          >
            {formatWeight(selectedGrams)}
          </motion.span>
        </AnimatePresence>
        <span className="invisible text-[10px]">{formatWeight(selectedGrams)}</span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "inline-flex items-center justify-center hover:bg-white/20 rounded-none text-white w-8 h-8 shrink-0",
          atMax && "opacity-40 cursor-not-allowed"
        )}
        onClick={handleIncrease}
      >
        <Plus className={isSm ? "w-3.5 h-3.5" : "w-4 h-4"} />
      </Button>
    </div>
  );
}
