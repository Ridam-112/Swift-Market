import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import {
  Search,
  PackageSearch,
  X,
  Clock,
  Sparkles,
  ChevronDown,
  Store,
  Wrench,
  Layers,
  Star,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useShops } from "@/hooks/useShops";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonProductGrid } from "@/components/SkeletonProductCard";
import { Input } from "@/components/ui/input";
import { categories } from "@/data/categories";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { getShopUrl } from "@/lib/shopUrl";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

const PAGE_SIZE = 24;

interface ServiceCatalogItem {
  id: string;
  title: string;
  subtitle: string;
  icon?: string;
  badge?: string;
  presets?: string[];
  brandsCovered?: string;
}

const FALLBACK_SERVICES: ServiceCatalogItem[] = [
  {
    id: "tv-repair",
    title: "LED / Smart TV Repair",
    subtitle: "Screen, power supply, motherboard & backlight repair by certified technicians.",
    icon: "📺",
    badge: "Most Popular",
    presets: ["Screen display blank", "Sound but no picture", "Motherboard issue"],
    brandsCovered: "Samsung, LG, Sony, Mi, TCL, Realme",
  },
  {
    id: "ac-repair",
    title: "AC Servicing & Gas Charging",
    subtitle: "Wet servicing, cooling coil cleaning, PCB repair & gas refill.",
    icon: "❄️",
    badge: "Seasonal",
    presets: ["Not cooling", "Water leakage", "Gas charging", "Deep wet service"],
    brandsCovered: "Voltas, Daikin, LG, Blue Star, Carrier",
  },
  {
    id: "refrigerator-repair",
    title: "Refrigerator & Freezer Repair",
    subtitle: "Single/Double door compressor, gas charge, thermostat replacement.",
    icon: "🧊",
    presets: ["Not cooling properly", "Compressor noise", "Freezer ice jamming"],
    brandsCovered: "LG, Samsung, Whirlpool, Godrej, Haier",
  },
  {
    id: "fan-repair",
    title: "Ceiling & Exhaust Fan Repair",
    subtitle: "Coil winding, capacitor, bearing replacement & safe uninstallation.",
    icon: "🌀",
    presets: ["Fan running slow", "Noisy sound", "Complete dead / not spinning"],
    brandsCovered: "Usha, Orient, Havells, Crompton, Bajaj",
  },
  {
    id: "microwave-repair",
    title: "Microwave Oven Repair",
    subtitle: "Heating issue, plate not rotating, spark inside & keypad repair.",
    icon: "🍲",
    presets: ["No heating", "Spark inside", "Buttons not working"],
    brandsCovered: "IFB, Samsung, LG, Morphy Richards",
  },
  {
    id: "sound-repair",
    title: "Sound System & Home Theatre",
    subtitle: "Amplifier repair, Bluetooth connectivity & woofer speaker fixing.",
    icon: "🔊",
    presets: ["Distorted audio", "No sound from woofer", "Bluetooth connection fail"],
    brandsCovered: "Sony, JBL, Philips, F&D, Zebronics",
  },
];

type SearchTab = "all" | "products" | "stores" | "services" | "categories";

