import React, { createContext, useState, useEffect } from "react";
import { CartItem, Product } from "@/types";
import { parseUnit, priceForWeight } from "@/lib/weightUtils";
import { api } from "@/lib/api";

export function weightVariantId(productId: string, grams: number): string {
  return `${productId}:weight:${grams}`;
}

export function cartKey(
  productId: string,
  color?: string | null,
  size?: string | null,
  grams?: number | null,
): string {
  return `${productId}::${color ?? ""}::${size ?? ""}::${grams ?? ""}`;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, qty?: number, selectedColor?: string, selectedSize?: string, selectedGrams?: number) => void;
  removeFromCart: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  updateWeight: (key: string, grams: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  productLimits: Record<string, number>;
}

export const CartContext = createContext<CartContextType | null>(null);

function itemPrice(item: CartItem): number {
  const p = item.product;
  const unitPrice = p.discountedPrice != null && p.discountedPrice < p.price
    ? p.discountedPrice
    : p.price;
  if (item.selectedGrams) {
    const parsed = parseUnit(p.unit);
    if (parsed.type === "weight") {
      return priceForWeight(unitPrice, parsed.baseGrams, item.selectedGrams) * item.qty;
    }
  }
  return unitPrice * item.qty;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("swiftmart_cart");
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved) as CartItem[];
      // Backfill the stable variant identifier for carts created before
      // variant IDs were persisted. This keeps old local carts usable.
      return parsed.map(item => (
        item.selectedGrams && !item.selectedVariantId
          ? { ...item, selectedVariantId: weightVariantId(item.product.id, item.selectedGrams) }
          : item
      ));
    } catch {
      return [];
    }
  });

  const [productLimits, setProductLimits] = useState<Record<string, number>>({});

  useEffect(() => {
    localStorage.setItem("swiftmart_cart", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    const updateLimits = (bucketsList: any[]) => {
      setProductLimits(prev => {
        const next = { ...prev };
        for (const bucket of bucketsList) {
          if (bucket.maxQtyPerCart != null && bucket.maxQtyPerCart > 0) {
            const productIds = (bucket.productIds || []) as string[];
            for (const pid of productIds) {
              if (next[pid] !== undefined) {
                next[pid] = Math.min(next[pid], bucket.maxQtyPerCart);
              } else {
                next[pid] = bucket.maxQtyPerCart;
              }
            }
          }
        }
        return next;
      });
    };

    api.get<{ success: boolean; buckets: any[] }>("/buckets")
      .then(res => {
        if (res.success && res.buckets) {
          updateLimits(res.buckets);
        }
      })
      .catch(() => {});

    api.get<{ success: boolean; buckets: any[] }>("/buckets/addons")
      .then(res => {
        if (res.success && res.buckets) {
          updateLimits(res.buckets);
        }
      })
      .catch(() => {});
  }, []);

  const addToCart = (
    product: Product,
    qty: number = 1,
    selectedColor?: string,
    selectedSize?: string,
    selectedGrams?: number,
  ) => {
    setItems(current => {
      const key = cartKey(product.id, selectedColor, selectedSize, selectedGrams);
      const existing = current.find(
        item => cartKey(item.product.id, item.selectedColor, item.selectedSize, item.selectedGrams) === key
      );
      const limit = productLimits[product.id];

      if (existing) {
        const newQty = existing.qty + qty;
        let capped = product.stock > 0 ? Math.min(newQty, product.stock) : newQty;
        if (limit !== undefined) {
          capped = Math.min(capped, limit);
        }
        return current.map(item =>
          cartKey(item.product.id, item.selectedColor, item.selectedSize, item.selectedGrams) === key
            ? { ...item, qty: capped }
            : item
        );
      }

      let initialQty = selectedGrams !== undefined ? 1 : Math.min(qty, product.stock > 0 ? product.stock : qty);
      if (limit !== undefined) {
        initialQty = Math.min(initialQty, limit);
      }

      return [
        ...current,
        {
          product,
          qty: initialQty,
          selectedColor,
          selectedSize,
          selectedGrams,
          selectedVariantId: selectedGrams !== undefined
            ? weightVariantId(product.id, selectedGrams)
            : undefined,
        },
      ];
    });
  };

  const removeFromCart = (key: string) => {
    setItems(current =>
      current.filter(item => cartKey(item.product.id, item.selectedColor, item.selectedSize, item.selectedGrams) !== key)
    );
  };

  const updateQty = (key: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(key);
      return;
    }
    setItems(current =>
      current.map(item => {
        if (cartKey(item.product.id, item.selectedColor, item.selectedSize, item.selectedGrams) !== key) return item;
        const stock = item.product.stock;
        let capped = stock > 0 ? Math.min(qty, stock) : qty;
        const limit = productLimits[item.product.id];
        if (limit !== undefined) {
          capped = Math.min(capped, limit);
        }
        return { ...item, qty: capped };
      })
    );
  };

  const updateWeight = (key: string, grams: number) => {
    if (grams <= 0) {
      removeFromCart(key);
      return;
    }
    setItems(current =>
      current.map(item =>
        cartKey(item.product.id, item.selectedColor, item.selectedSize, item.selectedGrams) === key
          ? {
              ...item,
              selectedGrams: grams,
              selectedVariantId: weightVariantId(item.product.id, grams),
            }
          : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.length;
  const subtotal = items.reduce((sum, item) => sum + itemPrice(item), 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQty, updateWeight, clearCart, totalItems, subtotal, productLimits }}>
      {children}
    </CartContext.Provider>
  );
}
