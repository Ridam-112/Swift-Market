import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
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

const MALL_CATEGORIES = [
  { id: "all", label: "All Mall Items", icon: "🛍️" },
  { id: "fashion", label: "Fashion & Apparel", icon: "👗" },
  { id: "electronics", label: "Electronics & Tech", icon: "🎧" },
  { id: "home-kitchen", label: "Home & Living", icon: "🏺" },
  { id: "beauty-personal-care", label: "Beauty & Grooming", icon: "💄" },
  { id: "books-stationery", label: "Stationery & Gifts", icon: "✏️" },
];

export default function SuperMall() {
  const { selectedDeliveryAddress } = useAuth();
  const { allShops, getShopById, isLoading: shopsLoading } = useShops();
  const customerCity = selectedDeliveryAddress?.city || "Balurghat";

  const [activeCategory, setActiveCategory] = useState("all");
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

  return (
    <div className="min-h-screen pb-24 pt-4 px-3 sm:px-4 max-w-7xl mx-auto space-y-6">
      <SEO
        title="SwiftMart Super Mall — Pan-India Shopping, Fashion & Electronics"
        description="Shop fashion, lifestyle, electronics, gifts and home decor with nationwide express delivery (7 business days) via BlueDart and India Post on SwiftMart Super Mall."
        canonical="/mall"
      />

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 text-white p-6 sm:p-10 shadow-xl border border-purple-500/20">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 backdrop-blur-md border border-purple-400/30 text-purple-200 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Pan-India Direct E-Commerce
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            SwiftMart Super Mall
          </h1>
          <p className="text-sm sm:text-base text-purple-200/90 leading-relaxed">
            Discover fashion, tech gadgets, home decor, gifts &amp; lifestyle essentials delivered safely to your doorstep in 7 days.
          </p>

          <div className="flex flex-wrap gap-4 pt-2 text-xs font-semibold text-purple-200">
            <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-emerald-400" /> Doorstep Logistics (7 Days)</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-purple-300" /> 7 Day Replacement Guarantee</span>
            <span className="flex items-center gap-1.5"><Tag className="w-4 h-4 text-amber-400" /> Verified Seller Pricing</span>
          </div>
        </div>
      </div>

      {/* Pincode Shipping Estimator Strip */}
      <div className="bg-card neu-card p-4 sm:p-5 rounded-3xl border border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Pan-India Delivery Availability</h2>
            <p className="text-xs text-muted-foreground">Check shipping transit times to your pincode</p>
          </div>
        </div>

        <form onSubmit={handlePincodeCheck} className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            value={pincode}
            onChange={e => {
              setPincode(e.target.value);
              setPincodeChecked(false);
            }}
            placeholder="Enter 6-digit Pincode"
            maxLength={6}
            className="w-36 h-10 rounded-xl bg-background text-xs font-mono font-bold"
          />
          <Button
            type="submit"
            disabled={checkingPincode || pincode.length !== 6}
            className="rounded-xl h-10 text-xs font-bold px-4"
          >
            {checkingPincode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Check Pincode"}
          </Button>
        </form>

        {pincodeChecked && (
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4" />
            <span>Delivers in 7 Days to {pincode}</span>
          </div>
        )}
      </div>

      {/* Mall Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {MALL_CATEGORIES.map(tab => {
          const isSelected = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Products Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Trending on Super Mall
          </h2>
          {!loading && products.length > 0 && (
            <span className="text-xs text-muted-foreground font-medium">
              Showing {products.length} items
            </span>
          )}
        </div>

        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-64 bg-muted/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map((prod, idx) => (
                <div key={prod.id} className="relative">
                  <ProductCard product={prod} index={idx} isMall={true} />
                </div>
              ))}
            </div>

            {/* Lazy loader sentinel */}
            <div ref={observerRef} className="h-6 w-full" />

            {loadingMore && (
              <div className="py-6 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Loading more Super Mall items...</span>
              </div>
            )}

            {hasMore && !loadingMore && (
              <div className="py-4 flex justify-center">
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
          <div className="py-16 text-center bg-card rounded-3xl neu-card p-8 space-y-4 max-w-lg mx-auto border border-border/60">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto text-3xl">
              🛍️
            </div>
            <h3 className="text-xl font-black text-foreground">
              Pan-India Super Mall — Coming Soon!
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Currently all active stores on SwiftMart are verified local neighborhood stores in <span className="font-semibold text-foreground">{customerCity}</span> delivering fresh in <span className="text-primary font-bold">30–60 minutes</span>. Curated regional merchants and Pan-India direct e-commerce with 7-day courier delivery will be live here soon!
            </p>
            <div className="pt-2">
              <Link href="/stores">
                <Button className="rounded-xl font-bold text-xs h-11 px-6 neu-card gap-2">
                  <ShoppingBag className="w-4 h-4" /> Explore Local Stores (30–60m Delivery)
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Trust & Guarantee Strip */}
      <section className="mt-12 bg-card/60 border border-border/50 rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          How SwiftMart Super Mall Delivery Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-background/80 p-4 rounded-2xl border border-border/40 space-y-1">
            <strong className="text-foreground block">🇮🇳 Pan-India Shipping Network</strong>
            <p className="text-muted-foreground leading-relaxed">
              Orders from verified regional merchants and manufacturers are dispatched directly via BlueDart, India Post Speed Post, or Delhivery.
            </p>
          </div>
          <div className="bg-background/80 p-4 rounded-2xl border border-border/40 space-y-1">
            <strong className="text-foreground block">📦 Live AWB Courier Tracking</strong>
            <p className="text-muted-foreground leading-relaxed">
              Every parcel comes with a verified tracking number (AWB) allowing you to track transit steps from dispatch to your doorstep.
            </p>
          </div>
          <div className="bg-background/80 p-4 rounded-2xl border border-border/40 space-y-1">
            <strong className="text-foreground block">🛡️ Buyer Protection &amp; Support</strong>
            <p className="text-muted-foreground leading-relaxed">
              Enjoy 7-day doorstep replacement for defective or incorrect items with dedicated SwiftMart Balurghat helpdesk support.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
