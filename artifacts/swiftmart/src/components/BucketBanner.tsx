import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ProductCard } from "./ProductCard";
import { Sparkles } from "lucide-react";
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
 * Admin-curated "bucket" bundles, highlighted at the very top of the home
 * page — deliberately louder/brighter than regular sections so they act as
 * an attention-seeker for combo deals / cross-shop picks.
 */
export function BucketBanner() {
  const [buckets, setBuckets] = useState<BucketRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; buckets: Array<BucketRow & { products: RawBucketProduct[] }> }>('/buckets')
      .then(d => {
        const mapped = (d.buckets ?? []).map(b => ({ ...b, products: (b.products ?? []).map(mapProduct) }));
        setBuckets(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || buckets.length === 0) return null;

  return (
    <div className="space-y-5">
      {buckets.map(bucket => (
        <section
          key={bucket._id}
          className="relative overflow-hidden rounded-3xl p-4 pt-3.5"
          style={{
            background: `linear-gradient(135deg, ${bucket.accentColor}22, ${bucket.accentColor}08)`,
            boxShadow: `0 0 0 1.5px ${bucket.accentColor}55, 0 8px 24px -8px ${bucket.accentColor}55`,
          }}
        >
          {/* Attention-seeker glow pulse */}
          <div
            className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-30 animate-pulse pointer-events-none"
            style={{ background: bucket.accentColor, filter: "blur(30px)" }}
          />

          <div className="flex items-center justify-between mb-3 relative z-10">
            <div>
              <div
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full mb-1.5 animate-pulse"
                style={{ background: bucket.accentColor, color: "#fff" }}
              >
                <Sparkles className="w-3 h-3" />
                {bucket.badgeText}
              </div>
              <h2 className="text-base font-extrabold text-foreground leading-tight">{bucket.title}</h2>
              {bucket.subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{bucket.subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x -mx-1 px-1 relative z-10">
            {bucket.products.slice(0, 10).map((product, i) => (
              <div key={product.id} className="snap-start shrink-0 w-[42vw] max-w-[170px] min-w-[140px]">
                <ProductCard product={product} index={i} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
