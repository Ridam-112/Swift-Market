import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function RoleSwitcher() {
  const { role, setRole } = useAuth();

  return (
    <div className="flex items-center bg-background/50 p-1 rounded-full neu-inset">
      <button
        onClick={() => setRole('customer')}
        className={cn(
          "px-3 py-1 text-xs font-medium rounded-full transition-all duration-200",
          role === 'customer' ? "bg-primary text-primary-foreground neu-card" : "text-muted-foreground hover:text-foreground"
        )}
      >
        Customer
      </button>
      <button
        onClick={() => setRole('vendor')}
        className={cn(
          "px-3 py-1 text-xs font-medium rounded-full transition-all duration-200",
          role === 'vendor' ? "bg-primary text-primary-foreground neu-card" : "text-muted-foreground hover:text-foreground"
        )}
      >
        Vendor
      </button>
    </div>
  );
}
