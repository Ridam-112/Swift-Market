import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from "react";
import { Product } from "@/types";
import { api } from "@/lib/api";
import { AuthContext } from "@/context/AuthContext";

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
  discountedPrice?: number;
  unit?: string;
  image?: string;
  images?: string[];
  description?: string;
  stock?: number;
  rating?: number;
  shopId?: string;
  trending?: boolean;
  status?: string;
  colors?: string[];
  sizes?: string[];
  colorImages?: Record<string, string>;
  shopName?: string;
}

function mapApiProduct(p: ApiProduct): Product {
  return {
    id: p._id,
    name: p.name,
    category: p.category as Product['category'],
    price: p.price,
    discountedPrice: p.discountedPrice ?? undefined,
    unit: p.unit ?? "1 unit",
    image: p.images?.[0] ?? p.image ?? "/assets/product-placeholder.png",
    images: p.images ?? (p.image ? [p.image] : []),
    description: p.description ?? "",
    stock: p.stock ?? 0,
    rating: p.rating ?? 0,
    vendorId: p.shopId ?? "",
    shopId: p.shopId ?? "",
    shopName: p.shopName,
    trending: p.trending ?? false,
    colors: p.colors,
    sizes: p.sizes,
    colorImages: p.colorImages,
  };
}

export const ProductsContext = createContext<ProductsContextType | null>(null);

// Refresh at most every 60 s in the background when the tab is visible.
// A forced refetch (e.g. after adding a product) bypasses this gate.
const BG_INTERVAL_MS = 60_000;

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const auth = useContext(AuthContext);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authLoading = auth?.isLoading ?? true;
  const userId = auth?.user?.id ?? null;

  // Track whether a request is already in-flight to avoid concurrent fetches.
  const inFlight = useRef(false);
  const lastFetchedAt = useRef(0);

  const fetchProducts = useCallback((showLoading = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (showLoading) setIsLoading(true);
    setError(null);
    api.get<{ success: boolean; products: ApiProduct[] }>(`/products?limit=200`)
      .then(d => {
        setProducts(d.products.map(mapApiProduct));
        lastFetchedAt.current = Date.now();
      })
      .catch(err => {
        const msg = err instanceof Error ? err.message : "Failed to load products";
        setError(msg.includes("buffering") ? "Database connecting…" : msg);
      })
      .finally(() => {
        inFlight.current = false;
        if (showLoading) setIsLoading(false);
      });
  }, []);

  // Fetch on mount immediately.
  useEffect(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  // Refetch when the logged-in user changes (login / logout).
  useEffect(() => {
    if (authLoading) return;
    fetchProducts(false);
  }, [userId, authLoading, fetchProducts]);

  // Background safety interval — only fires when the tab is visible.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchProducts(false);
      }
    }, BG_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  // Refetch when the user switches back to this tab after being away.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        // Only refetch if data is stale (older than 30 s).
        if (Date.now() - lastFetchedAt.current > 30_000) {
          fetchProducts(false);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchProducts]);

  const addProduct = (product: Product) => {
    setProducts(prev => [product, ...prev]);
    api.post("/products", {
      name: product.name,
      category: product.category,
      price: product.price,
      unit: product.unit,
      images: product.image ? [product.image] : [],
      description: product.description,
      stock: product.stock,
      shopId: product.vendorId,
    }).then(() => fetchProducts()).catch(() => {});
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    const apiUpdates: Record<string, unknown> = { ...updates };
    if (updates.image !== undefined) {
      apiUpdates['images'] = [updates.image];
      delete apiUpdates['image'];
    }
    api.patch(`/products/${id}`, apiUpdates).catch((err: unknown) => {
      console.error("[ProductsContext] updateProduct failed for", id, err);
    });
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    api.delete(`/products/${id}`).catch((err: unknown) => {
      console.error("[ProductsContext] deleteProduct failed for", id, err);
    });
  };

  return (
    <ProductsContext.Provider value={{ products, isLoading, error, addProduct, updateProduct, deleteProduct, refetch: () => fetchProducts() }}>
      {children}
    </ProductsContext.Provider>
  );
}
