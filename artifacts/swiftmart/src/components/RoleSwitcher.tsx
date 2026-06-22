import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ShoppingBag, Store } from "lucide-react";

export function RoleSwitcher() {
  const { role, setRole } = useAuth();

  return (
    <div className="flex gap-3">
      <button
        onClick={() => setRole('customer')}
        className={cn(
          "flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all duration-200 font-bold",
          role === 'customer'
            ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/30"
            : "bg-background border-border text-muted-foreground hover:border-blue-400 hover:text-blue-500"
        )}
        type="button"
      >
        <ShoppingBag className={cn("w-7 h-7", role === 'customer' ? "text-white" : "text-blue-400")} />
        <span className="text-sm">Customer</span>
        {role === 'customer' && (
          <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">
            Active
          </span>
        )}
      </button>

      <button
        onClick={() => setRole('vendor')}
        className={cn(
          "flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all duration-200 font-bold",
          role === 'vendor'
            ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30"
            : "bg-background border-border text-muted-foreground hover:border-orange-400 hover:text-orange-500"
        )}
        type="button"
      >
        <Store className={cn("w-7 h-7", role === 'vendor' ? "text-white" : "text-orange-400")} />
        <span className="text-sm">Vendor</span>
        {role === 'vendor' && (
          <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">
            Active
          </span>
        )}
      </button>
    </div>
  );
}
