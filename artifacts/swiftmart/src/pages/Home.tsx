import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useShops } from "@/hooks/useShops";
import { HeroBannerSlider } from "@/components/HeroBannerSlider";
import { BucketBanner } from "@/components/BucketBanner";
import { CategoryBubble, type DisplayCategory } from "@/components/CategoryBubble";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/SectionHeader";
import { SEO } from "@/components/SEO";
import { SiteFooter, FAQ_ITEMS } from "@/components/SiteFooter";
import { SearchOverlay } from "@/components/SearchOverlay";
import { api } from "@/lib/api";
import {
  Star,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Search,
  ChevronDown,
  ChevronUp,
  Wrench,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
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
    "mainEntity": FAQ_ITEMS.map((item) => ({
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
        "sameAs": "https://swiftmart.space/about#founders",
      },
      {
        "@type": "Person",
        "name": "Abhi Das",
        "jobTitle": "Co-Founder & Head of Operations",
        "sameAs": "https://swiftmart.space/about#founders",
      },
    ],
    "foundingLocation": {
      "@type": "Place",
      "name": "Balurghat, West Bengal, India",
    },
    "knowsAbout": [
      "Grocery Delivery",
      "Quick Commerce",
      "Local Marketplace",
      "Food Delivery",
      "Medicine Delivery",
      "Balurghat",
      "Dakshin Dinajpur",
      "West Bengal",
    ],
    "areaServed": {
      "@type": "City",
      "name": "Balurghat",
      "containedInPlace": {
        "@type": "State",
        "name": "West Bengal",
        "containedInPlace": { "@type": "Country", "name": "India" },
      },
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+916296118949",
      "url": "https://swiftmart.space/contact-support",
      "contactType": "customer support",
      "hoursAvailable": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "opens": "09:00",
        "closes": "19:00",
      },
      "availableLanguage": ["English", "Bengali"],
    },
    "sameAs": [
      "https://swiftmart.space/",
      "https://share.google/7uxIQizF0XLUe9TgX",
      "https://www.facebook.com/swiftmart.balurghat",
      "https://www.instagram.com/swiftmart.balurghat",
      "https://x.com/SwiftMart_IN",
      "https://www.linkedin.com/company/swiftmart-balurghat",
      "https://www.youtube.com/@SwiftMartBalurghat",
    ],
  },
  {
    "@type": "WebSite",
    "@id": "https://swiftmart.space/#website",
    "url": "https://swiftmart.space/",
    "name": "SwiftMart",
    "description":
      "Order groceries, vegetables, fruits, food, medicines, dairy, bakery, sweets and daily essentials from trusted local shops in Balurghat with SwiftMart.",
    "inLanguage": "en-IN",
    "potentialAction": {
      "@type": "SearchAction",
      "target": { "@type": "EntryPoint", "urlTemplate": "https://swiftmart.space/search?q={search_term_string}" },
      "query-input": "required name=search_term_string",
    },
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
    "description":
      "Unified local commerce platform delivering groceries, fresh vegetables, hot food, mall products, and appliance repair services in Balurghat.",
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
      "addressCountry": "IN",
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 25.2167,
      "longitude": 88.7667,
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5.0",
      "reviewCount": "15",
      "bestRating": "5",
      "worstRating": "1",
    },
    "hasMap": "https://maps.google.com/?q=Swift+Mart+Balurghat+Gourlo+Math+733103",
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      "opens": "07:00",
      "closes": "23:00",
    },
    "areaServed": [
      { "@type": "City", "name": "Balurghat" },
      { "@type": "PostalAddress", "postalCode": "733101", "addressCountry": "IN" },
      { "@type": "PostalAddress", "postalCode": "733103", "addressCountry": "IN" },
    ],
  },
  {
    "@type": "Service",
    "@id": "https://swiftmart.space/#service",
    "name": "SwiftMart Quick Delivery",
    "serviceType": "Grocery & Daily Essentials Delivery",
    "description":
      "Fast home delivery of groceries, vegetables, fruits, food, and daily essentials from trusted local shops in Balurghat.",
    "provider": { "@id": "https://swiftmart.space/#business" },
    "areaServed": { "@type": "City", "name": "Balurghat" },
    "availableChannel": {
      "@type": "ServiceChannel",
      "serviceUrl": "https://swiftmart.space/",
      "servicePhone": "+916296118949",
    },
  },
  {
    "@type": "WebApplication",
    "name": "SwiftMart",
    "url": "https://swiftmart.space/",
    "applicationCategory": "ShoppingApplication",
    "operatingSystem": "All",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "INR" },
  },
];

