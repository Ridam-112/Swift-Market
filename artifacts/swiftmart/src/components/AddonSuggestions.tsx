import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCart } from "@/hooks/useCart";
import { formatINR } from "@/lib/currency";
import { Plus, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

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
  products: Product[];
}

/**
 * "Buy something new" upsell strip — pulls admin-curated add-on bucket
 * products and lets the shopper quick-add them straight from the cart
 * without leaving the page.
 */
export function AddonSuggestions() {
  const { items, addToCart } = useCart();
  const [buckets, setBuckets] = useState<BucketRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; buckets: Array<BucketRow & { products: RawBucketProduct[] }> }>('/buckets/addons')
      .then(d => {
        const mapped = (d.buckets ?? []).map(b => ({ ...b, products: (b.products ?? []).map(mapProduct) }));
        setBuckets(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cartProductIds = new Set(items.map(i => i.product.id));
  // Flatten and de-dupe across buckets, drop anything already in the cart.
  const suggestions = buckets
    .flatMap(b => b.products)
    .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i && !cartProductIds.has(p.id))
    .slice(0, 12);

  if (loading || suggestions.length === 0) return null;

  return (
    <section className="bg-card rounded-2xl p-4 neu-card">
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-sm">Add these to your order</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x -mx-1 px-1">
        {suggestions.map(product => {
          const inCart = cartProductIds.has(product.id);
          const price = product.discountedPrice ?? product.price;
          return (
            <div key={product.id} className="snap-start shrink-0 w-32 bg-background rounded-xl p-2.5 neu-inset flex flex-col gap-1.5">
              <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <p className="text-[11px] font-semibold leading-tight line-clamp-2 min-h-[28px]">{product.name}</p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs font-bold text-primary">{formatINR(price)}</span>
                <button
                  onClick={() => !inCart && addToCart(product, 1)}
                  disabled={inCart}
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
                    inCart ? "bg-green-500/15 text-green-600" : "bg-primary text-primary-foreground"
                  )}
                  aria-label={inCart ? "Added" : `Add ${product.name}`}
                >
                  {inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
