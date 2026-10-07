import { useState, useMemo, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";
import { Star, Clock, SlidersHorizontal, X, Search, Zap, MapPin, CheckCircle2 } from "lucide-react";
import { useShops } from "@/hooks/useShops";
import { useAuth } from "@/hooks/useAuth";
import { SkeletonShopCardGrid } from "@/components/SkeletonShopCard";
import { getShopUrl, toShopSlug } from "@/lib/shopUrl";
import { isSameCity } from "@/lib/deliveryEta";

function formatCategory(slug: string) {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

const PAGE_SIZE = 18;

interface ShopsProps {
  initialCity?: string;
  initialCategory?: string;
}

export default function Shops({ initialCity, initialCategory }: ShopsProps = {}) {
  const [, cityCatParams] = useRoute("/stores/:city/:category");
  const [, cityParams] = useRoute("/stores/:city");

  const routeCity = cityCatParams?.city || cityParams?.city || (initialCity ? toShopSlug(initialCity) : "");
  const routeCategory = cityCatParams?.category || (initialCategory ? toShopSlug(initialCategory) : "");

  const { shops, allShops, isLoading } = useShops();
  const { user, selectedDeliveryAddress } = useAuth();
  const customerCity = selectedDeliveryAddress?.city || "Balurghat";
  const candidateShops = (allShops && allShops.length > 0) ? allShops : shops;

  const [openOnly, setOpenOnly] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

  // Distinct cities from actual database shops
  const cities = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const shop of candidateShops) {
      const c = shop.city ? shop.city.trim() : "";
      if (c && !seen.has(c.toLowerCase())) {
        seen.add(c.toLowerCase());
        list.push(c);
      }
    }
    return list.sort();
  }, [candidateShops]);

  // Sync route params to state (or default to customer city)
  useEffect(() => {
    if (routeCity && cities.length > 0) {
      const match = cities.find(c => toShopSlug(c) === routeCity.toLowerCase());
      if (match) setSelectedCity(match);
    } else if (!selectedCity && cities.length > 0) {
      const uCity = (selectedDeliveryAddress?.city || "Balurghat").trim().toLowerCase();
      const match = cities.find(c => c.toLowerCase().includes(uCity) || uCity.includes(c.toLowerCase()));
      if (match) setSelectedCity(match);
    }
  }, [routeCity, cities, selectedDeliveryAddress?.city]);

  // Distinct categories from actual database shops (filtered by city if city chosen)
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    const source = selectedCity
      ? candidateShops.filter(s => (s.city || "").toLowerCase() === selectedCity.toLowerCase())
      : candidateShops;

    for (const shop of source) {
      if (shop.category && !seen.has(shop.category)) {
        seen.add(shop.category);
        list.push(shop.category);
      }
    }
    return list.sort();
  }, [candidateShops, selectedCity]);

  useEffect(() => {
    if (routeCategory && categories.length > 0) {
      const match = categories.find(c => toShopSlug(c) === routeCategory.toLowerCase());
      if (match) setSelectedCategory(match);
    }
  }, [routeCategory, categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = candidateShops;
    if (selectedCity) {
      list = list.filter(s => (s.city || "").toLowerCase() === selectedCity.toLowerCase());
    }
    if (openOnly) {
      list = list.filter(s => s.isOpen);
    }
    if (selectedCategory) {
      list = list.filter(s => s.category === selectedCategory);
    }
    if (q) {
      list = list.filter(s =>
        s.storeName.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [candidateShops, selectedCity, openOnly, selectedCategory, query]);

  const activeFilters = (selectedCity ? 1 : 0) + (openOnly ? 1 : 0) + (selectedCategory ? 1 : 0) + (query ? 1 : 0);

  const clearAll = () => {
    setSelectedCity(null);
    setOpenOnly(false);
    setSelectedCategory(null);
    setQuery("");
    setDisplayLimit(PAGE_SIZE);
  };

  // Dynamic SEO calculation based on active selection (Requirements #2, #3, #4, #5)
  const cityName = selectedCity || (cities.length === 1 ? cities[0] : "Local");
  const catTitle = selectedCategory ? formatCategory(selectedCategory) : "";

  let seoTitle = "Stores & Local Merchants | SwiftMart";
  let seoDesc = `Browse all verified local stores, bakeries, restaurants, grocery marts, and electronics service centers on SwiftMart. Transparent pricing and fast local doorstep delivery.`;
  let canonicalUrl = "/stores";

  if (selectedCity && selectedCategory) {
    seoTitle = `${catTitle} in ${selectedCity} | Order Online on SwiftMart`;
    seoDesc = `Order from top ${catTitle} shops in ${selectedCity}. Authentic quality, verified merchants, and quick local doorstep delivery on SwiftMart.`;
    canonicalUrl = `/stores/${toShopSlug(selectedCity)}/${toShopSlug(selectedCategory)}`;
  } else if (selectedCity) {
    seoTitle = `Local Shops & Stores in ${selectedCity} | SwiftMart`;
    seoDesc = `Discover verified local stores, bakeries, restaurants, and grocery marts in ${selectedCity}. Fast doorstep delivery and authentic local merchants on SwiftMart.`;
    canonicalUrl = `/stores/${toShopSlug(selectedCity)}`;
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-7xl mx-auto space-y-4">
      <SEO
        title={seoTitle}
        description={seoDesc}
        canonical={canonicalUrl}
        keywords={`shops in ${cityName}, stores ${cityName}, ${catTitle ? `${catTitle} ${cityName}, ` : ""}local delivery, order online ${cityName}, SwiftMart`}
        jsonLd={[
          {
            "@type": "BreadcrumbList",
            "@id": `https://swiftmart.space${canonicalUrl}#breadcrumb`,
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "SwiftMart Home", "item": "https://swiftmart.space/" },
              { "@type": "ListItem", "position": 2, "name": "Stores", "item": "https://swiftmart.space/stores" },
              ...(selectedCity ? [{ "@type": "ListItem", "position": 3, "name": `${selectedCity} Stores`, "item": `https://swiftmart.space/stores/${toShopSlug(selectedCity)}` }] : []),
              ...(selectedCategory && selectedCity ? [{ "@type": "ListItem", "position": 4, "name": catTitle, "item": `https://swiftmart.space/stores/${toShopSlug(selectedCity)}/${toShopSlug(selectedCategory)}` }] : []),
            ]
          }
        ]}
      />

      {/* ── Breadcrumb Outline (Requirement #20 & #21) ── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/stores" className="hover:text-foreground transition-colors">Stores</Link>
        {selectedCity && (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/stores/${toShopSlug(selectedCity)}`} className="hover:text-foreground transition-colors">
              {selectedCity}
            </Link>
          </>
        )}
        {selectedCategory && (
          <>
            <span aria-hidden="true">/</span>
            <span className="text-foreground font-bold">{catTitle}</span>
          </>
        )}
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">
            {selectedCategory && selectedCity
              ? `${catTitle} in ${selectedCity}`
              : selectedCity
              ? `Local Stores in ${selectedCity}`
              : "Stores & Local Merchants"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtered.length} verified merchant{filtered.length === 1 ? "" : "s"} available
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeFilters > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium"
            >
              <X className="w-3 h-3" /> Clear ({activeFilters})
            </button>
          )}

          {/* Open Now Toggle */}
          <button
            onClick={() => setOpenOnly(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-colors ${
              openOnly
                ? "bg-green-500 text-white font-bold"
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
          placeholder={`Search ${selectedCity ? `shops in ${selectedCity}` : "shops by name, category or city"}…`}
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

      {/* City filter chips if multiple cities exist or if a city is active */}
      {cities.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 snap-x">
          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 mr-1 shrink-0">
            <MapPin className="w-3 h-3" /> Location:
          </span>
          <button
            onClick={() => setSelectedCity(null)}
            className={`snap-start shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              selectedCity === null
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "bg-card neu-inset text-muted-foreground hover:text-foreground"
            }`}
          >
            All Cities
          </button>
          {cities.map(c => {
            const active = selectedCity === c;
            const count = candidateShops.filter(s => (s.city || "").toLowerCase() === c.toLowerCase()).length;
            return (
              <button
                key={c}
                onClick={() => setSelectedCity(active ? null : c)}
                className={`snap-start shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card neu-inset text-muted-foreground hover:text-foreground"
                }`}
              >
                {c} ({count})
              </button>
            );
          })}
        </div>
      )}

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
            All Categories
            <span className={`text-xs px-1.5 py-0 rounded-full ${selectedCategory === null ? "bg-white/20" : "bg-muted"}`}>
              {selectedCity ? candidateShops.filter(s => (s.city || "").toLowerCase() === selectedCity.toLowerCase()).length : candidateShops.length}
            </span>
          </button>

          {categories.map(cat => {
            const count = candidateShops.filter(s =>
              s.category === cat && (!selectedCity || (s.city || "").toLowerCase() === selectedCity.toLowerCase())
            ).length;
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
            <SkeletonShopCardGrid key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-lg font-semibold text-foreground">No shops found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {query
              ? `No shops matching "${query}"${selectedCity ? ` in ${selectedCity}` : ""}${selectedCategory ? ` for ${formatCategory(selectedCategory)}` : ""}.`
              : selectedCity && selectedCategory
              ? `No ${formatCategory(selectedCategory)} shops found in ${selectedCity} right now.`
              : selectedCity
              ? `No active shops in ${selectedCity} at this time.`
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
            key={`${selectedCity ?? "all"}-${selectedCategory ?? "all"}-${openOnly}-${query}`}
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
                {/* Crawlable link to /stores/{merchant-slug} (Requirement #17 & #20) */}
                <Link href={getShopUrl(vendor)} className="block">
                  <div className="bg-card rounded-2xl p-4 neu-card flex gap-4 items-center group hover:scale-[1.02] transition-transform">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-background neu-inset flex-shrink-0">
                      <img
                        src={vendor.image}
                        alt={`${vendor.storeName} storefront in ${vendor.city || "Balurghat"}`}
                        className="w-full h-full object-cover mix-blend-multiply"
                        loading="lazy"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-base truncate text-foreground">{vendor.storeName}</h3>
                        {vendor.isOpen ? (
                          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Open Now" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" title="Closed" />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 truncate">
                        <span>{formatCategory(vendor.category)}</span>
                        <span>•</span>
                        <span className="truncate">{vendor.city || "Local"}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs font-medium">
                        {/* Rating or New on SwiftMart (Requirement #14) */}
                        <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-md">
                          <Star className="w-3 h-3 fill-current" />
                          {Number(vendor.rating || 0) > 0 && Number(vendor.totalOrders || 0) > 0
                            ? Number(vendor.rating).toFixed(1)
                            : "New"}
                        </div>

                        {/* Dynamic ETA (Requirement #8) */}
                        <div className="flex items-center gap-1 text-muted-foreground bg-background neu-inset px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" />
                          {isSameCity(customerCity, vendor.city) ? (vendor.eta || "30–60 min") : "7 Days"}
                        </div>

                        {/* Verification badge (Requirement #9) */}
                        {vendor.verificationStatus === "verified" && (
                          <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-md text-[10px] font-bold">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Verified
                          </div>
                        )}

                        {user?.pincode && vendor.pincode === user.pincode && (
                          <div className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded-md font-semibold">
                            <Zap className="w-3 h-3 fill-current" />
                            Nearest
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
            Showing {Math.min(displayLimit, filtered.length)} of {filtered.length} stores
          </p>
        )}
        </>
      )}

      <SiteFooter />
    </div>
  );
}
