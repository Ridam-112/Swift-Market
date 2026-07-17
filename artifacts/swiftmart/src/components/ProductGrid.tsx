import { Product } from "@/types";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "./EmptyState";
import { SkeletonProductGrid } from "./SkeletonProductCard";
import { PackageOpen } from "lucide-react";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  skeletonCount?: number;
}

export function ProductGrid({ products, isLoading = false, skeletonCount = 8 }: ProductGridProps) {
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
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
}
