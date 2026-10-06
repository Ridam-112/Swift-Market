import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useShops } from "@/hooks/useShops";
import { HeroBannerSlider } from "@/components/HeroBannerSlider";
import { BucketBanner } from "@/components/BucketBanner";
import { CategoryBubble, type DisplayCategory } from "@/components/CategoryBubble";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonShopCardHorizontal } from "@/components/SkeletonShopCard";
import { SectionHeader } from "@/components/SectionHeader";
import { SEO } from "@/components/SEO";
import { SiteFooter, FAQ_ITEMS } from "@/components/SiteFooter";
import { SearchOverlay } from "@/components/SearchOverlay";
import { api } from "@/lib/api";
import { Star, ChevronRight, ChevronLeft, Zap, MapPin, Search, ChevronDown, ChevronUp, Loader2, Package, ShoppingBag, Store, Wrench, Sparkles, X, ArrowRight, RefreshCw } from "lucide-react";
import type { Product } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { isAddressServiceable } from "@/lib/serviceArea";
import { MapLocationPicker, type MapLocationResult } from "@/components/MapLocationPicker";
import { AdSenseSectionBanner } from "@/components/GoogleAdSense";
import { getShopUrl } from "@/lib/shopUrl";
import { cn } from "@/lib/utils";

const HOME_JSON_LD = [
  {
    "@type": "FAQPage",
    "@id": "https://swiftmart.space/#faq",
    "mainEntity": FAQ_ITEMS.map(item => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": { "@type": "Answer", "text": item.a },
    })),
  },
  {
    "@type": "Organization",
    "@id": "https://swiftmart.space/#organization",
    "name": "SwiftMart",
    "alternateName": ["Swift Mart", "Swift-Mart", "SwiftMart Balurghat", "Swift Mart Balurghat"],
    "url": "https://swiftmart.space/",
    "logo": { "@type": "ImageObject", "url": "https://swiftmart.space/logo.png" },
    "foundingDate": "2024",
    "founders": [
      {
        "@type": "Person",
        "name": "Ridam Mohanta",
        "jobTitle": "Founder & Chief Executive Officer",
        "sameAs": "https://swiftmart.space/about#founders"
      },
      {
        "@type": "Person",
        "name": "Abhi Das",
        "jobTitle": "Co-Founder & Head of Operations",
        "sameAs": "https://swiftmart.space/about#founders"
      }
    ],
    "foundingLocation": {
      "@type": "Place",
      "name": "Balurghat, West Bengal, India"
    },
    "knowsAbout": [
      "Grocery Delivery", "Quick Commerce", "Local Marketplace",
      "Food Delivery", "Medicine Delivery", "Balurghat",
      "Dakshin Dinajpur", "West Bengal"
    ],
    "areaServed": {
      "@type": "City",
      "name": "Balurghat",
      "containedInPlace": {
        "@type": "State",
        "name": "West Bengal",
        "containedInPlace": { "@type": "Country", "name": "India" }
      }
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+916296118949",
      "url": "https://swiftmart.space/contact-support",
      "contactType": "customer support",
      "hoursAvailable": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
        "opens": "09:00",
        "closes": "19:00"
      },
      "availableLanguage": ["English", "Bengali"]
    },
    "sameAs": [
      "https://swiftmart.space/",
      "https://share.google/7uxIQizF0XLUe9TgX",
      "https://www.facebook.com/swiftmart.balurghat",
      "https://www.instagram.com/swiftmart.balurghat",
      "https://x.com/SwiftMart_IN",
      "https://www.linkedin.com/company/swiftmart-balurghat",
      "https://www.youtube.com/@SwiftMartBalurghat"
    ]
  },
  {
    "@type": "WebSite",
    "@id": "https://swiftmart.space/#website",
    "url": "https://swiftmart.space/",
    "name": "SwiftMart",
    "description": "Order groceries, vegetables, fruits, food, medicines, dairy, bakery, sweets and daily essentials from trusted local shops in Balurghat with SwiftMart.",
    "inLanguage": "en-IN",
    "potentialAction": {
      "@type": "SearchAction",
      "target": { "@type": "EntryPoint", "urlTemplate": "https://swiftmart.space/search?q={search_term_string}" },
      "query-input": "required name=search_term_string"
    }
  },
  {
    "@type": ["LocalBusiness", "Store", "GroceryStore"],
    "@id": "https://swiftmart.space/#business",
    "name": "SwiftMart Balurghat",
    "alternateName": ["Swift Mart", "Swift-Mart", "SwiftMart", "Swift Mart Balurghat"],
    "legalName": "SwiftMart (Swift Mart)",
    "url": "https://swiftmart.space/",
    "logo": { "@type": "ImageObject", "url": "https://swiftmart.space/logo.png" },
    "image": "https://swiftmart.space/opengraph.jpg",
    "description": "Unified local commerce platform delivering groceries, fresh vegetables, hot food, mall products, and appliance repair services in Balurghat.",
    "telephone": "+916296118949",
    "priceRange": "₹",
    "currenciesAccepted": "INR",
    "paymentAccepted": "Cash on Delivery, UPI, Cards, Net Banking",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Gourlo Math",
      "addressLocality": "Balurghat",
      "addressRegion": "West Bengal",
      "postalCode": "733103",
      "addressCountry": "IN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 25.2167,
      "longitude": 88.7667
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5.0",
      "reviewCount": "15",
      "bestRating": "5",
      "worstRating": "1"
    },
    "hasMap": "https://maps.google.com/?q=Swift+Mart+Balurghat+Gourlo+Math+733103",
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
      "opens": "07:00",
      "closes": "23:00"
    },
    "areaServed": [
      { "@type": "City", "name": "Balurghat" },
      { "@type": "PostalAddress", "postalCode": "733101", "addressCountry": "IN" },
      { "@type": "PostalAddress", "postalCode": "733103", "addressCountry": "IN" }
    ]
  },
  {
    "@type": "Service",
    "@id": "https://swiftmart.space/#service",
    "name": "SwiftMart Quick Delivery",
    "serviceType": "Grocery & Daily Essentials Delivery",
    "description": "Fast home delivery of groceries, vegetables, fruits, food, and daily essentials from trusted local shops in Balurghat.",
    "provider": { "@id": "https://swiftmart.space/#business" },
    "areaServed": { "@type": "City", "name": "Balurghat" },
    "availableChannel": {
      "@type": "ServiceChannel",
      "serviceUrl": "https://swiftmart.space/",
      "servicePhone": "+916296118949"
    }
  },
  {
    "@type": "WebApplication",
    "name": "SwiftMart",
    "url": "https://swiftmart.space/",
    "applicationCategory": "ShoppingApplication",
    "operatingSystem": "All",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "INR" }
  }
];

