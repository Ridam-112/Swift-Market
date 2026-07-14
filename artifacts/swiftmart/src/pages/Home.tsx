import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useProducts } from "@/hooks/useProducts";
import { useShops } from "@/hooks/useShops";
import { HeroBannerSlider } from "@/components/HeroBannerSlider";
import { BucketBanner } from "@/components/BucketBanner";
import { CategoryBubble, type DisplayCategory } from "@/components/CategoryBubble";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { SEO } from "@/components/SEO";
import { api } from "@/lib/api";
import { Star, ChevronRight, Zap, MapPin } from "lucide-react";
import type { Product } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const HOME_JSON_LD = [
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
  const [apiCategories, setApiCategories] = useState<DisplayCategory[]>([]);
  const [dynamicSections, setDynamicSections] = useState<HomepageSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  // Load admin-configured homepage sections
  useEffect(() => {
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

  useEffect(() => {
    api.get<{ success: boolean; categories: Array<{ _id: string; name: string; slug: string; emoji?: string; color?: string }> }>('/categories')
      .then(d => {
        const mapped = (d.categories ?? []).map((c, i) => ({
          id: c.slug,
          name: c.name,
          emoji: c.emoji ?? "🛍️",
          color: c.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        }));
        setApiCategories(sortCategories(mapped));
      })
      .catch(() => {});
  }, []);

  const SHOPS_PREVIEW = 4;
  const popularShops = shops.slice(0, SHOPS_PREVIEW);

  return (
    <div className="pb-24 pt-4 px-3 w-full max-w-7xl mx-auto space-y-6 overflow-x-hidden">
      <SEO
        title="SwiftMart Balurghat | Grocery, Food, Medicine & Quick Commerce Delivery"
        description="Order groceries, vegetables, fruits, food, medicines, dairy, bakery, sweets and daily essentials from trusted local shops in Balurghat with SwiftMart. Fast local delivery."
        canonical="/"
        keywords="SwiftMart, SwiftMart Balurghat, Balurghat Grocery, Balurghat Online Shopping, Quick Commerce Balurghat, Food Delivery Balurghat, Medicine Delivery Balurghat, Vegetable Delivery Balurghat, Local Marketplace Balurghat"
        jsonLd={HOME_JSON_LD}
      />
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
                <div className="w-16 h-16 rounded-2xl bg-muted animate-pulse" />
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
              <div key={i} className="snap-start shrink-0 w-[calc(75vw)] max-w-[260px] min-w-[200px]">
                <div className="bg-card rounded-2xl p-3 neu-card flex gap-3 items-center h-full animate-pulse">
                  <div className="w-14 h-14 rounded-xl bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-2 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
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
          <div className="h-5 w-48 bg-muted rounded animate-pulse mb-4" />
          <div className="flex gap-3 -mx-3 px-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="shrink-0 w-44">
                <div className="bg-card rounded-2xl p-2.5 animate-pulse">
                  <div className="aspect-square rounded-xl bg-muted mb-2" />
                  <div className="h-2 bg-muted rounded w-3/4 mb-1.5" />
                  <div className="h-2 bg-muted rounded w-1/2 mb-3" />
                  <div className="h-7 bg-muted rounded-full w-full" />
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

      {/* About + Footer */}
      <section aria-label="About SwiftMart" className="border-t border-border/30 pt-6 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <MapPin className="w-3.5 h-3.5" />
          About SwiftMart
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          SwiftMart is Balurghat's very own quick commerce &amp; e-grocery app — built for the people
          of Balurghat, by the people of Balurghat. We deliver groceries, daily essentials, snacks,
          beverages, household items, and much more right to your doorstep in as fast as{" "}
          <span className="font-semibold text-foreground">10 minutes</span>.
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          No more waiting in queues or travelling to the market. Open the app, pick what you need
          from your favourite local shops, and sit back — SwiftMart handles the rest. Our network of
          trusted local vendors across Balurghat ensures you always get fresh, quality products at
          honest prices.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            "⚡ 10-Min Delivery",
            "🛒 E-Grocery",
            "🏪 Local Shops",
            "📍 Balurghat Only",
          ].map(tag => (
            <span key={tag} className="text-[10px] font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground font-medium">Proudly serving Balurghat, West Bengal 🇮🇳</p>
        <div className="flex items-center gap-3 flex-wrap text-xs pt-1">
          <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
          <span className="text-border">·</span>
          <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
          <span className="text-border">·</span>
          <Link href="/refund-cancellation" className="text-muted-foreground hover:text-foreground transition-colors">Refunds</Link>
          <span className="text-border">·</span>
          <Link href="/contact-support" className="text-muted-foreground hover:text-foreground transition-colors">Support</Link>
        </div>
      </section>
    </div>
  );
}
