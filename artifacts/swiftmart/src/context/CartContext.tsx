import React, { createContext, useState, useEffect } from "react";
import { CartItem, Product } from "@/types";

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

export const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("swiftmart_cart");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("swiftmart_cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, qty: number = 1) => {
    setItems(current => {
      const existing = current.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = existing.qty + qty;
        const capped = product.stock > 0 ? Math.min(newQty, product.stock) : newQty;
        return current.map(item =>
          item.product.id === product.id ? { ...item, qty: capped } : item
        );
      }
      return [...current, { product, qty: Math.min(qty, product.stock > 0 ? product.stock : qty) }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(current => current.filter(item => item.product.id !== productId));
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems(current => current.map(item => {
      if (item.product.id !== productId) return item;
      const stock = item.product.stock;
      const capped = stock > 0 ? Math.min(qty, stock) : qty;
      return { ...item, qty: capped };
    }));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.qty), 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQty, clearCart, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}
