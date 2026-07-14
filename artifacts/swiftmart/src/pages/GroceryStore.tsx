import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import { SEO } from "@/components/SEO";
import { categories as ALL_CATS } from "@/data/categories";
import { ArrowLeft, PackageOpen, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Grocery-relevant category IDs shown in this store
const GROCERY_CATEGORY_IDS = [
  "grocery", "kirana-store", "vegetables", "fruits", "dairy",
  "snacks", "drinks", "bakery", "sweet-shop", "health-drinks",
  "chocolates", "beverages", "spices", "personal-care", "household",
  "baby-products", "pet-food",
];

const CAT_EMOJI: Record<string, string> = {
  grocery: "🛒", "kirana-store": "🏪", vegetables: "🥦", fruits: "🍎",
  dairy: "🥛", snacks: "🍿", drinks: "🥤", bakery: "🍞",
  "sweet-shop": "🍬", "health-drinks": "💪", chocolates: "🍫",
  beverages: "☕", spices: "🌶️", "personal-care": "🧴",
  household: "🏠", "baby-products": "🍼", "pet-food": "🐾",
};

const CAT_COLOR: Record<string, string> = {
  grocery: "hsl(35,90%,55%)", "kirana-store": "hsl(20,85%,55%)",
  vegetables: "hsl(140,60%,45%)", fruits: "hsl(10,80%,55%)",
  dairy: "hsl(200,70%,55%)", snacks: "hsl(45,90%,50%)",
  drinks: "hsl(210,80%,55%)", bakery: "hsl(30,75%,55%)",
  "sweet-shop": "hsl(350,80%,60%)", "health-drinks": "hsl(145,60%,40%)",
  chocolates: "hsl(25,70%,40%)", beverages: "hsl(30,60%,50%)",
  spices: "hsl(15,90%,50%)", "personal-care": "hsl(280,60%,60%)",
  household: "hsl(220,60%,55%)", "baby-products": "hsl(330,70%,60%)",
  "pet-food": "hsl(170,60%,45%)",
};

function getCatMeta(id: string): { name: string; emoji: string; color: string } {
  const found = ALL_CATS.find(c => c.id === id);
  const name = found?.name ?? id.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  const emoji = CAT_EMOJI[id] ?? found?.emoji ?? "🛍️";
  const color = CAT_COLOR[id] ?? found?.color ?? "hsl(35,90%,55%)";
  return { name, emoji, color };
}

export default function GroceryStore() {
  const { products, isLoading } = useProducts();
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [query, setQuery] = useState("");

  // Build category list from products actually present
  const availableCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const cat = p.category as string;
      counts[cat] = (counts[cat] ?? 0) + 1;
    });

    // Prioritise grocery-relevant cats, then fall back to whatever's left
    const ordered = [
      ...GROCERY_CATEGORY_IDS.filter(id => counts[id]),
      ...Object.keys(counts).filter(id => !GROCERY_CATEGORY_IDS.includes(id)),
    ];

    return ordered.map(id => ({ id, count: counts[id] ?? 0, ...getCatMeta(id) }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = selectedCat === "all" ? products : products.filter(p => p.category === selectedCat);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [products, selectedCat, query]);

  const totalCount = selectedCat === "all"
    ? products.length
    : (availableCategories.find(c => c.id === selectedCat)?.count ?? 0);

  const selectedMeta = selectedCat === "all"
    ? { name: "All Products", emoji: "🛒", color: "hsl(140,60%,45%)" }
    : getCatMeta(selectedCat);

  return (
    <div className="min-h-[100dvh] pb-24">
      <SEO
        title="Grocery Store — SwiftMart Balurghat"
        description="Shop fresh groceries, vegetables, dairy, snacks, health drinks, chocolates and daily essentials from SwiftMart's grocery store in Balurghat."
        canonical="/grocery"
      />

      {/* ── Hero Header ─────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-green-500 to-teal-500 text-white px-4 pt-4 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/" className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold leading-tight tracking-tight">🛒 Grocery Store</h1>
              <p className="text-xs text-white/80 mt-0.5">Fresh picks · Daily essentials · Fast delivery</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search groceries, snacks, drinks…"
              className="pl-9 pr-9 bg-white/20 backdrop-blur-md border-white/30 text-white placeholder:text-white/60 rounded-2xl focus-visible:ring-white/40 focus-visible:ring-2"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8 pointer-events-none" />
        <div className="absolute bottom-0 right-16 w-20 h-20 bg-white/10 rounded-full translate-y-6 pointer-events-none" />
      </div>

      {/* ── Mobile category chips ─────────────────────────────────── */}
      <div className="md:hidden overflow-x-auto scrollbar-hide px-3 pt-3 pb-1 flex gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/40">
        <button
          onClick={() => setSelectedCat("all")}
          className={cn(
            "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all",
            selectedCat === "all"
              ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
              : "bg-card text-foreground border-border hover:border-emerald-400"
          )}
        >
          🛒 All
          <span className="text-[10px] font-bold opacity-70">{products.length}</span>
        </button>
        {availableCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            className={cn(
              "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all",
              selectedCat === cat.id
                ? "text-white border-transparent shadow-sm"
                : "bg-card text-foreground border-border hover:border-emerald-400"
            )}
            style={selectedCat === cat.id ? { background: cat.color, borderColor: cat.color } : {}}
          >
            {cat.emoji} {cat.name}
            <span className="text-[10px] font-bold opacity-70">{cat.count}</span>
          </button>
        ))}
      </div>

      {/* ── Main layout: sidebar + products ─────────────────────── */}
      <div className="max-w-7xl mx-auto flex gap-0 md:gap-4 px-0 md:px-4 pt-0 md:pt-4">

        {/* Desktop Left Sidebar */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 sticky top-4 self-start h-[calc(100vh-7rem)] overflow-y-auto scrollbar-hide">
          <div className="bg-card rounded-2xl neu-card p-2 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2">Categories</p>

            {/* All */}
            <button
              onClick={() => setSelectedCat("all")}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left",
                selectedCat === "all"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <span className="text-base">🛒</span>
              <span className="flex-1 leading-tight">All Products</span>
              <span className={cn("text-[10px] font-bold", selectedCat === "all" ? "text-white/70" : "text-muted-foreground")}>
                {products.length}
              </span>
            </button>

            {availableCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left",
                  selectedCat === cat.id
                    ? "text-white shadow-sm"
                    : "text-foreground hover:bg-muted"
                )}
                style={selectedCat === cat.id ? { background: cat.color } : {}}
              >
                <span className="text-base">{cat.emoji}</span>
                <span className="flex-1 leading-tight">{cat.name}</span>
                <span className={cn("text-[10px] font-bold", selectedCat === cat.id ? "text-white/70" : "text-muted-foreground")}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Products Panel */}
        <div className="flex-1 min-w-0 px-3 md:px-0 pt-3 md:pt-0">
          {/* Section label */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedMeta.emoji}</span>
              <h2 className="font-extrabold text-lg text-foreground leading-tight">{selectedMeta.name}</h2>
            </div>
            <span className="text-xs text-muted-foreground font-semibold bg-muted px-2.5 py-1 rounded-full">
              {query ? filteredProducts.length : totalCount} item{(query ? filteredProducts.length : totalCount) !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="rounded-2xl bg-muted animate-pulse h-52" />
              ))}
            </div>
          )}

          {/* Products */}
          {!isLoading && filteredProducts.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}

          {/* Empty */}
          {!isLoading && filteredProducts.length === 0 && (
            <EmptyState
              icon={PackageOpen}
              title={query ? "No results found" : "No products here yet"}
              description={query ? `Nothing matches "${query}" — try a different search.` : "This category is empty right now. Check back soon!"}
            />
          )}
        </div>
      </div>
    </div>
  );
}
