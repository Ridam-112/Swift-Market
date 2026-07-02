import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, PackageOpen } from "lucide-react";
import type { Product } from "@/types";

interface RawProduct {
  id?: unknown; _id?: unknown; name?: unknown; category?: unknown;
  price?: unknown; discountedPrice?: unknown; unit?: unknown; images?: unknown;
  image?: unknown; description?: unknown; stock?: unknown; rating?: unknown;
  shopId?: unknown; trending?: unknown;
}

function mapProduct(p: RawProduct): Product {
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
    trending: Boolean(p.trending),
  };
}

const PAGE_SIZE = 20;

import { SEO } from "@/components/SEO";

export default function SectionProducts() {
  const params = useParams<{ id: string }>();
  const sectionId = params.id ?? "";
  const [, navigate] = useLocation();

  const title = decodeURIComponent(
    new URLSearchParams(window.location.search).get("title") ?? "Products"
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!sectionId) return;
    setLoading(true);
    api.get<{ success: boolean; products: RawProduct[]; hasMore: boolean }>(
      `/homepage-sections/${sectionId}/products?page=1&limit=${PAGE_SIZE}`
    )
      .then(d => {
        setProducts((d.products ?? []).map(mapProduct));
        setHasMore(d.hasMore ?? false);
        setPage(1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sectionId]);

  function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    api.get<{ success: boolean; products: RawProduct[]; hasMore: boolean }>(
      `/homepage-sections/${sectionId}/products?page=${nextPage}&limit=${PAGE_SIZE}`
    )
      .then(d => {
        setProducts(prev => [...prev, ...(d.products ?? []).map(mapProduct)]);
        setHasMore(d.hasMore ?? false);
        setPage(nextPage);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }

  return (
    <div className="pb-24 pt-4 px-3 w-full max-w-7xl mx-auto">
      <SEO noIndex />
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-xl neu-card flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground truncate">{title}</h1>
      </div>

      {/* Product grid */}
      {loading ? (
        <SkeletonGrid count={8} />
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <PackageOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">No products in this section yet.</p>
          <Button variant="outline" onClick={() => navigate("/")} className="rounded-full">
            Back to Home
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-6">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-full px-8 font-semibold neu-card border-none gap-2"
              >
                {loadingMore ? (
                  <>
                    <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block" />
                    Loading…
                  </>
                ) : (
                  <>Load more <ChevronRight className="w-4 h-4" /></>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
