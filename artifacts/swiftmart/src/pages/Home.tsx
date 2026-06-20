import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useProducts } from "@/hooks/useProducts";
import { useShops } from "@/hooks/useShops";
import { HeroBannerSlider } from "@/components/HeroBannerSlider";
import { CategoryBubble, type DisplayCategory } from "@/components/CategoryBubble";
import { ProductCard } from "@/components/ProductCard";
import { ProductGrid } from "@/components/ProductGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { api } from "@/lib/api";
import { Star, ChevronRight, Flame, Zap, MapPin } from "lucide-react";
import type { Product } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const VISIBLE_CATEGORIES = 8;

// Priority order: daily needs first, then food, then other categories
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

export default function Home() {
  const { user } = useAuth();
  const { products } = useProducts();
  const { shops, isLoading: shopsLoading } = useShops();
  // Use real data-loading state instead of a hardcoded timeout
  const loading = shopsLoading;
  const [apiCategories, setApiCategories] = useState<DisplayCategory[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; products: Array<Record<string, unknown>> }>('/products?trending=true&limit=10')
      .then(d => {
        const mapped: Product[] = (d.products ?? []).map(p => ({
          id: (p['id'] ?? p['_id'] ?? '') as string,
          name: (p['name'] ?? '') as string,
          category: (p['category'] ?? '') as Product['category'],
          price: Number(p['price'] ?? 0),
          discountedPrice: p['discountedPrice'] != null ? Number(p['discountedPrice']) : undefined,
          unit: (p['unit'] ?? '1 unit') as string,
          image: ((p['images'] as string[] | undefined)?.[0] ?? p['image'] ?? '/assets/product-placeholder.png') as string,
          images: (p['images'] as string[] | undefined) ?? [],
          description: (p['description'] ?? '') as string,
          stock: Number(p['stock'] ?? 0),
          rating: Number(p['rating'] ?? 0),
          vendorId: (p['shopId'] ?? '') as string,
          trending: Boolean(p['trending']),
        }));
        setTrendingProducts(mapped);
      })
      .catch((err: unknown) => {
        console.error("[Home] Failed to load trending products:", err);
      })
      .finally(() => setTrendingLoading(false));
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

  const HOME_PRODUCTS = 8;
  const homeProducts = products.slice(0, HOME_PRODUCTS);
  const SHOPS_PREVIEW = 4;
  const popularShops = shops.slice(0, SHOPS_PREVIEW);

  return (
    <div className="pb-24 pt-4 px-3 w-full max-w-7xl mx-auto space-y-6 overflow-x-hidden">
      <HeroBannerSlider />

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
                    <img
                      src={shop.image}
                      alt={shop.storeName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate text-foreground">{shop.storeName}</h3>
                    <div className="text-[10px] text-muted-foreground mb-1 truncate">
                      {shop.category}
                    </div>
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

      {(trendingLoading || trendingProducts.length > 0) && (
        <section>
          <SectionHeader
            title="Trending in Your Area"
            action={
              !trendingLoading && trendingProducts.length > 0 ? (
                <div className="flex items-center gap-1 text-xs font-semibold text-orange-500">
                  <Flame className="w-3.5 h-3.5" />
                  {trendingProducts.length} hot picks
                </div>
              ) : undefined
            }
          />
          {trendingLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
              {[1, 2, 3, 4].map(i => (
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
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-3 px-3">
              {trendingProducts.map((product, i) => (
                <div key={product.id} className="snap-start shrink-0 w-44">
                  <ProductCard product={product} index={i} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <SectionHeader
          title="Your Daily Needs"
          action={
            products.length > HOME_PRODUCTS ? (
              <Link href="/products" className="flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80 transition-opacity">
                See more <ChevronRight className="w-4 h-4" />
              </Link>
            ) : undefined
          }
        />
        {loading ? (
          <SkeletonGrid count={8} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
              {homeProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
            {products.length > HOME_PRODUCTS && (
              <div className="flex justify-center pt-4">
                <Link href="/products">
                  <Button variant="outline" className="rounded-full px-8 font-semibold neu-card border-none">
                    See all {products.length} products
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </section>

      {/* About + Footer — SEO content, invisible to casual browsing, natural to read */}
      <section aria-label="About SwiftMart" className="border-t border-border/30 pt-6 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <MapPin className="w-3.5 h-3.5" />
          About SwiftMart
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          SwiftMart is Balurghat's hyper-local online marketplace connecting customers with nearby
          shops for fast delivery. From groceries and sweets to electronics and daily essentials,
          order from trusted local vendors in Balurghat, West Bengal and get it delivered in minutes.
        </p>
        <p className="text-xs text-muted-foreground font-medium">
          Serving Balurghat, West Bengal
        </p>
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
