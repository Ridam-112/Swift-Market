import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { Search, PackageSearch, X, Clock, Sparkles } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonProductGrid } from "@/components/SkeletonProductCard";
import { Input } from "@/components/ui/input";
import { categories } from "@/data/categories";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

export default function SearchPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialQuery = searchParams.get("q") || "";

  const { user } = useAuth();
  const { products, isLoading } = useProducts();
  const { searches, addSearch, removeSearch, clearAll } = useRecentSearches(user?.id);

  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Save search term after user pauses typing (debounced)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      addSearch(query.trim());
    }, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [query, addSearch]);

  // Save immediately when user clears the input
  const handleQueryChange = (val: string) => {
    setQuery(val);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase());
    const matchesCategory =
      activeCategory === "all" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Recommended: products that match any recent search keyword
  const recommendedProducts = (() => {
    if (!searches.length) return [];
    const keywords = searches.flatMap((s) =>
      s.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    );
    const seen = new Set<number>();
    const results: typeof products = [];
    for (const p of products) {
      if (seen.has(p.id)) continue;
      const haystack = `${p.name} ${p.description} ${p.category}`.toLowerCase();
      if (keywords.some((kw) => haystack.includes(kw))) {
        seen.add(p.id);
        results.push(p);
      }
    }
    return results.slice(0, 12);
  })();

  const showEmpty = query.length > 0;
  const searchTitle = query ? `"${query}" — Search` : "Search Groceries & Food in Balurghat";
  const searchDesc = query
    ? `Search results for "${query}" on SwiftMart — grocery, food, vegetables, fruits, medicines and daily essentials in Balurghat.`
    : "Search for fresh fruits, vegetables, home essentials, and quick medicine delivery in Balurghat. Find exactly what you need on SwiftMart.";

  return (
    <div className="pb-24 pt-4 px-4 max-w-7xl mx-auto space-y-6 min-h-[100dvh]">
      {/* Visually-hidden H1 for crawlers — the search input is the visual focal point */}
      <h1 className="sr-only">Search Groceries, Vegetables &amp; Daily Essentials in Balurghat</h1>
      <SEO
        title={searchTitle}
        description={searchDesc}
        canonical="/search"
        noIndex={!!query}
      />

      {/* ── Sticky search bar + category filter ── */}
      <div className="sticky top-[72px] z-40 bg-background/80 backdrop-blur-xl pb-4 -mx-4 px-4">
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            autoFocus
            className="w-full pl-10 pr-10 bg-card neu-inset border-none h-12 rounded-full text-lg focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Search for anything..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-4 max-w-3xl mx-auto px-1">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              activeCategory === "all"
                ? "bg-primary text-white neu-card shadow-none"
                : "bg-card neu-inset text-muted-foreground"
            )}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                activeCategory === cat.id
                  ? "bg-primary text-white neu-card shadow-none"
                  : "bg-card neu-inset text-muted-foreground"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Recent Searches (only when not actively searching) ── */}
      <AnimatePresence>
        {!query && searches.length > 0 && (
          <motion.div
            key="recent"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="max-w-5xl mx-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Recent Searches</span>
              </div>
              <button
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Clear all
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {searches.map((term) => (
                <motion.div
                  key={term}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="flex items-center gap-1.5 bg-card neu-inset rounded-full px-3 py-1.5 whitespace-nowrap shrink-0 group"
                >
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                  <button
                    onClick={() => setQuery(term)}
                    className="text-sm text-foreground hover:text-primary transition-colors"
                  >
                    {term}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSearch(term);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-0.5 opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Recommended Products (only when not actively searching) ── */}
      <AnimatePresence>
        {!query && recommendedProducts.length > 0 && (
          <motion.div
            key="recommended"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="max-w-5xl mx-auto"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-lg font-bold text-foreground">Recommended for You</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {recommendedProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search Results ── */}
      <div className="max-w-5xl mx-auto">
        {/* Loading state */}
        {isLoading && (
          <>
            <div className="h-6 w-40 bg-muted animate-pulse rounded mb-4" />
            <SkeletonProductGrid count={8} />
          </>
        )}

        {!isLoading && query && (
          <h2 className="text-lg font-bold mb-4 text-foreground">
            {filteredProducts.length > 0
              ? `${filteredProducts.length} result${filteredProducts.length === 1 ? "" : "s"} for '${query}'`
              : `No results for '${query}'`}
          </h2>
        )}

        {!isLoading && !query && !searches.length && !recommendedProducts.length && (
          <h2 className="text-lg font-bold mb-4 text-foreground">Suggested Products</h2>
        )}

        {!isLoading && query ? (
          filteredProducts.length > 0 ? (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } },
              }}
            >
              <ProductGrid products={filteredProducts} />
            </motion.div>
          ) : (
            <EmptyState
              icon={PackageSearch}
              title="No products found"
              description={`We couldn't find anything matching "${query}". Try a different search term or category.`}
            />
          )
        ) : (
          !isLoading && !searches.length && !recommendedProducts.length && (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } },
              }}
            >
              <ProductGrid products={products.slice(0, 20)} />
            </motion.div>
          )
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