export default function SearchPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialQuery = searchParams.get("q") || "";

  const { user } = useAuth();
  const { products, isLoading: productsLoading } = useProducts();
  const { shops, isLoading: shopsLoading } = useShops();
  const { searches, addSearch, removeSearch, clearAll } = useRecentSearches(user?.id);

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [services, setServices] = useState<ServiceCatalogItem[]>(FALLBACK_SERVICES);

  // Synchronize query when URL parameter changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    if (q !== query) {
      setQuery(q);
      setVisibleCount(PAGE_SIZE);
    }
  }, [location]);

  // Load backend service catalog
  useEffect(() => {
    api.get<{ success: boolean; services: ServiceCatalogItem[] }>("/services/catalog")
      .then(res => {
        if (res.success && res.services?.length) {
          setServices(res.services);
        }
      })
      .catch(() => {});
  }, []);

  // Reset pagination on query or tab change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, activeTab]);

  // Debounced recent search recorder
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      addSearch(trimmed);
    }, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [query, addSearch]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
  };

  const queryTerms = useMemo(() => {
    return query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  }, [query]);

  // 1. Filtered Products
  const filteredProducts = useMemo(() => {
    if (queryTerms.length === 0) return products;
    return products.filter((p) => {
      const pName = (p.name || "").toLowerCase();
      const pDesc = (p.description || "").toLowerCase();
      const pCat = (p.category || "").toLowerCase();
      const pShop = (p.shopName || "").toLowerCase();
      const haystack = `${pName} ${pDesc} ${pCat} ${pShop}`;
      return queryTerms.every((term) => haystack.includes(term));
    });
  }, [products, queryTerms]);

  // 2. Filtered Stores
  const filteredStores = useMemo(() => {
    if (queryTerms.length === 0) return shops;
    return shops.filter((s) => {
      const sName = (s.storeName || s.name || "").toLowerCase();
      const sCat = (s.category || "").toLowerCase();
      const sAddress = (s.address || "").toLowerCase();
      const sCity = (s.city || "").toLowerCase();
      const haystack = `${sName} ${sCat} ${sAddress} ${sCity}`;
      return queryTerms.every((term) => haystack.includes(term));
    });
  }, [shops, queryTerms]);

  // 3. Filtered Services
  const filteredServices = useMemo(() => {
    if (queryTerms.length === 0) return services;
    return services.filter((srv) => {
      const title = (srv.title || "").toLowerCase();
      const sub = (srv.subtitle || "").toLowerCase();
      const brands = (srv.brandsCovered || "").toLowerCase();
      const presets = (srv.presets || []).join(" ").toLowerCase();
      const haystack = `${title} ${sub} ${brands} ${presets}`;
      return queryTerms.some((term) => haystack.includes(term));
    });
  }, [services, queryTerms]);

  // 4. Filtered Categories
  const filteredCategories = useMemo(() => {
    if (queryTerms.length === 0) return categories;
    return categories.filter((cat) => {
      const name = (cat.name || "").toLowerCase();
      const id = (cat.id || "").toLowerCase();
      const haystack = `${name} ${id}`;
      return queryTerms.some((term) => haystack.includes(term));
    });
  }, [queryTerms]);

  const totalResultsCount =
    (queryTerms.length > 0 ? filteredProducts.length : 0) +
    (queryTerms.length > 0 ? filteredStores.length : 0) +
    (queryTerms.length > 0 ? filteredServices.length : 0) +
    (queryTerms.length > 0 ? filteredCategories.length : 0);

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const hasMore = visibleCount < filteredProducts.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  const searchTitle = query ? `"${query}" — Universal Search` : "Search Stores, Products & Services";
  const searchDesc = `Search across local stores, fresh groceries, restaurants, Super Mall items, and appliance repair services on SwiftMart.`;

  return (
    <div className="pb-24 pt-4 px-3 sm:px-4 max-w-7xl mx-auto space-y-6 min-h-[100dvh]">
      <SEO title={searchTitle} description={searchDesc} canonical="/search" noIndex={!!query} />

      {/* ── Universal Search Bar ── */}
      <div className="sticky top-[60px] md:top-[72px] z-30 bg-background/95 backdrop-blur-xl py-3 -mx-3 px-3 sm:-mx-4 sm:px-4 border-b border-border/40 shadow-xs">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="w-full pl-11 pr-11 bg-card neu-inset border-none h-12 rounded-2xl text-base focus-visible:ring-2 focus-visible:ring-primary shadow-inner"
            placeholder="Search products, stores or services (e.g. rice, cake, AC repair, store name)..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
          />
          {query.length > 0 && (
            <button
              onClick={() => {
                setQuery("");
                window.history.replaceState({}, "", "/search");
              }}
              aria-label="Clear query"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Universal Tabs (Requirement #15) ── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-3 max-w-2xl mx-auto px-1">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
              activeTab === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "products"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Products</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/20 font-black">
              {filteredProducts.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stores")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "stores"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            <Store className="w-3 h-3" />
            <span>Stores</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/20 font-black">
              {filteredStores.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("services")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "services"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            <Wrench className="w-3 h-3" />
            <span>Services</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/20 font-black">
              {filteredServices.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "categories"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="w-3 h-3" />
            <span>Categories</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/20 font-black">
              {filteredCategories.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── Recent Searches (when not querying) ── */}
      <AnimatePresence>
        {!query && searches.length > 0 && (
          <motion.div
            key="recent"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Recent Searches</span>
              </div>
              <button
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                Clear all
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {searches.map((term) => (
                <div
                  key={term}
                  className="flex items-center gap-1.5 bg-card neu-card rounded-full px-3 py-1.5 whitespace-nowrap shrink-0 group border border-border/40"
                >
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                  <button
                    onClick={() => {
                      setQuery(term);
                      setLocation(`/search?q=${encodeURIComponent(term)}`);
                    }}
                    className="text-xs sm:text-sm text-foreground hover:text-primary font-medium transition-colors cursor-pointer"
                  >
                    {term}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSearch(term);
                    }}
                    aria-label={`Remove search ${term}`}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Popular Search Tags (when not querying) ── */}
      {!query && (
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-1.5 mb-2.5">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Popular Searches</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "Atta & Rice",
              "Mustard Oil",
              "Sweets & Rosogolla",
              "AC Servicing",
              "TV Repair",
              "Cold Drinks",
              "Cake & Bakery",
              "Stationery",
              "Fashion & Dresses",
            ].map((term) => (
              <button
                key={term}
                onClick={() => {
                  setQuery(term);
                  setLocation(`/search?q=${encodeURIComponent(term)}`);
                }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-muted/80 hover:bg-primary/10 hover:text-primary border border-border/50 transition-colors cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Results View ── */}
      <div className="max-w-5xl mx-auto space-y-8">
        {productsLoading || shopsLoading ? (
          <div className="space-y-4">
            <div className="h-6 w-48 bg-muted animate-pulse rounded-md" />
            <SkeletonProductGrid count={8} />
          </div>
        ) : query && totalResultsCount === 0 ? (
          /* Empty State with proper guidance (Requirement #15) */
          <div className="py-10">
            <EmptyState
              icon={PackageSearch}
              title={`No results for "${query}"`}
              description="We couldn't find an exact match across products, stores, services, or categories."
              action={
                <div className="space-y-4 max-w-md mx-auto pt-2 text-left">
                  <div className="p-4 rounded-2xl bg-card border border-border/60 neu-card space-y-2 text-xs text-muted-foreground">
                    <p className="font-bold text-foreground">Helpful suggestions:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Check your spelling for any typos</li>
                      <li>Try broader keywords like "dal", "oil", or "repair"</li>
                      <li>Browse our verified neighborhood stores or book an appliance service</li>
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    <Link href="/stores">
                      <Button variant="default" className="rounded-full text-xs font-bold gap-1.5">
                        <Store className="w-3.5 h-3.5" /> Browse Stores
                      </Button>
                    </Link>
                    <Link href="/services">
                      <Button variant="outline" className="rounded-full text-xs font-bold gap-1.5">
                        <Wrench className="w-3.5 h-3.5" /> Book Service
                      </Button>
                    </Link>
                    <Button
                      onClick={() => {
                        setQuery("");
                        setActiveTab("all");
                        setLocation("/search");
                      }}
                      variant="ghost"
                      className="rounded-full text-xs font-semibold"
                    >
                      Clear Search
                    </Button>
                  </div>
                </div>
              }
            />
          </div>
        ) : (
          <>
            {/* ── 1. Matching Categories (when 'all' or 'categories' tab) ── */}
            {(activeTab === "all" || activeTab === "categories") && filteredCategories.length > 0 && query && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm sm:text-base text-foreground flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-primary" />
                    Matching Categories ({filteredCategories.length})
                  </h3>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {filteredCategories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/category/${cat.id}`}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border/60 hover:border-primary/50 text-xs font-bold text-foreground transition-all shrink-0 neu-card"
                    >
                      <span className="text-base">{cat.icon || "🛍️"}</span>
                      <span>{cat.name}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── 2. Matching Stores (when 'all' or 'stores' tab) ── */}
            {(activeTab === "all" || activeTab === "stores") && filteredStores.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm sm:text-base text-foreground flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-primary" />
                    {query ? `Matching Stores (${filteredStores.length})` : "Local Stores"}
                  </h3>
                  {filteredStores.length > 4 && activeTab === "all" && (
                    <button
                      onClick={() => setActiveTab("stores")}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      View all ({filteredStores.length}) →
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(activeTab === "all" ? filteredStores.slice(0, 3) : filteredStores).map((shop) => (
                    <Link
                      key={shop.id}
                      href={getShopUrl(shop)}
                      className="p-3.5 rounded-2xl bg-card border border-border/60 neu-card hover:border-primary/40 transition-all flex items-center gap-3.5 block"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-background neu-inset shrink-0">
                        <img
                          src={shop.image || "/assets/product-placeholder.png"}
                          alt={shop.storeName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-foreground truncate">{shop.storeName}</h4>
                        <p className="text-[11px] text-muted-foreground truncate">{shop.category}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            <Star className="w-3 h-3 fill-current" />
                            {shop.rating ? Number(shop.rating).toFixed(1) : "New"}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600">
                            Verified Store
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── 3. Matching Services (when 'all' or 'services' tab) ── */}
            {(activeTab === "all" || activeTab === "services") && filteredServices.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm sm:text-base text-foreground flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-primary" />
                    {query ? `Service Corner Services (${filteredServices.length})` : "Home Appliance Services"}
                  </h3>
                  <Link href="/services" className="text-xs font-bold text-primary hover:underline">
                    Service Desk →
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(activeTab === "all" ? filteredServices.slice(0, 3) : filteredServices).map((srv) => (
                    <Link
                      key={srv.id}
                      href="/services"
                      className="p-4 rounded-2xl bg-card border border-border/60 neu-card hover:border-blue-500/50 transition-all flex flex-col justify-between block"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{srv.icon || "🛠️"}</span>
                          {srv.badge && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                              {srv.badge}
                            </span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-sm text-foreground">{srv.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {srv.subtitle}
                        </p>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-bold text-blue-600">
                        <span>Book Technician</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── 4. Matching Products (when 'all' or 'products' tab) ── */}
            {(activeTab === "all" || activeTab === "products") && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm sm:text-base text-foreground">
                    {query ? `Matching Products (${filteredProducts.length})` : "All Products"}
                  </h3>
                  {filteredProducts.length > 0 && (
                    <span className="text-xs text-muted-foreground font-medium">
                      Showing {Math.min(visibleCount, filteredProducts.length)} of {filteredProducts.length}
                    </span>
                  )}
                </div>

                {filteredProducts.length > 0 ? (
                  <div className="space-y-6">
                    <ProductGrid products={visibleProducts} />
                    {hasMore && (
                      <div className="flex flex-col items-center justify-center pt-2 pb-6">
                        <Button
                          onClick={handleLoadMore}
                          variant="outline"
                          className="rounded-full px-6 py-2 bg-card neu-card shadow-sm text-xs sm:text-sm font-bold flex items-center gap-2 border border-border/60 hover:bg-muted"
                        >
                          <span>Show More Products ({filteredProducts.length - visibleCount} remaining)</span>
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  activeTab === "products" && (
                    <EmptyState
                      icon={PackageSearch}
                      title="No products matched"
                      description={`No individual products matched "${query}". Check other tabs above for matching stores or services.`}
                    />
                  )
                )}
              </section>
            )}
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