const CACHE_TTL = 5 * 60_000;
let _categoriesCache: { data: DisplayCategory[]; at: number } | null = null;

const FRIENDLY_NAMES: Record<string, string> = {
  "ayush-store": "Wellness",
  "baby-store": "Baby Care",
  "derma-store": "Skin Care",
  "automotive-store": "Auto Accessories",
  "fruits-vegetables": "Fruits & Vegetables",
  vegetables: "Fruits & Vegetables",
  "sweet-shop": "Sweets & Bakery",
  bakery: "Sweets & Bakery",
  food_junction: "Food",
  "zepto-cafe": "Food",
  restaurant: "Food",
  "fast-food": "Food",
  "kirana-store": "Grocery",
  grocery: "Grocery",
  "personal-care": "Beauty & Care",
  beauty: "Beauty & Care",
  clothing: "Fashion",
  fashion: "Fashion",
  stationery: "Stationery",
  electronics: "Electronics",
};

const CATEGORY_PRIORITY: Record<string, number> = {
  grocery: 1,
  "kirana-store": 1,
  "fruits-vegetables": 2,
  vegetables: 2,
  fruits: 3,
  food_junction: 4,
  restaurant: 4,
  "fast-food": 4,
  "sweet-shop": 5,
  bakery: 5,
  stationery: 6,
  beauty: 7,
  "personal-care": 7,
  electronics: 8,
  fashion: 9,
  clothing: 9,
  "derma-store": 10,
  "baby-store": 11,
  "ayush-store": 12,
  "automotive-store": 13,
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
  "hsl(35,90%,55%)",
  "hsl(140,60%,45%)",
  "hsl(200,70%,55%)",
  "hsl(20,90%,55%)",
  "hsl(210,80%,55%)",
  "hsl(45,90%,50%)",
  "hsl(0,65%,50%)",
  "hsl(330,70%,60%)",
  "hsl(280,60%,60%)",
  "hsl(170,60%,45%)",
  "hsl(260,55%,55%)",
  "hsl(200,80%,50%)",
  "hsl(350,80%,60%)",
  "hsl(160,60%,40%)",
  "hsl(230,60%,55%)",
  "hsl(250,55%,55%)",
];

