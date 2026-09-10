import { useState, useMemo, useEffect, Fragment } from "react";
import { Link } from "wouter";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import { SEO } from "@/components/SEO";
import { AdSenseInFeedCard } from "@/components/GoogleAdSense";
import { ArrowLeft, PackageOpen, Search, X, ChevronRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GROCERY_SUBCATS } from "@/data/grocerySubcats";

// ─── Non-grocery product categories — always excluded from this page ──────────
const NON_GROCERY_CATS = new Set([
  "restaurant", "fast-food", "cloud-kitchen",
  "meat-fish", "meat-shop", "fish-shop",
  "clothing", "fashion", "electronics", "mobile-phone",
  "toys", "gaming", "hardware", "handmade", "gifts", "gift-shop",
  "book-store", "books", "Stationery & Crafts", "stationary",
  "Roll", "Chowmin", "Mughlai", "Fried Rice", "Gravy", "Milkshake", "Mojito", "Lassi", "Coffee"
]);

function matchSubcat(product: { name: string; category?: string; subcategory?: string; description?: string }, subcatId: string): boolean {
  const name = (product.name || "").toLowerCase();
  const subcat = (product.subcategory || "").toLowerCase();
  const cat = (product.category || "").toLowerCase();
  const desc = (product.description || "").toLowerCase();
  const combined = `${name} ${subcat} ${cat} ${desc}`;

  switch (subcatId) {
    case "rice":
      return /rice|chawal|basmati|gobindo|miniket|sona masoori|poha|sabudana|makhana/i.test(combined) || subcat.includes("rice") || subcat.includes("grains") || subcat.includes("poha");
    case "atta":
      return /atta|flour|maida|sooji|suji|semolina|besan|gram flour|ragi|bajra|jowar/i.test(combined) || subcat.includes("atta") || subcat.includes("flour");
    case "dal":
      return /dal|pulse|masoor|moong|chana|urad|toor|arhar|rajma|matar|chole|chickpea|lobiya/i.test(combined) || subcat.includes("dal") || subcat.includes("pulses");
    case "oil":
      return (/oil|ghee|mustard|sunflower|refined|soyabean|palm|groundnut|vanaspati/i.test(combined) && !/hair oil|baby oil|essential oil/i.test(name)) || subcat.includes("oil") || subcat.includes("ghee");
    case "spices":
      return /spice|masala|turmeric|haldi|jeera|cumin|coriander|dhania|pepper|chilli|mirchi|hing|cardamom|elaichi|clove|bay leaf|cinnamon|dalchini|methi|ajwain/i.test(combined) || cat === "spices-dryfruits" || subcat.includes("spice");
    case "tea":
      return /tea|coffee|nescafe|bru|lipton|tata tea|taj mahal|wagh bakri/i.test(combined) || cat === "tea-coffee" || subcat.includes("tea") || subcat.includes("coffee");
    case "sugar":
      return (/sugar|chini|jaggery|gur|salt|namak/i.test(combined) && !/hair|shampoo/i.test(name)) || subcat.includes("sugar") || subcat.includes("salt");
    case "biscuits":
      return /biscuit|cookie|rusk|wafer|cracker|marie|parle|bourbon|oreo|good day|hide & seek|digestive/i.test(combined) || cat === "biscuits-cookies" || subcat.includes("biscuit");
    case "chocolates":
      return /chocolate|cadbury|kitkat|dairy milk|5 star|snickers|ferrero|gems|candy|toffee|lollipop|mithai|sweet/i.test(combined) || cat === "sweets" || subcat.includes("chocolate") || subcat.includes("sweet");
    case "drinks":
      return /cold drink|soft drink|pepsi|sprite|coke|coca cola|thums up|limca|maaza|frooti|juice|squash|sharbat|soda|energy drink|sting|red bull/i.test(combined) || cat === "cold-drinks" || subcat.includes("juice") || subcat.includes("drink");
    case "health-drinks":
      return /horlicks|bournvita|complan|protinex|boost|glucon-d|ensure|pediasure|protein|nutrition/i.test(combined) || cat === "protein-nutrition" || subcat.includes("health") || subcat.includes("nutrition");
    case "bread":
      return /bread|pav|bun|bakery|cake|muffin|croissant/i.test(combined) || subcat.includes("bread") || subcat.includes("bakery");
    case "dairy":
      return /milk|curd|dahi|paneer|butter|cheese|cream|yogurt|lassi|amul|dairy/i.test(combined) || cat === "dairy-bread-eggs" || subcat.includes("milk") || subcat.includes("butter");
    case "dry-fruits":
      return /kaju|cashew|badam|almond|raisin|kishmish|pista|pistachio|walnut|akhrot|dates|khajur|anjeer|peanut|nut/i.test(combined) || subcat.includes("dry fruit");
    case "snacks":
      return /chips|lays|kurkure|bingo|pringles|namkeen|bhujia|chanachur|mixture|popcorn|snack/i.test(combined) || cat === "snacks" || subcat.includes("chips") || subcat.includes("snack");
    case "noodles":
      return /maggi|yippee|noodles|pasta|macaroni|vermicelli|chowmein|ready to eat|ready to cook|soup/i.test(combined) || cat === "packaged-food" || subcat.includes("ready to") || subcat.includes("noodle");
    case "cereals":
      return /corn flakes|cornflakes|muesli|oats|oatmeal|kellogg|quaker|chocos|cereal|upma/i.test(combined) || subcat.includes("cereal");
    case "soap":
      return /soap|body wash|handwash|hand wash|lifebuoy|lux|dove|dettol|pears|savlon|shower gel/i.test(combined) || subcat.includes("soap") || subcat.includes("body wash");
    case "dental":
      return /toothpaste|toothbrush|tooth paste|tooth brush|colgate|sensodyne|pepsodent|close up|oral-b|mouthwash/i.test(combined) || subcat.includes("dental") || subcat.includes("oral");
    case "personal-care":
      return /shampoo|conditioner|face wash|lotion|cream|powder|deodorant|perfume|shaving|razor|grooming|hygiene|skincare|hair oil|vaseline/i.test(combined) || cat === "fragrance" || cat === "feminine-hygiene" || cat === "beauty-personal-care" || subcat.includes("wellness") || subcat.includes("grooming");
    case "cleaning":
      return /detergent|surf excel|tide|ariel|vim|dishwash|phenyl|lizol|harpic|cleaner|air freshner|repellent|mop|broom|garbage/i.test(combined) || cat === "cleaning-essentials" || subcat.includes("dishwashing") || subcat.includes("cleaning");
    case "baby-care":
      return /baby|diaper|pampers|huggies|wipes|cerelac|johnson/i.test(combined) || cat === "baby-care";
    case "pooja":
      return /agarbatti|incense|camphor|kapoor|diya|sindoor|kumkum|dhoop|pooja/i.test(combined) || cat === "pooja" || subcat.includes("pooja");
    case "frozen":
      return /frozen|pickle|achar|jam|jelly|spread|sauce|ketchup|mayonnaise|vinegar|peanut butter|ready to cook|papad/i.test(combined) || cat === "breakfast-sauces" || subcat.includes("spread") || subcat.includes("sauce") || subcat.includes("pickle") || subcat.includes("frozen");
    default:
      return false;
  }
}

