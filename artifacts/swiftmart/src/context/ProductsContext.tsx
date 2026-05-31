import React, { createContext, useState, useEffect } from "react";
import { Product } from "@/types";
import { api } from "@/lib/api";

interface ProductsContextType {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  refetch: () => void;
}

interface ApiProduct {
  _id: string;
  name: string;
  category: string;
  price: number;
  unit?: string;
  image?: string;
  description?: string;
  stock?: number;
  rating?: number;
  shopId?: string;
  trending?: boolean;
  status?: string;
}

function mapApiProduct(p: ApiProduct): Product {
  return {
    id: p._id,
    name: p.name,
    category: p.category as Product['category'],
    price: p.price,
    unit: p.unit ?? "1 unit",
    image: p.image ?? "/assets/product-placeholder.png",
    description: p.description ?? "",
    stock: p.stock ?? 0,
    rating: p.rating ?? 0,
    vendorId: p.shopId ?? "",
    trending: p.trending ?? false,
  };
}

export const ProductsContext = createContext<ProductsContextType | null>(null);

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = () => {
    setIsLoading(true);
    setError(null);
    api.get<{ success: boolean; products: ApiProduct[] }>("/products?limit=100")
      .then(d => {
        setProducts(d.products.map(mapApiProduct));
      })
      .catch(err => {
        const msg = err instanceof Error ? err.message : "Failed to load products";
        setError(msg.includes("buffering") ? "Database connecting…" : msg);
        setProducts([]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addProduct = (product: Product) => {
    setProducts(prev => [product, ...prev]);
    api.post("/products", {
      name: product.name,
      category: product.category,
      price: product.price,
      unit: product.unit,
      image: product.image,
      description: product.description,
      stock: product.stock,
      shopId: product.vendorId,
    }).then(() => fetchProducts()).catch(() => {});
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    api.patch(`/products/${id}`, updates).catch(() => {});
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    api.delete(`/products/${id}`).catch(() => {});
  };

  return (
    <ProductsContext.Provider value={{ products, isLoading, error, addProduct, updateProduct, deleteProduct, refetch: fetchProducts }}>
      {children}
    </ProductsContext.Provider>
  );
}
