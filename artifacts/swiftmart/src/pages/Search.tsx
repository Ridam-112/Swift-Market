import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { Search, PackageSearch, X, Clock, Sparkles, ChevronDown } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonProductGrid } from "@/components/SkeletonProductCard";
import { Input } from "@/components/ui/input";
import { categories } from "@/data/categories";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

const PAGE_SIZE = 24;

export default function SearchPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialQuery = searchParams.get("q") || "";

  const { user } = useAuth();
  const { products, isLoading } = useProducts();
  const { searches, addSearch, removeSearch, clearAll } = useRecentSearches(user?.id);

  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Synchronize query when URL search parameter changes (e.g. from desktop header search or clicking links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    if (q !== query) {
      setQuery(q);
      setVisibleCount(PAGE_SIZE);
    }
  }, [location]);

  // Reset pagination when query or category changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, activeCategory]);

  // Save search term after user pauses typing (debounced)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      addSearch(trimmed);
    }, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [query, addSearch]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
  };

  // High performance memoized search filter with multi-term fuzzy support & null safety
  const filteredProducts = useMemo(() => {
    const q = query.toLowerCase().trim();
    const queryTerms = q ? q.split(/\s+/).filter(Boolean) : [];

    return products.filter((p) => {
      // 1. Category match
      if (activeCategory !== "all") {
        const pCat = (p.category || "").toLowerCase();
        if (activeCategory === "fruits-vegetables" || activeCategory === "vegetables") {
          if (pCat !== "fruits-vegetables" && pCat !== "vegetables" && pCat !== "fruits") {
            return false;
          }
        } else if (pCat !== activeCategory) {
          return false;
        }
      }

      // 2. Query search
      if (queryTerms.length === 0) return true;

      const pName = (p.name || "").toLowerCase();
      const pDesc = (p.description || "").toLowerCase();
      const pCat = (p.category || "").toLowerCase();
      const pShop = (p.shopName || "").toLowerCase();
      const haystack = `${pName} ${pDesc} ${pCat} ${pShop}`;

      // All terms in query must be present in product haystack
      return queryTerms.every((term) => haystack.includes(term));
    });
  }, [products, query, activeCategory]);

  // Progressive slice for light DOM & smooth scrolling
  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const hasMore = visibleCount < filteredProducts.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  // Recommended: products that match any recent search keyword safely
  const recommendedProducts = useMemo(() => {
    if (!searches.length || query) return [];
    const keywords = searches.flatMap((s) =>
      (s || "").toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    );
    if (!keywords.length) return [];

    const seen = new Set<string>();
    const results: typeof products = [];
    for (const p of products) {
      if (seen.has(p.id)) continue;
      const haystack = `${p.name || ""} ${p.description || ""} ${p.category || ""} ${p.shopName || ""}`.toLowerCase();
      if (keywords.some((kw) => haystack.includes(kw))) {
        seen.add(p.id);
        results.push(p);
        if (results.length >= 12) break;
      }
    }
    return results;
  }, [products, searches, query]);

  const searchTitle = query ? `"${query}" — Search` : "Search Groceries & Food in Balurghat";
  const searchDesc = query
    ? `Search results for "${query}" on SwiftMart — grocery, food, vegetables, fruits, medicines and daily essentials in Balurghat.`
    : "Search for fresh fruits, vegetables, home essentials, and quick medicine delivery in Balurghat. Find exactly what you need on SwiftMart.";

  return (
    <div className="pb-24 pt-4 px-3 sm:px-4 max-w-7xl mx-auto space-y-5 min-h-[100dvh]">
      {/* Visually-hidden H1 for crawlers */}
      <h1 className="sr-only">Search Groceries, Vegetables &amp; Daily Essentials in Balurghat</h1>
      <SEO
        title={searchTitle}
        description={searchDesc}
        canonical="/search"
        noIndex={!!query}
      />

      {/* ── Search bar + category filter ── */}
      <div className="sticky top-[60px] md:top-[72px] z-30 bg-background/95 backdrop-blur-xl py-2 -mx-3 px-3 sm:-mx-4 sm:px-4 border-b border-border/40">
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="w-full pl-10 pr-10 bg-card neu-inset border-none h-11 sm:h-12 rounded-full text-base focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Search groceries, medicines, snacks…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
          />
          {query.length > 0 && (
            <button
              onClick={() => {
                setQuery("");
                window.history.replaceState({}, "", "/search");
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-3 max-w-3xl mx-auto px-1">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all",
              activeCategory === "all"
                ? "bg-primary text-white neu-card shadow-none"
                : "bg-card neu-inset text-muted-foreground hover:text-foreground"
            )}
          >
            All ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all",
                activeCategory === cat.id
                  ? "bg-primary text-white neu-card shadow-none"
                  : "bg-card neu-inset text-muted-foreground hover:text-foreground"
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
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="max-w-5xl mx-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Recent Searches</span>
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
                <div
                  key={term}
                  className="flex items-center gap-1.5 bg-card neu-inset rounded-full px-3 py-1.5 whitespace-nowrap shrink-0 group border border-border/30"
                >
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                  <button
                    onClick={() => {
                      setQuery(term);
                      setLocation(`/search?q=${encodeURIComponent(term)}`);
                    }}
                    className="text-xs sm:text-sm text-foreground hover:text-primary font-medium transition-colors"
                  >
                    {term}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSearch(term);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Recommended Products (only when not actively searching) ── */}
      {!query && recommendedProducts.length > 0 && (
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-base font-bold text-foreground">Recommended for You</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {recommendedProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ── Search Results ── */}
      <div className="max-w-5xl mx-auto">
        {isLoading && (
          <>
            <div className="h-5 w-36 bg-muted animate-pulse rounded mb-4" />
            <SkeletonProductGrid count={8} />
          </>
        )}

        {!isLoading && query && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              {filteredProducts.length > 0
                ? `${filteredProducts.length} product${filteredProducts.length === 1 ? "" : "s"} for "${query}"`
                : `No results for "${query}"`}
            </h2>
            {filteredProducts.length > 0 && (
              <span className="text-xs text-muted-foreground font-medium">
                Showing 1–{Math.min(visibleCount, filteredProducts.length)} of {filteredProducts.length}
              </span>
            )}
          </div>
        )}

        {!isLoading && !query && !searches.length && !recommendedProducts.length && (
          <h2 className="text-base font-bold mb-4 text-foreground">All Popular Products</h2>
        )}

        {!isLoading && (
          filteredProducts.length > 0 ? (
            <div className="space-y-6">
              <ProductGrid products={visibleProducts} />
              
              {hasMore && (
                <div className="flex flex-col items-center justify-center pt-2 pb-6">
                  <Button
                    onClick={handleLoadMore}
                    variant="outline"
                    className="rounded-full px-6 py-2 bg-card neu-card shadow-sm text-xs sm:text-sm font-bold flex items-center gap-2 border border-border/60 hover:bg-muted"
                  >
                    <span>Show More Products ({filteredProducts.length - visibleCount} remaining)</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : query ? (
            <EmptyState
              icon={PackageSearch}
              title="No products found"
              description={`We couldn't find anything matching "${query}". Try checking your spelling or selecting a different category.`}
              action={
                <Button
                  onClick={() => {
                    setQuery("");
                    setActiveCategory("all");
                  }}
                  variant="outline"
                  className="rounded-full mt-3 neu-card shadow-none"
                >
                  Clear Search
                </Button>
              }
            />
          ) : (
            <div className="space-y-6">
              <ProductGrid products={products.slice(0, visibleCount)} />
              {products.length > visibleCount && (
                <div className="flex justify-center pt-2 pb-6">
                  <Button
                    onClick={handleLoadMore}
                    variant="outline"
                    className="rounded-full px-6 py-2 bg-card neu-card text-xs sm:text-sm font-bold flex items-center gap-2"
                  >
                    <span>Show More Products</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </div>

      <SiteFooter />
    </div>
  );
}

