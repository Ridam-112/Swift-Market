import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Search, MapPin, ShoppingBag, Store, Clock, User, Shield, LayoutDashboard, Package, ClipboardList, Plus, Bell, LogIn, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useProducts } from "@/hooks/useProducts";
import { formatINR } from "@/lib/currency";
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
  const [campaign, setCampaign] = useState<{
    isActive: boolean;
    tabName: string;
    theme: {
      badgeTitle?: string;
      badgeSubtitle?: string;
      badgeEmoji?: string;
      badgeBgColor?: string;
      badgeTextColor?: string;
      searchPlaceholders?: string[];
    };
  } | null>(null);

  useEffect(() => {
    api.get<{ success: boolean; campaign: any }>("/seasonal-campaign")
      .then(res => {
        if (res.success && res.campaign?.isActive) {
          setCampaign(res.campaign);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    let lastFetchedAt = 0;
    const fetchUnread = () => {
      api.get<{ success: boolean; unreadCount: number }>("/notifications")
        .then(d => {
          setUnreadCount(d.unreadCount ?? 0);
          lastFetchedAt = Date.now();
        })
        .catch(() => {});
    };
    fetchUnread();
    // Poll every 30 s (only when tab is visible) instead of every 5 s.
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchUnread();
    }, 30_000);
    // Also refresh immediately when the user switches back to this tab.
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetchedAt > 15_000) {
        fetchUnread();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user]);

  const { products } = useProducts();
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchSuggestions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q || q.length < 1) return [];
    return products.filter(p => {
      const name = (p.name || "").toLowerCase();
      const cat = (p.category || "").toLowerCase();
      const shop = (p.shopName || "").toLowerCase();
      return name.includes(q) || cat.includes(q) || shop.includes(q);
    }).slice(0, 6);
  }, [products, searchQuery]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      setSearchFocused(false);
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else if (e.key === "Escape") {
      setSearchFocused(false);
    }
  };

  const handleSearchClick = () => {
    if (searchQuery.trim()) {
      setSearchFocused(false);
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const PLACEHOLDERS = [
    "Search 'Fresh Milk, Bread, Butter' 🥛",
    "Search 'Fresh Fruits & Vegetables' 🥦",
    "Search 'Sweets, Snacks & Chocolates' 🍬",
    "Search 'Cold Drinks & Juices' 🧃",
    "Search 'Atta, Rice & Dal' 🌾",
    "Search 'Medicines & Essentials' 💊",
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 w-full px-3 py-2.5 md:px-6 bg-gradient-to-r from-[#F4EBFF]/95 via-[#EFE6FD]/95 to-[#FAF5FF]/95 dark:from-[#1C1328]/95 dark:via-[#170E22]/95 dark:to-[#140B1D]/95 backdrop-blur-md border-b border-purple-200/50 dark:border-purple-900/40 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-2 md:gap-4">
          {/* Logo & 10-MIN Badge */}
          <div className="shrink-0 flex items-center gap-2">
            <Link href="/" className="flex items-center">
              <img src="/logo.png" alt="SwiftMart" className="h-9 w-auto object-contain" />
            </Link>
            <div className="hidden sm:flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm animate-pulse">
              <span>⚡ 10 MINS</span>
            </div>
          </div>

          {/* Location pill — customer only, takes remaining space on mobile */}
          {role === 'customer' && (
            <button
              onClick={() => setIsLocationOpen(true)}
              className="flex-1 min-w-0 flex items-center gap-1.5 text-sm bg-white/70 dark:bg-card/70 border border-purple-200/60 dark:border-purple-900/40 shadow-sm rounded-full px-2.5 py-1.5 hover:bg-white dark:hover:bg-card transition-colors md:flex-none md:max-w-[210px]"
            >
              <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex flex-col items-start text-left min-w-0 flex-1">
                <div className="flex items-center gap-1 w-full">
                  <span className="font-extrabold text-[11px] leading-none text-foreground truncate">
                    {selectedDeliveryAddress?.label || "Deliver in 10 mins"}
                  </span>
                </div>
                <span className="text-muted-foreground text-[10px] truncate w-full leading-none mt-0.5 font-medium">
                  {selectedDeliveryAddress?.city || "Select Location"}
                </span>
              </div>
            </button>
          )}

          {/* Desktop search bar */}
          {role === 'customer' && (
            <div className="flex-1 max-w-xl hidden md:flex gap-3 items-center">
              <Link href="/shops" className="flex items-center gap-1.5 font-semibold hover:text-purple-600 transition-colors text-foreground shrink-0 text-sm">
                <Store className="w-4 h-4 text-purple-600" /> Shops
              </Link>
              <div ref={searchContainerRef} className="relative flex-1 flex items-center">
                <button onClick={handleSearchClick} aria-label="Search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10">
                  <Search className="w-4 h-4" aria-hidden="true" />
                </button>
                <Input
                  className={cn(
                    "w-full pl-9 bg-white/80 dark:bg-card/80 border border-purple-200/60 dark:border-purple-900/40 h-10 rounded-full focus-visible:ring-2 focus-visible:ring-purple-500 text-foreground text-sm transition-all shadow-inner placeholder:text-muted-foreground/80 placeholder:transition-opacity",
                    campaign?.isActive && "pr-28"
                  )}
                  placeholder={
                    campaign?.theme?.searchPlaceholders?.[0] || PLACEHOLDERS[placeholderIndex]
                  }
                  aria-label="Search groceries and products"
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                />
                {campaign?.isActive && (
                  <Link
                    href="/festive"
                    className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs shadow-sm border transition-transform hover:scale-105"
                    style={{
                      backgroundColor: campaign.theme?.badgeBgColor || "#FFF0F2",
                      color: campaign.theme?.badgeTextColor || "#881337",
                      borderColor: (campaign.theme?.badgeTextColor || "#881337") + "30",
                    }}
                  >
                    <span className="text-xs">{campaign.theme?.badgeEmoji || "🎀"}</span>
                    <div className="flex flex-col text-left leading-none">
                      <span className="text-[10px] font-extrabold">{campaign.theme?.badgeTitle || "Rakhi"}</span>
                      <span className="text-[8px] opacity-80">{campaign.theme?.badgeSubtitle || "Special"}</span>
                    </div>
                  </Link>
                )}

                {/* Autocomplete Suggestions Dropdown */}
                {searchFocused && searchQuery.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl p-2 z-[100] space-y-1">
                    {searchSuggestions.length > 0 ? (
                      <>
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Suggested Products
                        </div>
                        {searchSuggestions.map((prod) => (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => {
                              setSearchFocused(false);
                              setLocation(`/product/${prod.id}`);
                            }}
                            className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-muted text-left transition-colors group cursor-pointer"
                          >
                            <img
                              src={prod.image || "/assets/product-placeholder.png"}
                              alt=""
                              className="w-8 h-8 object-contain rounded-lg bg-card p-0.5 border border-border/40 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground truncate group-hover:text-primary">
                                {prod.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {prod.category} {prod.shopName ? `· ${prod.shopName}` : ""}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-primary">
                                {formatINR(prod.discountedPrice ?? prod.price)}
                              </span>
                            </div>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setSearchFocused(false);
                            setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                          }}
                          className="w-full mt-1 p-2 text-center text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>View all results for "{searchQuery}"</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        No matching products found for "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Guest login prompt — shown only when not logged in */}
          {!user && (
            <div className="ml-auto shrink-0">
              <Link href="/auth">
                <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold text-sm px-4 py-2 rounded-2xl neu-card shadow-none hover:opacity-90 transition-opacity">
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Login</span>
                  <span className="hidden md:inline">/ Sign Up</span>
                </button>
              </Link>
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
              <Link href="/notifications" aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"} className="relative p-2 rounded-full neu-card">
                <Bell aria-hidden="true" className={cn("w-4 h-4", location.startsWith("/notifications") ? "text-primary" : "text-foreground")} />
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
                <Link href="/cart" aria-label={totalItems > 0 ? `Shopping cart (${totalItems} items)` : "Shopping cart"} className="relative p-2 rounded-full neu-card">
                  <ShoppingBag aria-hidden="true" className="w-4 h-4 text-foreground" />
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
