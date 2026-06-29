import { Product } from "@/types";
import { Link, useLocation } from "wouter";
import { formatINR } from "@/lib/currency";
import { QuantityStepper } from "./QuantityStepper";
import { useCart } from "@/hooks/useCart";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import { categories } from "@/data/categories";
import { cartKey } from "@/context/CartContext";
import { Store } from "lucide-react";

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { items, addToCart, updateQty } = useCart();
  const [, navigate] = useLocation();

  const hasVariants = (product.colors?.length ?? 0) > 0 || (product.sizes?.length ?? 0) > 0;

  // For variant products, sum qty across all variants for display
  const totalQtyInCart = hasVariants
    ? items.filter(item => item.product.id === product.id).reduce((s, i) => s + i.qty, 0)
    : (items.find(item => item.product.id === product.id)?.qty ?? 0);

  const simpleKey = cartKey(product.id, undefined, undefined);

  const category = categories.find(c => c.id === product.category);
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleAdd = () => {
    if (hasVariants) {
      navigate(`/product/${product.id}`);
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
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
          className={`w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? "opacity-40" : ""}`}
        />
        {product.discountedPrice && product.discountedPrice < product.price && !isOutOfStock && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {Math.round((1 - product.discountedPrice / product.price) * 100)}% off
          </div>
        )}
        {product.trending && !isOutOfStock && !(product.discountedPrice && product.discountedPrice < product.price) && (
          <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
            Trending
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-background/90 text-foreground text-[10px] font-bold px-2 py-1 rounded-full border border-border">
              Out of Stock
            </span>
          </div>
        )}
        {isLowStock && (
          <div className="absolute top-2 left-2 bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
            Only {product.stock} left
          </div>
        )}
      </Link>

      <div className="flex-1 flex flex-col">
        <div className="text-xs text-muted-foreground mb-1 font-medium bg-background/50 w-max px-2 py-0.5 rounded-md neu-inset">
          {product.unit}
        </div>
        <Link href={`/product/${product.id}`} className="font-semibold text-sm text-foreground line-clamp-2 leading-tight mb-1 hover:text-primary transition-colors cursor-pointer">
          {product.name}
        </Link>
        {product.shopName && (
          <Link href={`/shop/${product.shopId}`} className="flex items-center gap-1 mb-1.5 w-max max-w-full">
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
          </div>
        )}

        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            <div className="font-bold text-base text-primary">
              {formatINR(product.discountedPrice && product.discountedPrice < product.price ? product.discountedPrice : product.price)}
            </div>
            {product.discountedPrice && product.discountedPrice < product.price && (
              <div className="text-[11px] text-muted-foreground line-through leading-tight">
                {formatINR(product.price)}
              </div>
            )}
          </div>
          <div className="z-10">
            {isOutOfStock ? (
              <span className="text-[10px] font-semibold text-muted-foreground">Unavailable</span>
            ) : totalQtyInCart > 0 ? (
              hasVariants ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full font-bold shadow-none px-3 h-8 text-[11px]"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {totalQtyInCart} in cart
                </Button>
              ) : (
                <QuantityStepper
                  qty={totalQtyInCart}
                  maxQty={product.stock}
                  onChange={handleStepperChange}
                  size="sm"
                />
              )
            ) : (
              <Button
                size="sm"
                className="rounded-full font-bold shadow-none neu-card px-4 h-8"
                onClick={handleAdd}
              >
                {hasVariants ? "OPTIONS" : "ADD"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
