import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { ShopListing, mapApiShop } from "@/context/ShopsContext";
import { useShops } from "@/hooks/useShops";
import { useProducts } from "@/hooks/useProducts";
import { ProductGrid } from "@/components/ProductGrid";
import { EmptyState } from "@/components/EmptyState";
import { ArrowLeft, Star, Clock, MapPin, PackageOpen, Store, AlertCircle, Sparkles, Search, Share2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { CustomCakeModal } from "@/components/CustomCakeModal";
import { toShopSlug, getShopUrl } from "@/lib/shopUrl";

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
  const [, shopParams] = useRoute("/shop/:vendorId");
  const [, shopsParams] = useRoute("/shops/:vendorId");
  const [, rootParams] = useRoute("/:shopSlug");
  const rawIdentifier = shopParams?.vendorId || shopsParams?.vendorId || rootParams?.shopSlug || "";
  let identifier = "";
  try {
    identifier = rawIdentifier ? decodeURIComponent(rawIdentifier).trim() : "";
  } catch {
    identifier = rawIdentifier.trim();
  }

  const { shops, allShops, isLoading: shopsLoading } = useShops();
  const { products } = useProducts();

  const [shop, setShop] = useState<ShopListing | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [isInitialCheckDone, setIsInitialCheckDone] = useState(false);
  const [shopProducts, setShopProducts] = useState<ReturnType<typeof useProducts>['products']>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsLoadingMore, setProductsLoadingMore] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [productsHasMore, setProductsHasMore] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isCustomCakeOpen, setIsCustomCakeOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const shopObserverRef = useRef<HTMLDivElement | null>(null);

  const SHOP_PAGE_SIZE = 24;

  const loadProducts = useCallback((shopId: string, storeName?: string, targetPage = 1, isInitial = true) => {
    if (isInitial) {
      setProductsLoading(true);
    } else {
      setProductsLoadingMore(true);
    }

    api.get<{ success: boolean; products: any[]; total?: number; hasMore?: boolean }>(
      `/products?shopId=${encodeURIComponent(shopId)}&limit=${SHOP_PAGE_SIZE}&page=${targetPage}&status=active`
    )
      .then(d => {
        if (d.success && Array.isArray(d.products)) {
          const mapped = d.products
            .filter(p => p && typeof p === "object")
            .map(p => ({
              id: String(p._id || p.id || ""),
              name: String(p.name || "Product"),
              category: String(p.category || ""),
              price: Number(p.price) || 0,
              discountedPrice: p.discountedPrice != null ? Number(p.discountedPrice) : undefined,
              unit: typeof p.unit === "string" ? p.unit : "1 unit",
              image: typeof p.images?.[0] === "string" ? p.images[0] : (typeof p.image === "string" ? p.image : "/assets/product-placeholder.png"),
              images: Array.isArray(p.images) ? p.images : (typeof p.image === "string" ? [p.image] : []),
              description: typeof p.description === "string" ? p.description : "",
              stock: Number(p.stock) || 0,
              rating: Number(p.rating) || 0,
              vendorId: String(p.shopId ?? shopId),
              shopId: String(p.shopId ?? shopId),
              shopName: String(p.shopName || (storeName ?? "")),
              trending: Boolean(p.trending),
              colors: Array.isArray(p.colors) ? p.colors : undefined,
              sizes: Array.isArray(p.sizes) ? p.sizes : undefined,
              colorImages: p.colorImages,
              variants: p.variants,
            }));

          if (isInitial) {
            setShopProducts(mapped);
          } else {
            setShopProducts(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              return [...prev, ...mapped.filter(p => !existingIds.has(p.id))];
            });
          }

          setProductsPage(targetPage);
          setProductsHasMore(d.hasMore ?? (mapped.length === SHOP_PAGE_SIZE));
        }
      })
      .catch(err => {
        console.error("Failed to load shop products:", err);
      })
      .finally(() => {
        if (isInitial) setProductsLoading(false);
        setProductsLoadingMore(false);
      });
  }, []);

  useEffect(() => {
    if (!identifier) return;

    const candidateList = (allShops && allShops.length > 0) ? allShops : shops;
    const targetSlug = toShopSlug(identifier);
    const identifierWithSpaces = identifier.replace(/[-_]+/g, " ").trim().toLowerCase();

    const found = (candidateList || []).find(s => {
      if (!s) return false;
      const sId = s.id ? String(s.id).toLowerCase() : "";
      const sName = (s.storeName || "").trim().toLowerCase();
      const sSlug = toShopSlug(s.storeName);
      return (
        sId === identifier.toLowerCase() ||
        (targetSlug && sSlug === targetSlug) ||
        sName === identifier.toLowerCase() ||
        sName === identifierWithSpaces ||
        sName.replace(/[-_]+/g, " ").toLowerCase() === identifierWithSpaces
      );
    });

    if (found) {
      setShop(found);
      setNotFound(false);
      setIsInitialCheckDone(true);
      loadProducts(found.id, found.storeName);
      return;
    }

    if (shopsLoading) return;

    setFetchLoading(true);
    api.get<{ success: boolean; shop: ApiShopDetail }>(`/shops/${encodeURIComponent(identifier)}`)
      .then(d => {
        if (d.success && d.shop) {
          const mapped = mapApiShop(d.shop as Parameters<typeof mapApiShop>[0]);
          setShop(mapped);
          setNotFound(false);
          setIsInitialCheckDone(true);
          loadProducts(mapped.id, mapped.storeName);
        } else {
          setNotFound(true);
          setIsInitialCheckDone(true);
        }
      })
      .catch(() => {
        setNotFound(true);
        setIsInitialCheckDone(true);
      })
      .finally(() => setFetchLoading(false));
  }, [identifier, shops, allShops, shopsLoading, loadProducts]);

  // Infinite scroll / lazy loading observer for storefront products
  useEffect(() => {
    if (!productsHasMore || productsLoading || productsLoadingMore || !shop?.id) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver((entries) => {
      if (entries && entries[0] && entries[0].isIntersecting) {
        loadProducts(shop.id, shop.storeName, productsPage + 1, false);
      }
    }, { threshold: 0.1, rootMargin: "300px" });

    const currentTarget = shopObserverRef.current;
    if (currentTarget) observer.observe(currentTarget);

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [productsHasMore, productsLoading, productsLoadingMore, shop, productsPage, loadProducts]);

  const vendorProducts = useMemo(() => {
    if (shopProducts.length > 0) return shopProducts;
    if (!shop?.id || !Array.isArray(products)) return [];
    return products.filter(p => Boolean(p && (p.vendorId === shop.id || p.shopId === shop.id)));
  }, [shopProducts, products, shop?.id]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return vendorProducts;
    const q = productSearch.toLowerCase().trim();
    return vendorProducts.filter(p =>
      (p?.name || "").toLowerCase().includes(q) ||
      (p?.description || "").toLowerCase().includes(q) ||
      (p?.category || "").toLowerCase().includes(q)
    );
  }, [vendorProducts, productSearch]);

  if (shopsLoading || fetchLoading || (!shop && !notFound && !isInitialCheckDone)) {
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

  if (notFound || (!shop && isInitialCheckDone)) {
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

  const isFoodShop = ['restaurant', 'cafe', 'cloud-kitchen', 'sweet-shop', 'bakery', 'fast-food', 'food', 'food_junction', 'cake'].some(t => 
    (shop.shopType || '').toLowerCase().includes(t) || 
    (shop.category || '').toLowerCase().includes(t) ||
    (shop.storeName || '').toLowerCase().includes('cake') ||
    (shop.storeName || '').toLowerCase().includes('roll')
  );

  const shopUrlPath = getShopUrl(shop);
  const shopCanonicalUrl = `https://swiftmart.space${shopUrlPath}`;
  const seoTitle = `${shop.storeName || "Shop"} (Balurghat) — Official Storefront & Online Ordering | SwiftMart`;
  const seoDescription = `Order directly from ${shop.storeName || "Shop"}'s official online storefront in Balurghat on SwiftMart. ${shop.category ? `${shop.category} · ` : ""}Instant 10-15 min local delivery across Balurghat Pincodes 733101 & 733103. Live menu, verified prices, discounts & deals. ${vendorProducts.length > 0 ? `${vendorProducts.length} items available.` : ""}`;
  const seoKeywords = `${shop.storeName || "Shop"}, ${shop.storeName || "Shop"} Balurghat, ${shop.storeName || "Shop"} storefront, ${shop.storeName || "Shop"} online shop, ${shop.storeName || "Shop"} menu, ${shop.storeName || "Shop"} delivery, order ${shop.storeName || "Shop"} online, SwiftMart Balurghat, Balurghat quick commerce, ${shop.category || 'grocery store'}`;

  const handleShare = () => {
    const fullUrl = shopCanonicalUrl;
    const shareText = `Order directly from ${shop.storeName}'s official online storefront in Balurghat with 10-15 min delivery on SwiftMart!`;
    if (navigator.share) {
      navigator.share({
        title: `${shop.storeName} — Official Storefront | SwiftMart`,
        text: shareText,
        url: fullUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="pb-24 min-h-[100dvh]">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={shopUrlPath}
        keywords={seoKeywords}
        ogImage={shop.image && shop.image !== "/assets/shop-placeholder.png" ? shop.image : "https://swiftmart.space/opengraph.jpg"}
        jsonLd={[
          {
            "@type": isFoodShop
              ? ["Restaurant", "FoodEstablishment", "LocalBusiness"]
              : ["Store", "LocalBusiness", "OnlineStore"],
            "@id": `${shopCanonicalUrl}#storefront`,
            "name": shop.storeName,
            "legalName": `${shop.storeName} — SwiftMart Official Storefront`,
            "alternateName": [
              shop.storeName,
              `${shop.storeName} Balurghat`,
              `${shop.storeName} Storefront`,
              `${shop.storeName} Online Store`,
              `${shop.storeName} Menu`
            ],
            "description": seoDescription,
            "image": shop.image && shop.image !== "/assets/shop-placeholder.png" ? shop.image : "https://swiftmart.space/opengraph.jpg",
            "url": shopCanonicalUrl,
            "telephone": shop.phone || "+91 62961 18949",
            "priceRange": "₹₹",
            "currenciesAccepted": "INR",
            "paymentAccepted": "Cash on Delivery, UPI, Cards, Net Banking",
            "servesCuisine": isFoodShop ? (shop.category || "Fast Food, Bakery, Sweets, Indian") : undefined,
            "parentOrganization": {
              "@type": "OnlineBusiness",
              "name": "SwiftMart",
              "url": "https://swiftmart.space"
            },
            "branchOf": {
              "@type": "OnlineBusiness",
              "name": "SwiftMart",
              "url": "https://swiftmart.space"
            },
            "address": {
              "@type": "PostalAddress",
              "streetAddress": shop.address?.line1 || shop.address?.city || "Gourlo Math",
              "addressLocality": shop.city || "Balurghat",
              "postalCode": shop.pincode || "733103",
              "addressRegion": "West Bengal",
              "addressCountry": "IN"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": 25.2167,
              "longitude": 88.7667
            },
            "hasMap": `https://maps.google.com/?q=${encodeURIComponent(shop.storeName + " Balurghat")}`,
            "openingHoursSpecification": {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
              "opens": "07:00",
              "closes": "23:00"
            },
            "areaServed": {
              "@type": "City",
              "name": "Balurghat"
            },
            ...(Number(shop.rating || 0) > 0 && {
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": Number(shop.rating || 0).toFixed(1),
                "bestRating": "5",
                "worstRating": "1",
                "ratingCount": Math.max(Number(shop.totalOrders) || 1, 1)
              }
            }),
            "potentialAction": {
              "@type": "OrderAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": shopCanonicalUrl,
                "inLanguage": "en-IN",
                "actionPlatform": [
                  "http://schema.org/DesktopWebPlatform",
                  "http://schema.org/MobileWebPlatform",
                  "http://schema.org/AndroidPlatform",
                  "http://schema.org/IOSPlatform"
                ]
              },
              "deliveryMethod": ["http://purl.org/goodrelations/v1#DeliveryModeOwnFleet"]
            },
            ...(vendorProducts.length > 0 && {
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": `${shop.storeName || "Store"} Live Catalog & Menu`,
                "numberOfItems": vendorProducts.length,
                "itemListElement": vendorProducts.slice(0, 25).map(p => ({
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Product",
                    "name": p?.name || "Product",
                    "description": p?.description || `${p?.name || "Product"} from ${shop.storeName || "Store"} in Balurghat`,
                    "image": typeof p?.image === "string" && !p.image.includes('placeholder') ? p.image : undefined
                  },
                  "price": (p?.discountedPrice && p.discountedPrice > 0) ? p.discountedPrice : (p?.price || 0),
                  "priceCurrency": "INR",
                  "availability": (p?.stock && p.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
                }))
              }
            })
          },
          {
            "@type": "BreadcrumbList",
            "@id": `${shopCanonicalUrl}#breadcrumb`,
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "SwiftMart",
                "item": "https://swiftmart.space/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Balurghat Stores",
                "item": "https://swiftmart.space/shops"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": shop.storeName || "Store",
                "item": shopCanonicalUrl
              }
            ]
          }
        ]}
      />
      {/* ── Breadcrumb Navigation Outline for Search Engines & Users ── */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 pt-3 pb-2 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/shops" className="hover:text-foreground transition-colors">Balurghat Stores</Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground font-bold truncate">{shop.storeName || "Store"} Storefront</span>
      </nav>

      {/* ── Storefront Hero Banner ── */}
      <div className="relative h-48 md:h-64 w-full bg-muted">
        <img
          src={shop.image || "/assets/shop-placeholder.png"}
          alt={`${shop.storeName || "Store"} — Official Storefront in Balurghat`}
          width={1200}
          height={400}
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

        <Link href="/shops" className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors" aria-label="Back to all shops">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="bg-amber-400 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Store className="w-3 h-3" /> Official Storefront
            </span>
            <span className="bg-primary/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
              {shop.category}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${shop.isOpen ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
              {shop.isOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black mb-1 leading-tight text-white drop-shadow-sm">{shop.storeName}</h1>
          <p className="text-xs md:text-sm text-white/90 line-clamp-1">
            Official Balurghat Storefront · 10-15 Min Express Delivery by SwiftMart · {shop.city || "Balurghat"}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        {/* ── Storefront Details Strip & Share Actions ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card neu-card p-4 rounded-2xl border border-border/50">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-current" />
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-none text-foreground">
                  {Number(shop.rating || 0) > 0 ? Number(shop.rating).toFixed(1) : "New"}
                </span>
                <span className="text-[10px] text-muted-foreground">{(shop.totalOrders || 0)}+ orders</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-none text-foreground">{shop.eta || "15-20 min"}</span>
                <span className="text-[10px] text-muted-foreground">Delivery time</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-none text-foreground truncate max-w-[140px]">
                  {shop.city || "Balurghat"}
                </span>
                <span className="text-[10px] text-muted-foreground">Pincode {shop.pincode || "733103"}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-xl">
              <span className="text-green-700 dark:text-green-400 text-sm leading-none" aria-hidden="true">✅</span>
              <span className="font-bold text-[11px] text-green-700 dark:text-green-400">Verified Partner</span>
            </div>
          </div>

          {/* Share Storefront Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleShare}
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-bold gap-1.5 h-9 bg-background/80"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
              {copied ? "Link Copied!" : "Share Storefront"}
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Order online directly from ${shop.storeName || "Store"}'s official storefront in Balurghat with 10-15 min delivery on SwiftMart! ${shopCanonicalUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold px-3.5 py-2 rounded-full transition-colors shadow-xs"
            >
              <span>WhatsApp</span>
            </a>
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

        {/* Custom Cake Banner for Bakeries & Cake Shops only */}
        {(() => {
          const cat = (shop.category || "").toLowerCase().trim();
          const type = (shop.shopType || "").toLowerCase().trim();
          const name = (shop.storeName || "").toLowerCase().trim();
          const isBakery =
            cat === "bakery" ||
            cat === "cake" ||
            cat === "cakes" ||
            cat === "bakery-cakes" ||
            cat === "cakes-bakery" ||
            type === "bakery" ||
            type === "cake" ||
            type === "cakes" ||
            name.includes("cake") ||
            name.includes("bakery");

          if (!isBakery) return null;

          return (
            <>
              <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 rounded-3xl p-5 md:p-6 text-white shadow-lg shadow-pink-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-pink-100 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" /> Customized Designer Cakes
                  </div>
                  <h3 className="text-xl md:text-2xl font-black tracking-tight">
                    🎂 Customize Your Cake with {shop.storeName || "Store"}
                  </h3>
                  <p className="text-white/85 text-xs max-w-xl">
                    Select flavour, weight, tiers & attach reference photo. Choose Doorstep Delivery or Free Store Pickup!
                  </p>
                </div>
                <Button
                  onClick={() => setIsCustomCakeOpen(true)}
                  className="rounded-full font-black bg-white text-pink-600 hover:bg-pink-50 shadow-md text-sm px-6 shrink-0"
                >
                  Customize Cake 🎂
                </Button>
              </div>

              {/* Custom Cake Modal */}
              <CustomCakeModal
                isOpen={isCustomCakeOpen}
                onClose={() => setIsCustomCakeOpen(false)}
                shop={{
                  id: shop.id,
                  shopName: shop.storeName || "Bakery",
                  address: {
                    city: shop.city,
                    pincode: shop.pincode,
                  }
                }}
              />
            </>
          );
        })()}

        {/* ── In-Store Product Search ── */}
        {vendorProducts.length > 4 && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder={`Search products inside ${shop.storeName || "Store"}...`}
              className="pl-10 h-11 bg-card rounded-2xl border-border/60 text-sm"
            />
          </div>
        )}

        {/* ── Products Grid ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">
              {productSearch.trim() ? `Search Results in ${shop.storeName || "Store"}` : "Store Products & Menu"}
            </h2>
            {!productsLoading && filteredProducts.length > 0 && (
              <span className="text-xs text-muted-foreground font-medium">({filteredProducts.length} items)</span>
            )}
          </div>
          {productsLoading && vendorProducts.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-56 bg-muted/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <>
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
                <ProductGrid products={filteredProducts} />
              </motion.div>

              {/* Sentinel for IntersectionObserver lazy loading */}
              <div ref={shopObserverRef} className="h-6 w-full" />

              {/* Lazy loading indicator */}
              {productsLoadingMore && (
                <div className="py-6 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground font-medium">Loading more products...</span>
                </div>
              )}

              {productsHasMore && !productsLoadingMore && (
                <div className="py-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => shop && loadProducts(shop.id, shop.storeName, productsPage + 1, false)}
                    className="rounded-full neu-card text-xs font-semibold px-6 hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    Load More Products
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={PackageOpen}
              title={productSearch.trim() ? "No matching products found" : "No products listed"}
              description={productSearch.trim() ? `No items matched "${productSearch}" in ${shop.storeName || "Store"}.` : "This vendor hasn't listed any products yet. Check back later!"}
            />
          )}
        </div>

        {/* ── Hyperlocal Storefront Information Card for Google Crawlers & Shoppers ── */}
        <section aria-label="Storefront Information" className="mt-12 bg-card/60 border border-border/50 rounded-2xl p-5 space-y-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Store className="w-4 h-4 text-primary" />
            About {shop.storeName || "Store"} Online Storefront on SwiftMart
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Welcome to the official verified online storefront of <strong>{shop.storeName || "Store"}</strong> on SwiftMart. Serving customers across <strong>Balurghat, West Bengal</strong>, {shop.storeName || "Store"} partners with SwiftMart to deliver {shop.category || 'fresh grocery, food, sweets, and daily essentials'} directly to customer doorsteps in 10 to 15 minutes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="bg-background/60 p-3 rounded-xl border border-border/40">
              <span className="font-bold text-foreground block mb-0.5">⚡ Delivery Guarantee</span>
              <span className="text-[11px] text-muted-foreground">Dispatched instantly via SwiftMart delivery fleet across Balurghat Pincodes 733101 &amp; 733103.</span>
            </div>
            <div className="bg-background/60 p-3 rounded-xl border border-border/40">
              <span className="font-bold text-foreground block mb-0.5">💳 Payment Options</span>
              <span className="text-[11px] text-muted-foreground">Cash on Delivery (COD), UPI (GPay, PhonePe, Paytm), and Net Banking accepted.</span>
            </div>
            <div className="bg-background/60 p-3 rounded-xl border border-border/40">
              <span className="font-bold text-foreground block mb-0.5">📞 Direct Helpdesk</span>
              <span className="text-[11px] text-muted-foreground">Store helpline: <a href="tel:+916296118949" className="text-primary font-bold">+91 62961 18949</a> (07:00 AM &ndash; 11:00 PM).</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

