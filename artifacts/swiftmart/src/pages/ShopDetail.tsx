import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { ShopListing, mapApiShop } from "@/context/ShopsContext";
import { useShops } from "@/hooks/useShops";
import { useProducts } from "@/hooks/useProducts";
import { ProductGrid } from "@/components/ProductGrid";
import { EmptyState } from "@/components/EmptyState";
import { ArrowLeft, Star, Clock, MapPin, PackageOpen, Store, AlertCircle, Sparkles, Search, Share2, Check, Loader2, ExternalLink, Navigation, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { CustomCakeModal } from "@/components/CustomCakeModal";
import { toShopSlug, getShopUrl } from "@/lib/shopUrl";
import { GoogleGLogo, getShopGoogleBusinessUrl } from "@/lib/googleBusiness";

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
  slug?: string;
  claimStatus?: string;
  verificationStatus?: string;
  eta?: string;
  googleBusinessUrl?: string;
}

function getMerchantSchemaType(category: string, shopType: string, name: string): string[] {
  const text = `${category} ${shopType} ${name}`.toLowerCase();
  if (text.includes("bakery") || text.includes("cake")) {
    return ["Bakery", "FoodEstablishment", "LocalBusiness"];
  }
  if (text.includes("restaurant") || text.includes("fast-food") || text.includes("food") || text.includes("shawarma") || text.includes("roll")) {
    return ["Restaurant", "FoodEstablishment", "LocalBusiness"];
  }
  if (text.includes("grocery") || text.includes("kirana") || text.includes("supermarket") || text.includes("fruit") || text.includes("vegetable")) {
    return ["GroceryStore", "Store", "LocalBusiness"];
  }
  if (text.includes("electronic") || text.includes("mobile") || text.includes("computer")) {
    return ["ElectronicsStore", "Store", "LocalBusiness"];
  }
  if (text.includes("clothing") || text.includes("fashion") || text.includes("dress") || text.includes("wear")) {
    return ["ClothingStore", "Store", "LocalBusiness"];
  }
  if (text.includes("book") || text.includes("stationery") || text.includes("khatapatra")) {
    return ["BookStore", "Store", "LocalBusiness"];
  }
  if (text.includes("service") || text.includes("repair") || text.includes("centre")) {
    return ["LocalBusiness", "Service"];
  }
  return ["Store", "LocalBusiness"];
}

