import { Link } from "wouter";
import { Search, MapPin, ShoppingBag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { RoleSwitcher } from "./RoleSwitcher";
import { Input } from "./ui/input";

export function Header() {
  const { user, role } = useAuth();
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-50 glass w-full px-4 py-3 md:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-shrink-0">
          <Link href="/" className="font-bold text-2xl text-primary flex items-center gap-2">
            <span className="bg-primary text-primary-foreground rounded-xl w-8 h-8 flex items-center justify-center neu-card">S</span>
            <span className="hidden sm:inline">SwiftMart</span>
          </Link>
          
          {role === 'customer' && (
            <div className="hidden md:flex items-center gap-2 text-sm bg-background/50 rounded-full px-3 py-1.5 neu-inset">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium truncate max-w-[150px]">
                {user?.addresses[0]?.line1 || "Select Location"}
              </span>
            </div>
          )}
        </div>

        {role === 'customer' && (
          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                className="w-full pl-9 bg-background/50 neu-inset border-none h-10 rounded-full focus-visible:ring-1 focus-visible:ring-primary/50" 
                placeholder="Search for groceries, vegetables, personal care..."
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 flex-shrink-0">
          {user?.isVendorRegistered && <RoleSwitcher />}
          
          {role === 'customer' && (
            <Link href="/cart" className="relative p-2 rounded-full hover-elevate transition-colors hidden md:block neu-card">
              <ShoppingBag className="w-5 h-5 text-foreground" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center neu-card">
                  {totalItems}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
