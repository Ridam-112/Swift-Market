import { Link, useLocation } from "wouter";
import { Home, LayoutGrid, Search, Clock, User, LayoutDashboard, Package, PlusCircle, ClipboardList, ShoppingBag, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { formatINR } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function BottomNav() {
  const [location] = useLocation();
  const { role } = useAuth();
  const { totalItems, subtotal } = useCart();

  type Tab = { href: string; icon: React.ComponentType<{ className?: string }>; label: string; badge?: number };

  const customerTabs: Tab[] = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/categories", icon: LayoutGrid, label: "Categories" },
    { href: "/search", icon: Search, label: "Search" },
    { href: "/orders", icon: Clock, label: "Orders" },
    { href: "/profile", icon: User, label: "Account" },
  ];

  const vendorTabs: Tab[] = [
    { href: "/vendor", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/vendor/products", icon: Package, label: "Products" },
    { href: "/vendor/add-product", icon: PlusCircle, label: "Add" },
    { href: "/vendor/orders", icon: ClipboardList, label: "Orders" },
    { href: "/profile", icon: User, label: "Profile" }
  ];

  const tabs = role === 'vendor' ? vendorTabs : customerTabs;
  const isCustomer = role !== 'vendor' && role !== 'delivery';
  const showStickyCart = isCustomer && totalItems > 0 && !location.startsWith("/cart") && !location.startsWith("/checkout");

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      {/* ── Contextual Sticky Cart Bar (Requirement #22) ── */}
      <AnimatePresence>
        {showStickyCart && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="px-3 pb-2 pointer-events-auto"
          >
            <Link
              href="/cart"
              className="w-full flex items-center justify-between bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl shadow-xl shadow-primary/25 border border-primary-foreground/10 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
                <span>{totalItems} item{totalItems > 1 ? "s" : ""} in cart</span>
              </div>
              <div className="flex items-center gap-1.5 font-black text-xs">
                <span>View Cart · {formatINR(subtotal)}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Navigation Bar ── */}
      <nav className="glass pb-safe pt-1.5 px-2 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)] border-t border-border/50 pointer-events-auto">
        <div className="flex justify-around items-center">
          {tabs.map((tab) => {
            const isActive = location === tab.href || (tab.href !== "/" && tab.href !== "/vendor" && location.startsWith(tab.href));
            const Icon = tab.icon;

            return (
              <Link key={tab.href} href={tab.href} className="relative flex flex-col items-center py-1.5 px-2 w-16">
                <div className="relative z-10 flex flex-col items-center gap-0.5">
                  <div className="relative">
                    <Icon className={cn("w-5 h-5 transition-colors duration-200", isActive ? "text-primary" : "text-muted-foreground")} />
                    {tab.badge ? (
                      <span className="absolute -top-1 -right-2 bg-destructive text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {tab.badge}
                      </span>
                    ) : null}
                  </div>
                  <span className={cn("text-[10px] font-semibold transition-colors duration-200", isActive ? "text-primary" : "text-muted-foreground")}>
                    {tab.label}
                  </span>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute inset-x-2 top-0.5 bottom-0.5 rounded-xl bg-primary/10 -z-0"
                    initial={false}
                    transition={{ type: "spring", stiffness: 350, damping: 35 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
