import { Fragment } from "react";
import { Product } from "@/types";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "./EmptyState";
import { SkeletonProductGrid } from "./SkeletonProductCard";
import { PackageOpen } from "lucide-react";
import { AdSenseInFeedCard } from "./GoogleAdSense";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  skeletonCount?: number;
  showInFeedAds?: boolean;
  adFrequency?: number;
  adSlotId?: string;
}

export function ProductGrid({
  products,
  isLoading = false,
  skeletonCount = 8,
  showInFeedAds = true,
  adFrequency = 8,
  adSlotId,
}: ProductGridProps) {
  if (isLoading) {
    return <SkeletonProductGrid count={skeletonCount} />;
  }

  if (products.length === 0) {
    return (
      <EmptyState 
        icon={PackageOpen}
        title="No products found"
        description="Try adjusting your filters or browse other categories."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
      {products.map((product, index) => {
        const shouldShowAd = showInFeedAds && (index + 1) % adFrequency === 0;
        return (
          <Fragment key={product.id}>
            <ProductCard product={product} index={index} />
            {shouldShowAd && (
              <AdSenseInFeedCard
                key={`ad-feed-${index}`}
                slotId={adSlotId}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
