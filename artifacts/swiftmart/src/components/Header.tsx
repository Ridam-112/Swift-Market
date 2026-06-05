import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, MapPin, ShoppingBag, Store, Clock, User, Shield, LayoutDashboard, Package, ClipboardList, Plus, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { AddressForm } from "./AddressForm";
import { AddressCard } from "./AddressCard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export function Header() {
  const { user, role, isAdmin, selectedDeliveryAddress, setSelectedDeliveryAddress, addAddress } = useAuth();
  const { totalItems } = useCart();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      api.get<{ success: boolean; unreadCount: number }>("/notifications")
        .then(d => setUnreadCount(d.unreadCount ?? 0))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchClick = () => {
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass w-full px-3 py-2.5 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 md:gap-4">
          {/* Logo — always visible */}
          <Link href="/" className="shrink-0 flex items-center">
            <img src="/logo.png" alt="SwiftMart" className="h-9 w-auto object-contain" />
          </Link>

          {/* Location pill — customer only, takes remaining space on mobile */}
          {role === 'customer' && (
            <button
              onClick={() => setIsLocationOpen(true)}
              className="flex-1 min-w-0 flex items-center gap-1.5 text-sm bg-background/50 rounded-full px-2.5 py-1.5 neu-inset hover:bg-background/80 transition-colors md:flex-none md:max-w-[200px]"
            >
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="flex flex-col items-start text-left min-w-0">
                <span className="font-bold text-[10px] leading-none text-foreground">
                  {selectedDeliveryAddress?.label || "Deliver to"}
                </span>
                <span className="text-muted-foreground text-[10px] truncate w-full leading-none mt-0.5">
                  {selectedDeliveryAddress?.city || "Select Location"}
                </span>
              </div>
            </button>
          )}

          {/* Desktop search bar */}
          {role === 'customer' && (
            <div className="flex-1 max-w-xl hidden md:flex gap-3 items-center">
              <Link href="/shops" className="flex items-center gap-1.5 font-medium hover:text-primary transition-colors text-foreground shrink-0 text-sm">
                <Store className="w-4 h-4" /> Shops
              </Link>
              <div className="relative flex-1">
                <button onClick={handleSearchClick} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <Search className="w-4 h-4" />
                </button>
                <Input
                  className="w-full pl-9 bg-background/50 neu-inset border-none h-9 rounded-full focus-visible:ring-1 focus-visible:ring-primary/50 text-foreground text-sm"
                  placeholder="Search groceries, vegetables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                />
              </div>
            </div>
          )}

          {/* Right side — icons + desktop nav */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0 ml-auto md:ml-0">
            {/* Desktop nav links */}
            {role === 'customer' && (
              <nav className="hidden md:flex items-center gap-1">
                {[
                  { href: "/", icon: Store, label: "Home" },
                  { href: "/orders", icon: Clock, label: "Orders" },
                  { href: "/profile", icon: User, label: "Profile" },
                ].map(({ href, icon: Icon, label }) => {
                  const isActive = href === "/" ? location === "/" : location.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary/10 text-primary neu-inset"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  );
                })}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all",
                      location.startsWith("/admin")
                        ? "bg-primary/10 text-primary neu-inset"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </Link>
                )}
              </nav>
            )}

            {role === 'vendor' && (
              <nav className="hidden md:flex items-center gap-1">
                {[
                  { href: "/vendor", icon: LayoutDashboard, label: "Dashboard" },
                  { href: "/vendor/products", icon: Package, label: "Products" },
                  { href: "/vendor/orders", icon: ClipboardList, label: "Orders" },
                  { href: "/profile", icon: User, label: "Profile" },
                ].map(({ href, icon: Icon, label }) => {
                  const isActive = href === "/vendor" ? location === "/vendor" : location.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary/10 text-primary neu-inset"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  );
                })}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all",
                      location.startsWith("/admin")
                        ? "bg-primary/10 text-primary neu-inset"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </Link>
                )}
              </nav>
            )}

            {/* Notification bell — for customer and vendor */}
            {user && (role === 'customer' || role === 'vendor') && (
              <Link href="/notifications" className="relative p-2 rounded-full neu-card">
                <Bell className={cn("w-4 h-4", location.startsWith("/notifications") ? "text-primary" : "text-foreground")} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* Mobile search + cart icons */}
            {role === 'customer' && (
              <>
                <Link href="/search" className="md:hidden p-2 rounded-full neu-card">
                  <Search className="w-4 h-4 text-foreground" />
                </Link>
                <Link href="/cart" className="relative p-2 rounded-full neu-card">
                  <ShoppingBag className="w-4 h-4 text-foreground" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <Dialog open={isLocationOpen} onOpenChange={setIsLocationOpen}>
        <DialogContent className="sm:max-w-md bg-card neu-card border-none">
          <DialogHeader>
            <DialogTitle className="text-foreground">Deliver to</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {!showAddressForm ? (
              <>
                <div className="grid gap-3">
                  {user?.addresses.map(addr => (
                    <AddressCard 
                      key={addr.id}
                      address={addr}
                      selected={selectedDeliveryAddress?.id === addr.id}
                      onClick={() => {
                        setSelectedDeliveryAddress(addr);
                        setIsLocationOpen(false);
                      }}
                    />
                  ))}
                  {(!user?.addresses || user.addresses.length === 0) && (
                    <div className="text-center p-4 bg-background rounded-2xl neu-inset text-muted-foreground">
                      No addresses saved. Please add one.
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full text-primary border-primary/20 hover:bg-primary/5 rounded-xl h-12 neu-inset shadow-none"
                  onClick={() => setShowAddressForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add new address
                </Button>
              </>
            ) : (
              <AddressForm 
                onSubmit={(addr) => {
                  addAddress(addr);
                  setSelectedDeliveryAddress(addr);
                  setShowAddressForm(false);
                  setIsLocationOpen(false);
                  toast.success("Address added successfully");
                }}
                onCancel={() => setShowAddressForm(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
