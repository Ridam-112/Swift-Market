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

  const customerTabs = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/shops", icon: Store, label: "Shops" },
    { href: "/cart", icon: ShoppingBag, label: "Cart", badge: totalItems },
    { href: "/orders", icon: Clock, label: "Orders" },
    { href: "/profile", icon: User, label: "Profile" }
  ];

  const vendorTabs = [
    { href: "/vendor", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/vendor/products", icon: Package, label: "Products" },
    { href: "/vendor/add-product", icon: PlusCircle, label: "Add" },
    { href: "/vendor/orders", icon: ClipboardList, label: "Orders" },
    { href: "/profile", icon: User, label: "Profile" }
  ];

  const tabs = role === 'vendor' ? vendorTabs : customerTabs;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 glass pb-safe pt-2 px-2 z-50 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.05)] border-t border-border/50">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => {
          const isActive = location === tab.href || (tab.href !== "/" && tab.href !== "/vendor" && location.startsWith(tab.href));
          const Icon = tab.icon;

          return (
            <Link key={tab.href} href={tab.href} className="relative flex flex-col items-center p-2 w-16">
              <div className="relative z-10 flex flex-col items-center gap-1">
                <div className="relative">
                  <Icon className={cn("w-6 h-6 transition-colors duration-300", isActive ? "text-white" : "text-muted-foreground")} />
                  {tab.badge ? (
                    <span className="absolute -top-1 -right-2 bg-destructive text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {tab.badge}
                    </span>
                  ) : null}
                </div>
                <span className={cn("text-[10px] font-medium transition-colors duration-300", isActive ? "text-primary" : "text-muted-foreground")}>
                  {tab.label}
                </span>
              </div>
              
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute top-1 w-12 h-10 bg-primary rounded-2xl -z-0 neu-card"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