interface RawProduct {
  id?: unknown;
  _id?: unknown;
  name?: unknown;
  category?: unknown;
  price?: unknown;
  discountedPrice?: unknown;
  unit?: unknown;
  images?: unknown;
  image?: unknown;
  description?: unknown;
  stock?: unknown;
  rating?: unknown;
  shopId?: unknown;
  shopName?: unknown;
  trending?: unknown;
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

function normalizeAndOrderSections(sections: HomepageSection[]): HomepageSection[] {
  const merged: HomepageSection[] = [];

  for (const sec of sections) {
    const rawTitle = (sec.title || "").trim();
    const lower = rawTitle.toLowerCase();

    // Deduplicate Vegetable / Vegetables sections into one cohesive section
    if (lower === "vegetable" || lower === "vegetables" || lower === "fresh vegetables") {
      const existingVegIdx = merged.findIndex((s) => {
        const t = s.title.toLowerCase();
        return t.includes("produce") || t.includes("vegetable");
      });

      if (existingVegIdx !== -1) {
        const existing = merged[existingVegIdx];
        const existingIds = new Set(existing.products.map((p) => p.id));
        const newProducts = sec.products.filter((p) => !existingIds.has(p.id));
        existing.products = [...existing.products, ...newProducts];
        existing.total += newProducts.length;
        existing.title = "Fresh Produce & Vegetables";
      } else {
        merged.push({
          ...sec,
          title: "Fresh Produce & Vegetables",
        });
      }
      continue;
    }

    merged.push(sec);
  }

  // Desired homepage hierarchy:
  // 1. Food & Sweets
  // 2. Fresh Grocery / Fruits & Vegetables
  // 3. Recommended / Popular Products
  // 4. Other
  return merged.sort((a, b) => {
    const getRank = (title: string) => {
      const t = title.toLowerCase();
      if (t.includes("food") || t.includes("sweet") || t.includes("bakery") || t.includes("cafe")) return 1;
      if (t.includes("produce") || t.includes("vegetable") || t.includes("fruit") || t.includes("grocery")) return 2;
      if (t.includes("recommend") || t.includes("trending") || t.includes("popular") || t.includes("top pick")) return 3;
      return 4;
    };
    return getRank(a.title) - getRank(b.title);
  });
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
          <button
            type="button"
            onClick={() => scrollByAmount(-350)}
            aria-label="Scroll left"
            className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-card/90 backdrop-blur border border-border shadow-lg items-center justify-center text-foreground hover:bg-card hover:scale-110 active:scale-95 transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount(350)}
            aria-label="Scroll right"
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-card/90 backdrop-blur border border-border shadow-lg items-center justify-center text-foreground hover:bg-card hover:scale-110 active:scale-95 transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
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
                  className="w-full h-full min-h-[220px] flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border border-border/50 hover:bg-primary/5 hover:border-primary transition-all text-center group"
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
              className="rounded-full px-8 font-semibold border-border/60 gap-2 cursor-pointer"
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

  const isServiceable = isAddressServiceable(selectedDeliveryAddress);
  const showComingSoon = !isServiceable && !!selectedDeliveryAddress;