// Module-level in-memory cache — survives re-mounts within a session so
// navigating back to Home doesn't re-fetch static-ish data every time.
const CACHE_TTL = 5 * 60_000; // 5 min
let _categoriesCache: { data: DisplayCategory[]; at: number } | null = null;

const VISIBLE_CATEGORIES = 8;

const CATEGORY_PRIORITY: Record<string, number> = {
  grocery: 1, "kirana-store": 2, "fruits-vegetables": 3, vegetables: 4, fruits: 5,
  "sweet-shop": 6, bakery: 7, dairy: 8, snacks: 9, drinks: 10,
  restaurant: 11, "cloud-kitchen": 12, "fast-food": 13, "meat-fish": 14, "meat-shop": 15, "fish-shop": 16,
  medicine: 17, pharmacy: 18, cosmetics: 19, "personal-care": 20, "beauty": 21,
  clothing: 22, fashion: 23, handmade: 24, electronics: 25, "mobile-phone": 26,
};

const QUICK_CATEGORY_SLUGS = new Set([
  "grocery", "kirana-store", "fruits-vegetables", "vegetables", "fruits",
  "sweet-shop", "bakery", "dairy", "snacks", "drinks", "restaurant",
  "cloud-kitchen", "fast-food", "meat-fish", "meat-shop", "fish-shop",
  "medicine", "pharmacy", "personal-care", "food_junction"
]);
function sortCategories<T extends { id: string; name: string }>(cats: T[]): T[] {
  return [...cats].sort((a, b) => {
    const pa = CATEGORY_PRIORITY[a.id] ?? 999;
    const pb = CATEGORY_PRIORITY[b.id] ?? 999;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });
}

