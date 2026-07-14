import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useCart } from "@/hooks/useCart";
import { formatINR } from "@/lib/currency";
import { Plus, Check, Sparkles, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

interface RawBucketProduct {
  id?: unknown; _id?: unknown; name?: unknown; category?: unknown;
  price?: unknown; discountedPrice?: unknown; unit?: unknown; images?: unknown;
  image?: unknown; description?: unknown; stock?: unknown; rating?: unknown;
  shopId?: unknown; shopName?: unknown; trending?: unknown;
}

function mapProduct(p: RawBucketProduct): Product {
  return {
    id: (p.id ?? p._id ?? "") as string,
    name: (p.name ?? "") as string,
    category: (p.category ?? "") as Product["category"],
    price: Number(p.price ?? 0),
    discountedPrice: p.discountedPrice != null ? Number(p.discountedPrice) : undefined,
    unit: (p.unit ?? "1 unit") as string,
    image: ((p.images as string[] | undefined)?.[0] ?? p.image ?? "/assets/product-placeholder.png") as string,
    images: (p.images as string[] | undefined) ?? [],
    description: (p.description ?? "") as string,
    stock: Number(p.stock ?? 0),
    rating: Number(p.rating ?? 0),
    vendorId: (p.shopId ?? "") as string,
    shopId: (p.shopId ?? "") as string,
    shopName: p.shopName ? (p.shopName as string) : undefined,
    trending: Boolean(p.trending),
  };
}

interface BucketRow {
  _id: string;
  title: string;
  subtitle: string;
  badgeText: string;
  accentColor: string;
  comboPrice?: number | null;
  products: Product[];
}

/**
 * Cart add-on section:
 * 1. Each addon bucket shown as a highlighted combo card with "Add Combo" CTA.
 * 2. A shuffled "More to try" strip of individual products from all buckets —
 *    products are reshuffled on every page load so the customer sees something new.
 */
export function AddonSuggestions() {
  const { items, addToCart } = useCart();
  const [buckets, setBuckets] = useState<BucketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCombo, setAddingCombo] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ success: boolean; buckets: Array<BucketRow & { products: RawBucketProduct[]; comboPrice?: number | null }> }>('/buckets/addons')
      .then(d => {
        const mapped = (d.buckets ?? []).map(b => ({
          ...b,
          comboPrice: b.comboPrice ?? null,
          products: (b.products ?? []).map(mapProduct),
        }));
        setBuckets(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cartProductIds = new Set(items.map(i => i.product.id));

  // Shuffle once on load — different order every visit
  const shuffledPool = useMemo(() => {
    const all = buckets.flatMap(b => b.products);
    const deduped = all.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
    return shuffle(deduped);
  }, [buckets]);

  const suggestions = shuffledPool.filter(p => !cartProductIds.has(p.id)).slice(0, 20);

  function handleAddCombo(bucket: BucketRow) {
    setAddingCombo(bucket._id);
    bucket.products.forEach(p => {
      if (!cartProductIds.has(p.id)) addToCart(p, 1);
    });
    setTimeout(() => setAddingCombo(null), 1400);
  }

  if (loading || buckets.length === 0) return null;

  const allInCart = (bucket: BucketRow) =>
    bucket.products.length > 0 && bucket.products.every(p => cartProductIds.has(p.id));

  return (
    <div className="space-y-4">
      {/* ── Combo bucket cards ────────────────────────────────────── */}
      {buckets.map(bucket => {
        const done = allInCart(bucket);
        const adding = addingCombo === bucket._id;
        const mrp = bucket.products.reduce((s, p) => s + (p.discountedPrice ?? p.price), 0);
        const hasComboPrice = bucket.comboPrice != null && bucket.comboPrice > 0;

        return (
          <section
            key={bucket._id}
            className="relative overflow-hidden rounded-2xl p-4"
            style={{
              background: `linear-gradient(135deg, ${bucket.accentColor}1a, ${bucket.accentColor}06)`,
              boxShadow: `0 0 0 1.5px ${bucket.accentColor}50, 0 6px 20px -6px ${bucket.accentColor}55`,
            }}
          >
            {/* ambient glow */}
            <div
              className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-25 pointer-events-none animate-pulse"
              style={{ background: bucket.accentColor, filter: "blur(28px)" }}
            />

            {/* header */}
            <div className="flex items-start justify-between gap-2 mb-3 relative z-10">
              <div className="min-w-0">
                <div
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-1.5"
                  style={{ background: bucket.accentColor, color: "#fff" }}
                >
                  <Sparkles className="w-3 h-3" />
                  {bucket.badgeText}
                </div>
                <h3 className="font-extrabold text-sm leading-tight">{bucket.title}</h3>
                {bucket.subtitle && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{bucket.subtitle}</p>
                )}
              </div>

              {/* price badge */}
              {hasComboPrice && (
                <div className="shrink-0 text-right">
                  {mrp > bucket.comboPrice! && (
                    <p className="text-[11px] text-muted-foreground line-through opacity-60">
                      {formatINR(mrp)}
                    </p>
                  )}
                  <p className="font-extrabold text-lg leading-none" style={{ color: bucket.accentColor }}>
                    {formatINR(bucket.comboPrice!)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">combo deal</p>
                </div>
              )}
            </div>

            {/* product thumbnails */}
            <div className="flex gap-2 mb-3 relative z-10 overflow-x-auto pb-0.5 scrollbar-hide">
              {bucket.products.slice(0, 5).map(p => {
                const inCart = cartProductIds.has(p.id);
                return (
                  <div key={p.id} className="relative shrink-0">
                    <div className={cn(
                      "w-[60px] h-[60px] rounded-xl overflow-hidden border-2 transition-all",
                      inCart ? "border-green-500/70 opacity-60" : "border-white/10"
                    )}>
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    {inCart && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <p className="text-[9px] leading-tight text-center mt-1 text-muted-foreground line-clamp-1 w-[60px]">
                      {p.name}
                    </p>
                  </div>
                );
              })}
              {bucket.products.length > 5 && (
                <div className="w-[60px] h-[60px] rounded-xl bg-muted/60 border-2 border-white/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-muted-foreground">+{bucket.products.length - 5}</span>
                </div>
              )}
            </div>

            {/* CTA button */}
            <button
              onClick={() => !done && !adding && handleAddCombo(bucket)}
              disabled={done || adding}
              className={cn(
                "relative z-10 w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                done
                  ? "bg-green-500/15 text-green-600 border border-green-500/30 cursor-default"
                  : "text-white shadow-sm"
              )}
              style={done ? {} : { background: bucket.accentColor }}
            >
              {done ? (
                <><Check className="w-4 h-4" /> All items added</>
              ) : adding ? (
                <><ShoppingBag className="w-4 h-4 animate-bounce" /> Adding…</>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  {hasComboPrice
                    ? `Add Combo · ${formatINR(bucket.comboPrice!)}`
                    : `Add All ${bucket.products.length} Items`}
                </>
              )}
            </button>
          </section>
        );
      })}

      {/* ── Shuffled individual picks ─────────────────────────────── */}
      {suggestions.length > 0 && (
        <section className="bg-card rounded-2xl p-4 neu-card">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm">More to try</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x -mx-1 px-1">
            {suggestions.map(product => {
              const inCart = cartProductIds.has(product.id);
              const price = product.discountedPrice ?? product.price;
              return (
                <div
                  key={product.id}
                  className="snap-start shrink-0 w-28 bg-background rounded-xl p-2.5 neu-inset flex flex-col gap-1"
                >
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  {product.shopName && (
                    <p className="text-[9px] text-muted-foreground truncate font-semibold">{product.shopName}</p>
                  )}
                  <p className="text-[10px] font-semibold leading-tight line-clamp-2 min-h-[24px]">{product.name}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs font-bold text-primary">{formatINR(price)}</span>
                    <button
                      onClick={() => !inCart && addToCart(product, 1)}
                      disabled={inCart}
                      aria-label={inCart ? "Added" : `Add ${product.name}`}
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
                        inCart
                          ? "bg-green-500/15 text-green-600"
                          : "bg-primary text-primary-foreground"
                      )}
                    >
                      {inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