  const visibleShopIds = useMemo(() => new Set(shops.map((s) => s.id)), [shops]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [apiCategories, setApiCategories] = useState<DisplayCategory[]>([]);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  const [dynamicSections, setDynamicSections] = useState<HomepageSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  // Load admin-configured homepage sections
  useEffect(() => {
    setSectionsLoading(true);
    api
      .get<{ success: boolean; sections: Array<HomepageSection & { products: RawProduct[] }> }>("/homepage-sections")
      .then((d) => {
        const mapped = (d.sections ?? []).map((s) => ({
          ...s,
          products: (s.products ?? []).map(mapProduct),
        }));
        setDynamicSections(normalizeAndOrderSections(mapped));
      })
      .catch(() => {})
      .finally(() => setSectionsLoading(false));
  }, []);

  // Load categories
  useEffect(() => {
    if (_categoriesCache && Date.now() - _categoriesCache.at < CACHE_TTL) {
      setApiCategories(_categoriesCache.data);
      return;
    }
    api
      .get<{ success: boolean; categories: Array<{ _id: string; name: string; slug: string; emoji?: string; color?: string }> }>("/categories")
      .then((d) => {
        const mapped = (d.categories ?? [])
          .filter((c) => c.slug !== "sexual-wellness" && !c.name.toLowerCase().includes("sexual"))
          .map((c, i) => {
            const friendlyName = FRIENDLY_NAMES[c.slug] || FRIENDLY_NAMES[c.name.toLowerCase().replace(/\s+/g, "-")] || c.name;
            return {
              id: c.slug,
              name: friendlyName,
              emoji: c.emoji ?? "🛍️",
              color: c.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
            };
          });
        const sorted = sortCategories(mapped);
        _categoriesCache = { data: sorted, at: Date.now() };
        setApiCategories(sorted);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      api
        .get<{ success: boolean; orders: any[] }>("/orders")
        .then((d) => {
          if (d?.orders && Array.isArray(d.orders)) {
            setRecentOrders(d.orders.slice(0, 3));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const SHOPS_PREVIEW = 8;
  const popularShops = shops.slice(0, SHOPS_PREVIEW);

  return (
    <div className="w-full flex flex-col min-h-screen">
      <div className="pb-16 pt-3 px-3 w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 flex-1">
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
            className="w-full flex items-center gap-3 h-11 px-4 rounded-2xl bg-card border border-border/50 shadow-xs text-sm text-muted-foreground text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="flex-1 truncate">Search groceries, food, sweets, services…</span>
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
          <div className="py-12 md:py-20 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center p-8 bg-card rounded-3xl max-w-md mx-auto space-y-4 border border-primary/20 shadow-md"
            >
              <div className="relative w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                <MapPin className="w-8 h-8 fill-primary/20" />
              </div>
              <h2 className="text-xl font-black bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                Coming Soon to Your Area!
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                SwiftMart is currently serving <span className="font-bold text-primary">Balurghat (733101, 733102, 733103)</span>.
                We will start delivering to <span className="font-semibold text-foreground capitalize">{selectedCity}</span> very soon!
              </p>
              <div className="pt-2 w-full">
                <Button
                  onClick={() => setMapPickerOpen(true)}
                  className="w-full rounded-xl bg-primary text-white font-bold text-sm h-10 gap-2 cursor-pointer"
                >
                  <MapPin className="w-4 h-4" /> Change Location to Balurghat
                </Button>
              </div>
            </motion.div>
          </div>
        ) : (
          <>
            {/* ── 1. Compact Hero (Reduced height by ~45%, no duplicate search/tags) ── */}
            <section className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-r from-card via-card/90 to-background border border-border/50 p-4 sm:p-6 md:p-8 shadow-xs">
              <div className="flex flex-col md:flex-row items-center justify-between gap-5">
                <div className="max-w-xl space-y-2 text-center md:text-left">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-tight">
                    Everything you need,{" "}
                    <span className="bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent">
                      delivered fast.
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Local stores, food, shopping &amp; home services — all in one place.
                  </p>
                  <div className="pt-2 flex items-center justify-center md:justify-start">
                    <a
                      href="#stores-near-you"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      <span>Start Shopping</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Desktop Commerce Visual — compact badges, zero dead space */}
                <div className="hidden md:flex items-center gap-3 shrink-0">
                  <div className="p-3.5 rounded-2xl bg-background/80 border border-border/60 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                      ⚡
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-foreground">Fast Local Delivery</p>
                      <p className="text-[11px] text-muted-foreground">30–60 mins in Balurghat</p>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-background/80 border border-border/60 shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-lg">
                      🏪
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-foreground">Verified Merchants</p>
                      <p className="text-[11px] text-muted-foreground">Neighborhood stores</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 2. Four Main Pillars (Compact Shortcuts: 2×2 mobile, 4-col desktop) ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5">
              {/* Pillar 1: Local Stores */}
              <Link href="/stores" className="group block">
                <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/50 hover:border-emerald-500/50 transition-all flex items-center gap-3 shadow-xs">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                    🏪
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs sm:text-sm text-foreground truncate group-hover:text-emerald-500 transition-colors">
                      Local Stores
                    </p>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-500">
                      30–60m
                    </span>
                  </div>
                </div>
              </Link>

              {/* Pillar 2: Food & Sweets */}
              <Link href="/stores" className="group block">
                <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/50 hover:border-orange-500/50 transition-all flex items-center gap-3 shadow-xs">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                    🍱
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs sm:text-sm text-foreground truncate group-hover:text-orange-500 transition-colors">
                      Food &amp; Sweets
                    </p>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-orange-500">
                      30–45m
                    </span>
                  </div>
                </div>
              </Link>

              {/* Pillar 3: SwiftMart Mall */}
              <Link href="/mall" className="group block">
                <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/50 hover:border-indigo-500/50 transition-all flex items-center gap-3 shadow-xs">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                    🛍️
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs sm:text-sm text-foreground truncate group-hover:text-indigo-500 transition-colors">
                      SwiftMart Mall
                    </p>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-indigo-400">
                      2–4 Days
                    </span>
                  </div>
                </div>
              </Link>

              {/* Pillar 4: Service Corner */}
              <Link href="/services" className="group block">
                <div className="p-3 sm:p-3.5 rounded-2xl bg-card border border-border/50 hover:border-blue-500/50 transition-all flex items-center gap-3 shadow-xs">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                    🛠️
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs sm:text-sm text-foreground truncate group-hover:text-blue-500 transition-colors">
                      Services
                    </p>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-blue-400">
                      Book Slot
                    </span>
                  </div>
                </div>
              </Link>
            </div>

            {/* ── 3. Stores Near You (Moved high up, enhanced store cards) ── */}
            <section id="stores-near-you" className="scroll-mt-20">
              <SectionHeader
                title="Stores Near You"
                action={
                  shops.length > SHOPS_PREVIEW ? (
                    <Link
                      href="/stores"
                      className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:opacity-80 transition-opacity"
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
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="snap-start shrink-0 block w-[260px] bg-card rounded-2xl p-3 animate-pulse h-20 border border-border/40"
                    />
                  ))}
                </div>
              ) : popularShops.length === 0 ? (
                <p className="text-sm text-muted-foreground px-1">No stores available yet.</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-3 px-3">
                  {popularShops.map((shop) => (
                    <Link
                      key={shop.id}
                      href={getShopUrl(shop)}
                      className="snap-start shrink-0 block w-[260px] sm:w-[280px] group"
                    >
                      <div className="bg-card rounded-2xl p-3 border border-border/50 hover:border-primary/40 transition-all flex gap-3.5 items-center h-full shadow-xs hover:shadow-md">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-background border border-border/40 shrink-0 relative">
                          <img
                            src={shop.image || "/assets/store-placeholder.png"}
                            alt={shop.storeName}
                            width={64}
                            height={64}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {shop.storeName}
                          </h3>
                          <div className="text-[11px] text-muted-foreground capitalize truncate mt-0.5">
                            {shop.category || "General Store"}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                              <Star className="w-3 h-3 fill-current" />
                              <span>{Number(shop.rating || 0) > 0 ? Number(shop.rating).toFixed(1) : "New on SwiftMart"}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium bg-muted/60 px-1.5 py-0.5 rounded">
                              30–60m
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* ── 4. Shop by Category (Top 8 first, friendly names, toggle) ── */}
            <section className="w-full">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
                  Shop by Category
                </h2>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-x-2.5 gap-y-4">
                {(categoriesExpanded ? apiCategories : apiCategories.slice(0, 8)).map((cat) => (
                  <CategoryBubble key={cat.id} category={cat} />
                ))}
              </div>
              {apiCategories.length > 8 && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => setCategoriesExpanded((prev) => !prev)}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-border/70 bg-card transition-all cursor-pointer shadow-2xs hover:scale-105"
                  >
                    {categoriesExpanded ? (
                      <>
                        See Less <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        See all categories ({apiCategories.length - 8} more) <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </section>

            {/* ── 5. Dynamic Product Sections (Food & Sweets -> Fresh Produce -> Recommended) ── */}
            {sectionsLoading ? (
              <section className="w-full">
                <Skeleton className="h-6 w-48 mb-4 rounded-md" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="bg-card rounded-2xl p-2.5 flex flex-col gap-2 border border-border/40">
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
                .map((section) => ({
                  ...section,
                  products: section.products.filter((p) => !p.shopId || visibleShopIds.size === 0 || visibleShopIds.has(p.shopId)),
                }))
                .filter((s) => s.products.length > 0)
                .map((section) => <DynamicSection key={section._id || section.id} section={section} />)
            ) : null}

            {/* Curated bucket deals / bundle offers */}
            <BucketBanner />

            {/* ── 6. Promotional Banner (Campaign/merchant specific, reduced height) ── */}
            <HeroBannerSlider />

            {/* ── 7. Detailed Service Corner Section ── */}
            <section className="rounded-2xl md:rounded-3xl bg-gradient-to-br from-blue-950/40 via-card to-background border border-blue-500/30 p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[11px] font-bold">
                    <Wrench className="w-3 h-3" />
                    <span>Upahar Lab Service Corner</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-foreground">
                    Appliance &amp; Electronics Repair in Balurghat
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Professional doorstep technician visit for TV, AC, refrigerator, washing machine, microwave &amp; water purifier.
                  </p>
                </div>
                <Link href="/services" className="shrink-0">
                  <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm h-10 px-5 gap-1.5 shadow-sm cursor-pointer">
                    <span>Book Service Slot</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </section>

            {/* ── 8. SwiftMart Mall Showcase ── */}
            <section className="rounded-2xl md:rounded-3xl bg-gradient-to-br from-indigo-950/40 via-card to-background border border-indigo-500/30 p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[11px] font-bold">
                    <ShoppingBag className="w-3 h-3" />
                    <span>SwiftMart Mall · Pan-Balurghat Delivery</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-foreground">
                    Curated Fashion, Gadgets &amp; Lifestyle
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Explore verified brand products, electronics, stationery, gifts and lifestyle merchandise with 2–4 day delivery.
                  </p>
                </div>
                <Link href="/mall" className="shrink-0">
                  <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm h-10 px-5 gap-1.5 shadow-sm cursor-pointer">
                    <span>Explore Mall</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </section>

            {/* ── 9. More from SwiftMart / Send Parcel ── */}
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
                More from SwiftMart
              </h2>
              <Link href="/send-parcel" className="block group">
                <div className="rounded-2xl bg-card border border-emerald-500/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-emerald-500/60 transition-all shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                      📦
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm sm:text-base text-foreground group-hover:text-emerald-500 transition-colors">
                          Send Parcel — Express Local Courier
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                          Flat ₹39 Base
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Instant point-to-point document, package, and gift delivery across Balurghat within 30–45 mins.
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3.5 py-2 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <span>Send Package</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            </section>

            {/* ── 10. Order Again (for logged-in customers) ── */}
            {recentOrders.length > 0 && (
              <section className="p-4 sm:p-5 rounded-2xl bg-card border border-border/50 space-y-3 shadow-xs">
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
                  {recentOrders.map((ord) => (
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

            {/* ── AdSense Banner ── */}
            <AdSenseSectionBanner />

            {/* ── 11. Why SwiftMart (Shortened, realistic benefits) ── */}
            <section className="rounded-2xl md:rounded-3xl bg-card/60 border border-border/50 p-5 sm:p-7 shadow-xs">
              <div className="text-center max-w-lg mx-auto mb-6 space-y-1">
                <h2 className="text-lg sm:text-xl font-black text-foreground">
                  Why Shop on SwiftMart?
                </h2>
                <p className="text-xs text-muted-foreground">
                  Supporting local shop owners with dependable doorstep service in Balurghat.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center sm:text-left">
                <div className="space-y-1.5 p-3 rounded-xl bg-background/50 border border-border/40">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-base mx-auto sm:mx-0">
                    🏪
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-foreground">Local Partners</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Real neighborhood shops and verified sellers in Balurghat.
                  </p>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-background/50 border border-border/40">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-base mx-auto sm:mx-0">
                    ⚡
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-foreground">Realistic ETAs</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Prompt 30–60m delivery based on actual store prep and distance.
                  </p>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-background/50 border border-border/40">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-base mx-auto sm:mx-0">
                    🏷️
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-foreground">Transparent Pricing</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Direct merchant store prices with clear, upfront delivery charges.
                  </p>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-background/50 border border-border/40">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-base mx-auto sm:mx-0">
                    📞
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-foreground">Customer Support</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Direct help via WhatsApp or call for every single order.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {/* ── Compact Customer Footer ── */}
      <SiteFooter />
    </div>
  );
}