export default function ShopDetail() {
  const [, storesParams] = useRoute("/stores/:slug");
  const [, shopParams] = useRoute("/shop/:vendorId");
  const [, shopsParams] = useRoute("/shops/:vendorId");
  const [, rootParams] = useRoute("/:shopSlug");
  const rawIdentifier = storesParams?.slug || shopParams?.vendorId || shopsParams?.vendorId || rootParams?.shopSlug || "";
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
            <Link href="/stores">
              <Button className="mt-4 rounded-full px-8 neu-card shadow-none">
                Back to Stores
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!shop) return null;

  const category = shop.category || "General Store";
  const shopType = shop.shopType || category;
  const storeName = shop.storeName || "Store";
  const city = shop.city || "Local Area";
  const pincode = shop.pincode || "";
  const citySlug = toShopSlug(city);
  const catSlug = toShopSlug(category);

  const text = `${category} ${shopType} ${storeName}`.toLowerCase();
  const isBakery = text.includes("bakery") || text.includes("cake");
  const isRestaurant = !isBakery && (text.includes("restaurant") || text.includes("fast-food") || text.includes("food") || text.includes("shawarma") || text.includes("roll") || text.includes("cafe"));
  const isService = text.includes("service") || text.includes("repair") || text.includes("centre") || text.includes("lab");

  const schemaTypes = getMerchantSchemaType(category, shopType, storeName);

  // Dynamic ETA based on merchant configuration and category
  const dynamicEta = shop.eta || (
    isService
      ? "On-site visit & inspection"
      : isBakery
        ? "Same-day delivery & pre-order"
        : isRestaurant
          ? "20-30 min"
          : "15-25 min"
  );

  const isVerified = (shop.verificationStatus || "").toLowerCase() === "verified";
  const isClaimed = (shop.claimStatus || "claimed").toLowerCase() === "claimed";

  const shopUrlPath = getShopUrl(shop);
  const shopCanonicalUrl = `https://swiftmart.space${shopUrlPath}`;
  const googleBusinessUrl = getShopGoogleBusinessUrl(shop);

  // Dynamic human-readable SEO title & description
  const seoTitle = `${storeName} ${city ? `in ${city}` : ""} | ${category} | SwiftMart`;
  const seoDescription = shop.description
    ? `${shop.description} Order online from ${storeName} in ${city} on SwiftMart with ${dynamicEta} delivery.`
    : isService
      ? `Official online storefront for ${storeName} in ${city} on SwiftMart. Explore electronics, repair solutions, and book on-site visit.`
      : isRestaurant
        ? `Order food online from ${storeName} in ${city} on SwiftMart. Live menu, genuine prices, and ${dynamicEta} local delivery.`
        : isBakery
          ? `Order delicious cakes, fresh pastries, and custom designer cakes from ${storeName} in ${city} on SwiftMart. ${dynamicEta} doorstep delivery or pickup.`
          : `Official online storefront for ${storeName} in ${city} on SwiftMart. Browse live products, verified prices, daily discounts, and order online with ${dynamicEta} delivery.`;

  const seoKeywords = `${storeName}, ${storeName} ${city}, ${storeName} storefront, ${storeName} online shop, ${category}, ${storeName} delivery, order ${storeName} online, SwiftMart ${city}`;

  const handleShare = () => {
    const fullUrl = shopCanonicalUrl;
    const shareText = `Order directly from ${storeName}'s storefront in ${city} with ${dynamicEta} delivery on SwiftMart!`;
    if (navigator.share) {
      navigator.share({
        title: `${storeName} | SwiftMart`,
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
            "@type": schemaTypes,
            "@id": `${shopCanonicalUrl}#storefront`,
            "name": storeName,
            "legalName": `${storeName} — SwiftMart ${isClaimed ? "Official Storefront" : "Storefront"}`,
            "alternateName": [
              storeName,
              `${storeName} ${city}`,
              `${storeName} Storefront`,
              `${storeName} Online Store`,
              ...(isRestaurant ? [`${storeName} Menu`] : [])
            ],
            "description": seoDescription,
            "image": shop.image && shop.image !== "/assets/shop-placeholder.png" ? shop.image : "https://swiftmart.space/opengraph.jpg",
            "url": shopCanonicalUrl,
            "telephone": shop.phone || "+91 62961 18949",
            "priceRange": "₹₹",
            "currenciesAccepted": "INR",
            "paymentAccepted": "Cash on Delivery, UPI, Cards, Net Banking",
            ...(isRestaurant && { "servesCuisine": category }),
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
              "streetAddress": shop.address?.line1 || city,
              "addressLocality": city,
              "postalCode": pincode || "733103",
              "addressRegion": "West Bengal",
              "addressCountry": "IN"
            },
            ...(googleBusinessUrl && {
              "hasMap": googleBusinessUrl,
              "sameAs": [googleBusinessUrl]
            }),
            "openingHoursSpecification": {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
              "opens": "07:00",
              "closes": "23:00"
            },
            "areaServed": {
              "@type": "City",
              "name": city
            },
            ...(Number(shop.rating || 0) > 0 && Number(shop.totalOrders || 0) > 0 && {
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
                "name": `${storeName} Catalog`,
                "numberOfItems": vendorProducts.length,
                "itemListElement": vendorProducts.slice(0, 25).map(p => ({
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Product",
                    "name": p?.name || "Product",
                    "description": p?.description || `${p?.name || "Product"} from ${storeName} in ${city}`,
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
                "name": "Stores",
                "item": "https://swiftmart.space/stores"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": `${city} Stores`,
                "item": `https://swiftmart.space/stores/${citySlug}`
              },
              {
                "@type": "ListItem",
                "position": 4,
                "name": storeName,
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
        <Link href="/stores" className="hover:text-foreground transition-colors">Stores</Link>
        {city && (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/stores/${citySlug}`} className="hover:text-foreground transition-colors">{city}</Link>
          </>
        )}
        {category && (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/stores/${citySlug}/${catSlug}`} className="hover:text-foreground transition-colors">{category}</Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="text-foreground font-bold truncate">{storeName}</span>
      </nav>

      {/* ── Storefront Hero Banner ── */}
      <div className="relative h-48 md:h-64 w-full bg-muted">
        <img
          src={shop.image || "/assets/shop-placeholder.png"}
          alt={`${storeName} storefront in ${city}`}
          width={1200}
          height={400}
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

        <Link href="/stores" className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors" aria-label="Back to all stores">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="bg-amber-400 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Store className="w-3 h-3" /> {isClaimed ? "Official Storefront" : "Listed on SwiftMart"}
            </span>
            {isVerified && (
              <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3 h-3" /> Verified by SwiftMart
              </span>
            )}
            <span className="bg-primary/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
              {category}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${shop.isOpen ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
              {shop.isOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black mb-1 leading-tight text-white drop-shadow-sm">{storeName}</h1>
          <p className="text-xs md:text-sm text-white/90 line-clamp-1">
            {isClaimed ? "Official Storefront" : "Storefront"} · {dynamicEta} · {city}
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
                  {Number(shop.rating || 0) > 0 ? Number(shop.rating).toFixed(1) : "New on SwiftMart"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {Number(shop.totalOrders || 0) > 0 ? `${shop.totalOrders}+ orders` : "Verified Merchant"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-none text-foreground">{dynamicEta}</span>
                <span className="text-[10px] text-muted-foreground">{isService ? "Service window" : "Delivery estimate"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-none text-foreground truncate max-w-[140px]">
                  {city}
                </span>
                <span className="text-[10px] text-muted-foreground">{pincode ? `Pincode ${pincode}` : "Local Area"}</span>
              </div>
            </div>

            {isVerified && (
              <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-green-700 dark:text-green-400" />
                <span className="font-bold text-[11px] text-green-700 dark:text-green-400">Verified by SwiftMart</span>
              </div>
            )}

            {googleBusinessUrl && (
              <a
                href={googleBusinessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 hover:bg-blue-100/80 dark:hover:bg-blue-900/60 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs group cursor-pointer"
                title="View verified profile on Google Maps & read reviews"
              >
                <GoogleGLogo className="w-3.5 h-3.5" />
                <span className="font-bold text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-1">
                  Google Verified
                  <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </span>
              </a>
            )}
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
              href={`https://wa.me/?text=${encodeURIComponent(`Order online directly from ${storeName}'s storefront in ${city} with ${dynamicEta} delivery on SwiftMart! ${shopCanonicalUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold px-3.5 py-2 rounded-full transition-colors shadow-xs"
            >
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* ── Official Google Business Profile & Verification Card ── */}
        {googleBusinessUrl && (
          <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50/90 to-blue-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-blue-950/30 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200/70 dark:border-slate-700/80 flex items-center justify-center shrink-0">
                  <GoogleGLogo className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                      {storeName} on Google
                    </h3>
                    <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      ✓ Verified Local Business
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                    Official verified Google Maps listing in {city}. Read authentic customer reviews, photos, operating hours &amp; directions.
                  </p>
                  <div className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                    {Number(shop.rating || 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                        ★ {Number(shop.rating).toFixed(1)} Rating
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        ✓ Verified Listing
                      </span>
                    )}
                    <span>•</span>
                    <span>📍 {city}, West Bengal</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">⚡ {dynamicEta}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:self-center shrink-0 flex-wrap">
                <a
                  href={googleBusinessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  <GoogleGLogo className="w-3.5 h-3.5" />
                  <span>Google Reviews</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
                <a
                  href={googleBusinessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Directions &amp; Map</span>
                </a>
              </div>
            </div>
          </div>
        )}

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
        {isBakery && (
          <>
            <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 rounded-3xl p-5 md:p-6 text-white shadow-lg shadow-pink-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-pink-100 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Customized Designer Cakes
                </div>
                <h3 className="text-xl md:text-2xl font-black tracking-tight">
                  🎂 Customize Your Cake with {storeName}
                </h3>
                <p className="text-white/85 text-xs max-w-xl">
                  Select flavour, weight, tiers &amp; attach reference photo. Choose Doorstep Delivery or Free Store Pickup!
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
                shopName: storeName,
                address: {
                  city: shop.city,
                  pincode: shop.pincode,
                }
              }}
            />
          </>
        )}

        {/* ── In-Store Product Search ── */}
        {vendorProducts.length > 4 && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder={`Search items in ${storeName}...`}
              className="pl-10 h-11 bg-card rounded-2xl border-border/60 text-sm"
            />
          </div>
        )}

        {/* ── Products & Catalog Grid ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">
              {productSearch.trim()
                ? `Search Results in ${storeName}`
                : isService
                  ? "Available Services & Repairs"
                  : isRestaurant
                    ? "Restaurant Menu & Food Items"
                    : isBakery
                      ? "Fresh Bakes & Cakes"
                      : "Store Products & Essentials"}
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
                  <span className="text-xs text-muted-foreground font-medium">Loading more items...</span>
                </div>
              )}

              {productsHasMore && !productsLoadingMore && (
                <div className="py-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => shop && loadProducts(shop.id, shop.storeName, productsPage + 1, false)}
                    className="rounded-full neu-card text-xs font-semibold px-6 hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    Load More Items
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={PackageOpen}
              title={productSearch.trim() ? "No matching items found" : "No items listed yet"}
              description={productSearch.trim() ? `No items matched "${productSearch}" in ${storeName}.` : "This merchant has not added items yet. Check back soon!"}
            />
          )}
        </div>

        {/* ── Reusable Trust Section (Requirement #11) ── */}
        <section aria-label="Trust and Transparency" className="bg-card/70 border border-border/60 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-foreground">
              Why shop with {storeName} on SwiftMart?
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-background/80 p-3.5 rounded-2xl border border-border/40 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{isVerified ? "Verified Merchant" : "Listed on SwiftMart"}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isVerified
                  ? "Identity, physical presence, and merchant partnership verified by SwiftMart."
                  : "Registered merchant on SwiftMart with secure order processing."}
              </p>
            </div>
            <div className="bg-background/80 p-3.5 rounded-2xl border border-border/40 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Transparent Pricing</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Zero hidden store markups. Direct prices set by {storeName} with live discounts.
              </p>
            </div>
            <div className="bg-background/80 p-3.5 rounded-2xl border border-border/40 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{isService ? "Service Fulfilled" : "Direct Fulfillment"}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isService
                  ? `Estimated visit: ${dynamicEta}. Handled directly by trained technicians.`
                  : `Estimated delivery: ${dynamicEta}. Dispatched via SwiftMart delivery network.`}
              </p>
            </div>
            <div className="bg-background/80 p-3.5 rounded-2xl border border-border/40 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>SwiftMart Order Support</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Dedicated platform support, real-time tracking, and verified customer assistance.
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-2">
            <span>
              {isService
                ? `Service provided by ${storeName} · Booking powered by SwiftMart`
                : `Sold & prepared by ${storeName} · Ordering & delivery powered by SwiftMart`}
            </span>
            <span className="font-medium text-foreground">Safe &amp; Encrypted Ordering</span>
          </div>
        </section>

        {/* ── Reusable About This Store Section (Requirement #12) ── */}
        <section aria-label="About This Store" className="bg-card/50 border border-border/50 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">
              About {storeName}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {shop.description ||
              `Welcome to the storefront of ${storeName} on SwiftMart. Located in ${city}, ${storeName} offers ${category.toLowerCase()} with fast local fulfillment (${dynamicEta}) for customers across ${city}.`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
            <div className="bg-background/70 p-3 rounded-2xl border border-border/40">
              <span className="font-bold text-foreground block mb-0.5">📍 Location &amp; Address</span>
              <span className="text-[11px] text-muted-foreground block">
                {shop.address?.line1 ? `${shop.address.line1}, ` : ""}{city}{pincode ? ` - ${pincode}` : ""}
              </span>
            </div>
            <div className="bg-background/70 p-3 rounded-2xl border border-border/40">
              <span className="font-bold text-foreground block mb-0.5">⏱️ Operating Hours</span>
              <span className="text-[11px] text-muted-foreground block">
                Mon &ndash; Sun: 07:00 AM &ndash; 11:00 PM
              </span>
            </div>
            <div className="bg-background/70 p-3 rounded-2xl border border-border/40">
              <span className="font-bold text-foreground block mb-0.5">📞 Public Contact</span>
              <span className="text-[11px] text-muted-foreground block">
                {shop.phone ? (
                  <a href={`tel:${shop.phone}`} className="text-primary font-bold hover:underline">
                    {shop.phone}
                  </a>
                ) : (
                  "Contact via SwiftMart Support"
                )}
              </span>
            </div>
            <div className="bg-background/70 p-3 rounded-2xl border border-border/40">
              <span className="font-bold text-foreground block mb-0.5">⚡ Fulfillment Area</span>
              <span className="text-[11px] text-muted-foreground block">
                {city} local areas &amp; surrounding neighborhoods
              </span>
            </div>
          </div>
        </section>

        {/* ── Internal Linking: Related Stores in City (Requirement #20) ── */}
        {(() => {
          const allList = (allShops && allShops.length > 0) ? allShops : shops;
          const related = (allList || [])
            .filter(s => s && s.id !== shop.id && (s.city || "").toLowerCase() === (shop.city || "").toLowerCase())
            .slice(0, 4);

          if (related.length === 0) return null;

          return (
            <section aria-label="Related Stores" className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">
                  More Stores in {city}
                </h3>
                <Link href={citySlug ? `/stores/${citySlug}` : "/stores"} className="text-xs font-bold text-primary hover:underline">
                  View All {city} Stores &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {related.map(r => (
                  <Link
                    key={r.id}
                    href={getShopUrl(r)}
                    className="group block bg-card rounded-2xl border border-border/50 p-2.5 hover:border-primary/50 transition-all hover:shadow-sm"
                  >
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-muted mb-2">
                      <img
                        src={r.image || "/assets/shop-placeholder.png"}
                        alt={`${r.storeName} storefront`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {r.storeName}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {r.category || "Store"} · {r.eta || "Fast Delivery"}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })()}
      </div>
    </div>
  );
}

