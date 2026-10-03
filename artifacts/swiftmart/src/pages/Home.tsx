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
import { Star, ChevronRight, ChevronLeft, Zap, MapPin, Search, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { Product } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { isAddressServiceable } from "@/lib/serviceArea";
import { MapLocationPicker, type MapLocationResult } from "@/components/MapLocationPicker";
import { AdSenseSectionBanner } from "@/components/GoogleAdSense";
import { getShopUrl } from "@/lib/shopUrl";

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
    "description": "Hyperlocal 10-minute online delivery of groceries, fresh vegetables, dairy, and medicines in Balurghat.",
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
    "description": "10-minute home delivery of groceries, vegetables, fruits, medicines, and daily essentials from local shops in Balurghat.",
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
  toys: 27, household: 28, gifts: 29, gaming: 30, hardware: 31,
};
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
  const [apiCategories, setApiCategories] = useState<DisplayCategory[]>([]);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
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

  const SHOPS_PREVIEW = 4;
  const popularShops = shops.slice(0, SHOPS_PREVIEW);
  const isCityEmpty = !!selectedCity && !shopsLoading && shops.length === 0;

  return (
    <div className="w-full flex flex-col min-h-screen">
      <div className="pb-16 pt-4 px-3 w-full max-w-7xl mx-auto space-y-6 flex-1">
        {/* Visually-hidden H1 anchors the page outline for crawlers */}
      <h1 className="sr-only">SwiftMart (Swift Mart) — 10-Minute Delivery | Balurghat</h1>
      <SEO
        title="SwiftMart (Swift Mart) — 10-Minute Delivery | Balurghat"
        description="SwiftMart (Swift Mart) Balurghat delivers fresh groceries, fruits, vegetables, medicines, and daily essentials from local shops to your door in 10 minutes."
        canonical="/"
        keywords="SwiftMart, Swift Mart, swiftmart, swift-mart, swift mart app, swiftmart space, swiftmart balurghat, quick commerce near me, online grocery delivery balurghat, 10 minute delivery balurghat, blinkit balurghat, zepto balurghat, Balurghat Grocery, Balurghat Online Shopping, Quick Commerce Balurghat, Food Delivery Balurghat, Medicine Delivery Balurghat, Vegetable Delivery Balurghat, Local Marketplace Balurghat, ridam mohanta, abhi das"
        jsonLd={HOME_JSON_LD}
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
          {/* First-order promo banner — dismissable */}
          {!bannerDismissed && (
            <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-2xl px-4 py-2.5">
              <span className="text-xl shrink-0" aria-hidden="true">🎉</span>
              <p className="flex-1 text-sm font-semibold text-foreground leading-snug">
                New here? Use code{" "}
                <span className="text-primary font-extrabold tracking-wide">FIRST50</span>{" "}
                for ₹50 off your first order!
              </p>
              <button
                onClick={() => {
                  setBannerDismissed(true);
                  localStorage.setItem("sm_promo_banner_v1", "1");
                }}
                aria-label="Dismiss offer banner"
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/50"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}

          <HeroBannerSlider />

          {/* SwiftMart Local Q-Commerce Delivery Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center" aria-label="SwiftMart Delivery Highlights">
            <div className="bg-card/60 border border-border/40 rounded-xl p-2.5 neu-inset">
              <span className="text-xs font-bold text-foreground block">⚡ 30–45 Min Express</span>
              <span className="text-[10px] text-muted-foreground">Local Q-Commerce Fleet</span>
            </div>
            <div className="bg-card/60 border border-border/40 rounded-xl p-2.5 neu-inset">
              <span className="text-xs font-bold text-foreground block">🥦 Fresh Groceries</span>
              <span className="text-[10px] text-muted-foreground">Local Farm Daily Staples</span>
            </div>
            <div className="bg-card/60 border border-border/40 rounded-xl p-2.5 neu-inset">
              <span className="text-xs font-bold text-foreground block">🏪 Balurghat Local Shops</span>
              <span className="text-[10px] text-muted-foreground">Direct Trusted Retailers</span>
            </div>
            <div className="bg-card/60 border border-border/40 rounded-xl p-2.5 neu-inset">
              <span className="text-xs font-bold text-foreground block">🚚 Heavy Logistics (1–3d)</span>
              <span className="text-[10px] text-muted-foreground">Bulky Goods Transport</span>
            </div>
          </div>

          {/* Admin-curated highlighted bucket bundles */}
          <BucketBanner />

          {/* ── Quick Access Row: Fresh Grocery & Service Corner (Side-by-Side Square Cards) ── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* 1. Fresh Grocery Card */}
            <Link href="/grocery" className="block group">
              <div className="relative h-full min-h-[148px] sm:min-h-[164px] p-3.5 sm:p-4 rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between border border-emerald-500/20 shadow-xs transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
                {/* gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500" />
                {/* pattern overlay */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />

                {/* Top: Icons & Badge */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex -space-x-1.5">
                    {["🥛", "🥦", "🍎"].map((em, i) => (
                      <div key={i} className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-sm sm:text-base shadow-xs" style={{ zIndex: 3 - i }}>
                        {em}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-xs">
                    30–45m
                  </span>
                </div>

                {/* Bottom: Text & Button */}
                <div className="relative z-10 mt-3">
                  <p className="text-white font-extrabold text-sm sm:text-base leading-tight">Fresh Grocery</p>
                  <p className="text-white/85 text-[11px] sm:text-xs mt-0.5 line-clamp-1">Veggies, Dairy & Snacks</p>
                  <div className="mt-2.5 flex items-center gap-1 text-[11px] sm:text-xs font-bold text-emerald-950 bg-white hover:bg-emerald-50 w-fit px-2.5 py-1 rounded-lg shadow-xs transition-colors">
                    <span>Shop Now</span>
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </div>
            </Link>

            {/* 2. Service Corner Card */}
            <Link href="/services" className="block group">
              <div className="relative h-full min-h-[148px] sm:min-h-[164px] p-3.5 sm:p-4 rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between border border-blue-500/30 shadow-xs transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
                {/* gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-600 to-sky-500" />
                {/* pattern overlay */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />

                {/* Top: Icons & Badge */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex -space-x-1.5">
                    {["📺", "❄️", "🧊"].map((em, i) => (
                      <div key={i} className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-sm sm:text-base shadow-xs" style={{ zIndex: 3 - i }}>
                        {em}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 shadow-xs">
                    Upahar Lab
                  </span>
                </div>

                {/* Bottom: Text & Button */}
                <div className="relative z-10 mt-3">
                  <p className="text-white font-extrabold text-sm sm:text-base leading-tight">Service Corner 🛠️</p>
                  <p className="text-white/85 text-[11px] sm:text-xs mt-0.5 line-clamp-1">TV, AC, Fridge Repair</p>
                  <div className="mt-2.5 flex items-center gap-1 text-[11px] sm:text-xs font-bold text-blue-950 bg-white hover:bg-blue-50 w-fit px-2.5 py-1 rounded-lg shadow-xs transition-colors">
                    <span>Book Now</span>
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* ── Category bubble list ───────────────────────────────── */}
          <section className="w-full">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[15px] font-extrabold text-foreground tracking-tight">Shop Grocery &amp; Daily Essentials by Category</h2>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-x-2.5 gap-y-4">
              {(categoriesExpanded ? apiCategories : apiCategories.slice(0, 16)).map(cat => (
                <CategoryBubble key={cat.id} category={cat} />
              ))}
            </div>
            {apiCategories.length > 16 && (
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
                      See More ({apiCategories.length - 16} more) <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </section>


          {/* ── AdSense Section Banner: Category & Shops Divider ── */}
          <AdSenseSectionBanner />

          {/* ── Popular Shops ─────────────────────────────────────── */}
          <section>
            <SectionHeader
              title="Local Balurghat Grocery Shops &amp; Supermarkets"
              action={
                shops.length > SHOPS_PREVIEW ? (
                  <Link
                    href="/shops"
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
                  >
                    See all <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">
                    {shops.length} active
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
              <p className="text-sm text-muted-foreground px-3">No shops available yet.</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-3 px-3">
                {popularShops.map((shop) => (
                  <Link key={shop.id} href={getShopUrl(shop)} className="snap-start shrink-0 block w-[calc(75vw)] max-w-[260px] min-w-[200px]">
                    <div className="bg-card rounded-2xl p-3 neu-card flex gap-3 items-center h-full">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-background neu-inset flex-shrink-0">
                        <img src={shop.image} alt={shop.storeName} width={56} height={56} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate text-foreground">{shop.storeName}</h3>
                        <div className="text-[10px] text-muted-foreground mb-1 truncate">{shop.category}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                            <Star className="w-3 h-3 fill-current" />
                            {shop.rating > 0 ? shop.rating.toFixed(1) : "New"}
                          </div>
                          {user?.pincode && shop.pincode === user.pincode && (
                            <div className="flex items-center gap-0.5 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                              <Zap className="w-2.5 h-2.5 fill-current" />
                              Quick
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

          {/* ── Space reserved for User Testimonials ── */}
        </>
      )}
      </div>

      {/* ── Global Clean Dark Footer (ABOLTABOL style) ── */}
      <SiteFooter />
    </div>
  );
}
