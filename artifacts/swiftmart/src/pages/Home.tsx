import { useState, useEffect } from "react";
import { useProducts } from "@/hooks/useProducts";
import { DeliveryBanner } from "@/components/DeliveryBanner";
import { CategoryBubble } from "@/components/CategoryBubble";
import { ProductGrid } from "@/components/ProductGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { categories } from "@/data/categories";

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
    <div className="pb-24 pt-4 px-4 max-w-7xl mx-auto space-y-8">
      <DeliveryBanner />

      <section>
        <SectionHeader title="Shop by Category" />
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
          {categories.map((category) => (
            <div key={category.id} className="snap-start shrink-0">
              <CategoryBubble category={category} />
            </div>
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
