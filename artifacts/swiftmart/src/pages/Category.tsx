import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useProducts } from "@/hooks/useProducts";
import { ProductGrid } from "@/components/ProductGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { categories } from "@/data/categories";
import { Button } from "@/components/ui/button";

export default function Category() {
  const [, params] = useRoute("/category/:slug");
  const slug = params?.slug;
  const { products } = useProducts();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'instock'>('all');

  const category = categories.find(c => c.id === slug);
  
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(timer);
  }, [slug]);

  if (!category) return <div className="p-8 text-center">Category not found</div>;

  let filteredProducts = products.filter(p => p.category === slug);
  if (filter === 'instock') filteredProducts = filteredProducts.filter(p => p.stock > 0);

  return (
    <div className="pb-24 pt-4 px-4 max-w-7xl mx-auto space-y-6">
      <div 
        className="h-32 rounded-3xl neu-card flex items-center justify-between px-8 relative overflow-hidden"
        style={{ backgroundColor: `${category.color}15` }}
      >
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">{category.name}</h1>
          <p className="text-muted-foreground mt-1">{filteredProducts.length} items</p>
        </div>
        <img 
          src={category.image} 
          alt={category.name}
          className="h-40 w-40 object-contain absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 opacity-80"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          className="rounded-full neu-card h-8"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button 
          variant={filter === 'instock' ? 'default' : 'outline'} 
          className="rounded-full neu-card h-8"
          onClick={() => setFilter('instock')}
        >
          In Stock
        </Button>
      </div>

      {loading ? <SkeletonGrid count={8} /> : <ProductGrid products={filteredProducts} />}
    </div>
  );
}
