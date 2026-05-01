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
        <SectionHeader title="Popular Shops" />
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
          {vendors.map((vendor) => (
            <Link key={vendor.id} href={`/shop/${vendor.id}`} className="snap-start shrink-0 block w-[280px]">
              <div className="bg-card rounded-2xl p-4 neu-card flex gap-4 items-center group hover:scale-[1.02] transition-transform">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-background neu-inset flex-shrink-0">
                  <img 
                    src={vendor.image} 
                    alt={vendor.storeName} 
                    className="w-full h-full object-cover mix-blend-multiply"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-sm truncate text-foreground">{vendor.storeName}</h3>
                  </div>
                  
                  <div className="text-[10px] text-muted-foreground mb-1.5 truncate">
                    {vendor.category}
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] font-medium">
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Star className="w-3 h-3 fill-current" />
                      {vendor.rating}
                    </div>
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
