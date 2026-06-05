import { CartItem } from "@/types";
import { formatINR } from "@/lib/currency";
import { QuantityStepper } from "./QuantityStepper";
import { useCart } from "@/hooks/useCart";

export function CartItemRow({ item }: { item: CartItem }) {
  const { updateQty } = useCart();
  const { product, qty } = item;

  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div className="flex gap-4 p-3 bg-card rounded-2xl neu-card mb-3 items-center">
      <div className="w-16 h-16 rounded-xl bg-background neu-inset p-2 flex-shrink-0">
        <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm line-clamp-1">{product.name}</h4>
        <div className="text-xs text-muted-foreground mt-0.5">{product.unit}</div>
        {isLowStock && (
          <div className="text-[10px] font-semibold text-amber-600 mt-0.5">
            Only {product.stock} left in stock
          </div>
        )}
        <div className="font-bold text-primary mt-1">{formatINR(product.price)}</div>
      </div>

      <div className="flex-shrink-0">
        <QuantityStepper
          qty={qty}
          maxQty={product.stock}
          onChange={(newQty) => updateQty(product.id, newQty)}
          size="sm"
        />
      </div>
    </div>
  );
}
