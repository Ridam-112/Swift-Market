import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { SEO } from "@/components/SEO";
import { Star, Clock, SlidersHorizontal, X, Search, Zap } from "lucide-react";
import { useShops } from "@/hooks/useShops";
import { useAuth } from "@/hooks/useAuth";

function formatCategory(slug: string) {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

const PAGE_SIZE = 18;

export default function Shops() {
  const { shops, isLoading } = useShops();
  const { user } = useAuth();
  const [openOnly, setOpenOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const shop of shops) {
      if (shop.category && !seen.has(shop.category)) {
        seen.add(shop.category);
        list.push(shop.category);
      }
    }
    return list.sort();
  }, [shops]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = shops;
    if (openOnly) list = list.filter(s => s.isOpen);
    if (selectedCategory) list = list.filter(s => s.category === selectedCategory);
    if (q) list = list.filter(s =>
      s.storeName.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q)
    );
    return list;
  }, [shops, openOnly, selectedCategory, query]);

  const activeFilters = (openOnly ? 1 : 0) + (selectedCategory ? 1 : 0) + (query ? 1 : 0);

  const clearAll = () => {
    setOpenOnly(false);
    setSelectedCategory(null);
    setQuery("");
    setDisplayLimit(PAGE_SIZE);
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-7xl mx-auto space-y-4">
      <SEO
        title="Local Shops in Balurghat"
        description="Browse grocery, food, medicine, dairy, bakery and daily essentials shops in Balurghat on SwiftMart. Find open shops near you for fast local delivery."
        canonical="/shops"
        keywords="shops in Balurghat, grocery shops Balurghat, medicine shops Balurghat, local stores Balurghat"
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Shops Near You</h2>
        <div className="flex items-center gap-2">
          {activeFilters > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium"
            >
              <X className="w-3 h-3" /> Clear ({activeFilters})
            </button>
          )}
          <button
            onClick={() => setOpenOnly(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-colors ${
              openOnly
                ? "bg-green-500 text-white font-semibold"
                : "bg-card neu-inset text-muted-foreground"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${openOnly ? "bg-white" : "bg-green-500"}`} />
            Open Now
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search shops…"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-card neu-inset text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category filter chips */}
      {!isLoading && categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 snap-x">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`snap-start shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === null
                ? "bg-primary text-primary-foreground neu-card shadow-sm"
                : "bg-card neu-inset text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            All
            <span className={`text-xs px-1.5 py-0 rounded-full ${selectedCategory === null ? "bg-white/20" : "bg-muted"}`}>
              {shops.length}
            </span>
          </button>

          {categories.map(cat => {
            const count = shops.filter(s => s.category === cat).length;
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(active ? null : cat)}
                className={`snap-start shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  active
                    ? "bg-primary text-primary-foreground neu-card shadow-sm"
                    : "bg-card neu-inset text-muted-foreground hover:text-foreground"
                }`}
              >
                {formatCategory(cat)}
                <span className={`text-xs px-1.5 py-0 rounded-full ${active ? "bg-white/20" : "bg-muted"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-card rounded-2xl p-4 neu-card flex gap-4 items-center animate-pulse">
              <div className="w-20 h-20 rounded-xl bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-lg font-semibold text-foreground">No shops found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {query
              ? `No shops matching "${query}"${selectedCategory ? ` in ${formatCategory(selectedCategory)}` : ""}${openOnly ? " that are open" : ""}.`
              : openOnly && selectedCategory
              ? `No open ${formatCategory(selectedCategory)} shops right now.`
              : openOnly
              ? "No shops are currently open."
              : selectedCategory
              ? `No ${formatCategory(selectedCategory)} shops available.`
              : "No approved shops available yet."}
          </p>
          {activeFilters > 0 && (
            <button
              onClick={clearAll}
              className="mt-3 text-sm text-primary font-medium hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedCategory ?? "all"}-${openOnly}-${query}`}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {filtered.slice(0, displayLimit).map((vendor, i) => (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
              >
                <Link href={`/shop/${vendor.id}`} className="block">
                  <div className="bg-card rounded-2xl p-4 neu-card flex gap-4 items-center group hover:scale-[1.02] transition-transform">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-background neu-inset flex-shrink-0">
                      <img
                        src={vendor.image}
                        alt={vendor.storeName}
                        className="w-full h-full object-cover mix-blend-multiply"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-base truncate text-foreground">{vendor.storeName}</h3>
                        {vendor.isOpen ? (
                          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground mb-2 truncate">
                        {formatCategory(vendor.category)}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs font-medium">
                        <div className="flex items-center gap-1 text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-md">
                          <Star className="w-3 h-3 fill-current" />
                          {vendor.rating > 0 ? vendor.rating.toFixed(1) : "New"}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground bg-background neu-inset px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" />
                          {vendor.eta}
                        </div>
                        {user?.pincode && vendor.pincode === user.pincode && (
                          <div className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded-md font-semibold">
                            <Zap className="w-3 h-3 fill-current" />
                            Quick Delivery
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
        {filtered.length > displayLimit && (
          <div className="flex flex-col items-center gap-1 pt-2">
            <button
              onClick={() => setDisplayLimit(l => l + PAGE_SIZE)}
              className="px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-none neu-card hover:opacity-90 transition-opacity"
            >
              Load more ({filtered.length - displayLimit} remaining)
            </button>
          </div>
        )}
        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground text-center pb-2">
            Showing {Math.min(displayLimit, filtered.length)} of {filtered.length} shops
          </p>
        )}
        </>
      )}
    </div>
  );
}
