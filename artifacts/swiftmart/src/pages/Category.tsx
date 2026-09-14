import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { SEO } from "@/components/SEO";
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
  const { products: contextProducts } = useProducts();
  const [serverProducts, setServerProducts] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'instock'>('all');
  const [apiCategory, setApiCategory] = useState<ApiCategory | null>(null);

  useEffect(() => {
    setLoading(true);
    setServerProducts(null);
    Promise.all([
      api.get<{ success: boolean; categories: ApiCategory[] }>('/categories'),
      api.get<{ success: boolean; products: any[] }>(`/products?category=${encodeURIComponent(slug)}&limit=60`),
    ])
      .then(([catData, prodData]) => {
        const match = (catData.categories ?? []).find(c => c.slug === slug);
        if (match) setApiCategory(match);
        if (prodData.success && Array.isArray(prodData.products)) {
          setServerProducts(prodData.products.map((p: any) => ({
            id: p._id || p.id,
            name: p.name,
            category: p.category,
            price: p.price,
            discountedPrice: p.discountedPrice ?? undefined,
            unit: p.unit ?? "1 unit",
            image: p.images?.[0] ?? p.image ?? "/assets/product-placeholder.png",
            images: p.images ?? (p.image ? [p.image] : []),
            description: p.description ?? "",
            stock: p.stock ?? 0,
            rating: p.rating ?? 0,
            vendorId: p.shopId ?? "",
            shopId: p.shopId ?? "",
            shopName: p.shopName,
            trending: p.trending ?? false,
          })));
        }
      })
      .catch(() => {})
      .finally(() => {
        setTimeout(() => setLoading(false), 150);
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

  const allCatProducts = serverProducts !== null ? serverProducts : contextProducts.filter(p => p.category === slug);
  let filteredProducts = allCatProducts;
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
      <SEO
        title={`${category.name} in Balurghat`}
        description={`Order ${category.name.toLowerCase()} from local shops in Balurghat on SwiftMart. ${filteredProducts.length > 0 ? `${filteredProducts.length} products available` : "Fresh stock, fast delivery"}. Order now for 10-minute delivery.`}
        canonical={`/category/${slug}`}
        keywords={`${category.name} Balurghat, buy ${category.name.toLowerCase()} online Balurghat, ${category.name} delivery Balurghat`}
        jsonLd={{
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://swiftmart.space/" },
            { "@type": "ListItem", "position": 2, "name": category.name, "item": `https://swiftmart.space/category/${slug}` },
          ],
        }}
      />
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
