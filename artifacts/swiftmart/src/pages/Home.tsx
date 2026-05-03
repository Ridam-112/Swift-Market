import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useProducts } from "@/hooks/useProducts";
import { DeliveryBanner } from "@/components/DeliveryBanner";
import { CategoryBubble } from "@/components/CategoryBubble";
import { ProductGrid } from "@/components/ProductGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { categories } from "@/data/categories";
import { vendors } from "@/data/vendors";
import { Star } from "lucide-react";

export default function Home() {
  const { products } = useProducts();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const trendingProducts = products.filter(p => p.trending).slice(0, 4);
  const recentProducts = products.slice(0, 4); // Just mocking recent

  return (
    <div className="pb-24 pt-4 px-3 w-full max-w-7xl mx-auto space-y-6 overflow-x-hidden">
      <DeliveryBanner />

      <section>
        <SectionHeader title="Shop by Category" />
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-3 px-3">
          {categories.map((category) => (
            <div key={category.id} className="snap-start shrink-0">
              <CategoryBubble category={category} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Popular Shops" />
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-3 px-3">
          {vendors.map((vendor) => (
            <Link key={vendor.id} href={`/shop/${vendor.id}`} className="snap-start shrink-0 block w-[calc(75vw)] max-w-[260px] min-w-[200px]">
              <div className="bg-card rounded-2xl p-3 neu-card flex gap-3 items-center h-full">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-background neu-inset flex-shrink-0">
                  <img
                    src={vendor.image}
                    alt={vendor.storeName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate text-foreground">{vendor.storeName}</h3>
                  <div className="text-[10px] text-muted-foreground mb-1 truncate">
                    {vendor.category}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-yellow-600">
                    <Star className="w-3 h-3 fill-current" />
                    {vendor.rating}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
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
