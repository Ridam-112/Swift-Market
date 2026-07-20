import React, { createContext, useState, useEffect, useCallback, useContext, useRef, useMemo } from "react";
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

// Refresh at most every 60 s in the background when the tab is visible.
const BG_INTERVAL_MS = 60_000;

export function ShopsProvider({ children }: { children: React.ReactNode }) {
  const auth = useContext(AuthContext);
  const authLoading = auth?.isLoading ?? true;
  const userId = auth?.user?.id ?? null;

  const [allShops, setAllShops] = useState<ShopListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track whether a request is already in-flight to avoid concurrent fetches.
  const inFlight = useRef(false);
  const lastFetchedAt = useRef(0);
  // undefined = auth hasn't resolved yet (first resolution), string|null = known userId
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  const fetchShops = useCallback((showLoading = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (showLoading) setIsLoading(true);
    setError(null);
    api.get<{ success: boolean; shops: ApiShopItem[] }>("/shops?status=approved&limit=100")
      .then(d => {
        setAllShops(d.shops.map(mapApiShop));
        lastFetchedAt.current = Date.now();
      })
      .catch(err => {
        const msg = err instanceof Error ? err.message : "Failed to load shops";
        setError(msg.includes("buffering") ? "Database connecting…" : msg);
      })
      .finally(() => {
        inFlight.current = false;
        if (showLoading) setIsLoading(false);
      });
  }, []);

  // Fetch on mount immediately.
  useEffect(() => {
    fetchShops(true);
  }, [fetchShops]);

  // Refetch when the logged-in user changes (login / logout).
  // On first auth resolution, skip if the mount fetch already ran within 10 s
  // (prevents the double-fetch: mount fires immediately, then auth resolves ~200 ms later).
  useEffect(() => {
    if (authLoading) return;
    const isFirstResolution = prevUserIdRef.current === undefined;
    const userChanged = prevUserIdRef.current !== userId;
    prevUserIdRef.current = userId;
    if (isFirstResolution) {
      if (Date.now() - lastFetchedAt.current < 10_000) return; // mount already fetched
    } else if (!userChanged) {
      return; // spurious re-render — userId unchanged
    }
    fetchShops(false);
  }, [userId, authLoading, fetchShops]);

  // Background safety interval — only fires when the tab is visible.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchShops(false);
      }
    }, BG_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchShops]);

  // Refetch when the user switches back to this tab after being away.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        // Only refetch if data is stale (older than 30 s).
        if (Date.now() - lastFetchedAt.current > 30_000) {
          fetchShops(false);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchShops]);

  const getShopById = (id: string) => allShops.find(s => s.id === id);

  return (
    <ShopsContext.Provider value={{ shops: allShops, allShops, isLoading, error, refetch: fetchShops, getShopById }}>
      {children}
    </ShopsContext.Provider>
  );
}
