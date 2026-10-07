import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { ShopListing, mapApiShop } from "@/context/ShopsContext";
import { useShops } from "@/hooks/useShops";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { isSameCity } from "@/lib/deliveryEta";
import { ProductGrid } from "@/components/ProductGrid";
import { EmptyState } from "@/components/EmptyState";
import {
  ArrowLeft,
  Star,
  Clock,
  MapPin,
  PackageOpen,
  Store,
  AlertCircle,
  Sparkles,
  Search,
  Share2,
  Check,
  Loader2,
  ExternalLink,
  Navigation,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Wrench,
  HelpCircle,
  Phone,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { CustomCakeModal } from "@/components/CustomCakeModal";
import { VerificationBadgeModal } from "@/components/VerificationBadgeModal";
import { ServiceCard } from "@/components/ServiceCard";
import { ServiceDetailsModal } from "@/components/ServiceDetailsModal";
import { toShopSlug, getShopUrl } from "@/lib/shopUrl";
import { GoogleGLogo, getShopGoogleBusinessUrl } from "@/lib/googleBusiness";
import type { Product } from "@/types";

interface ApiShopDetail {
  _id: string;
  shopName: string;
  ownerName: string;
  shopType: string;
  address?: { line1?: string; city?: string; pincode?: string };
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
  description?: string;
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
  if (text.includes("uphar") || text.includes("upahar") || text.includes("appliance repair") || text.includes("electronics lab") || category.toLowerCase() === "service" || category.toLowerCase() === "services") {
    return ["LocalBusiness", "Service"];
  }
  return ["Store", "LocalBusiness"];
}

export default function ShopDetail() {
  const [, setLocation] = useLocation();
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
  const { selectedDeliveryAddress } = useAuth();
  const customerCity = selectedDeliveryAddress?.city || "Balurghat";

  const [shop, setShop] = useState<ShopListing | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [isInitialCheckDone, setIsInitialCheckDone] = useState(false);
  const [shopProducts, setShopProducts] = useState<ReturnType<typeof useProducts>["products"]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsLoadingMore, setProductsLoadingMore] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [productsHasMore, setProductsHasMore] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isCustomCakeOpen, setIsCustomCakeOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [selectedServiceForDetails, setSelectedServiceForDetails] = useState<Product | null>(null);
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

    api
      .get<{ success: boolean; products: any[]; total?: number; hasMore?: boolean }>(
        `/products?shopId=${encodeURIComponent(shopId)}&limit=${SHOP_PAGE_SIZE}&page=${targetPage}&status=active`
      )
      .then((d) => {
        if (d.success && Array.isArray(d.products)) {
          const mapped = d.products
            .filter((p) => p && typeof p === "object")
            .map((p) => ({
              id: String(p._id || p.id || ""),
              name: String(p.name || "Product"),
              category: String(p.category || ""),
              price: Number(p.price) || 0,
              discountedPrice: p.discountedPrice != null ? Number(p.discountedPrice) : undefined,
              unit: typeof p.unit === "string" ? p.unit : "1 unit",
              image: typeof p.images?.[0] === "string" ? p.images[0] : typeof p.image === "string" ? p.image : "/assets/product-placeholder.png",
              images: Array.isArray(p.images) ? p.images : typeof p.image === "string" ? [p.image] : [],
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
            setShopProducts((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              return [...prev, ...mapped.filter((p) => !existingIds.has(p.id))];
            });
          }

          setProductsPage(targetPage);
          setProductsHasMore(d.hasMore ?? mapped.length === SHOP_PAGE_SIZE);
        }
      })
      .catch((err) => {
        console.error("Failed to load shop products:", err);
      })
      .finally(() => {
        if (isInitial) setProductsLoading(false);
        setProductsLoadingMore(false);
      });
  }, []);

  useEffect(() => {
    if (!identifier) return;

    const candidateList = allShops && allShops.length > 0 ? allShops : shops;
    const targetSlug = toShopSlug(identifier);
    const identifierWithSpaces = identifier.replace(/[-_]+/g, " ").trim().toLowerCase();

    const found = (candidateList || []).find((s) => {
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
    api
      .get<{ success: boolean; shop: ApiShopDetail }>(`/shops/${encodeURIComponent(identifier)}`)
      .then((d) => {
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

  // Infinite scroll observer for storefront products
  useEffect(() => {
    if (!productsHasMore || productsLoading || productsLoadingMore || !shop?.id) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries && entries[0] && entries[0].isIntersecting) {
          loadProducts(shop.id, shop.storeName, productsPage + 1, false);
        }
      },
      { threshold: 0.1, rootMargin: "300px" }
    );

    const currentTarget = shopObserverRef.current;
    if (currentTarget) observer.observe(currentTarget);

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [productsHasMore, productsLoading, productsLoadingMore, shop, productsPage, loadProducts]);

  const vendorProducts = useMemo(() => {
    if (shopProducts.length > 0) return shopProducts;
    if (!shop?.id || !Array.isArray(products)) return [];
    return products.filter((p) => Boolean(p && (p.vendorId === shop.id || p.shopId === shop.id)));
  }, [shopProducts, products, shop?.id]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return vendorProducts;
    const q = productSearch.toLowerCase().trim();
    return vendorProducts.filter(
      (p) =>
        (p?.name || "").toLowerCase().includes(q) ||
        (p?.description || "").toLowerCase().includes(q) ||
        (p?.category || "").toLowerCase().includes(q)
    );
  }, [vendorProducts, productSearch]);

  if (shopsLoading || fetchLoading || (!shop && !notFound && !isInitialCheckDone)) {
    return (
      <div className="pb-24 min-h-[100dvh] animate-pulse">
        <div className="h-44 md:h-56 w-full bg-muted" />
        <div className="max-w-7xl mx-auto px-4 pt-6 space-y-4">
          <div className="flex gap-4">
            <div className="h-16 w-32 bg-muted rounded-xl" />
            <div className="h-16 w-32 bg-muted rounded-xl" />
            <div className="h-16 w-32 bg-muted rounded-xl" />
          </div>
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 bg-muted rounded-2xl" />
            ))}
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
              <Button className="mt-4 rounded-full px-8 shadow-none">Back to Stores</Button>
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
  const city = shop.city || "Balurghat";
  const pincode = shop.pincode || "733101";
  const citySlug = toShopSlug(city);
  const catSlug = toShopSlug(category);

  const text = `${category} ${shopType} ${storeName}`.toLowerCase();
  const catLower = category.toLowerCase().trim();
  const typeLower = shopType.toLowerCase().trim();
  const isBakery = text.includes("bakery") || text.includes("cake");
  const isRestaurant = !isBakery && (text.includes("restaurant") || text.includes("fast-food") || text.includes("food") || text.includes("shawarma") || text.includes("roll") || text.includes("cafe"));
  // A shop is ONLY a service shop if its category/type is service, or it is explicitly Uphar / electronics repair lab
  // Do NOT treat shops with 'centre' or 'center' (e.g., Maa Laxmi Online Centre) as service shops
  const isService =
    catLower === "services" ||
    catLower === "service" ||
    typeLower === "services" ||
    typeLower === "service" ||
    text.includes("uphar") ||
    text.includes("upahar") ||
    text.includes("appliance repair") ||
    text.includes("electronics lab") ||
    (text.includes("repair") && !text.includes("online centre") && !text.includes("online center") && !text.includes("khatapatra"));

  const schemaTypes = getMerchantSchemaType(category, shopType, storeName);

  const isSameCityDelivery = isSameCity(customerCity, city);

  // Dynamic ETA
  const dynamicEta = isService
    ? "On-site visit & inspection"
    : !isSameCityDelivery
      ? "7 Days Delivery"
      : isBakery
        ? "Same-day delivery & pre-order"
        : isRestaurant
          ? "20–30 min"
          : shop.eta || "30–60 min";

  const isVerified = (shop.verificationStatus || "verified").toLowerCase() === "verified";
  const isClaimed = (shop.claimStatus || "claimed").toLowerCase() === "claimed";

  const shopUrlPath = getShopUrl(shop);
  const shopCanonicalUrl = `https://swiftmart.space${shopUrlPath}`;
  const googleBusinessUrl = getShopGoogleBusinessUrl(shop);

  // Professional polished description for UPHAR / Service providers
  const isUphar = text.includes("uphar") || text.includes("upahar");
  const formattedDescription = isUphar
    ? "UPHAR Electronics Lab provides home repair and servicing for LED TVs, air conditioners, refrigerators and other home electronics in Balurghat."
    : shop.description && shop.description.length > 15
      ? shop.description
      : isService
        ? `${storeName} provides professional home electronics, appliance repair, and maintenance services across ${city}.`
        : `Official online storefront for ${storeName} in ${city} on SwiftMart. Browse live products, verified prices, and order online with ${dynamicEta} delivery.`;

  // Formatted address for UPHAR
  const formattedAddress = isUphar
    ? "Balurghat Public Bus Stand, Purbasha Club area, Balurghat – 733101"
    : `${shop.address?.line1 ? `${shop.address.line1}, ` : ""}${city}${pincode ? ` – ${pincode}` : ""}`;

  // SEO metadata
  const seoTitle = `${storeName} ${city ? `in ${city}` : ""} | ${isService ? "Electronics Repair & Home Services" : category} | SwiftMart`;
  const seoDescription = `${formattedDescription} Verified partner on SwiftMart with ${dynamicEta}.`;
  const seoKeywords = `${storeName}, ${storeName} ${city}, ${storeName} storefront, ${category}, ${isService ? "appliance repair balurghat, electronics repair" : "order online"}, SwiftMart ${city}`;

  const handleShare = () => {
    const fullUrl = shopCanonicalUrl;
    const shareText = isService
      ? `Book electronics repair & home service directly from ${storeName} in ${city} on SwiftMart! ${fullUrl}`
      : `Order directly from ${storeName}'s storefront in ${city} with ${dynamicEta} delivery on SwiftMart! ${fullUrl}`;

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

  const handleBookService = (product?: Product) => {
    const serviceName = product?.name || (vendorProducts[0]?.name ?? "Electronics Repair");
    setLocation(`/services?service=${encodeURIComponent(serviceName)}&shopId=${encodeURIComponent(shop.id)}`);
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
            name: storeName,
            legalName: `${storeName} — SwiftMart ${isService ? "Service Partner" : "Official Storefront"}`,
            alternateName: [storeName, `${storeName} ${city}`, `${storeName} Storefront`],
            description: seoDescription,
            image: shop.image && shop.image !== "/assets/shop-placeholder.png" ? shop.image : "https://swiftmart.space/opengraph.jpg",
            url: shopCanonicalUrl,
            telephone: shop.phone || "+91 62961 18949",
            priceRange: "₹₹",
            currenciesAccepted: "INR",
            paymentAccepted: "Cash on Delivery, UPI, Cards, Net Banking",
            address: {
              "@type": "PostalAddress",
              streetAddress: formattedAddress,
              addressLocality: city,
              postalCode: pincode,
              addressRegion: "West Bengal",
              addressCountry: "IN",
            },
            ...(googleBusinessUrl && {
              hasMap: googleBusinessUrl,
              sameAs: [googleBusinessUrl],
            }),
            areaServed: {
              "@type": "City",
              name: city,
            },
          },
        ]}
      />

      {/* ── Breadcrumb Navigation ── */}
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
        <span aria-hidden="true">/</span>
        <span className="text-foreground font-bold truncate">{storeName}</span>
      </nav>

      {/* ── 1. Clean, Focused Storefront Hero Banner (P0 Issue #1) ── */}
      <div className="relative h-44 sm:h-52 md:h-60 w-full bg-slate-950 overflow-hidden">
        <img
          src={shop.image || "/assets/shop-placeholder.png"}
          alt={`${storeName} storefront in ${city}`}
          width={1200}
          height={360}
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/30" />

        <Link
          href="/stores"
          className="absolute top-4 left-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors cursor-pointer"
          aria-label="Back to all stores"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Hero Content */}
        <div className="absolute bottom-4 left-4 right-4 text-white flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight flex items-center gap-2">
                <span>{storeName}</span>
                {isVerified && (
                  <span
                    onClick={() => setVerificationModalOpen(true)}
                    className="inline-flex text-emerald-400 cursor-pointer hover:scale-110 transition-transform"
                    title="Verified by SwiftMart"
                  >
                    ✓
                  </span>
                )}
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              {isService ? "Electronics Repair & Home Services" : category}
            </p>

            <div className="flex items-center gap-2 pt-0.5 text-xs text-slate-300 font-semibold flex-wrap">
              <span>📍 {city}</span>
              <span>•</span>
              <span className={`inline-flex items-center gap-1 ${shop.isOpen ? "text-emerald-400" : "text-rose-400"}`}>
                <span className={`w-2 h-2 rounded-full ${shop.isOpen ? "bg-emerald-400" : "bg-rose-400"}`} />
                {shop.isOpen ? "Open" : "Closed"}
              </span>
              <span>•</span>
              <span className="text-amber-400">⚡ {dynamicEta}</span>
            </div>
          </div>

          {/* Primary Action Button right in Hero */}
          <div className="shrink-0 flex items-center gap-2">
            {isService ? (
              <a
                href="#services-catalog"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Wrench className="w-4 h-4" />
                <span>Book Service</span>
              </a>
            ) : (
              <a
                href="#products-catalog"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <span>Browse Products</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-5 space-y-6">
        {/* ── 2. Quick Trust Row & Verified Badge (P0 Issue #2) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3.5 sm:p-4 rounded-2xl border border-border/50 shadow-xs">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Rating */}
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-current" />
              <div className="flex flex-col">
                <span className="font-bold text-xs sm:text-sm text-foreground leading-none">
                  {Number(shop.rating || 0) > 0 ? Number(shop.rating).toFixed(1) : "New on SwiftMart"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {Number(shop.totalOrders || 0) > 0 ? `${shop.totalOrders}+ orders` : "Verified Partner"}
                </span>
              </div>
            </div>

            {/* Visit / Delivery Estimate */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <div className="flex flex-col">
                <span className="font-bold text-xs sm:text-sm text-foreground leading-none">{dynamicEta}</span>
                <span className="text-[10px] text-muted-foreground">{isService ? "Service window" : "Delivery estimate"}</span>
              </div>
            </div>

            {/* Verified by SwiftMart — Single clickable badge with popup (Issue #2) */}
            {isVerified && (
              <button
                type="button"
                onClick={() => setVerificationModalOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                title="Tap to see verification details"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-extrabold text-[11px]">✓ Verified by SwiftMart</span>
              </button>
            )}
          </div>

          {/* Share & WhatsApp */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleShare}
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-bold gap-1.5 h-8 sm:h-9 bg-background/80 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Share"}</span>
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                isService
                  ? `Book doorstep electronics repair from ${storeName} in ${city} on SwiftMart! ${shopCanonicalUrl}`
                  : `Order online from ${storeName} in ${city} with fast delivery on SwiftMart! ${shopCanonicalUrl}`
              )}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold px-3 py-1.5 sm:py-2 rounded-full transition-colors shadow-xs"
            >
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* ── 3. Compact Google Business Profile Trust Row (P0 Issue #3) ── */}
        {googleBusinessUrl && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 border border-border/50 rounded-2xl p-3 sm:p-3.5 text-xs shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-card border border-border/60 flex items-center justify-center shrink-0">
                <GoogleGLogo className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-foreground">Google Business Profile</span>
                  <span className="text-emerald-500 text-[10px] font-bold">✓</span>
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span>⭐ Verified Listing</span>
                  <span>•</span>
                  <span>📍 {city}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={googleBusinessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-card border border-border/60 hover:bg-muted text-foreground transition-all cursor-pointer"
              >
                <span>Reviews</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </a>
              <a
                href={googleBusinessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer"
              >
                <Navigation className="w-3 h-3" />
                <span>Directions</span>
              </a>
            </div>
          </div>
        )}

        {!shop.isOpen && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-300/40 text-red-600 dark:text-red-400 rounded-2xl p-3.5">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-sm">Shop is currently closed</p>
              <p className="text-xs mt-0.5 opacity-80">This store has paused orders. You can browse services/products, but cannot place an order right now.</p>
            </div>
          </div>
        )}

        {/* Custom Cake Banner for Bakeries */}
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
                className="rounded-full font-black bg-white text-pink-600 hover:bg-pink-50 shadow-md text-sm px-6 shrink-0 cursor-pointer"
              >
                Customize Cake 🎂
              </Button>
            </div>

            <CustomCakeModal
              isOpen={isCustomCakeOpen}
              onClose={() => setIsCustomCakeOpen(false)}
              shop={{
                id: shop.id,
                shopName: storeName,
                address: {
                  city: shop.city,
                  pincode: shop.pincode,
                },
              }}
            />
          </>
        )}

        {/* ── In-Store Product/Service Search ── */}
        {vendorProducts.length > 4 && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder={`Search in ${storeName}...`}
              className="pl-10 h-11 bg-card rounded-2xl border-border/60 text-sm"
            />
          </div>
        )}

        {/* ── 4. Merchant-Type-Aware Catalog / Service Cards (P0 Issues #4, #5, #6, #7, #8) ── */}
        <div id={isService ? "services-catalog" : "products-catalog"} className="space-y-4 scroll-mt-20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-foreground">
              {productSearch.trim()
                ? `Search Results in ${storeName}`
                : isService
                  ? "Available Services & Repairs"
                  : isRestaurant
                    ? "Restaurant Menu & Food Items"
                    : isBakery
                      ? "Fresh Bakes & Cakes"
                      : "Store Products & Daily Essentials"}
            </h2>
            {!productsLoading && filteredProducts.length > 0 && (
              <span className="text-xs text-muted-foreground font-medium">({filteredProducts.length} items)</span>
            )}
          </div>

          {productsLoading && vendorProducts.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-muted/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            isService ? (
              /* Dedicated Service Provider 3-Column Balanced Layout (Issue #6) */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProducts.map((p) => (
                  <ServiceCard
                    key={p.id}
                    product={p}
                    shopName={storeName}
                    onViewDetails={(item) => setSelectedServiceForDetails(item)}
                    onBookService={(item) => handleBookService(item)}
                  />
                ))}
              </div>
            ) : (
              /* Standard Retail / Food / Grocery Product Grid */
              <>
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: { staggerChildren: 0.05 },
                    },
                  }}
                >
                  <ProductGrid products={filteredProducts} />
                </motion.div>

                <div ref={shopObserverRef} className="h-6 w-full" />

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
                      className="rounded-full text-xs font-semibold px-6 hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                    >
                      Load More Items
                    </Button>
                  </div>
                )}
              </>
            )
          ) : (
            <EmptyState
              icon={PackageOpen}
              title={productSearch.trim() ? "No matching items found" : "No items listed yet"}
              description={productSearch.trim() ? `No items matched "${productSearch}" in ${storeName}.` : "This merchant has not added items yet. Check back soon!"}
            />
          )}
        </div>

        {/* ── 5. "How Service Booking Works" (for Service Providers) ── */}
        {isService && (
          <section aria-label="How Service Booking Works" className="rounded-3xl bg-card border border-blue-500/20 p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-500" />
              <h3 className="text-base font-black text-foreground">How Service Booking Works</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/40 space-y-1">
                <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-500 font-extrabold flex items-center justify-center text-xs mb-1">
                  1
                </span>
                <p className="font-bold text-foreground">Choose Service</p>
                <p className="text-[11px] text-muted-foreground">Select your appliance or repair type above.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/40 space-y-1">
                <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-500 font-extrabold flex items-center justify-center text-xs mb-1">
                  2
                </span>
                <p className="font-bold text-foreground">Select Slot</p>
                <p className="text-[11px] text-muted-foreground">Pick your preferred date and convenient time window.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/40 space-y-1">
                <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-500 font-extrabold flex items-center justify-center text-xs mb-1">
                  3
                </span>
                <p className="font-bold text-foreground">Technician Visit</p>
                <p className="text-[11px] text-muted-foreground">Certified technician arrives at your home for diagnosis.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/40 space-y-1">
                <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-500 font-extrabold flex items-center justify-center text-xs mb-1">
                  4
                </span>
                <p className="font-bold text-foreground">Service Completed</p>
                <p className="text-[11px] text-muted-foreground">Transparent pricing, genuine spares &amp; warranty support.</p>
              </div>
            </div>
          </section>
        )}

        {/* ── 6. Streamlined Trust Section (Issues #10, #11, #12, #13) ── */}
        <section aria-label="Trust and Transparency" className="bg-card/70 border border-border/60 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-bold text-foreground">
              {isService ? `Why book ${storeName} through SwiftMart?` : `Why shop with ${storeName} on SwiftMart?`}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-background/80 p-3.5 rounded-2xl border border-border/40 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Verified Partner</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Business details &amp; merchant on-ground presence checked.
              </p>
            </div>

            <div className="bg-background/80 p-3.5 rounded-2xl border border-border/40 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Transparent Pricing</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isService ? "Know inspection and service charges before booking." : "Direct merchant prices with clear delivery fee."}
              </p>
            </div>

            <div className="bg-background/80 p-3.5 rounded-2xl border border-border/40 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>SwiftMart Support</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Dedicated help with your booking &amp; order coordination.
              </p>
            </div>

            <div className="bg-background/80 p-3.5 rounded-2xl border border-border/40 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{isService ? "On-site Service" : "Direct Fulfillment"}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isService ? "Service delivered at your location." : `Fast local delivery: ${dynamicEta}.`}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-2">
            <span>
              {isService
                ? `Service provided by ${storeName} · Booking powered by SwiftMart`
                : `Sold & prepared by ${storeName} · Ordering & delivery powered by SwiftMart`}
            </span>
            <span className="font-semibold text-foreground">
              {isService ? "Secure Booking" : "Safe & Encrypted Ordering"}
            </span>
          </div>
        </section>

        {/* ── 7. Polished About Section (Issues #14, #15, #16) ── */}
        <section aria-label="About This Store" className="bg-card/50 border border-border/50 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">About {storeName}</h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {formattedDescription}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
            <div className="bg-background/70 p-3.5 rounded-2xl border border-border/40 space-y-1">
              <span className="font-bold text-foreground block">📍 Location</span>
              <span className="text-[11px] text-muted-foreground block leading-relaxed">
                {formattedAddress}
              </span>
              {googleBusinessUrl && (
                <a
                  href={googleBusinessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline pt-1"
                >
                  <span>Directions</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>

            <div className="bg-background/70 p-3.5 rounded-2xl border border-border/40 space-y-1">
              <span className="font-bold text-foreground block">⏱️ Operating Hours</span>
              <span className="text-[11px] text-muted-foreground block">
                Mon &ndash; Sun: 07:00 AM &ndash; 11:00 PM
              </span>
            </div>

            <div className="bg-background/70 p-3.5 rounded-2xl border border-border/40 space-y-1">
              <span className="font-bold text-foreground block">📞 Public Contact</span>
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

            <div className="bg-background/70 p-3.5 rounded-2xl border border-border/40 space-y-1">
              <span className="font-bold text-foreground block">
                {isService ? "⚡ Service Area" : "⚡ Fulfillment Area"}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                {isService ? "Balurghat and nearby areas" : `${city} and surrounding neighborhoods`}
              </span>
            </div>
          </div>
        </section>

        {/* ── 8. Category-Aware Related Stores (Issues #17, #18, #19) ── */}
        {(() => {
          const allList = allShops && allShops.length > 0 ? allShops : shops;
          // Filter out current shop and internal/admin shops (Issue #18)
          const filtered = (allList || []).filter(
            (s) =>
              s &&
              s.id !== shop.id &&
              !s.storeName.toLowerCase().includes("admin") &&
              !s.id.toLowerCase().includes("admin")
          );

          // Find category matches first (Issue #19)
          let related = filtered.filter((s) => {
            const sCat = (s.category || "").toLowerCase();
            const sType = (s.shopType || "").toLowerCase();
            const sName = (s.storeName || "").toLowerCase();
            if (isService) {
              return sCat.includes("service") || sCat.includes("electronic") || sType.includes("service") || sName.includes("service") || sName.includes("repair");
            }
            if (isBakery) {
              return sCat.includes("bakery") || sCat.includes("cake") || sCat.includes("sweet");
            }
            if (isRestaurant) {
              return sCat.includes("food") || sCat.includes("restaurant") || sCat.includes("cafe");
            }
            return sCat.includes(category.toLowerCase());
          });

          // Fallback to other verified local stores if not enough category matches
          if (related.length < 4) {
            const others = filtered.filter((s) => !related.some((r) => r.id === s.id));
            related = [...related, ...others].slice(0, 4);
          } else {
            related = related.slice(0, 4);
          }

          if (related.length === 0) return null;

          const sectionTitle = isService
            ? `More Electronics & Service Stores in ${city}`
            : isBakery
              ? `More Bakeries & Sweets in ${city}`
              : isRestaurant
                ? `More Food & Restaurants in ${city}`
                : `More Stores in ${city}`;

          return (
            <section aria-label="Related Stores" className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">{sectionTitle}</h3>
                <Link href="/stores" className="text-xs font-bold text-primary hover:underline">
                  View All Stores &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    href={getShopUrl(r)}
                    className="group block bg-card rounded-2xl border border-border/50 p-3 hover:border-primary/50 transition-all shadow-2xs hover:shadow-xs"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-background border border-border/40 mb-2">
                      <img
                        src={r.image || "/assets/shop-placeholder.png"}
                        alt={r.storeName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {r.storeName}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
                      <span className="truncate">{r.category || "Store"}</span>
                      <span className="font-semibold shrink-0">
                        {Number(r.rating || 0) > 0 ? `★ ${Number(r.rating).toFixed(1)}` : "New"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })()}
      </div>

      {/* ── Verification Badge Modal ── */}
      <VerificationBadgeModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        storeName={storeName}
      />

      {/* ── Service Details Modal ── */}
      <ServiceDetailsModal
        product={selectedServiceForDetails}
        storeName={storeName}
        isOpen={!!selectedServiceForDetails}
        onClose={() => setSelectedServiceForDetails(null)}
        onBook={(item) => {
          setSelectedServiceForDetails(null);
          handleBookService(item);
        }}
      />
    </div>
  );
}
