import { Product } from "@/types";
import { Link } from "wouter";
import { formatINR } from "@/lib/currency";
import { QuantityStepper } from "./QuantityStepper";
import { useCart } from "@/hooks/useCart";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import { categories } from "@/data/categories";

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { items, addToCart, updateQty } = useCart();
  
  const cartItem = items.find(item => item.product.id === product.id);
  const qty = cartItem?.qty || 0;
  const category = categories.find(c => c.id === product.category);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="bg-card rounded-2xl p-3 flex flex-col gap-3 neu-card relative overflow-hidden group"
    >
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity duration-300"
        style={{ background: `linear-gradient(135deg, ${category?.color || 'var(--primary)'}, transparent)` }}
      />
      
      <Link href={`/product/${product.id}`} className="relative aspect-square rounded-xl overflow-hidden bg-background neu-inset flex items-center justify-center p-2 cursor-pointer">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
        />
        {product.trending && (
          <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
            Trending
          </div>
        )}
      </Link>

      <div className="flex-1 flex flex-col">
        <div className="text-xs text-muted-foreground mb-1 font-medium bg-background/50 w-max px-2 py-0.5 rounded-md neu-inset">
          {product.unit}
        </div>
        <Link href={`/product/${product.id}`} className="font-semibold text-sm text-foreground line-clamp-2 leading-tight mb-2 hover:text-primary transition-colors cursor-pointer">
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between">
          <div className="font-bold text-base text-primary">
            {formatINR(product.price)}
          </div>
          <div className="z-10">
            {qty > 0 ? (
              <QuantityStepper 
                qty={qty} 
                onChange={(newQty) => updateQty(product.id, newQty)} 
                size="sm"
              />
            ) : (
              <Button 
                size="sm" 
                className="rounded-full font-bold shadow-none neu-card px-4 h-8"
                onClick={() => addToCart(product)}
              >
                ADD
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
