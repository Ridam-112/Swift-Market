import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Truck,
  Sparkles,
  ShieldCheck,
  Search,
  MapPin,
  CheckCircle2,
  PackageOpen,
  ArrowRight,
  Loader2,
  Tag,
  Star,
  Shirt,
  Smartphone,
  Laptop,
  Heart,
  Home,
  Tv,
  Gift,
  Dumbbell,
  BookOpen,
  Wrench,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { ProductCard } from "@/components/ProductCard";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useShops } from "@/hooks/useShops";
import { isSameCity } from "@/lib/deliveryEta";
import type { Product } from "@/types";

// ── Flipkart-Style Categories with Icons on Top and Text Below ─────────────────
const MALL_CATEGORIES = [
  { id: "all", label: "For You", icon: Sparkles },
  { id: "fashion", label: "Fashion", icon: Shirt },
  { id: "mobiles", label: "Mobiles", icon: Smartphone },
  { id: "electronics", label: "Electronics", icon: Laptop },
  { id: "beauty-personal-care", label: "Beauty", icon: Heart },
  { id: "home-kitchen", label: "Home", icon: Home },
  { id: "appliances", label: "Appliances", icon: Tv },
  { id: "toys-baby", label: "Toys, Baby", icon: Gift },
  { id: "food-health", label: "Food & Health", icon: PackageOpen },
  { id: "auto", label: "Auto Acc.", icon: Wrench },
  { id: "sports", label: "Sports", icon: Dumbbell },
  { id: "books-stationery", label: "Books", icon: BookOpen },
];

// ── Compact Flipkart-Style Mall Banners (SwiftMart Theme) ─────────────────────
const MALL_BANNERS = [
  {
    badge: "SUPER MALL MEGA OFFERS",
    title: "Pan-India Tech & Gadgets",
    subtitle: "Smart accessories, audio gear & peripherals with 7-Day Doorstep Courier",
    gradient: "from-indigo-950 via-purple-900 to-slate-950",
    border: "border-purple-500/25",
    badgeBg: "bg-purple-500/20 text-purple-200 border-purple-400/30",
    icon: "🎧",
    cta: "Explore Tech",
    cat: "electronics",
  },
  {
    badge: "TRENDING APPAREL",
    title: "Direct Merchant Fashion",
    subtitle: "Curated ethnic & modern styles shipped straight from verified sellers",
    gradient: "from-rose-950 via-pink-900 to-slate-950",
    border: "border-pink-500/25",
    badgeBg: "bg-pink-500/20 text-pink-200 border-pink-400/30",
    icon: "👗",
    cta: "Shop Fashion",
    cat: "fashion",
  },
  {
    badge: "PAN-INDIA COURIER",
    title: "Verified 7-Day Express Shipping",
    subtitle: "Live AWB tracking via BlueDart, Delhivery & Speed Post with 7-day guarantee",
    gradient: "from-blue-950 via-teal-900 to-slate-950",
    border: "border-teal-500/25",
    badgeBg: "bg-teal-500/20 text-teal-200 border-teal-400/30",
    icon: "📦",
    cta: "View Protection",
    cat: "all",
  },
];

