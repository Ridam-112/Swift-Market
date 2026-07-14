import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import { SEO } from "@/components/SEO";
import { ArrowLeft, PackageOpen, Search, X, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Subcategory definitions ──────────────────────────────────────────────────
// Each entry has an emoji, display name, accent colour, and a list of keywords
// matched (case-insensitive) against the product name OR subcategory field.
interface GrocerySubcat {
  id: string;
  name: string;
  emoji: string;
  color: string;
  keywords: string[];
}

const GROCERY_SUBCATS: GrocerySubcat[] = [
  {
    id: "rice",
    name: "Rice",
    emoji: "🍚",
    color: "hsl(35,85%,50%)",
    keywords: ["rice", "chawal", "basmati", "atap", "sella", "gobindo", "miniket", "kolam", "sona masoori"],
  },
  {
    id: "atta",
    name: "Atta & Flour",
    emoji: "🌾",
    color: "hsl(40,80%,48%)",
    keywords: ["atta", "flour", "maida", "suji", "semolina", "besan", "gram flour", "ragi", "bajra", "jowar"],
  },
  {
    id: "dal",
    name: "Dal & Pulses",
    emoji: "🫘",
    color: "hsl(20,80%,50%)",
    keywords: ["dal", "daal", "lentil", "masoor", "moong", "chana", "rajma", "urad", "toor", "arhar", "matar", "pulse", "chhole", "chole", "chickpea", "lobiya"],
  },
  {
    id: "oil",
    name: "Cooking Oil",
    emoji: "🫙",
    color: "hsl(50,90%,45%)",
    keywords: ["cooking oil", "mustard oil", "sunflower oil", "refined oil", "soyabean oil", "palm oil", "groundnut oil", "sarso", "tel ", "sarisher tel", "ghee"],
  },
  {
    id: "spices",
    name: "Spices & Masala",
    emoji: "🌶️",
    color: "hsl(5,90%,50%)",
    keywords: ["spice", "masala", "turmeric", "haldi", "jeera", "cumin", "coriander", "dhania", "pepper", "garam masala", "chilli powder", "mirchi", "ajwain", "hing", "cardamom", "elaichi", "cloves", "bay leaf", "tejpatta", "cinnamon", "dalchini", "saffron", "kesar", "amchur", "chaat masala"],
  },
  {
    id: "tea",
    name: "Tea & Coffee",
    emoji: "🍵",
    color: "hsl(30,70%,40%)",
    keywords: ["tea", "chai", "coffee", "green tea", "black tea", "red label", "tata tea", "wagh bakri", "brooke bond", "lipton", "taj mahal", "assam tea", "darjeeling", "nescafe", "bru", "instant coffee"],
  },
  {
    id: "sugar",
    name: "Sugar & Salt",
    emoji: "🧂",
    color: "hsl(200,60%,50%)",
    keywords: ["sugar", "chini", "jaggery", "gud", "gur", "namak", "rock salt", "sendha namak", "iodised salt", "tata salt"],
  },
  {
    id: "biscuits",
    name: "Biscuits & Cookies",
    emoji: "🍪",
    color: "hsl(30,75%,50%)",
    keywords: ["biscuit", "cookie", "cracker", "marie", "parle", "bourbon", "glucose", "digestive", "hide & seek", "oreo", "good day", "little hearts", "jim jam", "kreams", "dark fantasy"],
  },
  {
    id: "chocolates",
    name: "Chocolates & Candy",
    emoji: "🍫",
    color: "hsl(25,65%,35%)",
    keywords: ["chocolate", "choco", "kitkat", "dairy milk", "5 star", "gems", "cadbury", "ferrero", "silk", "snickers", "bounty", "eclairs", "munch", "perk", "milkybar", "candy", "toffee", "lollipop"],
  },
  {
    id: "drinks",
    name: "Drinks & Cold Drinks",
    emoji: "🥤",
    color: "hsl(210,75%,50%)",
    keywords: ["cold drink", "soft drink", "soda", "pepsi", "sprite", "coca cola", "coke", "limca", "thums up", "maaza", "frooti", "juice", "appy", "slice", "nimbu pani", "sharbat", "squash", "energy drink", "red bull"],
  },
  {
    id: "health-drinks",
    name: "Health Drinks",
    emoji: "💪",
    color: "hsl(145,60%,38%)",
    keywords: ["horlicks", "bournvita", "complan", "protinex", "boost", "ovaltine", "milo", "health drink", "glucon-d", "glucon d", "pedialyte", "electral", "protein powder", "whey"],
  },
  {
    id: "bread",
    name: "Bread & Bakery",
    emoji: "🍞",
    color: "hsl(35,80%,52%)",
    keywords: ["bread", "pav", "bun", "rusk", "toast", "loaf", "sandwich bread", "brown bread", "white bread", "multigrain"],
  },
  {
    id: "noodles",
    name: "Noodles & Pasta",
    emoji: "🍜",
    color: "hsl(15,80%,50%)",
    keywords: ["noodles", "pasta", "maggi", "yippee", "hakka", "macaroni", "vermicelli", "sewai", "semiya", "cup noodle", "instant noodle", "spaghetti"],
  },
  {
    id: "cereals",
    name: "Cereals & Chocos",
    emoji: "🥣",
    color: "hsl(40,85%,48%)",
    keywords: ["cereal", "chocos", "cornflakes", "corn flakes", "muesli", "oats", "oatmeal", "kellogg", "quaker", "upma", "poha"],
  },
  {
    id: "dry-fruits",
    name: "Dry Fruits & Nuts",
    emoji: "🥜",
    color: "hsl(30,65%,42%)",
    keywords: ["dry fruit", "cashew", "kaju", "almond", "badam", "raisin", "kishmish", "pista", "pistachio", "walnut", "akhrot", "dates", "khajur", "anjeer", "fig", "apricot", "mixed nut", "groundnut", "chestnut", "pecan", "hazelnut"],
  },
  {
    id: "soap",
    name: "Soap & Body Wash",
    emoji: "🧼",
    color: "hsl(185,60%,45%)",
    keywords: ["soap", "sabun", "body wash", "handwash", "hand wash", "lifebuoy", "lux soap", "dove soap", "dettol soap", "pears soap", "savlon", "bath soap"],
  },
  {
    id: "dental",
    name: "Toothpaste & Brush",
    emoji: "🪥",
    color: "hsl(170,60%,40%)",
    keywords: ["toothpaste", "toothbrush", "tooth paste", "tooth brush", "colgate", "sensodyne", "pepsodent", "close up", "oral b", "oral-b", "mouthwash", "tongue cleaner", "floss"],
  },
  {
    id: "snacks",
    name: "Snacks & Namkeen",
    emoji: "🍿",
    color: "hsl(45,90%,48%)",
    keywords: ["chips", "kurkure", "namkeen", "bhujia", "mixture", "popcorn", "wafer", "lays", "pringles", "doritos", "chanachur", "puffed rice", "muri ", "chivda", "murukku", "chakli", "mathri", "khakhra"],
  },
  {
    id: "dairy",
    name: "Dairy & Milk",
    emoji: "🥛",
    color: "hsl(200,70%,50%)",
    keywords: ["milk", "doodh", "curd", "dahi", "paneer", "butter", "cheese", "cream", "yogurt", "chhena", "khoa", "mawa", "lassi", "toned milk", "full cream", "amul milk", "packet milk"],
  },
  {
    id: "personal-care",
    name: "Personal Care",
    emoji: "🧴",
    color: "hsl(280,55%,55%)",
    keywords: ["shampoo", "conditioner", "lotion", "moisturiser", "face wash", "fairness cream", "sunscreen", "deodorant", "deo", "perfume", "hair oil", "aloe vera", "vaseline", "talcum", "face pack", "scrub", "toner", "serum", "lip balm"],
  },
  {
    id: "cleaning",
    name: "Cleaning & Household",
    emoji: "🏡",
    color: "hsl(220,60%,50%)",
    keywords: ["detergent", "washing powder", "surf excel", "tide", "ariel", "rin", "vim", "phenyl", "lizol", "toilet cleaner", "floor cleaner", "dishwash", "utensil", "broom", "jharoo", "dustbin", "garbage bag", "scotch brite", "sponge"],
  },
  {
    id: "pooja",
    name: "Pooja & Spiritual",
    emoji: "🪔",
    color: "hsl(35,90%,50%)",
    keywords: ["agarbatti", "incense", "camphor", "kapoor", "diya", "sindoor", "kumkum", "dhoop", "pooja", "matchbox", "cotton wick", "bati"],
  },
  {
    id: "frozen",
    name: "Frozen & Packaged",
    emoji: "🧊",
    color: "hsl(195,70%,50%)",
    keywords: ["frozen", "packaged", "ready to cook", "ready to eat", "instant", "can", "tinned", "canned", "pickle", "achar", "jam", "jelly", "sauce", "ketchup", "mayonnaise", "vinegar"],
  },
];

// ─── Keyword matcher ─────────────────────────────────────────────────────────
function matchSubcat(product: { name: string; subcategory?: string }, subcat: GrocerySubcat): boolean {
  const haystack = `${product.name} ${product.subcategory ?? ""}`.toLowerCase();
  return subcat.keywords.some(kw => haystack.includes(kw.toLowerCase()));
}

// Assign a product to the first matching subcategory
function getProductSubcatId(product: { name: string; subcategory?: string }): string | null {
  const match = GROCERY_SUBCATS.find(sc => matchSubcat(product, sc));
  return match?.id ?? null;
}

// ─── Component ───────────────────────────────────────────────────────────────
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

  // Only show subcats that have at least 1 product (or always show all for navigation)
  const visibleSubcats = GROCERY_SUBCATS; // show all so user sees the full menu

  // Filtered products for the right panel
  const filteredProducts = useMemo(() => {
    let list = products;
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
        {/* decorative */}
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
          🛒 All <span className="opacity-60">{products.length}</span>
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

            {/* All */}
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
                {products.length}
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
                  selectedId === sc.id ? "text-white/70" : counts[sc.id] ? "text-primary" : "text-muted-foreground/50"
                )}>
                  {counts[sc.id] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Right: Subcategory tile grid or filtered products */}
        <div className="flex-1 min-w-0 px-3 md:px-0 pt-3 md:pt-0">

          {/* ── "All" landing: show subcategory tile grid ── */}
          {selectedId === "all" && !query && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-extrabold text-lg text-foreground">Shop by Category</h2>
                <span className="text-xs text-muted-foreground font-semibold bg-muted px-2.5 py-1 rounded-full">
                  {products.length} items
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {visibleSubcats.map(sc => (
                  <button
                    key={sc.id}
                    onClick={() => setSelectedId(sc.id)}
                    className="group flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card neu-card hover:scale-105 transition-all cursor-pointer text-center relative overflow-hidden"
                  >
                    {/* colour splash background */}
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

              {/* Divider before all products */}
              <div className="mt-6 mb-3 flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">All Products</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </div>
          )}

          {/* ── Subcategory selected: header breadcrumb ── */}
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

          {/* ── Search active: show results header ── */}
          {query && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-foreground">Results for "{query}"</span>
              <span className="ml-auto text-xs text-muted-foreground font-semibold bg-muted px-2.5 py-1 rounded-full">
                {filteredProducts.length} found
              </span>
            </div>
          )}

          {/* Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="rounded-2xl bg-muted animate-pulse h-52" />
              ))}
            </div>
          )}

          {/* Products grid */}
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
