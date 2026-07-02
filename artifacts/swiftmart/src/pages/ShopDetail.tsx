import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { ShopListing, mapApiShop } from "@/context/ShopsContext";
import { useShops } from "@/hooks/useShops";
import { useProducts } from "@/hooks/useProducts";
import { ProductGrid } from "@/components/ProductGrid";
import { EmptyState } from "@/components/EmptyState";
import { ArrowLeft, Star, Clock, MapPin, PackageOpen, Store, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

interface ApiShopDetail {
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

export default function ShopDetail() {
  const [, params] = useRoute("/shop/:vendorId");
  const vendorId = params?.vendorId;
  const { shops, isLoading: shopsLoading } = useShops();
  const { products } = useProducts();

  const [shop, setShop] = useState<ShopListing | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!vendorId) return;

    const found = shops.find(s => s.id === vendorId);
    if (found) {
      setShop(found);
      setNotFound(false);
      return;
    }

    if (!shopsLoading) {
      setFetchLoading(true);
      api.get<{ success: boolean; shop: ApiShopDetail }>(`/shops/${vendorId}`)
        .then(d => {
          if (d.success && d.shop) {
            setShop(mapApiShop(d.shop as Parameters<typeof mapApiShop>[0]));
            setNotFound(false);
          } else {
            setNotFound(true);
          }
        })
        .catch(() => setNotFound(true))
        .finally(() => setFetchLoading(false));
    }
  }, [vendorId, shops, shopsLoading]);

  if (shopsLoading || fetchLoading) {
    return (
      <div className="pb-24 min-h-[100dvh] animate-pulse">
        <div className="h-48 md:h-64 w-full bg-muted" />
        <div className="max-w-7xl mx-auto px-4 pt-6 space-y-4">
          <div className="flex gap-4">
            <div className="h-16 w-32 bg-muted rounded-xl" />
            <div className="h-16 w-32 bg-muted rounded-xl" />
            <div className="h-16 w-32 bg-muted rounded-xl" />
          </div>
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-2 gap-4 mt-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-muted rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || (!shopsLoading && !fetchLoading && !shop)) {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] items-center justify-center">
        <EmptyState
          icon={Store}
          title="Shop not found"
          description="The shop you are looking for doesn't exist or is currently unavailable."
          action={
            <Link href="/shops">
              <Button className="mt-4 rounded-full px-8 neu-card shadow-none">
                Back to Shops
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!shop) return null;

  const vendorProducts = products.filter(p => p.vendorId === shop.id);

  return (
    <div className="pb-24 min-h-[100dvh]">
      <SEO
        title={shop.storeName}
        description={`Order from ${shop.storeName} in Balurghat on SwiftMart. ${shop.category ? `${shop.category} — ` : ""}Fast local delivery in 10 minutes. ${vendorProducts.length > 0 ? `${vendorProducts.length} products available.` : ""}`}
        canonical={`/shop/${vendorId}`}
        ogImage={shop.image && shop.image !== "/assets/shop-placeholder.png" ? shop.image : undefined}
      />
      <div className="relative h-48 md:h-64 w-full bg-muted">
        <img
          src={shop.image}
          alt={`${shop.storeName} — local shop in Balurghat`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

        <Link href="/shops" className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
              {shop.category}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${shop.isOpen ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
              {shop.isOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 leading-tight">{shop.storeName}</h1>
          <p className="text-sm text-white/80 line-clamp-1">by {shop.ownerName}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-8">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 bg-card neu-card px-4 py-2 rounded-xl">
            <Star className="w-5 h-5 text-yellow-500 fill-current" />
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-none text-foreground">
                {shop.rating > 0 ? shop.rating.toFixed(1) : "New"}
              </span>
              <span className="text-[10px] text-muted-foreground">{shop.totalOrders}+ orders</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-card neu-card px-4 py-2 rounded-xl">
            <Clock className="w-5 h-5 text-primary" />
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-none text-foreground">{shop.eta}</span>
              <span className="text-[10px] text-muted-foreground">Delivery time</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-card neu-card px-4 py-2 rounded-xl">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-none text-foreground truncate max-w-[120px]">
                {shop.city || "N/A"}
              </span>
              <span className="text-[10px] text-muted-foreground">Location</span>
            </div>
          </div>
        </div>

        {!shop.isOpen && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-300/40 text-red-700 dark:text-red-400 rounded-2xl p-4">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-sm">Shop is currently closed</p>
              <p className="text-xs mt-0.5 opacity-80">This shop has paused orders. You can still browse products but cannot place an order right now.</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Our Products</h2>
          {vendorProducts.length > 0 ? (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05 }
                }
              }}
            >
              <ProductGrid products={vendorProducts} />
            </motion.div>
          ) : (
            <EmptyState
              icon={PackageOpen}
              title="No products listed"
              description="This vendor hasn't listed any products yet. Check back later!"
            />
          )}
        </div>
      </div>
    </div>
  );
}
