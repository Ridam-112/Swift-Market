import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowRight, Store, PackageSearch } from "lucide-react";
import { Link } from "wouter";
import { useProducts } from "@/hooks/useProducts";
import { formatINR } from "@/lib/currency";
import type { Product } from "@/types";

// Highlight matched letters in a string
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary/20 text-primary font-bold rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { products } = useProducts();

  // Auto-focus when overlay opens, clear on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 120);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Live filter — match name, category, description, shopName
  const results: Product[] = query.trim().length === 0
    ? []
    : products.filter(p => {
        const q = query.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.shopName ?? "").toLowerCase().includes(q)
        );
      }).slice(0, 40);

  const hasQuery = query.trim().length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
            onClick={onClose}
          />

          {/* Panel — slides down from top */}
          <motion.div
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed top-0 left-0 right-0 z-[201] bg-background rounded-b-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: "90dvh" }}
          >
            {/* ── Search input row ── */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search groceries, medicine, vegetables…"
                  className="w-full pl-10 pr-4 h-12 rounded-2xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 h-10 px-3 rounded-xl bg-muted text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* ── Result count pill ── */}
            {hasQuery && (
              <div className="px-4 pb-2">
                <span className="text-xs text-muted-foreground font-medium">
                  {results.length === 0
                    ? "No results"
                    : `${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"`}
                </span>
              </div>
            )}

            {/* ── Results list ── */}
            <div className="overflow-y-auto flex-1 px-4 pb-6 space-y-2">
              <AnimatePresence mode="popLayout">
                {!hasQuery && (
                  <motion.div
                    key="empty-hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground"
                  >
                    <Search className="w-10 h-10 opacity-20" />
                    <p className="text-sm">Start typing to search…</p>
                  </motion.div>
                )}

                {hasQuery && results.length === 0 && (
                  <motion.div
                    key="no-results"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground"
                  >
                    <PackageSearch className="w-10 h-10 opacity-20" />
                    <p className="text-sm text-center">
                      Nothing matched "<span className="font-semibold text-foreground">{query}</span>"
                    </p>
                  </motion.div>
                )}

                {results.map((product, i) => {
                  const image = (product.images?.[0] ?? product.image) || "/assets/product-placeholder.png";
                  const price = product.discountedPrice ?? product.price;
                  const hasDiscount = product.discountedPrice != null && product.discountedPrice < product.price;

                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ delay: i * 0.025, duration: 0.18 }}
                    >
                      <Link
                        href={`/product/${product.id}`}
                        onClick={onClose}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-card hover:bg-muted/60 active:scale-[0.98] transition-all"
                      >
                        {/* Product image */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate leading-tight">
                            <Highlight text={product.name} query={query} />
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            <Highlight text={product.category} query={query} />
                            {product.shopName && (
                              <span className="ml-1 inline-flex items-center gap-0.5">
                                · <Store className="w-2.5 h-2.5 inline" />
                                <Highlight text={product.shopName} query={query} />
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-bold text-primary">{formatINR(price)}</span>
                            {hasDiscount && (
                              <span className="text-xs text-muted-foreground line-through">{formatINR(product.price)}</span>
                            )}
                            <span className="text-xs text-muted-foreground">{product.unit}</span>
                          </div>
                        </div>

                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
