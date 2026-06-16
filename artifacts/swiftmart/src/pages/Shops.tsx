import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Clock, SlidersHorizontal, X } from "lucide-react";
import { useShops } from "@/hooks/useShops";
import { SectionHeader } from "@/components/SectionHeader";

function formatCategory(slug: string) {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function Shops() {
  const { shops, isLoading } = useShops();
  const [openOnly, setOpenOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
    let list = shops;
    if (openOnly) list = list.filter(s => s.isOpen);
    if (selectedCategory) list = list.filter(s => s.category === selectedCategory);
    return list;
  }, [shops, openOnly, selectedCategory]);

  const activeFilters = (openOnly ? 1 : 0) + (selectedCategory ? 1 : 0);

  return (
    <div className="pb-24 pt-4 px-4 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Shops Near You</h2>
        <div className="flex items-center gap-2">
          {activeFilters > 0 && (
            <button
              onClick={() => { setOpenOnly(false); setSelectedCategory(null); }}
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
          <p className="text-lg font-semibold text-foreground">No shops found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {openOnly && selectedCategory
              ? `No open ${formatCategory(selectedCategory)} shops right now.`
              : openOnly
              ? "No shops are currently open."
              : selectedCategory
              ? `No ${formatCategory(selectedCategory)} shops available.`
              : "No approved shops available yet."}
          </p>
          {activeFilters > 0 && (
            <button
              onClick={() => { setOpenOnly(false); setSelectedCategory(null); }}
              className="mt-3 text-sm text-primary font-medium hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedCategory ?? "all"}-${openOnly}`}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {filtered.map((vendor, i) => (
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

                      <div className="text-xs text-muted-foreground mb-2 truncate capitalize">
                        {formatCategory(vendor.category)}
                      </div>

                      <div className="flex items-center gap-3 text-xs font-medium">
                        <div className="flex items-center gap-1 text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-md">
                          <Star className="w-3 h-3 fill-current" />
                          {vendor.rating > 0 ? vendor.rating.toFixed(1) : "New"}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground bg-background neu-inset px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" />
                          {vendor.eta}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
