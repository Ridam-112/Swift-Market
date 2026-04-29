import { Product } from "@/types";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "./EmptyState";
import { PackageOpen } from "lucide-react";

export function ProductGrid({ products }: { products: Product[] }) {
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
}