export default function SuperMall() {
  const { selectedDeliveryAddress } = useAuth();
  const { allShops, getShopById, isLoading: shopsLoading } = useShops();
  const customerCity = selectedDeliveryAddress?.city || "Balurghat";

  const [activeCategory, setActiveCategory] = useState("all");
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [pincode, setPincode] = useState("733101");
  const [pincodeChecked, setPincodeChecked] = useState(false);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const observerRef = useRef<HTMLDivElement | null>(null);

  // Auto-rotate hero banner every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % MALL_BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchMallProducts = useCallback(async (cat: string, targetPage = 1, isInitial = true) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const catParam = cat !== "all" ? `&category=${encodeURIComponent(cat)}` : "";
      const searchParam = searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : "";
      const d = await api.get<{ success: boolean; products: any[]; hasMore?: boolean }>(
        `/products?status=active&limit=50&page=${targetPage}${catParam}${searchParam}`
      );

      // Only include products from outside/different city shops, or products explicitly tagged as mall items
      const rawProducts = d.products || [];
      const items = rawProducts
        .map(p => {
          const shop = p.shopId ? getShopById(p.shopId) || allShops.find(s => s.id === p.shopId) : undefined;
          const shopCity = (p as any).shopCity || (p as any).city || shop?.city || "";
          const isMallTag = p.isMall === true || (p as any).deliveryType === "mall";
          // If shopCity is known, check if it's from a different city than customerCity
          const isOutsideShop = Boolean(shopCity && !isSameCity(customerCity, shopCity));

          return {
            id: p._id || p.id,
            name: p.name,
            category: p.category,
            price: Number(p.price) || 0,
            discountedPrice: p.discountedPrice != null ? Number(p.discountedPrice) : undefined,
            unit: p.unit ?? "1 piece",
            image: p.images?.[0] ?? p.image ?? "/assets/product-placeholder.png",
            images: p.images ?? (p.image ? [p.image] : []),
            description: p.description ?? "",
            stock: Number(p.stock) || 0,
            rating: Number(p.rating) || 0,
            vendorId: p.shopId ?? "",
            shopId: p.shopId ?? "",
            shopName: p.shopName || shop?.storeName || "SwiftMart Mall Partner",
            trending: p.trending ?? false,
            colors: p.colors,
            sizes: p.sizes,
            colorImages: p.colorImages,
            isOutsideShop,
            isMallTag,
          };
        })
        .filter(p => p.isOutsideShop || p.isMallTag);

      if (isInitial) {
        setProducts(items);
      } else {
        setProducts(prev => {
          const ids = new Set(prev.map(p => p.id));
          return [...prev, ...items.filter(p => !ids.has(p.id))];
        });
      }

      setPage(targetPage);
      setHasMore(d.hasMore ?? (items.length >= 24));
    } catch {
      if (isInitial) setProducts([]);
    } finally {
      if (isInitial) setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, allShops, customerCity, getShopById]);

  useEffect(() => {
    if (!shopsLoading) {
      fetchMallProducts(activeCategory, 1, true);
    }
  }, [activeCategory, shopsLoading, fetchMallProducts]);

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchMallProducts(activeCategory, page + 1, false);
      }
    }, { threshold: 0.1, rootMargin: "300px" });

    const currentTarget = observerRef.current;
    if (currentTarget) observer.observe(currentTarget);

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasMore, loading, loadingMore, activeCategory, page, fetchMallProducts]);

  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode.trim())) return;
    setCheckingPincode(true);
    setTimeout(() => {
      setCheckingPincode(false);
      setPincodeChecked(true);
    }, 400);
  };

  const activeBanner = MALL_BANNERS[currentBannerIndex];

  return (
    <div className="min-h-screen pb-24 max-w-7xl mx-auto space-y-4 px-2 sm:px-4">
      <SEO
        title="SwiftMart Super Mall — Pan-India Direct Shopping, Fashion & Electronics"
        description="Shop fashion, lifestyle, electronics, gifts and gadgets with nationwide express delivery (7 business days) via BlueDart and India Post on SwiftMart Super Mall."
        canonical="/mall"
      />

      {/* ── 1. Flipkart-Style Horizontal Category Strip (Top Priority) ── */}
      <section aria-label="Mall Categories" className="w-full bg-card rounded-2xl neu-card p-1.5 sm:p-2 border border-border/60">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide py-1 px-1">
          {MALL_CATEGORIES.map(cat => {
            const isSelected = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex flex-col items-center justify-center min-w-[58px] sm:min-w-[72px] md:min-w-[80px] py-1.5 px-1 rounded-xl transition-all cursor-pointer relative shrink-0 group ${
                  isSelected
                    ? "text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground font-medium"
                }`}
              >
                <div
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-1 transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs scale-105"
                      : "bg-background neu-inset text-muted-foreground group-hover:text-foreground group-hover:scale-105"
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[10px] sm:text-[11px] leading-tight text-center truncate max-w-[68px] sm:max-w-[78px]">
                  {cat.label}
                </span>
                {isSelected && (
                  <motion.div
                    layoutId="activeMallCatIndicator"
                    className="absolute -bottom-1 left-2 right-2 h-0.5 bg-primary rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 2. Compact Flipkart-Style Hero Banner Carousel (SwiftMart Theme) ── */}
      <section aria-label="Featured Promotions" className="relative">
        <div
          className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br ${activeBanner.gradient} text-white p-4 sm:p-6 shadow-md border ${activeBanner.border} min-h-[135px] sm:min-h-[175px] flex flex-col justify-between transition-all duration-500`}
        >
          {/* Subtle decorative background circle */}
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/5 rounded-full pointer-events-none" />

          {/* Banner content */}
          <div className="relative z-10 max-w-xl space-y-1.5 sm:space-y-2">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold tracking-wide border ${activeBanner.badgeBg}`}>
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{activeBanner.badge}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl shrink-0">{activeBanner.icon}</span>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                {activeBanner.title}
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-white/80 line-clamp-2 max-w-md">
              {activeBanner.subtitle}
            </p>
          </div>

          {/* Bottom Bar: Guarantee tags & Carousel navigation dots */}
          <div className="relative z-10 flex items-center justify-between pt-2 mt-auto border-t border-white/10 text-[10px] sm:text-xs text-white/70">
            <div className="flex items-center gap-3 sm:gap-4 font-semibold">
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-emerald-400" /> 7 Days Delivery
              </span>
              <span className="hidden xs:flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-300" /> Replacement Guaranteed
              </span>
            </div>

            {/* Carousel navigation dots */}
            <div className="flex items-center gap-1.5">
              {MALL_BANNERS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentBannerIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    currentBannerIndex === idx
                      ? "w-5 bg-white shadow-xs"
                      : "w-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Desktop Next/Prev arrows */}
          <button
            type="button"
            onClick={() => setCurrentBannerIndex(prev => (prev - 1 + MALL_BANNERS.length) % MALL_BANNERS.length)}
            aria-label="Previous slide"
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/30 hover:bg-black/60 text-white items-center justify-center transition-all opacity-60 hover:opacity-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentBannerIndex(prev => (prev + 1) % MALL_BANNERS.length)}
            aria-label="Next slide"
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/30 hover:bg-black/60 text-white items-center justify-center transition-all opacity-60 hover:opacity-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── 3. Compact Pincode & Shipping Estimator Bar ── */}
      <section aria-label="Delivery Check" className="bg-card neu-card px-3 py-2 rounded-2xl border border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground min-w-0 w-full sm:w-auto">
          <Truck className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate">Pan-India Express Logistics • 7 Days Delivery</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <form onSubmit={handlePincodeCheck} className="flex items-center gap-1.5">
            <Input
              value={pincode}
              onChange={e => {
                setPincode(e.target.value);
                setPincodeChecked(false);
              }}
              placeholder="6-digit pincode"
              maxLength={6}
              className="w-28 h-8 text-xs font-mono font-bold rounded-xl px-2.5 bg-background neu-inset border-none"
            />
            <Button
              type="submit"
              disabled={checkingPincode || pincode.length !== 6}
              size="sm"
              className="h-8 text-[11px] px-3 rounded-xl font-bold neu-card"
            >
              {checkingPincode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Check"}
            </Button>
          </form>

          {pincodeChecked && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>7 Days to {pincode}</span>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Mall Catalog / Products Section (Immediate Visual Access) ── */}
      <section aria-label="Mall Products" className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <span>
              {activeCategory === "all" ? "Trending on Super Mall" : MALL_CATEGORIES.find(c => c.id === activeCategory)?.label || "Mall Collection"}
            </span>
          </h2>
          {!loading && products.length > 0 && (
            <span className="text-[11px] text-muted-foreground font-semibold">
              {products.length} item{products.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-56 bg-muted/60 rounded-2xl animate-pulse neu-inset" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {products.map((prod, idx) => (
                <div key={prod.id} className="relative">
                  <ProductCard product={prod} index={idx} isMall={true} />
                </div>
              ))}
            </div>

            {/* Lazy loader sentinel */}
            <div ref={observerRef} className="h-6 w-full" />

            {loadingMore && (
              <div className="py-4 flex flex-col items-center justify-center gap-1.5">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Loading more Super Mall items...</span>
              </div>
            )}

            {hasMore && !loadingMore && (
              <div className="py-3 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => fetchMallProducts(activeCategory, page + 1, false)}
                  className="rounded-full neu-card text-xs font-semibold px-6 hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Load More Mall Products
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 sm:py-16 text-center bg-card rounded-3xl neu-card p-6 sm:p-8 space-y-4 max-w-lg mx-auto border border-border/60 shadow-xs">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto text-2xl sm:text-3xl neu-inset">
              🛍️
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-black text-foreground">
                Pan-India Super Mall — Coming Soon!
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Currently all active stores on SwiftMart are verified local neighborhood stores in <span className="font-semibold text-foreground">{customerCity}</span> delivering fresh in <span className="text-primary font-bold">30–60 minutes</span>. Curated regional merchants and Pan-India direct e-commerce with 7-day courier delivery will be live here soon!
              </p>
            </div>
            <div className="pt-2">
              <Link href="/stores">
                <Button className="rounded-xl font-bold text-xs h-11 px-6 neu-card gap-2 w-full sm:w-auto">
                  <ShoppingBag className="w-4 h-4" /> Explore Local Stores (30–60m Delivery)
                </Button>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ── 5. Compact Trust & Logistics Strip ── */}
      <section aria-label="Mall Trust Guarantee" className="mt-8 bg-card/60 border border-border/50 rounded-2xl p-4 sm:p-6 space-y-3">
        <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-primary" />
          <span>How SwiftMart Super Mall Delivery Works</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-background/80 p-3 rounded-xl border border-border/40 space-y-0.5 neu-inset">
            <strong className="text-foreground block font-bold">🇮🇳 Pan-India Network</strong>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Dispatched directly via BlueDart, India Post Speed Post, or Delhivery with 7-day delivery.
            </p>
          </div>
          <div className="bg-background/80 p-3 rounded-xl border border-border/40 space-y-0.5 neu-inset">
            <strong className="text-foreground block font-bold">📦 Live AWB Tracking</strong>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Every parcel comes with a verified tracking number (AWB) to track transit steps to your doorstep.
            </p>
          </div>
          <div className="bg-background/80 p-3 rounded-xl border border-border/40 space-y-0.5 neu-inset">
            <strong className="text-foreground block font-bold">🛡️ Buyer Protection</strong>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Enjoy 7-day doorstep replacement with dedicated SwiftMart customer support.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
