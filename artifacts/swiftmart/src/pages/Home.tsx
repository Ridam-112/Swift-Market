import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useProducts } from "@/hooks/useProducts";
import { useShops } from "@/hooks/useShops";
import { HeroBannerSlider } from "@/components/HeroBannerSlider";
import { CategoryBubble } from "@/components/CategoryBubble";
import { ProductGrid } from "@/components/ProductGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { categories } from "@/data/categories";
import { api } from "@/lib/api";
import { Star } from "lucide-react";

export default function Home() {
  const { products } = useProducts();
  const { shops, isLoading: shopsLoading } = useShops();
  const [loading, setLoading] = useState(true);
  const [activeShopSlugs, setActiveShopSlugs] = useState<string[] | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    api.get<{ success: boolean; shopTypes: { slug: string }[] }>("/shop-types/active")
      .then(d => setActiveShopSlugs(d.shopTypes.map(st => st.slug)))
      .catch(() => setActiveShopSlugs(null));
  }, []);

  const visibleCategories = activeShopSlugs === null
    ? categories
    : categories.filter(c => activeShopSlugs.includes(c.id));


  const trendingProducts = products.filter(p => p.trending).slice(0, 4);
  const recentProducts = products.slice(0, 4);
  const popularShops = shops.slice(0, 8);

  return (
    <div className="pb-24 pt-4 px-3 w-full max-w-7xl mx-auto space-y-6 overflow-x-hidden">
      <HeroBannerSlider />

      <section>
        <SectionHeader title="Shop by Category" />
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-3 px-3">
          {visibleCategories.map((category) => (
            <div key={category.id} className="snap-start shrink-0">
              <CategoryBubble category={category} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Popular Shops" />
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
                    <div className="flex items-center gap-1 text-[11px] font-medium text-yellow-600">
                      <Star className="w-3 h-3 fill-current" />
                      {shop.rating > 0 ? shop.rating.toFixed(1) : "New"}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Trending in your area" />
        {loading ? <SkeletonGrid count={4} /> : <ProductGrid products={trendingProducts} />}
      </section>

      <section>
        <SectionHeader title="Your Daily Needs" />
        {loading ? <SkeletonGrid count={4} /> : <ProductGrid products={recentProducts} />}
      </section>
    </div>
  );
}
