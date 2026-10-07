import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Truck,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  PackageOpen,
  ArrowRight,
  ArrowDown,
  Loader2,
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
  Armchair,
  Bike,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Tag,
  Star,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { ProductCard } from "@/components/ProductCard";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useShops } from "@/hooks/useShops";
import { isSameCity } from "@/lib/deliveryEta";
import type { Product } from "@/types";

// ── Flipkart Categories (Icon Directly on Top, Label Below, Active Underline) ─
const MALL_CATEGORIES = [
  { id: "all", label: "For You", icon: Sparkles },
  { id: "fashion", label: "Fashion", icon: Shirt },
  { id: "mobiles", label: "Mobiles", icon: Smartphone },
  { id: "electronics", label: "Electronics", icon: Laptop },
  { id: "beauty-personal-care", label: "Beauty", icon: Heart },
  { id: "home-kitchen", label: "Home", icon: Home },
  { id: "appliances", label: "Appliances", icon: Tv },
  { id: "toys-baby", label: "Toys, baby...", icon: Gift },
  { id: "food-health", label: "Food & H...", icon: PackageOpen },
  { id: "auto", label: "Auto Acc...", icon: Wrench },
  { id: "sports", label: "Sports & ...", icon: Dumbbell },
  { id: "furniture", label: "Furniture", icon: Armchair },
  { id: "books-stationery", label: "Books", icon: BookOpen },
  { id: "two-wheeler", label: "2 Wheele...", icon: Bike },
];

// ── High-Impact Flipkart-Style Promotional Banners (SwiftMart Theme) ─────────
const MALL_BANNERS = [
  {
    id: "banner-electronics",
    badge: "THE BIG MALL DAYS",
    badgeSub: "STARTS TODAY",
    title: "Electronics & Tech Fest",
    subtitle: "Galaxy series, audio gear & peripherals with 7-Day Doorstep Courier",
    priceTag: "Starting from ₹299*",
    bankOffer: "ICICI & AXIS Bank • 10% Instant Savings",
    gradient: "from-blue-900 via-indigo-950 to-slate-950",
    border: "border-blue-500/30",
    cat: "electronics",
    promoCode: "TECH10",
    glowColor: "rgba(37, 99, 235, 0.25)",
  },
  {
    id: "banner-mobiles",
    badge: "FLAGSHIP LAUNCH FEST",
    badgeSub: "EARLY ACCESS",
    title: "Maa Laxmi & Online Hub Tech Deals",
    subtitle: "Smartphones, chargers & accessories direct from verified partners",
    priceTag: "Galaxy S25 From ₹57,999",
    bankOffer: "Now Or Never • Prices Won't Be This Low Again",
    gradient: "from-purple-900 via-indigo-950 to-slate-950",
    border: "border-purple-500/30",
    cat: "mobiles",
    promoCode: "MALLSALE",
    glowColor: "rgba(147, 51, 234, 0.25)",
  },
  {
    id: "banner-fashion",
    badge: "DIRECT MERCHANT SPOTLIGHT",
    badgeSub: "VERIFIED PARTNER",
    title: "Sampa Enterprise & Trending Apparel",
    subtitle: "Ethnic Sarees, Kurtis & Streetwear shipped straight from certified sellers",
    priceTag: "Flat 70% Off • From ₹349",
    bankOffer: "Bengal Handloom & Surat Direct • Easy Exchange",
    gradient: "from-rose-900 via-pink-950 to-slate-950",
    border: "border-pink-500/30",
    cat: "fashion",
    promoCode: "FASHION70",
    glowColor: "rgba(225, 29, 72, 0.25)",
  },
  {
    id: "banner-jewels",
    badge: "FESTIVE GIFTS & JEWELS",
    badgeSub: "SPECIAL EDITION",
    title: "Velixa Jewels & Gift Planet Hub",
    subtitle: "Artisan designer jewelry, gifts & toys shipped nationwide with live AWB tracking",
    priceTag: "Deals from ₹199 • Up to 80% Off",
    bankOffer: "BlueDart & Delhivery Express • Free Gift Wrap",
    gradient: "from-emerald-900 via-teal-950 to-slate-950",
    border: "border-emerald-500/30",
    cat: "toys-baby",
    promoCode: "GIFT20",
    glowColor: "rgba(16, 185, 129, 0.25)",
  },
];

