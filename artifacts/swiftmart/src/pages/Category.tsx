import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useProducts } from "@/hooks/useProducts";
import { ProductGrid } from "@/components/ProductGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { EmptyState } from "@/components/EmptyState";
import { categories as localCategories } from "@/data/categories";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";

interface ApiCategory {
  _id: string;
  name: string;
  slug: string;
  emoji?: string;
  color?: string;
}

const DEFAULT_COLORS = [
  "hsl(35,90%,55%)", "hsl(140,60%,45%)", "hsl(200,70%,55%)", "hsl(20,90%,55%)",
  "hsl(210,80%,55%)", "hsl(45,90%,50%)", "hsl(0,65%,50%)", "hsl(330,70%,60%)",
];

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function Category() {
  const [, params] = useRoute("/category/:slug");
  const slug = params?.slug ?? "";
  const { products } = useProducts();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'instock'>('all');
  const [apiCategory, setApiCategory] = useState<ApiCategory | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get<{ success: boolean; categories: ApiCategory[] }>('/categories')
      .then(d => {
        const match = (d.categories ?? []).find(c => c.slug === slug);
        if (match) setApiCategory(match);
      })
      .catch(() => {})
      .finally(() => {
        setTimeout(() => setLoading(false), 200);
      });
  }, [slug]);

  const localCat = localCategories.find(c => c.id === slug);

  const category = localCat
    ? { name: localCat.name, color: localCat.color, emoji: localCat.emoji, image: localCat.image }
    : apiCategory
      ? {
          name: apiCategory.name,
          color: apiCategory.color ?? DEFAULT_COLORS[apiCategory._id.charCodeAt(0) % DEFAULT_COLORS.length],
          emoji: apiCategory.emoji ?? "🛍️",
          image: undefined,
        }
      : loading
        ? null
        : {
            name: slugToName(slug),
            color: DEFAULT_COLORS[slug.charCodeAt(0) % DEFAULT_COLORS.length],
            emoji: "🛍️",
            image: undefined,
          };

  let filteredProducts = products.filter(p => p.category === slug);
  if (filter === 'instock') filteredProducts = filteredProducts.filter(p => p.stock > 0);

  if (!category) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-7xl mx-auto">
        <SkeletonGrid count={8} />
      </div>
    );
  }

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
        {category.image ? (
          <img
            src={category.image}
            alt={category.name}
            className="h-40 w-40 object-contain absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 opacity-80"
          />
        ) : (
          <span className="text-7xl absolute right-6 top-1/2 -translate-y-1/2 opacity-20 select-none">
            {category.emoji}
          </span>
        )}
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

      {loading ? (
        <SkeletonGrid count={8} />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No products here"
          description={
            filter === "instock"
              ? "No in-stock items right now — try showing All."
              : "No products in this category yet."
          }
        />
      ) : (
        <ProductGrid products={filteredProducts} />
      )}
    </div>
  );
}
