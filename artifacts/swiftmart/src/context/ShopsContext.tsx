import React, { createContext, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

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
    eta: "20 mins",
  };
}

interface ShopsContextType {
  shops: ShopListing[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  getShopById: (id: string) => ShopListing | undefined;
}

export const ShopsContext = createContext<ShopsContextType | null>(null);

export function ShopsProvider({ children }: { children: React.ReactNode }) {
  const [shops, setShops] = useState<ShopListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShops = useCallback(() => {
    setIsLoading(true);
    setError(null);
    api.get<{ success: boolean; shops: ApiShopItem[] }>("/shops?status=approved&limit=50")
      .then(d => {
        setShops(d.shops.map(mapApiShop));
      })
      .catch(err => {
        const msg = err instanceof Error ? err.message : "Failed to load shops";
        setError(msg.includes("buffering") ? "Database connecting…" : msg);
        setShops([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  const getShopById = (id: string) => shops.find(s => s.id === id);

  return (
    <ShopsContext.Provider value={{ shops, isLoading, error, refetch: fetchShops, getShopById }}>
      {children}
    </ShopsContext.Provider>
  );
}