const DEFAULT_COLORS = [
  "hsl(35,90%,55%)", "hsl(140,60%,45%)", "hsl(200,70%,55%)", "hsl(20,90%,55%)",
  "hsl(210,80%,55%)", "hsl(45,90%,50%)", "hsl(0,65%,50%)", "hsl(330,70%,60%)",
  "hsl(280,60%,60%)", "hsl(170,60%,45%)", "hsl(260,55%,55%)", "hsl(200,80%,50%)",
  "hsl(350,80%,60%)", "hsl(160,60%,40%)", "hsl(230,60%,55%)", "hsl(250,55%,55%)",
];

interface RawProduct {
  id?: unknown; _id?: unknown; name?: unknown; category?: unknown;
  price?: unknown; discountedPrice?: unknown; unit?: unknown; images?: unknown;
  image?: unknown; description?: unknown; stock?: unknown; rating?: unknown;
  shopId?: unknown; shopName?: unknown; trending?: unknown;
}

function mapProduct(p: RawProduct): Product {
  return {
    id: (p.id ?? p._id ?? "") as string,
    name: (p.name ?? "") as string,
    category: (p.category ?? "") as Product["category"],
    price: Number(p.price ?? 0),
    discountedPrice: p.discountedPrice != null ? Number(p.discountedPrice) : undefined,
    unit: (p.unit ?? "1 unit") as string,
    image: ((p.images as string[] | undefined)?.[0] ?? p.image ?? "/assets/product-placeholder.png") as string,
    images: (p.images as string[] | undefined) ?? [],
    description: (p.description ?? "") as string,
    stock: Number(p.stock ?? 0),
    rating: Number(p.rating ?? 0),
    vendorId: (p.shopId ?? "") as string,
    shopId: (p.shopId ?? "") as string,
    shopName: p.shopName ? (p.shopName as string) : undefined,
    trending: Boolean(p.trending),
  };
}

interface HomepageSection {
  _id?: string;
  id?: string;
  title: string;
  type: string;
  enabled: boolean;
  sortOrder: number;
  config: { layout?: string; limit?: number };
  products: Product[];
  total: number;
  hasMore: boolean;
}

function DynamicSection({ section }: { section: HomepageSection }) {
  const secId = section._id || section.id || "";
  const sectionHref = `/section/${secId}?title=${encodeURIComponent(section.title)}`;
  const isCarousel = section.config?.layout === "scroll";
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollByAmount = (delta: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: delta, behavior: "smooth" });
    }
  };

  return (
    <section className="relative group/section">
      <SectionHeader
        title={section.title}
        action={
          section.hasMore || section.total > section.products.length ? (
            <Link
              href={sectionHref}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
            >
              See all ({section.total}) <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground font-medium">
              {section.total} item{section.total !== 1 ? "s" : ""}
            </span>
          )
        }
      />

      {isCarousel ? (
        <div className="relative group/carousel">
          {/* Subtle desktop navigation arrows on hover */}
          <button
            type="button"
            onClick={() => scrollByAmount(-350)}
            aria-label="Scroll left"
            className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-card/90 backdrop-blur border border-border shadow-lg items-center justify-center text-foreground hover:bg-card hover:scale-110 active:scale-95 transition-all opacity-0 group-hover/carousel:opacity-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount(350)}
            aria-label="Scroll right"
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-card/90 backdrop-blur border border-border shadow-lg items-center justify-center text-foreground hover:bg-card hover:scale-110 active:scale-95 transition-all opacity-0 group-hover/carousel:opacity-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-hide snap-x scroll-smooth -mx-3 px-3"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {section.products.map((product, i) => (
              <div
                key={product.id}
                className="snap-start shrink-0 w-[calc(46vw)] sm:w-[190px] md:w-[210px]"
              >
                <ProductCard product={product} index={i} />
              </div>
            ))}
            {(section.hasMore || section.total > section.products.length) && (
              <div className="snap-start shrink-0 w-[140px] flex items-center justify-center p-1">
                <Link
                  href={sectionHref}
                  className="w-full h-full min-h-[220px] flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card neu-card hover:bg-primary/5 hover:border-primary transition-all text-center group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-foreground">View All {section.total}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
          {section.products.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}

      {!isCarousel && (section.hasMore || section.total > section.products.length) && (
        <div className="flex justify-center pt-4">
          <Link href={sectionHref}>
            <Button
              variant="outline"
              className="rounded-full px-8 font-semibold neu-card border-none gap-2"
            >
              See more ({section.total - section.products.length} more) <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      )}
    </section>
  );
}



