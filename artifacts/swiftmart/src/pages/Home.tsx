import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useProducts } from "@/hooks/useProducts";
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
import { SiteFooter } from "@/components/SiteFooter";
import { SearchOverlay } from "@/components/SearchOverlay";
import { api } from "@/lib/api";
import { Star, ChevronRight, Zap, MapPin, Search } from "lucide-react";
import type { Product } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const FAQ_ITEMS = [
  {
    q: "How fast does SwiftMart deliver in Balurghat?",
    a: "SwiftMart delivers in as fast as 10 minutes across Balurghat (pincodes 733101 and 733103). Delivery time may vary based on shop distance and order volume.",
  },
  {
    q: "What can I order on SwiftMart?",
    a: "You can order fresh groceries, vegetables, fruits, dairy, bakery items, snacks, beverages, medicines, household essentials, and more from trusted local shops in Balurghat.",
  },
  {
    q: "Which areas does SwiftMart currently serve?",
    a: "SwiftMart currently serves Balurghat, West Bengal — pincodes 733101 and 733103. We are expanding to more areas soon.",
  },
  {
    q: "How do I track my order?",
    a: "Once your order is placed, you can track it live on the Orders page. You'll see the rider's real-time location on the map when your order is out for delivery.",
  },
  {
    q: "Can local shops sell on SwiftMart?",
    a: "Yes! Local Balurghat shop owners can register as vendors on SwiftMart to reach more customers. Tap 'Become a Vendor' in your profile to get started.",
  },
];

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
    "url": "https://swiftmart.space/",
    "logo": { "@type": "ImageObject", "url": "https://swiftmart.space/logo.png" },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+916296118949",
      "contactType": "customer support",
      "availableLanguage": ["English", "Bengali"]
    },
    "sameAs": []
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
    "@type": ["LocalBusiness", "Store"],
    "@id": "https://swiftmart.space/#business",
    "name": "SwiftMart",
    "url": "https://swiftmart.space/",
    "logo": { "@type": "ImageObject", "url": "https://swiftmart.space/logo.png" },
    "image": "https://swiftmart.space/opengraph.jpg",
    "description": "Hyper-local online marketplace delivering groceries, food, medicine and daily essentials from local Balurghat shops in 10 minutes.",
    "telephone": "+916296118949",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Balurghat",
      "addressRegion": "West Bengal",
      "addressCountry": "IN"
    },
    "areaServed": { "@type": "City", "name": "Balurghat" },
    "priceRange": "₹"
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
let _sectionsCache: { data: HomepageSection[]; at: number } | null = null;

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
  _id: string;
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
  const sectionHref = `/section/${section._id}?title=${encodeURIComponent(section.title)}`;

  return (
    <section>
      <SectionHeader
        title={section.title}
        action={
          section.hasMore || section.total > section.products.length ? (
            <Link
              href={sectionHref}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
            >
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground font-medium">
              {section.total} item{section.total !== 1 ? "s" : ""}
            </span>
          )
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
        {section.products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
      {(section.hasMore || section.total > section.products.length) && (
        <div className="flex justify-center pt-4">
          <Link href={sectionHref}>
            <Button
              variant="outline"
              className="rounded-full px-8 font-semibold neu-card border-none gap-2"
            >
              See more <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { shops, isLoading: shopsLoading } = useShops();
  const loading = shopsLoading;
  const [, setLocation] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [apiCategories, setApiCategories] = useState<DisplayCategory[]>([]);
  const [dynamicSections, setDynamicSections] = useState<HomepageSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  // Load admin-configured homepage sections (cached in memory for 5 min)
  useEffect(() => {
    if (_sectionsCache && Date.now() - _sectionsCache.at < CACHE_TTL) {
      setDynamicSections(_sectionsCache.data);
      setSectionsLoading(false);
      return;
    }
    api.get<{ success: boolean; sections: Array<HomepageSection & { products: RawProduct[] }> }>('/homepage-sections')
      .then(d => {
        const mapped = (d.sections ?? []).map(s => ({
          ...s,
          products: (s.products ?? []).map(mapProduct),
        }));
        _sectionsCache = { data: mapped, at: Date.now() };
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
        const mapped = (d.categories ?? []).map((c, i) => ({
          id: c.slug,
          name: c.name,
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

  return (
    <div className="pb-24 pt-4 px-3 w-full max-w-7xl mx-auto space-y-6 overflow-x-hidden">
      {/* Visually-hidden H1 anchors the page outline for crawlers */}
      <h1 className="sr-only">SwiftMart Balurghat — Grocery, Food &amp; Medicine Delivery in 10 Minutes</h1>
      <SEO
        title="SwiftMart Balurghat | Grocery, Food & Medicine Delivery"
        description="Order fresh groceries, organic vegetables, food, & medicine online in Balurghat. Fast delivery from your favorite local shops. Shop now on SwiftMart!"
        canonical="/"
        keywords="SwiftMart, SwiftMart Balurghat, Balurghat Grocery, Balurghat Online Shopping, Quick Commerce Balurghat, Food Delivery Balurghat, Medicine Delivery Balurghat, Vegetable Delivery Balurghat, Local Marketplace Balurghat"
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

      <HeroBannerSlider />

      {/* Admin-curated highlighted bucket bundles */}
      <BucketBanner />

      {/* ── Grocery mini-banner ─────────────────────────────────── */}
      <Link href="/grocery">
        <div className="relative rounded-2xl overflow-hidden cursor-pointer group">
          {/* gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-green-500 to-teal-400" />
          {/* subtle pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 80%, white 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
          {/* decorative blob */}
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute right-16 -bottom-4 w-20 h-20 bg-white/10 rounded-full" />

          <div className="relative flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              {/* icon cluster */}
              <div className="flex -space-x-2">
                {["🥛", "🥦", "🍎", "🛒"].map((em, i) => (
                  <div key={i} className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-base shadow-sm" style={{ zIndex: 4 - i }}>
                    {em}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-white font-extrabold text-sm leading-tight">Fresh Grocery Store</p>
                <p className="text-white/80 text-xs mt-0.5">Dairy · Veggies · Snacks · Daily needs</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-full shadow-md group-hover:scale-105 transition-transform shrink-0">
              Shop Now
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
        </div>
      </Link>

      {/* Shop by Category */}
      <section>
        <SectionHeader
          title="Shop by Category"
          action={
            <Link href="/categories" className="flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80 transition-opacity">
              See more <ChevronRight className="w-4 h-4" />
            </Link>
          }
        />
        {apiCategories.length === 0 ? (
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="flex justify-center">
                <div className="flex flex-col items-center gap-1.5">
                  <Skeleton className="w-14 h-14 rounded-2xl" />
                  <Skeleton className="h-2.5 w-10 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
            {apiCategories.slice(0, VISIBLE_CATEGORIES).map((category) => (
              <div key={category.id} className="flex justify-center">
                <CategoryBubble category={category} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Popular Shops */}
      <section>
        <SectionHeader
          title="Popular Shops"
          action={
            shops.length > SHOPS_PREVIEW ? (
              <Link href="/shops" className="flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80 transition-opacity">
                See more <ChevronRight className="w-4 h-4" />
              </Link>
            ) : undefined
          }
        />
        {shopsLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-3 px-3">
            {[1, 2, 3].map(i => (
              <SkeletonShopCardHorizontal key={i} />
            ))}
          </div>
        ) : popularShops.length === 0 ? (
          <p className="text-sm text-muted-foreground px-3">No shops available yet.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-3 px-3">
            {popularShops.map((shop) => (
              <Link key={shop.id} href={`/shop/${shop.id}`} className="snap-start shrink-0 block w-[calc(75vw)] max-w-[260px] min-w-[200px]">
                <div className="bg-card rounded-2xl p-3 neu-card flex gap-3 items-center h-full">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-background neu-inset flex-shrink-0">
                    <img src={shop.image} alt={shop.storeName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate text-foreground">{shop.storeName}</h3>
                    <div className="text-[10px] text-muted-foreground mb-1 truncate">{shop.category}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-yellow-600">
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

      {/* Dynamic Admin-Configured Sections */}
      {sectionsLoading ? (
        <section>
          <Skeleton className="h-5 w-48 mb-4" />
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
          .filter(s => s.products.length > 0)
          .map(section => <DynamicSection key={section._id} section={section} />)
      ) : null}

      {/* FAQ Section */}
      <FaqSection />

      {/* About + Footer */}
      <SiteFooter />
    </div>
  );
}

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section>
      <SectionHeader title="Frequently Asked Questions" />
      <div className="space-y-2">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="bg-card rounded-xl neu-card overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={open === i}
            >
              <span className="text-sm font-semibold text-foreground">{item.q}</span>
              <ChevronRight
                className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open === i ? "rotate-90" : ""}`}
              />
            </button>
            {open === i && (
              <div className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-2">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
