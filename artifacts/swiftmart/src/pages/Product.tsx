import { useState } from "react";
import { useRoute } from "wouter";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { formatINR } from "@/lib/currency";
import { QuantityStepper } from "@/components/QuantityStepper";
import { Button } from "@/components/ui/button";
import { Star, ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { ProductGrid } from "@/components/ProductGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { categories } from "@/data/categories";

export default function Product() {
  const [, params] = useRoute("/product/:id");
  const id = params?.id;
  const { products } = useProducts();
  const { items, addToCart, updateQty } = useCart();

  const product = products.find(p => p.id === id);
  const cartItem = items.find(item => item.product.id === id);
  const qty = cartItem?.qty || 0;

  if (!product) return <div className="p-8 text-center">Product not found</div>;

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const category = categories.find(c => c.id === product.category);
  const relatedProducts = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);

  return (
    <div className="pb-24 pt-4 px-4 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Image Gallery */}
        <div className="w-full md:w-1/2 aspect-square rounded-3xl bg-card neu-card p-8 flex items-center justify-center relative overflow-hidden group">
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ background: `linear-gradient(135deg, ${category?.color || 'var(--primary)'}, transparent)` }}
          />
          <img src={product.image} alt={product.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
        </div>

        {/* Details */}
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="text-sm font-medium text-muted-foreground mb-2">{category?.name}</div>
          <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-2">{product.name}</h1>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1 bg-background neu-inset px-2 py-1 rounded-md text-sm font-bold">
              <Star className="w-4 h-4 text-primary fill-primary" />
              {product.rating}
            </div>
            <div className="text-muted-foreground text-sm font-medium bg-background neu-inset px-2 py-1 rounded-md">
              {product.unit}
            </div>
          </div>

          <div className="text-3xl font-bold text-primary mb-6">
            {formatINR(product.price)}
          </div>

          <div className="mb-8">
            <h3 className="font-bold mb-2">Description</h3>
            <p className="text-muted-foreground leading-relaxed">
              {product.description || "Premium quality product guaranteed by SwiftMart."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-card neu-card p-3 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-background neu-inset flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="text-sm font-medium leading-tight">10 MIN<br/>DELIVERY</div>
            </div>
            <div className="bg-card neu-card p-3 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-background neu-inset flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div className="text-sm font-medium leading-tight">QUALITY<br/>ASSURED</div>
            </div>
          </div>

          {isLowStock && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Only {product.stock} left in stock — order soon!
              </span>
            </div>
          )}

          <div className="mt-auto">
            {isOutOfStock ? (
              <Button
                size="lg"
                disabled
                className="w-full md:w-auto rounded-full text-lg font-bold shadow-none h-14 px-12 opacity-50 cursor-not-allowed"
              >
                Out of Stock
              </Button>
            ) : qty > 0 ? (
              <div className="flex items-center gap-4">
                <QuantityStepper qty={qty} maxQty={product.stock} onChange={(newQty) => updateQty(product.id, newQty)} />
                <div className="text-sm text-muted-foreground font-medium">Added to cart</div>
              </div>
            ) : (
              <Button 
                size="lg" 
                className="w-full md:w-auto rounded-full text-lg font-bold shadow-none neu-card h-14 px-12"
                onClick={() => addToCart(product)}
              >
                Add to Cart
              </Button>
            )}
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="pt-8">
          <SectionHeader title="Similar Products" />
          <ProductGrid products={relatedProducts} />
        </section>
      )}
    </div>
  );
}
