import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import { SEO } from "@/components/SEO";
import { ArrowLeft, PackageOpen, Search, X, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GROCERY_SUBCATS } from "@/data/grocerySubcats";

// ─── Non-grocery product categories — always excluded from this page ──────────
const NON_GROCERY_CATS = new Set([
  "restaurant", "fast-food", "cloud-kitchen",
  "meat-fish", "meat-shop", "fish-shop",
  "clothing", "fashion", "electronics", "mobile-phone",
  "toys", "gaming", "hardware", "handmade", "gifts",
]);

// ─── Word-boundary keyword matcher ────────────────────────────────────────────
// Uses \b so "deo" ≠ "video", "atta" ≠ "khatta", "bru" ≠ "brush", "gur" in
// "nolen gur ice cream" is vetoed by the exclusion list on the sugar subcat.
function escRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function matchSubcat(product: { name: string }, subcat: { keywords: string[]; excludes?: string[] }): boolean {
  const name = product.name.toLowerCase();
  if (subcat.excludes?.some(ex => new RegExp(`\\b${escRe(ex)}\\b`, "i").test(name))) return false;
  return subcat.keywords.some(kw => new RegExp(`\\b${escRe(kw)}\\b`, "i").test(name));
}

function getProductSubcatId(product: { name: string; category?: string }): string | null {
  if (NON_GROCERY_CATS.has(product.category ?? "")) return null;
  return GROCERY_SUBCATS.find(sc => matchSubcat(product, sc))?.id ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GroceryStore() {
  const { products, isLoading } = useProducts();
  const [selectedId, setSelectedId] = useState<string>("all");
  const [query, setQuery] = useState("");

  // Count products per subcategory
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach(p => {
      const id = getProductSubcatId(p);
      if (id) map[id] = (map[id] ?? 0) + 1;
    });
    return map;
  }, [products]);

  const visibleSubcats = GROCERY_SUBCATS;

  // Filtered list — always strip non-grocery shop categories first
  const filteredProducts = useMemo(() => {
    let list = products.filter(p => !NON_GROCERY_CATS.has(p.category ?? ""));
    if (selectedId !== "all") {
      const subcat = GROCERY_SUBCATS.find(sc => sc.id === selectedId);
      list = subcat ? list.filter(p => matchSubcat(p, subcat)) : [];
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, selectedId, query]);

  const activeMeta = selectedId === "all"
    ? { name: "All Products", emoji: "🛒", color: "hsl(140,60%,45%)" }
    : GROCERY_SUBCATS.find(sc => sc.id === selectedId) ?? { name: "Products", emoji: "🛍️", color: "hsl(35,90%,55%)" };

  const allCount = useMemo(
    () => products.filter(p => !NON_GROCERY_CATS.has(p.category ?? "")).length,
    [products]
  );

  return (
    <div className="min-h-[100dvh] pb-24">
      <SEO
        title="Grocery Store — SwiftMart Balurghat"
        description="Shop rice, atta, dal, oil, spices, tea, biscuits, chocolates, dairy, personal care and all daily essentials from SwiftMart's grocery store in Balurghat."
        canonical="/grocery"
      />

      {/* ── Hero Header ─────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-green-500 to-teal-500 text-white px-4 pt-4 pb-5 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/" className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold leading-tight tracking-tight">🛒 Grocery Store</h1>
              <p className="text-xs text-white/80 mt-0.5">Fresh picks · Daily essentials · Fast delivery</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search rice, atta, chocolates, tea…"
              className="pl-9 pr-9 bg-white/20 backdrop-blur-md border-white/30 text-white placeholder:text-white/60 rounded-2xl focus-visible:ring-white/40 focus-visible:ring-2"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -translate-y-10 translate-x-10 pointer-events-none" />
        <div className="absolute bottom-0 right-20 w-20 h-20 bg-white/10 rounded-full translate-y-6 pointer-events-none" />
      </div>

      {/* ── Mobile: horizontal subcategory chips ─────────────── */}
      <div className="md:hidden overflow-x-auto scrollbar-hide px-3 pt-2 pb-2 flex gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/40">
        <button
          onClick={() => { setSelectedId("all"); setQuery(""); }}
          className={cn(
            "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap",
            selectedId === "all"
              ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
              : "bg-card text-foreground border-border"
          )}
        >
          🛒 All <span className="opacity-60">{allCount}</span>
        </button>
        {visibleSubcats.map(sc => (
          <button
            key={sc.id}
            onClick={() => { setSelectedId(sc.id); setQuery(""); }}
            className={cn(
              "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap",
              selectedId === sc.id
                ? "text-white border-transparent shadow-sm"
                : "bg-card text-foreground border-border"
            )}
            style={selectedId === sc.id ? { background: sc.color, borderColor: sc.color } : {}}
          >
            {sc.emoji} {sc.name}
            {counts[sc.id] ? <span className="opacity-60">{counts[sc.id]}</span> : null}
          </button>
        ))}
      </div>

      {/* ── Main layout ──────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto flex gap-0 md:gap-4 px-0 md:px-4 pt-0 md:pt-4">

        {/* Desktop Left Sidebar */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 sticky top-4 self-start h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide">
          <div className="bg-card rounded-2xl neu-card p-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2">Categories</p>

            <button
              onClick={() => { setSelectedId("all"); setQuery(""); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left mb-0.5",
                selectedId === "all"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <span className="text-base w-5 text-center">🛒</span>
              <span className="flex-1 leading-tight">All Products</span>
              <span className={cn("text-[10px] font-bold tabular-nums", selectedId === "all" ? "text-white/70" : "text-muted-foreground")}>
                {allCount}
              </span>
            </button>

            <div className="w-full h-px bg-border my-1" />

            {visibleSubcats.map(sc => (
              <button
                key={sc.id}
                onClick={() => { setSelectedId(sc.id); setQuery(""); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left",
                  selectedId === sc.id
                    ? "text-white shadow-sm"
                    : "text-foreground hover:bg-muted"
                )}
                style={selectedId === sc.id ? { background: sc.color } : {}}
              >
                <span className="text-base w-5 text-center">{sc.emoji}</span>
                <span className="flex-1 leading-tight text-[13px]">{sc.name}</span>
                <span className={cn(
                  "text-[10px] font-bold tabular-nums",
                  selectedId === sc.id ? "text-white/70" : counts[sc.id] ? "text-primary" : "text-muted-foreground/40"
                )}>
                  {counts[sc.id] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Right panel */}
        <div className="flex-1 min-w-0 px-3 md:px-0 pt-3 md:pt-0">

          {/* All landing: subcategory tile grid */}
          {selectedId === "all" && !query && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-extrabold text-lg text-foreground">Shop by Category</h2>
                <span className="text-xs text-muted-foreground font-semibold bg-muted px-2.5 py-1 rounded-full">
                  {allCount} items
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {visibleSubcats.map(sc => (
                  <button
                    key={sc.id}
                    onClick={() => setSelectedId(sc.id)}
                    className="group flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card neu-card hover:scale-105 transition-all cursor-pointer text-center relative overflow-hidden"
                  >
                    <div
                      className="absolute inset-0 opacity-10 group-hover:opacity-15 transition-opacity rounded-2xl"
                      style={{ background: sc.color }}
                    />
                    <span className="text-3xl relative z-10">{sc.emoji}</span>
                    <span className="text-[11px] font-bold text-foreground leading-tight relative z-10">{sc.name}</span>
                    {counts[sc.id] ? (
                      <span
                        className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full text-white relative z-10"
                        style={{ background: sc.color }}
                      >
                        {counts[sc.id]} items
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-muted-foreground/50 relative z-10">Coming soon</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-6 mb-3 flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">All Products</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </div>
          )}

          {/* Breadcrumb when subcategory selected */}
          {selectedId !== "all" && (
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => { setSelectedId("all"); setQuery(""); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                🛒 All
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-1.5">
                <span className="text-xl">{activeMeta.emoji}</span>
                <span className="font-extrabold text-foreground">{activeMeta.name}</span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground font-semibold bg-muted px-2.5 py-1 rounded-full">
                {filteredProducts.length} item{filteredProducts.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {query && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-foreground">Results for "{query}"</span>
              <span className="ml-auto text-xs text-muted-foreground font-semibold bg-muted px-2.5 py-1 rounded-full">
                {filteredProducts.length} found
              </span>
            </div>
          )}

          {isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="rounded-2xl bg-muted animate-pulse h-52" />
              ))}
            </div>
          )}

          {!isLoading && filteredProducts.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}

          {!isLoading && filteredProducts.length === 0 && (
            <EmptyState
              icon={PackageOpen}
              title={query ? "No results found" : "Nothing here yet"}
              description={
                query
                  ? `No products match "${query}". Try a different search.`
                  : selectedId !== "all"
                  ? "No products in this category yet — check back soon!"
                  : "No products available right now."
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