export default function Home() {
  const { user, selectedDeliveryAddress, setSelectedDeliveryAddress } = useAuth();
  const { shops, isLoading: shopsLoading } = useShops();
  const selectedCity = (selectedDeliveryAddress?.city ?? selectedDeliveryAddress?.line1 ?? "Your Location").trim();
  const loading = shopsLoading;

  // Check if current user address is in active service area
  const isServiceable = isAddressServiceable(selectedDeliveryAddress);
  const showComingSoon = !isServiceable && !!selectedDeliveryAddress;

  // When a delivery city is selected, restrict dynamic sections to products from visible shops.
  const visibleShopIds = useMemo(
    () => new Set(shops.map(s => s.id)),
    [shops]
  );
  const [, setLocation] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<"quick" | "all">("quick");
  const [apiCategories, setApiCategories] = useState<DisplayCategory[]>([]);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  const displayedCategories = apiCategories;
  const [dynamicSections, setDynamicSections] = useState<HomepageSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    typeof localStorage !== "undefined" && localStorage.getItem("sm_promo_banner_v1") === "1"
  );

  // Load admin-configured homepage sections
  useEffect(() => {
    setSectionsLoading(true);
    api.get<{ success: boolean; sections: Array<HomepageSection & { products: RawProduct[] }> }>('/homepage-sections')
      .then(d => {
        const mapped = (d.sections ?? []).map(s => ({
          ...s,
          products: (s.products ?? []).map(mapProduct),
        }));
        setDynamicSections(mapped);
      })
      .catch(() => {})
      .finally(() => setSectionsLoading(false));
  }, []);

  // Load categories (cached in memory for 5 min)
  useEffect(() => {
    if (_categoriesCache && Date.now() - _categoriesCache.at < CACHE_TTL) {
      setApiCategories(_categoriesCache.data);
      return;
    }
    api.get<{ success: boolean; categories: Array<{ _id: string; name: string; slug: string; emoji?: string; color?: string }> }>('/categories')
      .then(d => {
        const mapped = (d.categories ?? [])
          .filter(c => c.slug !== "sexual-wellness" && !c.name.toLowerCase().includes("sexual"))
          .map((c, i) => ({
            id: c.slug,
            name: c.name === "Zepto Cafe" || c.slug === "food_junction" ? "SwiftMart Cafe" : c.name,
            emoji: c.emoji ?? "🛍️",
            color: c.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
          }));
        const sorted = sortCategories(mapped);
        _categoriesCache = { data: sorted, at: Date.now() };
        setApiCategories(sorted);
      })
      .catch(() => {});
  }, []);

  const [announcementDismissed, setAnnouncementDismissed] = useState(() =>
    typeof localStorage !== "undefined" && localStorage.getItem("sm_announcement_back_v1") === "1"
  );
  const [heroSearchQuery, setHeroSearchQuery] = useState("");
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      api.get<{ success: boolean; orders: any[] }>('/orders')
        .then(d => {
          if (d?.orders && Array.isArray(d.orders)) {
            setRecentOrders(d.orders.slice(0, 3));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const SHOPS_PREVIEW = 6;
  const popularShops = shops.slice(0, SHOPS_PREVIEW);
  const isCityEmpty = !!selectedCity && !shopsLoading && shops.length === 0;

  return (
    <div className="w-full flex flex-col min-h-screen">
      <div className="pb-16 pt-4 px-3 w-full max-w-7xl mx-auto space-y-6 flex-1">
        {/* Visually-hidden H1 anchors the page outline for crawlers */}
      <h1 className="sr-only">SwiftMart — Everything you need, delivered fast | Balurghat</h1>
      <SEO
        title="SwiftMart — Everything you need, delivered fast"
        description="Shop local stores, order food and groceries, discover products and book home services — all in one place in Balurghat."
        canonical="/"
        keywords="SwiftMart, Swift Mart, swiftmart balurghat, local shops balurghat, grocery delivery balurghat, food delivery balurghat, mall balurghat, electronics repair balurghat, swiftmart space"
      />
      {/* ── Mobile Search Bar — tap opens full-screen overlay ── */}
      <div className="md:hidden">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-3 h-12 px-4 rounded-2xl bg-card border border-border/50 shadow-sm text-sm text-muted-foreground text-left active:scale-[0.98] transition-transform"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="flex-1 truncate">Search groceries, vegetables, medicine…</span>
        </button>
      </div>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <MapLocationPicker
        isOpen={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onConfirm={(loc: MapLocationResult) => {
          setSelectedDeliveryAddress({
            id: `addr_${Date.now()}`,
            label: "Home",
            line1: loc.line1,
            line2: loc.line2,
            city: loc.city,
            pincode: loc.pincode,
            lat: loc.lat,
            lng: loc.lng,
          });
          setMapPickerOpen(false);
        }}
      />

      {showComingSoon ? (
        <div className="py-12 md:py-24 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center p-8 bg-card rounded-3xl neu-card max-w-md mx-auto space-y-4 border border-primary/10"
          >
            <div className="relative w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                <MapPin className="w-10 h-10 fill-primary/20" />
              </motion.div>
              <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-40" />
            </div>
            <h2 className="text-2xl font-black bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
              Coming Soon to Your Area!
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              SwiftMart is currently serving <span className="font-bold text-primary">Balurghat (733101, 733102, 733103)</span> and surrounding areas. We will start delivering fresh groceries, food, and daily essentials to <span className="font-semibold text-foreground capitalize">{selectedCity}</span> very soon!
            </p>
            <div className="pt-2 w-full">
              <Button
                onClick={() => setMapPickerOpen(true)}
                className="w-full rounded-2xl bg-primary text-white font-bold text-sm h-11 neu-card gap-2"
              >
                <MapPin className="w-4 h-4" /> Change Location to Balurghat
              </Button>
            </div>
          </motion.div>
        </div>
      ) : (
        <>
          {/* ── 1. Dismissible "SwiftMart is back" Announcement Banner (Requirement #44) ── */}
          {!announcementDismissed && (
            <div className="relative flex items-center justify-between gap-3 bg-gradient-to-r from-primary/15 via-amber-500/10 to-primary/10 border border-primary/20 rounded-2xl px-4 py-3 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl shrink-0" aria-hidden="true">🎉</span>
                <p className="text-xs sm:text-sm font-semibold text-foreground truncate sm:whitespace-normal">
                  <span className="font-extrabold text-primary">SwiftMart is back!</span> Explore local stores, fresh food, Super Mall, and home services.
                </p>
              </div>
              <button
                onClick={() => {
                  setAnnouncementDismissed(true);
                  try { localStorage.setItem("sm_announcement_back_v1", "1"); } catch {}
                }}
                aria-label="Dismiss banner"
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── 2. Redesigned Hero Section (Requirement #1 & #2) ── */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-card via-card/95 to-background border border-border/60 p-6 sm:p-10 neu-card shadow-sm text-center md:text-left">
            <div className="max-w-3xl mx-auto md:mx-0 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Unified Local Commerce Platform</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight leading-[1.15]">
                Everything you need, <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent">
                  delivered fast.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                Shop local stores, order food &amp; groceries, discover products and book home services — all in one place.
              </p>

              {/* Large Universal Search Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (heroSearchQuery.trim()) {
                    setLocation(`/search?q=${encodeURIComponent(heroSearchQuery.trim())}`);
                  } else {
                    setSearchOpen(true);
                  }
                }}
                className="pt-2 max-w-2xl"
              >
                <div className="relative flex items-center">
                  <Search className="absolute left-4 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={heroSearchQuery}
                    onChange={(e) => setHeroSearchQuery(e.target.value)}
                    placeholder="Search products, stores or services (e.g. rice, cake, AC repair, store name)..."
                    className="w-full h-12 sm:h-13 pl-12 pr-24 rounded-2xl bg-background border-2 border-border/80 focus:border-primary text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none transition-all shadow-inner"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    Search
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2.5 text-xs text-muted-foreground flex-wrap">
                  <span className="font-semibold text-foreground/80">Try searching:</span>
                  {["Rice", "Cake", "AC Repair", "Stationery", "Fashion"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setLocation(`/search?q=${encodeURIComponent(tag)}`)}
                      className="px-2.5 py-0.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer text-[11px]"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </form>

              {/* Action CTAs */}
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <a
                  href="#primary-services"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <span>Start Shopping</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-muted/80 hover:bg-muted text-foreground font-bold text-sm border border-border/80 transition-all cursor-pointer"
                >
                  <Wrench className="w-4 h-4 text-primary" />
                  <span>Book Home Services</span>
                </Link>
              </div>
            </div>
          </section>

          {/* ── 3. Primary 4 SwiftMart Services (Requirement #3) ── */}
          <section id="primary-services" className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  What would you like today?
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Shop local stores, order fresh meals, discover Super Mall products or book repair services.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Local Stores */}
              <Link href="/stores" className="group block">
                <div className="h-full p-5 rounded-2xl bg-card border border-border/70 neu-card hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      🏪
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-base text-foreground group-hover:text-emerald-600 transition-colors">
                          Local Stores
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                          30–60m
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Groceries, vegetables, sweets, stationery and daily essentials.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-bold text-emerald-600">
                    <span>Browse Local Stores</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

              {/* Card 2: Food & Sweets */}
              <Link href="/stores" className="group block">
                <div className="h-full p-5 rounded-2xl bg-card border border-border/70 neu-card hover:border-orange-500/50 hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      🍱
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-base text-foreground group-hover:text-orange-600 transition-colors">
                          Food &amp; Sweets
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">
                          30–45m
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Restaurants, ready-made food, bakery and mithai.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-bold text-orange-600">
                    <span>Order Food &amp; Bakery</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

              {/* Card 3: SwiftMart Mall */}
              <Link href="/mall" className="group block">
                <div className="h-full p-5 rounded-2xl bg-card border border-border/70 neu-card hover:border-indigo-500/50 hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      🛍️
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-base text-foreground group-hover:text-indigo-600 transition-colors">
                          SwiftMart Mall
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600">
                          2–4 Days
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Fashion, beauty, electronics, gifts and other products.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-bold text-indigo-600">
                    <span>Explore Mall</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

              {/* Card 4: Service Corner */}
              <Link href="/services" className="group block">
                <div className="h-full p-5 rounded-2xl bg-card border border-border/70 neu-card hover:border-blue-500/50 hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      🛠️
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-base text-foreground group-hover:text-blue-600 transition-colors">
                          Service Corner
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                          Book Slot
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        TV, AC, fridge, fan and electronics/home services.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-bold text-blue-600">
                    <span>Book Service</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </div>
          </section>

          {/* ── 4. Marketing Hero Banners ── */}
          <HeroBannerSlider />

          {/* ── Quick Services: Send Parcel & Service Corner (Side-by-Side Dual Cards) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* 1. Send Parcel Card */}
            <Link href="/send-parcel" className="block group">
              <div className="relative h-full min-h-[136px] sm:min-h-[148px] p-4 sm:p-5 rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between border border-emerald-500/25 shadow-xs hover:shadow-md transition-all group-hover:-translate-y-0.5">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700" />
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />

                {/* Top: Icons & Badge */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-base shadow-xs">
                      📦
                    </span>
                    <span className="text-white font-black text-base sm:text-lg">Send Parcel</span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-xs border border-white/20">
                    Flat ₹39 Base · 30–45m
                  </span>
                </div>

                {/* Bottom: Text & Button */}
                <div className="relative z-10 mt-3 flex items-end justify-between gap-3">
                  <p className="text-white/90 text-xs sm:text-sm line-clamp-1">
                    Intra-city express delivery across Balurghat
                  </p>
                  <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-emerald-950 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-xl shadow-xs transition-colors">
                    <span>Book Delivery</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>

            {/* 2. Service Corner Card */}
            <Link href="/services" className="block group">
              <div className="relative h-full min-h-[136px] sm:min-h-[148px] p-4 sm:p-5 rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between border border-blue-500/25 shadow-xs hover:shadow-md transition-all group-hover:-translate-y-0.5">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-600 to-sky-600" />
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />

                {/* Top: Icons & Badge */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-base shadow-xs">
                      🛠️
                    </span>
                    <span className="text-white font-black text-base sm:text-lg">Service Corner</span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 shadow-xs">
                    Upahar Lab
                  </span>
                </div>

                {/* Bottom: Text & Button */}
                <div className="relative z-10 mt-3 flex items-end justify-between gap-3">
                  <p className="text-white/90 text-xs sm:text-sm line-clamp-1">
                    TV, AC, Fridge, RO &amp; Home Appliance Repair
                  </p>
                  <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-blue-950 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-xl shadow-xs transition-colors">
                    <span>Book Service</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* ── Category bubble list ───────────────────────────────── */}
          <section className="w-full">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
                Shop by Category
              </h2>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-x-2.5 gap-y-4">
              {(categoriesExpanded ? displayedCategories : displayedCategories.slice(0, 16)).map(cat => (
                <CategoryBubble key={cat.id} category={cat} />
              ))}
            </div>
            {displayedCategories.length > 16 && (
              <div className="flex justify-center mt-5">
                <button
                  onClick={() => setCategoriesExpanded(prev => !prev)}
                  className="flex items-center gap-1 px-4 py-2 rounded-full text-xs font-extrabold text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-border/80 bg-card/60 transition-all cursor-pointer shadow-sm hover:scale-105"
                >
                  {categoriesExpanded ? (
                    <>
                      See Less <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      See More ({displayedCategories.length - 16} more) <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </section>

          {/* Admin-curated highlighted bucket bundles / value deals */}
          <BucketBanner />

          {/* ── AdSense Section Banner: Category & Shops Divider ── */}
          <AdSenseSectionBanner />

          {/* ── Stores Near You (Requirement #7) ───────────────────── */}
          <section>
            <SectionHeader
              title="Stores Near You"
              action={
                shops.length > SHOPS_PREVIEW ? (
                  <Link
                    href="/stores"
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
                  >
                    See all ({shops.length}) <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">
                    {shops.length} verified stores
                  </span>
                )
              }
            />
            {shopsLoading ? (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-3 px-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="snap-start shrink-0 block w-[calc(75vw)] max-w-[260px] min-w-[200px] bg-card rounded-2xl p-3 animate-pulse h-20" />
                ))}
              </div>
            ) : popularShops.length === 0 ? (
              <p className="text-sm text-muted-foreground px-3">No stores available yet.</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-3 px-3">
                {popularShops.map((shop) => (
                  <Link key={shop.id} href={getShopUrl(shop)} className="snap-start shrink-0 block w-[calc(75vw)] max-w-[260px] min-w-[200px]">
                    <div className="bg-card rounded-2xl p-3 neu-card flex gap-3 items-center h-full hover:border-primary/40 transition-colors">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-background neu-inset flex-shrink-0">
                        <img src={shop.image} alt={shop.storeName} width={56} height={56} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate text-foreground">{shop.storeName}</h3>
                        <div className="text-[10px] text-muted-foreground mb-1 truncate">{shop.category}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                            <Star className="w-3 h-3 fill-current" />
                            {Number(shop.rating || 0) > 0 ? Number(shop.rating).toFixed(1) : "New"}
                          </div>
                          {user?.pincode && shop.pincode === user.pincode && (
                            <div className="flex items-center gap-0.5 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                              <Store className="w-2.5 h-2.5" />
                              Local
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ── Dynamic Admin Sections ───────────────────────────── */}
          {sectionsLoading ? (
            <section className="w-full">
              <Skeleton className="h-6 w-48 mb-4 rounded-md" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="bg-card rounded-2xl p-2.5 flex flex-col gap-2 neu-card">
                    <Skeleton className="aspect-square w-full rounded-xl" />
                    <Skeleton className="h-3.5 w-12 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <div className="flex items-center justify-between mt-auto pt-1">
                      <Skeleton className="h-5 w-14 rounded" />
                      <Skeleton className="h-8 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : dynamicSections.length > 0 ? (
            dynamicSections
              .map(section => ({
                ...section,
                products: section.products.filter(p => !p.shopId || visibleShopIds.size === 0 || visibleShopIds.has(p.shopId)),
              }))
              .filter(s => s.products.length > 0)
              .map(section => <DynamicSection key={section._id || section.id} section={section} />)
          ) : null}

          {/* ── Order Again for logged-in users (Requirement #12) ── */}
          {recentOrders.length > 0 && (
            <section className="p-4 sm:p-5 rounded-2xl bg-card border border-border/60 neu-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  <h2 className="font-bold text-sm sm:text-base text-foreground">Order Again</h2>
                </div>
                <Link href="/orders" className="text-xs font-semibold text-primary hover:underline">
                  All Orders →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {recentOrders.map(ord => (
                  <Link
                    key={ord.id || ord._id}
                    href="/orders"
                    className="p-3 rounded-xl bg-background border border-border/50 hover:border-primary/50 transition-colors block"
                  >
                    <div className="flex justify-between items-center text-xs font-bold text-foreground">
                      <span className="truncate">{ord.shopName || "SwiftMart Order"}</span>
                      <span>₹{Number(ord.totalAmount || ord.netAmount || 0).toFixed(0)}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex justify-between items-center">
                      <span>{new Date(ord.createdAt || Date.now()).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                      <span className="capitalize font-medium text-primary">{(ord.status || "").replace(/_/g, " ")}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Why SwiftMart / Trust & Transparency (Requirement #13) ── */}
          <section className="rounded-3xl bg-card/60 border border-border/60 p-6 sm:p-8 neu-card">
            <div className="text-center max-w-xl mx-auto mb-8 space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-foreground">
                Why Shop on SwiftMart?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Built for Balurghat. Supporting local shop owners and bringing transparent doorstep service to your home.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center sm:text-left">
              <div className="space-y-2 flex flex-col items-center sm:items-start">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg">
                  🏪
                </div>
                <h3 className="font-bold text-sm text-foreground">100% Local Merchants</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Every store is a verified neighborhood business with real physical presence in Balurghat.
                </p>
              </div>

              <div className="space-y-2 flex flex-col items-center sm:items-start">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-lg">
                  ⚡
                </div>
                <h3 className="font-bold text-sm text-foreground">Honest, Fast Delivery</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No false 10-minute promises. Realistic ETAs based on actual store distance and prep times.
                </p>
              </div>

              <div className="space-y-2 flex flex-col items-center sm:items-start">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-lg">
                  🛡️
                </div>
                <h3 className="font-bold text-sm text-foreground">Quality Guarantee</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  24-hour resolution for fresh items and 3–7 day replacement guarantee on mall merchandise.
                </p>
              </div>

              <div className="space-y-2 flex flex-col items-center sm:items-start">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-lg">
                  📞
                </div>
                <h3 className="font-bold text-sm text-foreground">Real Human Support</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Connect directly with our local operations team via WhatsApp or call at +91 62961 18949.
                </p>
              </div>
            </div>
          </section>

          {/* ── Space reserved for User Testimonials ── */}
        </>
      )}
      </div>

      {/* ── Global Clean Dark Footer (ABOLTABOL style) ── */}
      <SiteFooter />
    </div>
  );
}