// Filter out cooked food & perishables from SuperMall
function isPerishableOrCookedFood(cat: string): boolean {
  const c = (cat || "").toLowerCase();
  return [
    "chowmin", "roll", "fast-food", "restaurant", "cloud-kitchen",
    "gravy", "lassi", "fried rice", "mughlai", "coffee", "milkshake",
    "mojito", "fruits", "vegetables", "fruits-vegetables", "sweets",
    "bakery", "dairy", "dairy-bread-eggs", "frozen-foods"
  ].some(ex => c.includes(ex));
}

function matchesCategory(productCat: string, activeCat: string): boolean {
  if (activeCat === "all") return true;
  const c = (productCat || "").toLowerCase();
  switch (activeCat) {
    case "fashion":
      return c.includes("fashion") || c.includes("clothing") || c.includes("saree") || c.includes("dress") || c.includes("kurti") || c.includes("jewel");
    case "mobiles":
      return c.includes("mobile") || c.includes("phone") || c.includes("smartphone") || c.includes("electronics");
    case "electronics":
      return c.includes("electronics") || c.includes("laptop") || c.includes("gadget") || c.includes("audio") || c.includes("headphone");
    case "beauty-personal-care":
      return c.includes("beauty") || c.includes("personal-care") || c.includes("skincare") || c.includes("haircare") || c.includes("fragrance");
    case "home-kitchen":
      return c.includes("home") || c.includes("kitchen") || c.includes("household") || c.includes("cleaning");
    case "appliances":
      return c.includes("appliance") || c.includes("electronics") || c.includes("tv");
    case "toys-baby":
      return c.includes("toy") || c.includes("gift") || c.includes("baby");
    case "food-health":
      return c.includes("health") || c.includes("medicine") || c.includes("protein") || c.includes("dryfruit") || c.includes("packaged-food") || c.includes("tea-coffee");
    case "auto":
      return c.includes("auto") || c.includes("vehicle") || c.includes("motor");
    case "sports":
      return c.includes("sport") || c.includes("fitness") || c.includes("gym") || c.includes("nutrition");
    case "furniture":
      return c.includes("furniture") || c.includes("home");
    case "books-stationery":
      return c.includes("book") || c.includes("station") || c.includes("craft") || c.includes("pen") || c.includes("copy");
    case "two-wheeler":
      return c.includes("wheeler") || c.includes("bike") || c.includes("scooter") || c.includes("auto");
    default:
      return c.includes(activeCat.toLowerCase());
  }
}

