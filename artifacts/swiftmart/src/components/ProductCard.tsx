import { Product } from "@/types";
import { Link, useLocation } from "wouter";
import { formatINR } from "@/lib/currency";
import { QuantityStepper } from "./QuantityStepper";
import { WeightStepper } from "./WeightStepper";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useShops } from "@/hooks/useShops";
import { getDeliveryEtaForShop, isFoodCategory } from "@/lib/deliveryEta";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import { categories } from "@/data/categories";
import { cartKey } from "@/context/CartContext";
import { Store } from "lucide-react";
import { parseUnit, weightPresets, priceForWeight, formatWeight, isProductWeightBased } from "@/lib/weightUtils";
import { getShopUrl } from "@/lib/shopUrl";

interface ProductCardProps {
  product: Product;
  index?: number;
  maxQtyPerCart?: number | null;
  isMall?: boolean;
  forceEta?: string;
}

export function ProductCard({ product, index = 0, maxQtyPerCart, isMall = false, forceEta }: ProductCardProps) {
  const { user, selectedDeliveryAddress, openLoginModal } = useAuth();
  const { getShopById } = useShops();
  const { items, addToCart, updateQty, updateWeight, productLimits } = useCart();
  const [, navigate] = useLocation();

  const shopObj = (product.shopId || product.vendorId) ? getShopById(product.shopId || product.vendorId) : undefined;
  const customerCity = selectedDeliveryAddress?.city || "Balurghat";
  const shopCity = (product as any).shopCity || (product as any).city || shopObj?.city || "Balurghat";

  const hasCustomVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const hasVariants = (product.colors?.length ?? 0) > 0 || (product.sizes?.length ?? 0) > 0 || hasCustomVariants;
  const unitInfo = parseUnit(product.unit);
  const isWeightBased = isProductWeightBased(product);

  const cartItem = items.find(item => item?.product?.id === product.id && !item.selectedColor && !item.selectedSize);
  const simpleKey = cartKey(product.id, undefined, undefined, cartItem?.selectedGrams, cartItem?.selectedVariantId);

  // For variant products, sum qty across all variants for display
  const totalQtyInCart = hasVariants
    ? items.filter(item => item?.product?.id === product.id).reduce((s, i) => s + (i.qty || 0), 0)
    : (cartItem?.qty ?? 0);

  const category = categories.find(c => c.id === product.category);
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const resolvedMaxQtyPerCart = maxQtyPerCart ?? (product.id ? productLimits[product.id] : undefined);
  // Bucket offer limit: cap how many can be added to cart
  const effectiveMaxQty: number | undefined = resolvedMaxQtyPerCart != null
    ? (product.stock > 0 ? Math.min(resolvedMaxQtyPerCart, product.stock) : resolvedMaxQtyPerCart)
    : (product.stock > 0 ? product.stock : undefined);
  const atBucketLimit = resolvedMaxQtyPerCart != null && totalQtyInCart >= resolvedMaxQtyPerCart;

  // Weight-based helpers
  const baseGrams = isWeightBased && unitInfo.type === "weight" ? unitInfo.baseGrams : 1000;
  const maxGrams = product.stock > 0 ? product.stock * baseGrams : undefined;
  const presets = weightPresets(maxGrams, product.weightPresets);
  const selectedGrams = cartItem?.selectedGrams;
  const weightInCart = isWeightBased && selectedGrams != null && selectedGrams > 0;

  const lowestVariantPrice = hasCustomVariants
    ? Math.min(
        ...product.variants!
          .filter(v => v && typeof v === "object" && typeof (v.discountedPrice ?? v.price) === "number")
          .map(v => (v.discountedPrice && v.discountedPrice < v.price ? v.discountedPrice : v.price))
      )
    : null;

  const effectivePrice = (lowestVariantPrice != null && isFinite(lowestVariantPrice))
    ? lowestVariantPrice
    : (product.discountedPrice && product.discountedPrice < product.price
        ? product.discountedPrice
        : product.price);

  const displayPrice = isWeightBased && weightInCart && selectedGrams
    ? priceForWeight(effectivePrice, baseGrams, selectedGrams)
    : effectivePrice;

  const isCustomCake = Boolean(
    (product as any)?.isCustomizable ||
    (product as any)?.customCake ||
    (typeof product?.id === "string" && product.id.startsWith("custom_cake_"))
  );

  const isHeavyItem = Boolean(
    (product as any)?.deliveryType === "heavy_1_3d" ||
    (product as any)?.isHeavy === true ||
    ((product as any)?.deliveryDays || 0) > 0 ||
    /\b(25\s?kg|50\s?kg|sack|almirah|refrigerator|fridge|washing machine|cooler|wardrobe|bed|sofa|cylinder|mattress)\b/i.test(
      `${product.name || ""} ${product.unit || ""} ${product.description || ""}`
    )
  );

  const handleAdd = () => {
    if (isCustomCake) {
      if (product.shopId) {
        navigate(getShopUrl({ id: product.shopId, shopName: product.shopName }));
      } else {
        navigate('/shops');
      }
    } else if (hasVariants) {
      navigate(`/product/${product.id}`);
    } else if (isWeightBased) {
      const defaultGrams = presets[1] ?? presets[0]; // default to 250g or smallest
      addToCart(product, 1, undefined, undefined, defaultGrams);
    } else {
      addToCart(product);
    }
  };

  const handleStepperChange = (newQty: number) => {
    if (hasVariants) {
      navigate(`/product/${product.id}`);
    } else {
      updateQty(simpleKey, newQty);
    }
  };

  const handleWeightChange = (grams: number) => {
    updateWeight(simpleKey, grams);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.12), duration: 0.2 }}
      className="bg-card rounded-2xl p-2.5 flex flex-col gap-2 neu-card relative overflow-hidden group w-full min-w-0"
    >
      <div
        className="absolute inset-0 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity duration-300"
        style={{ background: `linear-gradient(135deg, ${category?.color || 'var(--primary)'}, transparent)` }}
      />

      <Link href={`/product/${product.id}`} className="relative aspect-square rounded-xl overflow-hidden bg-background neu-inset flex items-center justify-center p-2 cursor-pointer">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={200}
          height={200}
          className={`w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? "opacity-40" : ""}`}
        />
        {product.price > 0 && product.discountedPrice && product.discountedPrice < product.price && !isOutOfStock && (
          <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
            {Math.round((1 - product.discountedPrice / product.price) * 100)}% off
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-2xs flex items-center justify-center">
            <span className="bg-background text-foreground text-[10px] font-bold px-2.5 py-1 rounded-full border border-border shadow-xs">
              Out of Stock
            </span>
          </div>
        )}
        {!isOutOfStock && isLowStock && !(product.discountedPrice && product.discountedPrice < product.price) && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
            Only {product.stock} left
          </div>
        )}
      </Link>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          {product.unit && (
            <span className="text-[10px] text-muted-foreground font-medium bg-background/50 px-1.5 py-0.5 rounded-md neu-inset">
              {product.unit}
            </span>
          )}
          {(() => {
            const isFood = isFoodCategory(product.category, shopObj?.category);
            const isBakery = (product.category || "").toLowerCase().includes("bakery") || (product.category || "").toLowerCase().includes("cake") || isCustomCake;
            const eta = getDeliveryEtaForShop(customerCity, shopCity, {
              isFood,
              isBakery,
              isHeavy: isHeavyItem,
              isMall: isMall,
              category: product.category,
            });

            return (
              <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded-md ${eta.color}`}>
                {eta.icon} {forceEta || eta.badge}
              </span>
            );
          })()}
        </div>
        <Link href={`/product/${product.id}`} className="font-semibold text-sm text-foreground line-clamp-2 leading-tight mb-1 hover:text-primary transition-colors cursor-pointer">
          {product.name}
        </Link>
        {product.shopName && (
          <Link href={getShopUrl({ id: product.shopId, shopName: product.shopName })} className="flex items-center gap-1 mb-1.5 w-max max-w-full">
            <Store className="w-2.5 h-2.5 text-primary shrink-0" />
            <span className="text-[10px] text-primary font-medium truncate hover:underline">
              {product.shopName}
            </span>
          </Link>
        )}

        {hasVariants && (
          <div className="flex gap-1 flex-wrap mb-1">
            {product.colors?.slice(0, 3).map(c => (
              <span
                key={c}
                className="w-3 h-3 rounded-full border border-border inline-block"
                style={{ backgroundColor: { Red: "#ef4444", Blue: "#3b82f6", Green: "#22c55e", Yellow: "#eab308", Black: "#1a1a1a", White: "#f3f4f6", Pink: "#ec4899", Purple: "#a855f7", Orange: "#f97316", Navy: "#1e3a5f", Gray: "#6b7280", Grey: "#6b7280", Brown: "#92400e", Maroon: "#800000" }[c] ?? "#888" }}
                title={c}
              />
            ))}
            {(product.colors?.length ?? 0) > 3 && (
              <span className="text-[9px] text-muted-foreground">+{(product.colors?.length ?? 0) - 3}</span>
            )}
            {product.sizes?.slice(0, 3).map(s => (
              <span key={s} className="text-[9px] font-bold bg-background/50 px-1 rounded neu-inset">{s}</span>
            ))}
            {hasCustomVariants && (
              <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                {product.variants!.length} {product.variants!.length === 1 ? "Option" : "Options"}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-1">
          <div className="flex flex-col min-w-0">
            <div className="font-bold text-base text-primary flex items-baseline gap-1">
              {hasCustomVariants && <span className="text-[11px] text-muted-foreground font-normal">From</span>}
              <span>{formatINR(displayPrice)}</span>
            </div>
            {/* Show "per kg" label or original MRP if discounted */}
            {isWeightBased && weightInCart && selectedGrams ? (
              <div className="text-[10px] text-muted-foreground leading-tight">
                {formatWeight(selectedGrams)} · {formatINR(effectivePrice)}/{formatWeight(baseGrams)}
              </div>
            ) : product.discountedPrice && product.discountedPrice < product.price ? (
              <div className="text-[11px] text-muted-foreground line-through leading-tight">
                {formatINR(product.price)}
              </div>
            ) : null}
          </div>
          <div className="z-10 shrink-0">
            {isOutOfStock ? (
              <Button
                size="sm"
                disabled
                className="rounded-full font-bold shadow-none opacity-50 cursor-not-allowed px-3 h-8 text-[11px] bg-muted text-muted-foreground"
              >
                Out of Stock
              </Button>
            ) : isCustomCake ? (
              <Button
                size="sm"
                className="rounded-full font-bold shadow-none bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 px-3 h-8 text-[11px]"
                onClick={handleAdd}
              >
                CUSTOMIZE 🎂
              </Button>
            ) : hasVariants ? (
              totalQtyInCart > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full font-bold shadow-none px-3 h-8 text-[11px]"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {totalQtyInCart} in cart
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="rounded-full font-bold shadow-none neu-card px-4 h-8"
                  onClick={handleAdd}
                >
                  OPTIONS
                </Button>
              )
            ) : isWeightBased ? (
              weightInCart && selectedGrams ? (
                <WeightStepper
                  selectedGrams={selectedGrams}
                  presets={presets}
                  maxGrams={maxGrams}
                  onChange={handleWeightChange}
                  size="sm"
                />
              ) : (
                <Button
                  size="sm"
                  className="rounded-full font-bold shadow-none neu-card px-4 h-8"
                  onClick={handleAdd}
                >
                  ADD
                </Button>
              )
            ) : (
              totalQtyInCart > 0 ? (
                atBucketLimit ? (
                  <div className="flex items-center gap-1">
                    <QuantityStepper
                      qty={totalQtyInCart}
                      maxQty={effectiveMaxQty}
                      onChange={handleStepperChange}
                      size="sm"
                    />
                  </div>
                ) : (
                  <QuantityStepper
                    qty={totalQtyInCart}
                    maxQty={effectiveMaxQty}
                    onChange={handleStepperChange}
                    size="sm"
                  />
                )
              ) : atBucketLimit ? (
                <span className="text-[10px] font-semibold text-muted-foreground px-2">Added ✓</span>
              ) : (
                <Button
                  size="sm"
                  className="rounded-full font-bold shadow-none neu-card px-4 h-8"
                  onClick={handleAdd}
                >
                  ADD
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
