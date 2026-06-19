import React, { createContext, useState, useEffect, useCallback, useContext } from "react";
import { api } from "@/lib/api";
import { AuthContext } from "@/context/AuthContext";

export interface ShopListing {
  id: string;
  storeName: string;
  ownerName: string;
  category: string;
  city: string;
  pincode: string;
  phone: string;
  isOpen: boolean;
  rating: number;
  totalOrders: number;
  totalRevenue: number;
  commissionRate: number;
  image: string;
  status: string;
  eta: string;
}

interface ApiShopItem {
  _id: string;
  shopName: string;
  ownerName: string;
  shopType: string;
  address?: { city?: string; pincode?: string };
  phone: string;
  isOpen: boolean;
  rating: number;
  totalOrders: number;
  totalRevenue: number;
  commissionRate?: number;
  image?: string;
  status: string;
  eta?: string;
}

export function mapApiShop(s: ApiShopItem): ShopListing {
  return {
    id: s._id,
    storeName: s.shopName,
    ownerName: s.ownerName,
    category: s.shopType,
    city: s.address?.city ?? "",
    pincode: s.address?.pincode ?? "",
    phone: s.phone,
    isOpen: s.isOpen ?? false,
    rating: s.rating ?? 0,
    totalOrders: s.totalOrders ?? 0,
    totalRevenue: s.totalRevenue ?? 0,
    commissionRate: s.commissionRate ?? 5,
    image: s.image || `/assets/cat-${s.shopType}.png`,
    status: s.status,
    eta: s.eta ?? "",
  };
}

interface ShopsContextType {
  shops: ShopListing[];
  allShops: ShopListing[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  getShopById: (id: string) => ShopListing | undefined;
}

export const ShopsContext = createContext<ShopsContextType | null>(null);

export function ShopsProvider({ children }: { children: React.ReactNode }) {
  const auth = useContext(AuthContext);
  const authLoading = auth?.isLoading ?? true;
  const userId = auth?.user?.id ?? null;

  const [allShops, setAllShops] = useState<ShopListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShops = useCallback((showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    api.get<{ success: boolean; shops: ApiShopItem[] }>("/shops?status=approved&limit=100")
      .then(d => {
        setAllShops(d.shops.map(mapApiShop));
      })
      .catch(err => {
        const msg = err instanceof Error ? err.message : "Failed to load shops";
        setError(msg.includes("buffering") ? "Database connecting…" : msg);
      })
      .finally(() => { if (showLoading) setIsLoading(false); });
  }, []);

  // Shops are public — fetch immediately on mount without waiting for auth.
  // This prevents a blank page while auth resolves on fresh PWA installs.
  useEffect(() => {
    fetchShops(true);
    const interval = setInterval(() => fetchShops(false), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Silently refetch when the logged-in user changes (login / logout)
  // so personalised fields stay fresh without re-showing the skeleton.
  useEffect(() => {
    if (authLoading) return;
    fetchShops(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const getShopById = (id: string) => allShops.find(s => s.id === id);

  return (
    <ShopsContext.Provider value={{ shops: allShops, allShops, isLoading, error, refetch: fetchShops, getShopById }}>
      {children}
    </ShopsContext.Provider>
  );
}
