import { Link, useLocation } from "wouter";
import { Home, Store, ShoppingBag, Clock, User, LayoutDashboard, Package, PlusCircle, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function BottomNav() {
  const [location] = useLocation();
  const { role } = useAuth();
  const { totalItems } = useCart();

  type Tab = { href: string; icon: React.ComponentType<{ className?: string }>; label: string; badge?: number };

  const customerTabs: Tab[] = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/categories", icon: Store, label: "Categories" },
    { href: "/shops", icon: ShoppingBag, label: "Shops" },
    { href: "/orders", icon: Clock, label: "Orders" },
    { href: "/profile", icon: User, label: "Profile" }
  ];

  const vendorTabs: Tab[] = [
    { href: "/vendor", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/vendor/products", icon: Package, label: "Products" },
    { href: "/vendor/add-product", icon: PlusCircle, label: "Add" },
    { href: "/vendor/orders", icon: ClipboardList, label: "Orders" },
    { href: "/profile", icon: User, label: "Profile" }
  ];

  const tabs = role === 'vendor' ? vendorTabs : customerTabs;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl pb-safe pt-2 px-2 z-30 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)] border-t border-border/50">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => {
          const isActive = location === tab.href || (tab.href !== "/" && tab.href !== "/vendor" && location.startsWith(tab.href));
          const Icon = tab.icon;

          return (
            <Link key={tab.href} href={tab.href} className="relative flex flex-col items-center py-1.5 px-2 w-16 group">
              <div className="relative z-10 flex flex-col items-center gap-1">
                <div className="relative">
                  <Icon className={cn("w-5 h-5 transition-transform duration-200", isActive ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground")} />
                  {tab.badge ? (
                    <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                      {tab.badge}
                    </span>
                  ) : null}
                </div>
                <span className={cn("text-[10px] font-bold tracking-tight transition-colors duration-200", isActive ? "text-primary" : "text-muted-foreground")}>
                  {tab.label}
                </span>
              </div>
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(108,61,232,0.6)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
