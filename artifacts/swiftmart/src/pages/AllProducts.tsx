import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { api } from "@/lib/api";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

interface ApiCategory {
  _id: string;
  name: string;
  slug: string;
  emoji?: string;
}

const CATEGORY_PRIORITY: Record<string, number> = {
  grocery: 1, "kirana-store": 2, "fruits-vegetables": 3, vegetables: 4, fruits: 5,
  "sweet-shop": 6, bakery: 7, dairy: 8, snacks: 9, drinks: 10,
  restaurant: 11, "cloud-kitchen": 12, medicine: 17, cosmetics: 19,
  clothing: 22, fashion: 23, electronics: 25, "mobile-phone": 26,
  toys: 27, household: 28, gifts: 29, gaming: 30, hardware: 31,
};

export default function AllProducts() {
  const { products, isLoading } = useProducts();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get<{ success: boolean; categories: ApiCategory[] }>("/categories")
      .then(d => {
        const sorted = [...(d.categories ?? [])].sort((a, b) => {
          const pa = CATEGORY_PRIORITY[a.slug] ?? 999;
          const pb = CATEGORY_PRIORITY[b.slug] ?? 999;
          if (pa !== pb) return pa - pb;
          return a.name.localeCompare(b.name);
        });
        setApiCategories(sorted);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let result = products;
    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, search, selectedCategory]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const clearSearch = () => { setSearch(""); setPage(1); };
  const clearCategory = () => { setSelectedCategory(""); setPage(1); };

  return (
    <div className="pb-24 pt-4 px-3 w-full max-w-7xl mx-auto space-y-4">

      <div className="flex items-center gap-3">
        <Link href="/" className="w-10 h-10 bg-card rounded-xl flex items-center justify-center neu-card shrink-0 text-foreground">
          <span className="text-lg leading-none">←</span>
        </Link>
        <h1 className="font-bold text-xl text-foreground">All Products</h1>
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} items</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search products…"
          className="pl-10 pr-10 h-12 rounded-2xl bg-card border-none neu-inset text-foreground placeholder:text-muted-foreground"
        />
        {search && (
          <button onClick={clearSearch} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {apiCategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={clearCategory}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !selectedCategory
                ? "bg-primary text-primary-foreground"
                : "bg-card neu-card text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {apiCategories.map(cat => (
            <button
              key={cat.slug}
              onClick={() => { setSelectedCategory(cat.slug === selectedCategory ? "" : cat.slug); setPage(1); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat.slug
                  ? "bg-primary text-primary-foreground"
                  : "bg-card neu-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
      )}

      {(search || selectedCategory) && (
        <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
          <span>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          {selectedCategory && (
            <button onClick={clearCategory} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
              {apiCategories.find(c => c.slug === selectedCategory)?.name ?? selectedCategory}
              <X className="w-3 h-3" />
            </button>
          )}
          {search && (
            <button onClick={clearSearch} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
              "{search}"
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <SkeletonGrid count={8} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <span className="text-5xl">📦</span>
          <p className="font-semibold text-foreground">No products found</p>
          <p className="text-sm text-muted-foreground">Try a different search or category</p>
          {(search || selectedCategory) && (
            <Button variant="outline" onClick={() => { clearSearch(); clearCategory(); }} className="rounded-full">
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
            {paginated.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => setPage(p => p + 1)}
                variant="outline"
                className="rounded-full px-8 font-semibold neu-card border-none"
              >
                Load more ({filtered.length - paginated.length} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
