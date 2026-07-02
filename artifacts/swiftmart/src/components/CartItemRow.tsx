import { CartItem } from "@/types";
import { formatINR } from "@/lib/currency";
import { QuantityStepper } from "./QuantityStepper";
import { WeightStepper } from "./WeightStepper";
import { useCart } from "@/hooks/useCart";
import { cartKey } from "@/context/CartContext";
import { parseUnit, weightPresets, priceForWeight, formatWeight } from "@/lib/weightUtils";

const COLOR_HEX: Record<string, string> = {
  Red: "#ef4444", Blue: "#3b82f6", Green: "#22c55e", Yellow: "#eab308",
  Black: "#1a1a1a", White: "#f3f4f6", Pink: "#ec4899", Purple: "#a855f7",
  Orange: "#f97316", Navy: "#1e3a5f", Gray: "#6b7280", Grey: "#6b7280",
  Brown: "#92400e", Maroon: "#800000",
};

export function CartItemRow({ item }: { item: CartItem }) {
  const { updateQty, updateWeight } = useCart();
  const { product, qty, selectedColor, selectedSize, selectedGrams } = item;
  const key = cartKey(product.id, selectedColor, selectedSize);

  const unitInfo = parseUnit(product.unit);
  const isWeightBased = unitInfo.type === "weight";
  const baseGrams = isWeightBased && unitInfo.type === "weight" ? unitInfo.baseGrams : 1000;
  const maxGrams = product.stock > 0 ? product.stock * baseGrams : undefined;
  const presets = weightPresets(maxGrams);

  const isLowStock = product.stock > 0 && product.stock <= 5;

  const unitPrice = product.discountedPrice != null && product.discountedPrice < product.price
    ? product.discountedPrice
    : product.price;

  const lineTotal = isWeightBased && selectedGrams
    ? priceForWeight(unitPrice, baseGrams, selectedGrams)
    : unitPrice * qty;

  return (
    <div className="flex gap-4 p-3 bg-card rounded-2xl neu-card mb-3 items-center">
      <div className="w-16 h-16 rounded-xl bg-background neu-inset p-2 flex-shrink-0 relative">
        <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
        {selectedColor && (
          <span
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background shadow"
            style={{ backgroundColor: COLOR_HEX[selectedColor] ?? "#888" }}
            title={selectedColor}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm line-clamp-1">{product.name}</h4>

        {/* Weight badge for weight-based products */}
        {isWeightBased && selectedGrams ? (
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatWeight(selectedGrams)} · {formatWeight(baseGrams)} @ {formatINR(unitPrice)}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground mt-0.5">{product.unit}</div>
        )}

        {(selectedColor || selectedSize) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {selectedColor && (
              <span className="flex items-center gap-1 text-[10px] font-semibold bg-background neu-inset px-2 py-0.5 rounded-full">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block border border-border"
                  style={{ backgroundColor: COLOR_HEX[selectedColor] ?? "#888" }}
                />
                {selectedColor}
              </span>
            )}
            {selectedSize && (
              <span className="text-[10px] font-semibold bg-background neu-inset px-2 py-0.5 rounded-full">
                Size: {selectedSize}
              </span>
            )}
          </div>
        )}

        {isLowStock && (
          <div className="text-[10px] font-semibold text-amber-600 mt-0.5">
            Only {product.stock} left in stock
          </div>
        )}
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="font-bold text-primary">{formatINR(lineTotal)}</span>
          {product.discountedPrice != null && product.discountedPrice < product.price && !isWeightBased && (
            <span className="text-xs text-muted-foreground line-through">
              {formatINR(product.price * qty)}
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0">
        {isWeightBased && selectedGrams ? (
          <WeightStepper
            selectedGrams={selectedGrams}
            presets={presets}
            maxGrams={maxGrams}
            onChange={(grams) => updateWeight(key, grams)}
            size="sm"
          />
        ) : (
          <QuantityStepper
            qty={qty}
            maxQty={product.stock}
            onChange={(newQty) => updateQty(key, newQty)}
            size="sm"
          />
        )}
      </div>
    </div>
  );
}