const PAGE_SIZE = 24;

// ─── Component ────────────────────────────────────────────────────────────────
export default function GroceryStore() {
  const { products, isLoading } = useProducts();
  const [selectedId, setSelectedId] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // Reset page when category or query changes
  useEffect(() => {
    setPage(1);
  }, [selectedId, query]);

  // Count products per subcategory
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    const groceryList = products.filter(p => !NON_GROCERY_CATS.has(p.category ?? ""));
    for (const sc of GROCERY_SUBCATS) {
      map[sc.id] = groceryList.filter(p => matchSubcat(p, sc.id)).length;
    }
    return map;
  }, [products]);

  const visibleSubcats = GROCERY_SUBCATS;

  // Filtered list — always strip non-grocery shop categories first
  const filteredProducts = useMemo(() => {
    let list = products.filter(p => !NON_GROCERY_CATS.has(p.category ?? ""));
    if (selectedId !== "all") {
      list = list.filter(p => matchSubcat(p, selectedId));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.subcategory || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, selectedId, query]);

  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(0, page * PAGE_SIZE);
  }, [filteredProducts, page]);

  const hasMore = paginatedProducts.length < filteredProducts.length;

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

          {!isLoading && paginatedProducts.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {paginatedProducts.map((product, i) => (
                  <Fragment key={product.id}>
                    <ProductCard product={product} index={i % 24} />
                    {i === 7 && (
                      <AdSenseInFeedCard key="ad-groc-1" />
                    )}
                    {i === 23 && (
                      <AdSenseInFeedCard key="ad-groc-2" />
                    )}
                  </Fragment>
                ))}
              </div>
              {hasMore && (
                <div className="flex flex-col items-center justify-center pt-8 pb-4 gap-2">
                  <Button
                    onClick={() => setPage(p => p + 1)}
                    variant="outline"
                    className="rounded-full px-8 py-2 font-bold neu-card border-none shadow-md hover:bg-primary hover:text-white transition-all text-sm"
                  >
                    Load More Products ({filteredProducts.length - paginatedProducts.length} remaining)
                  </Button>
                </div>
              )}
            </>
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
