import React, { createContext, useState, useEffect } from "react";
import { CartItem, Product } from "@/types";
import { parseUnit, priceForWeight } from "@/lib/weightUtils";

export function cartKey(productId: string, color?: string | null, size?: string | null): string {
  return `${productId}::${color ?? ""}::${size ?? ""}`;
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
      return priceForWeight(unitPrice, parsed.baseGrams, item.selectedGrams);
    }
  }
  return unitPrice * item.qty;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("swiftmart_cart");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("swiftmart_cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (
    product: Product,
    qty: number = 1,
    selectedColor?: string,
    selectedSize?: string,
    selectedGrams?: number,
  ) => {
    setItems(current => {
      const key = cartKey(product.id, selectedColor, selectedSize);
      const existing = current.find(
        item => cartKey(item.product.id, item.selectedColor, item.selectedSize) === key
      );
      if (existing) {
        if (selectedGrams !== undefined) {
          return current.map(item =>
            cartKey(item.product.id, item.selectedColor, item.selectedSize) === key
              ? { ...item, selectedGrams }
              : item
          );
        }
        const newQty = existing.qty + qty;
        const capped = product.stock > 0 ? Math.min(newQty, product.stock) : newQty;
        return current.map(item =>
          cartKey(item.product.id, item.selectedColor, item.selectedSize) === key
            ? { ...item, qty: capped }
            : item
        );
      }
      return [
        ...current,
        {
          product,
          qty: selectedGrams !== undefined ? 1 : Math.min(qty, product.stock > 0 ? product.stock : qty),
          selectedColor,
          selectedSize,
          selectedGrams,
        },
      ];
    });
  };

  const removeFromCart = (key: string) => {
    setItems(current =>
      current.filter(item => cartKey(item.product.id, item.selectedColor, item.selectedSize) !== key)
    );
  };

  const updateQty = (key: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(key);
      return;
    }
    setItems(current =>
      current.map(item => {
        if (cartKey(item.product.id, item.selectedColor, item.selectedSize) !== key) return item;
        const stock = item.product.stock;
        const capped = stock > 0 ? Math.min(qty, stock) : qty;
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
        cartKey(item.product.id, item.selectedColor, item.selectedSize) === key
          ? { ...item, selectedGrams: grams }
          : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.length;
  const subtotal = items.reduce((sum, item) => sum + itemPrice(item), 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQty, updateWeight, clearCart, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}