export default function SuperMall() {
  const { user, selectedDeliveryAddress } = useAuth();
  const { allShops, getShopById, isLoading: shopsLoading } = useShops();
  const customerCity = selectedDeliveryAddress?.city || "Balurghat";

  // First name for personalized Flipkart-style shelf: "Ridam, still looking for these?"
  const firstName = user?.name ? user.name.trim().split(" ")[0] : "Ridam";

  const [activeCategory, setActiveCategory] = useState("all");
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [pincode, setPincode] = useState("733101");
  const [pincodeChecked, setPincodeChecked] = useState(false);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [allMallProducts, setAllMallProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);

  // Auto-slide banners every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % MALL_BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchProducts = useCallback(async (targetPage = 1, isInitial = true) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const d = await api.get<{ success: boolean; products: any[]; hasMore?: boolean }>(
        `/products?status=active&limit=50&page=${targetPage}`
      );

      const raw = d.products || [];
      const simulatedDiscounts = [82, 83, 67, 75, 77, 63, 70, 65, 80];

      const mapped: Product[] = raw
        .map((p, idx) => {
          const shop = p.shopId ? getShopById(p.shopId) || allShops.find(s => s.id === p.shopId) : undefined;
          const shopCity = (p as any).shopCity || (p as any).city || shop?.city || "";
          const isOutside = Boolean(shopCity && !isSameCity(customerCity, shopCity));

          const price = Number(p.price) || 0;
          let discPrice = p.discountedPrice != null ? Number(p.discountedPrice) : undefined;
          let discountPercent = 0;

          if (discPrice && discPrice < price) {
            discountPercent = Math.round(((price - discPrice) / price) * 100);
          } else {
            discountPercent = simulatedDiscounts[idx % simulatedDiscounts.length];
            discPrice = Math.max(10, Math.round(price * (1 - discountPercent / 100)));
          }

          return {
            id: p._id || p.id,
            name: p.name,
            category: p.category,
            price,
            discountedPrice: discPrice,
            unit: p.unit ?? "1 piece",
            image: p.images?.[0] ?? p.image ?? "/assets/product-placeholder.png",
            images: p.images ?? (p.image ? [p.image] : []),
            description: p.description ?? "",
            stock: Number(p.stock) || 10,
            rating: Number(p.rating) || 4.5,
            vendorId: p.shopId ?? "",
            shopId: p.shopId ?? "",
            shopName: p.shopName || shop?.storeName || "SwiftMart Mall Partner",
            trending: p.trending ?? true,
            colors: p.colors,
            sizes: p.sizes,
            isOutsideShop: isOutside,
            isMall: true, // Always Pan-India 7-Day Courier in Super Mall
            discountPercent,
          } as Product & { discountPercent: number };
        })
        // Only include retail courier-shippable items (exclude cooked restaurant food & raw perishables)
        .filter(p => !isPerishableOrCookedFood(p.category));

      if (isInitial) {
        setAllMallProducts(mapped);
      } else {
        setAllMallProducts(prev => {
          const ids = new Set(prev.map(item => item.id));
          return [...prev, ...mapped.filter(item => !ids.has(item.id))];
        });
      }

      setPage(targetPage);
      setHasMore(Boolean(d.hasMore ?? (mapped.length >= 30)));
    } catch {
      if (isInitial) setAllMallProducts([]);
    } finally {
      if (isInitial) setLoading(false);
      setLoadingMore(false);
    }
  }, [allShops, customerCity, getShopById]);

  useEffect(() => {
    if (!shopsLoading) {
      fetchProducts(1, true);
    }
  }, [shopsLoading, fetchProducts]);

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchProducts(page + 1, false);
      }
    }, { threshold: 0.1, rootMargin: "300px" });

    const currentTarget = observerRef.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasMore, loading, loadingMore, page, fetchProducts]);

  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode.trim())) return;
    setCheckingPincode(true);
    setTimeout(() => {
      setCheckingPincode(false);
      setPincodeChecked(true);
    }, 350);
  };

  // Filter products for active category
  const filteredProducts = allMallProducts.filter(p => matchesCategory(p.category, activeCategory));

  // Curated collections for the home/For-You view
  const dealProducts = allMallProducts.slice(0, 10);
  const techProducts = allMallProducts.filter(p => matchesCategory(p.category, "electronics") || matchesCategory(p.category, "mobiles")).slice(0, 8);
  const fashionProducts = allMallProducts.filter(p => matchesCategory(p.category, "fashion")).slice(0, 8);
  const stationeryProducts = allMallProducts.filter(p => matchesCategory(p.category, "books-stationery")).slice(0, 8);
  const giftsProducts = allMallProducts.filter(p => matchesCategory(p.category, "toys-baby")).slice(0, 8);

  // Active banner + adjacent banner for desktop 2-column view
  const banner1 = MALL_BANNERS[currentBannerIndex];
  const banner2 = MALL_BANNERS[(currentBannerIndex + 1) % MALL_BANNERS.length];

  return (
    <div className="min-h-screen pb-24 max-w-7xl mx-auto space-y-3 sm:space-y-4 px-2 sm:px-4">
      <SEO
        title="SwiftMart Super Mall — Pan-India Direct Shopping, Fashion & Electronics"
        description="Shop fashion, lifestyle, electronics, gifts and gadgets with nationwide express delivery (7 business days) via BlueDart and India Post on SwiftMart Super Mall."
        canonical="/mall"
      />

      {/* ── 1. EXACT FLIPKART-STYLE CATEGORY NAVIGATION BAR ───────────────────── */}
      {/* Clean surface, icons directly on top without rounded boxes, active underline */}
      <section
        aria-label="Mall Categories"
        className="w-full bg-card rounded-2xl neu-card px-2 sm:px-4 py-2 sm:py-3 border border-border/60 shadow-xs"
      >
        <div className="flex items-center justify-between gap-2 sm:gap-4 md:gap-6 overflow-x-auto scrollbar-hide py-0.5 px-1">
          {MALL_CATEGORIES.map(cat => {
            const isSelected = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex flex-col items-center justify-between min-w-[58px] sm:min-w-[68px] md:min-w-[76px] py-1 px-1 transition-all cursor-pointer relative shrink-0 group ${
                  isSelected
                    ? "text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground font-medium"
                }`}
              >
                {/* Clean crisp icon directly on the row — NO square/circle background */}
                <div className="h-6 sm:h-7 flex items-center justify-center transition-transform group-hover:scale-110">
                  <Icon
                    className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${
                      isSelected
                        ? "text-primary"
                        : "text-foreground/75 group-hover:text-foreground"
                    }`}
                  />
                </div>

                {/* Category label below icon */}
                <span className="text-[11px] sm:text-[12px] leading-tight text-center truncate max-w-[68px] sm:max-w-[78px] mt-1">
                  {cat.label}
                </span>

                {/* Flipkart-style solid underline indicator under the active category text */}
                {isSelected ? (
                  <motion.div
                    layoutId="activeMallCatUnderline"
                    className="h-[2.5px] bg-primary rounded-full w-full mt-1.5"
                  />
                ) : (
                  <div className="h-[2.5px] w-full mt-1.5 opacity-0" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Compact Top Delivery Location & Pincode Strip ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-card/60 neu-card rounded-xl border border-border/40 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 min-w-0">
          <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">
            Pan-India Direct Logistics • <strong className="text-foreground">7 Days Express Delivery</strong>
          </span>
        </div>

        <form onSubmit={handlePincodeCheck} className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] hidden xs:inline">Deliver to:</span>
          <input
            value={pincode}
            onChange={e => {
              setPincode(e.target.value);
              setPincodeChecked(false);
            }}
            maxLength={6}
            className="w-16 h-6 text-xs font-mono font-bold text-center rounded-md bg-background neu-inset border-none text-foreground"
            placeholder="Pincode"
          />
          <button
            type="submit"
            className="text-[11px] font-bold text-primary hover:underline cursor-pointer px-1"
          >
            {checkingPincode ? "..." : "Check"}
          </button>
          {pincodeChecked && (
            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" /> 7-Day Avail.
            </span>
          )}
        </form>
      </div>

      {/* ── 2. FLIPKART-STYLE PROMOTIONAL HERO BANNERS (MULTI-CARD CAROUSEL) ────── */}
      <section aria-label="Featured Promotions" className="relative">
        {/* On Desktop: 2 banners visible side-by-side; On Mobile: 1 banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Card 1 */}
          <div
            onClick={() => setActiveCategory(banner1.cat)}
            className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br ${banner1.gradient} text-white p-4 sm:p-5 shadow-lg border ${banner1.border} min-h-[175px] sm:min-h-[200px] flex flex-col justify-between cursor-pointer group transition-all duration-300 hover:scale-[1.01]`}
          >
            {/* Top Row: Flipkart-style Yellow/Gold badge & Promo pill */}
            <div className="flex items-center justify-between gap-2 z-10">
              <div className="inline-flex items-center gap-1.5 bg-amber-400 text-slate-950 font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-sm uppercase tracking-wide shadow-xs">
                <Sparkles className="w-3 h-3 fill-slate-950" />
                <span>{banner1.badge}</span>
              </div>
              <span className="text-[10px] font-bold tracking-wider text-amber-300/90 uppercase">
                {banner1.badgeSub}
              </span>
            </div>

            {/* Middle: Title & Subtitle */}
            <div className="relative z-10 space-y-1 my-2">
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight group-hover:text-amber-200 transition-colors">
                {banner1.title}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 line-clamp-2">
                {banner1.subtitle}
              </p>
              <div className="inline-block pt-1">
                <span className="text-xs sm:text-sm font-black text-amber-300 bg-black/40 px-2 py-0.5 rounded-md border border-amber-300/30">
                  {banner1.priceTag}
                </span>
              </div>
            </div>

            {/* Bottom Row: Bank offer & Delivery badge */}
            <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10 text-[10px] sm:text-xs text-white/80">
              <span className="truncate max-w-[200px] sm:max-w-xs font-semibold text-amber-200/90">
                {banner1.bankOffer}
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-300 shrink-0">
                <Truck className="w-3 h-3" /> 7-Day Pan-India
              </span>
            </div>
          </div>

          {/* Card 2 (Desktop secondary / Mobile rotation) */}
          <div
            onClick={() => setActiveCategory(banner2.cat)}
            className={`hidden md:flex relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br ${banner2.gradient} text-white p-4 sm:p-5 shadow-lg border ${banner2.border} min-h-[175px] sm:min-h-[200px] flex-col justify-between cursor-pointer group transition-all duration-300 hover:scale-[1.01]`}
          >
            {/* Top Row */}
            <div className="flex items-center justify-between gap-2 z-10">
              <div className="inline-flex items-center gap-1.5 bg-amber-400 text-slate-950 font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-sm uppercase tracking-wide shadow-xs">
                <Sparkles className="w-3 h-3 fill-slate-950" />
                <span>{banner2.badge}</span>
              </div>
              <span className="text-[10px] font-bold tracking-wider text-amber-300/90 uppercase">
                {banner2.badgeSub}
              </span>
            </div>

            {/* Middle */}
            <div className="relative z-10 space-y-1 my-2">
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight group-hover:text-amber-200 transition-colors">
                {banner2.title}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 line-clamp-2">
                {banner2.subtitle}
              </p>
              <div className="inline-block pt-1">
                <span className="text-xs sm:text-sm font-black text-amber-300 bg-black/40 px-2 py-0.5 rounded-md border border-amber-300/30">
                  {banner2.priceTag}
                </span>
              </div>
            </div>

            {/* Bottom */}
            <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10 text-[10px] sm:text-xs text-white/80">
              <span className="truncate max-w-[200px] sm:max-w-xs font-semibold text-amber-200/90">
                {banner2.bankOffer}
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-300 shrink-0">
                <Truck className="w-3 h-3" /> 7-Day Pan-India
              </span>
            </div>
          </div>
        </div>

        {/* Carousel pagination dots directly under the banners (Like Flipkart) */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {MALL_BANNERS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentBannerIndex(idx)}
              aria-label={`Banner slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                currentBannerIndex === idx
                  ? "w-6 bg-primary shadow-xs"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
              }`}
            />
          ))}
        </div>

        {/* Desktop Prev/Next buttons */}
        <button
          type="button"
          onClick={() => setCurrentBannerIndex(prev => (prev - 1 + MALL_BANNERS.length) % MALL_BANNERS.length)}
          aria-label="Previous banner"
          className="hidden md:flex absolute left-2 top-[45%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 text-white items-center justify-center transition-all opacity-70 hover:opacity-100 shadow-md"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setCurrentBannerIndex(prev => (prev + 1) % MALL_BANNERS.length)}
          aria-label="Next banner"
          className="hidden md:flex absolute right-2 top-[45%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 text-white items-center justify-center transition-all opacity-70 hover:opacity-100 shadow-md"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </section>

      {/* ── 3. FLIPKART SHELF: "{firstName}, still looking for these?" ─────────── */}
      {/* Exact match to the user's screenshot with blue down-arrow discount pills */}
      {dealProducts.length > 0 && activeCategory === "all" && (
        <section aria-label="Personalized Deals" className="bg-gradient-to-r from-primary/5 via-accent/10 to-primary/5 border border-border/60 rounded-2xl sm:rounded-3xl p-3 sm:p-5 neu-card space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-xl font-black text-foreground tracking-tight">
                {firstName}, still looking for these?
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Top Super Mall Deals • Pan-India 7-Day Express Courier
              </p>
            </div>
            <button
              onClick={() => setActiveCategory("all")}
              className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer"
            >
              See All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Horizontal deal cards carousel */}
          <div className="flex items-stretch gap-3 overflow-x-auto scrollbar-hide py-1 px-0.5">
            {dealProducts.map((p, idx) => {
              const discount = (p as any).discountPercent || 75;
              return (
                <div
                  key={p.id}
                  className="w-[140px] sm:w-[170px] md:w-[185px] shrink-0 bg-card rounded-2xl p-2.5 neu-card border border-border/50 flex flex-col justify-between relative group hover:border-primary/50 transition-all"
                >
                  {/* Flipkart Blue Down-Arrow Discount Badge */}
                  <div className="absolute top-2 left-2 bg-[#2874f0] text-white text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 rounded-sm flex items-center gap-0.5 z-10 shadow-xs">
                    <ArrowDown className="w-2.5 h-2.5 stroke-[3]" />
                    <span>{discount}%</span>
                  </div>

                  <Link href={`/product/${p.id}`} className="block relative aspect-square bg-background rounded-xl p-2 neu-inset overflow-hidden cursor-pointer">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </Link>

                  <div className="mt-2 space-y-1">
                    <Link href={`/product/${p.id}`}>
                      <h3 className="text-xs font-bold text-foreground line-clamp-1 hover:text-primary transition-colors cursor-pointer">
                        {p.name}
                      </h3>
                    </Link>

                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-foreground">
                        ₹{p.discountedPrice || p.price}
                      </span>
                      {p.discountedPrice && p.discountedPrice < p.price && (
                        <span className="text-[11px] text-muted-foreground line-through">
                          ₹{p.price}
                        </span>
                      )}
                    </div>

                    <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 w-max">
                      <Truck className="w-2.5 h-2.5" /> 7 Days Delivery
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 4. CATEGORIZED SHOWCASE ROWS (WHEN ON "FOR YOU") ───────────────────── */}
      {activeCategory === "all" && (
        <div className="space-y-6 pt-1">
          {/* Tech & Electronics Row */}
          {techProducts.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-black text-foreground flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-primary" />
                  <span>⚡ Electronics & Mobile Gadgets Hub</span>
                </h3>
                <button
                  onClick={() => setActiveCategory("electronics")}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {techProducts.map((prod, idx) => (
                  <ProductCard key={prod.id} product={prod} index={idx} isMall={true} />
                ))}
              </div>
            </section>
          )}

          {/* Sampa Enterprise & Direct Merchant Fashion Row */}
          {fashionProducts.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-black text-foreground flex items-center gap-1.5">
                  <Shirt className="w-4 h-4 text-rose-500" />
                  <span>👗 Direct Merchant Fashion (Sampa Enterprise & more)</span>
                </h3>
                <button
                  onClick={() => setActiveCategory("fashion")}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {fashionProducts.map((prod, idx) => (
                  <ProductCard key={prod.id} product={prod} index={idx} isMall={true} />
                ))}
              </div>
            </section>
          )}

          {/* Books & Stationery Row */}
          {stationeryProducts.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-black text-foreground flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-amber-500" />
                  <span>📚 Books, Study & Stationery Essentials</span>
                </h3>
                <button
                  onClick={() => setActiveCategory("books-stationery")}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {stationeryProducts.map((prod, idx) => (
                  <ProductCard key={prod.id} product={prod} index={idx} isMall={true} />
                ))}
              </div>
            </section>
          )}

          {/* Gifts & Toys Row */}
          {giftsProducts.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-black text-foreground flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-emerald-500" />
                  <span>🎁 Gifts, Toys & Curated Specials</span>
                </h3>
                <button
                  onClick={() => setActiveCategory("toys-baby")}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {giftsProducts.map((prod, idx) => (
                  <ProductCard key={prod.id} product={prod} index={idx} isMall={true} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── 5. SPECIFIC CATEGORY FILTERED PRODUCTS GRID (OR FULL LIST) ────────── */}
      <section aria-label="Mall Catalog" className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <span>
              {activeCategory === "all"
                ? "All Super Mall Collections"
                : MALL_CATEGORIES.find(c => c.id === activeCategory)?.label || "Mall Collection"}
            </span>
          </h2>
          {!loading && (
            <span className="text-[11px] text-muted-foreground font-semibold">
              {filteredProducts.length} item{filteredProducts.length !== 1 ? "s" : ""} • 7-Day Courier
            </span>
          )}
        </div>

        {loading && allMallProducts.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-56 bg-muted/60 rounded-2xl animate-pulse neu-inset" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredProducts.map((prod, idx) => (
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
          </>
        ) : (
          <div className="py-10 text-center bg-card rounded-2xl neu-card p-6 space-y-3 max-w-md mx-auto border border-border/60">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto text-2xl neu-inset">
              🛍️
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                No items found in {MALL_CATEGORIES.find(c => c.id === activeCategory)?.label}
              </h3>
              <p className="text-xs text-muted-foreground">
                Try browsing other Super Mall categories or explore all trending mall deals.
              </p>
            </div>
            <button
              onClick={() => setActiveCategory("all")}
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              Back to For You
            </button>
          </div>
        )}
      </section>

      {/* ── 6. Compact Trust & Logistics Strip ─────────────────────────────────── */}
      <section aria-label="Mall Trust Guarantee" className="mt-8 bg-card/60 border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3">
        <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-primary" />
          <span>How SwiftMart Super Mall Delivery Works</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-background/80 p-3 rounded-xl border border-border/40 space-y-0.5 neu-inset">
            <strong className="text-foreground block font-bold">🇮🇳 Nationwide Courier</strong>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Dispatched directly via BlueDart, India Post Speed Post, or Delhivery with 7-day delivery.
            </p>
          </div>
          <div className="bg-background/80 p-3 rounded-xl border border-border/40 space-y-0.5 neu-inset">
            <strong className="text-foreground block font-bold">📦 Verified AWB Tracking</strong>
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
