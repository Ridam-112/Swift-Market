import express, { type Express, type Request, type Response, type NextFunction } from "express";
import * as helmetModule from "helmet";
import * as compressionModule from "compression";
import * as pinoHttpModule from "pino-http";

const helmet: any = (helmetModule as any).default || helmetModule;
const compression: any = (compressionModule as any).default || compressionModule;
const pinoHttp: any = (pinoHttpModule as any).default || pinoHttpModule;
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { globalApiLimiter } from "./middlewares/rateLimiter.js";
import { maintenanceMode } from "./middlewares/maintenanceMode.js";
import { db } from "@workspace/db";
import * as schema from "@workspace/db";
import { eq, or } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "https://swiftmart.space";

// ─── Dynamic Split XML Sitemap System ───────────────────────────────────────
// Generated dynamically from DB records. Caches expire after 1 hour.
// Fully compliant with Google Search Console sitemap index protocol.
let sitemapIndexCache: { xml: string; builtAt: number } | null = null;
let sitemapPagesCache: { xml: string; builtAt: number } | null = null;
let sitemapStoresCache: { xml: string; builtAt: number } | null = null;
let sitemapCategoriesCache: { xml: string; builtAt: number } | null = null;
let sitemapProductsCache: { xml: string; builtAt: number } | null = null;
const SITEMAP_TTL_MS = 60 * 60 * 1000; // 1 hour

function normalizeSlug(name?: string | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/gu, "");
}

function formatCategoryTitle(slug: string): string {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

const STATIC_SITEMAP_URLS: Array<{ loc: string; changefreq: string; priority: string }> = [
  { loc: `${BASE_URL}/`,                    changefreq: "daily",   priority: "1.0" },
  { loc: `${BASE_URL}/stores`,              changefreq: "daily",   priority: "0.9" },
  { loc: `${BASE_URL}/products`,            changefreq: "daily",   priority: "0.9" },
  { loc: `${BASE_URL}/categories`,          changefreq: "weekly",  priority: "0.8" },
  { loc: `${BASE_URL}/grocery`,             changefreq: "daily",   priority: "0.8" },
  { loc: `${BASE_URL}/services`,            changefreq: "weekly",  priority: "0.8" },
  { loc: `${BASE_URL}/mall`,                changefreq: "weekly",  priority: "0.8" },
  { loc: `${BASE_URL}/about`,               changefreq: "monthly", priority: "0.7" },
  { loc: `${BASE_URL}/search`,              changefreq: "weekly",  priority: "0.7" },
  { loc: `${BASE_URL}/contact-support`,     changefreq: "monthly", priority: "0.6" },
  { loc: `${BASE_URL}/privacy`,             changefreq: "monthly", priority: "0.5" },
  { loc: `${BASE_URL}/terms`,               changefreq: "monthly", priority: "0.5" },
  { loc: `${BASE_URL}/refund-cancellation`, changefreq: "monthly", priority: "0.5" },
];

async function buildSitemapIndex(): Promise<string> {
  if (sitemapIndexCache && Date.now() - sitemapIndexCache.builtAt < SITEMAP_TTL_MS) {
    return sitemapIndexCache.xml;
  }
  const today = new Date().toISOString().split("T")[0]!;
  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    `  <sitemap><loc>${BASE_URL}/sitemap-pages.xml</loc><lastmod>${today}</lastmod></sitemap>`,
    `  <sitemap><loc>${BASE_URL}/sitemap-stores.xml</loc><lastmod>${today}</lastmod></sitemap>`,
    `  <sitemap><loc>${BASE_URL}/sitemap-categories.xml</loc><lastmod>${today}</lastmod></sitemap>`,
    `  <sitemap><loc>${BASE_URL}/sitemap-products.xml</loc><lastmod>${today}</lastmod></sitemap>`,
    `</sitemapindex>`,
  ].join("\n");
  sitemapIndexCache = { xml, builtAt: Date.now() };
  return xml;
}

async function buildPagesSitemap(): Promise<string> {
  if (sitemapPagesCache && Date.now() - sitemapPagesCache.builtAt < SITEMAP_TTL_MS) {
    return sitemapPagesCache.xml;
  }
  const today = new Date().toISOString().split("T")[0]!;
  const urlTags = STATIC_SITEMAP_URLS.map(u =>
    `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
  );
  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urlTags,
    `</urlset>`,
  ].join("\n");
  sitemapPagesCache = { xml, builtAt: Date.now() };
  return xml;
}

async function buildStoresSitemap(): Promise<string> {
  if (sitemapStoresCache && Date.now() - sitemapStoresCache.builtAt < SITEMAP_TTL_MS) {
    return sitemapStoresCache.xml;
  }
  const fmt = (d: Date | string | null | undefined): string =>
    d ? new Date(d as Date).toISOString().split("T")[0]! : new Date().toISOString().split("T")[0]!;
  const today = new Date().toISOString().split("T")[0]!;

  const shopRows = await db
    .select({
      id: schema.shops.id,
      shopName: schema.shops.shopName,
      slug: schema.shops.slug,
      address: schema.shops.address,
      updatedAt: schema.shops.updatedAt,
    })
    .from(schema.shops)
    .where(or(eq(schema.shops.status, "approved"), eq(schema.shops.status, "active")));

  const distinctCities = new Set<string>();
  const urlTags: string[] = [];

  for (const s of shopRows) {
    const slug = s.slug || normalizeSlug(s.shopName);
    if (slug) {
      urlTags.push(
        `  <url><loc>${BASE_URL}/stores/${slug}</loc><lastmod>${fmt(s.updatedAt)}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`
      );
    }
    const addr = s.address as Record<string, any> | null;
    const city = addr?.city ? String(addr.city).trim() : "";
    if (city) {
      distinctCities.add(normalizeSlug(city));
    }
  }

  // Include dynamic location pages for cities with verified merchant content
  for (const citySlug of distinctCities) {
    urlTags.push(
      `  <url><loc>${BASE_URL}/stores/${citySlug}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`
    );
  }

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urlTags,
    `</urlset>`,
  ].join("\n");
  sitemapStoresCache = { xml, builtAt: Date.now() };
  return xml;
}

async function buildCategoriesSitemap(): Promise<string> {
  if (sitemapCategoriesCache && Date.now() - sitemapCategoriesCache.builtAt < SITEMAP_TTL_MS) {
    return sitemapCategoriesCache.xml;
  }
  const fmt = (d: Date | string | null | undefined): string =>
    d ? new Date(d as Date).toISOString().split("T")[0]! : new Date().toISOString().split("T")[0]!;
  const today = new Date().toISOString().split("T")[0]!;

  const [categoryRows, shopRows] = await Promise.all([
    db.select({ slug: schema.categories.slug, updatedAt: schema.categories.updatedAt })
      .from(schema.categories)
      .where(eq(schema.categories.isActive, true)),
    db.select({ category: schema.shops.category, address: schema.shops.address })
      .from(schema.shops)
      .where(or(eq(schema.shops.status, "approved"), eq(schema.shops.status, "active"))),
  ]);

  const urlTags: string[] = categoryRows.map(c =>
    `  <url><loc>${BASE_URL}/category/${c.slug}</loc><lastmod>${fmt(c.updatedAt)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
  );

  // Dynamic city+category combination pages that contain active real merchants
  const seenCityCat = new Set<string>();
  for (const s of shopRows) {
    const addr = s.address as Record<string, any> | null;
    const city = addr?.city ? normalizeSlug(String(addr.city)) : "";
    const cat = s.category ? normalizeSlug(s.category) : "";
    if (city && cat) {
      const key = `${city}/${cat}`;
      if (!seenCityCat.has(key)) {
        seenCityCat.add(key);
        urlTags.push(
          `  <url><loc>${BASE_URL}/stores/${key}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`
        );
      }
    }
  }

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urlTags,
    `</urlset>`,
  ].join("\n");
  sitemapCategoriesCache = { xml, builtAt: Date.now() };
  return xml;
}

async function buildProductsSitemap(): Promise<string> {
  if (sitemapProductsCache && Date.now() - sitemapProductsCache.builtAt < SITEMAP_TTL_MS) {
    return sitemapProductsCache.xml;
  }
  const fmt = (d: Date | string | null | undefined): string =>
    d ? new Date(d as Date).toISOString().split("T")[0]! : new Date().toISOString().split("T")[0]!;

  const productRows = await db
    .select({ id: schema.products.id, updatedAt: schema.products.updatedAt })
    .from(schema.products)
    .where(eq(schema.products.status, "active"));

  const urlTags = productRows.map(p =>
    `  <url><loc>${BASE_URL}/product/${p.id}</loc><lastmod>${fmt(p.updatedAt)}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
  );

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urlTags,
    `</urlset>`,
  ].join("\n");
  sitemapProductsCache = { xml, builtAt: Date.now() };
  return xml;
}

// ─── Shop Storefront In-Memory SEO Cache ─────────────────────────────────────
// Caches shop metadata for 30 minutes so crawling or sharing shop storefront
// links (e.g. /stores/rock-n-rolls) serves dynamically pre-rendered HTML
// instantly with 0 ms DB query delay and zero Neon DB compute overhead.
export interface ShopSeoMeta {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  shopType: string;
  image: string;
  streetAddress: string;
  city: string;
  citySlug: string;
  pincode: string;
  rating: number;
  totalOrders: number;
  phone: string;
  eta: string;
  claimStatus: string;
  verificationStatus: string;
  googleBusinessUrl?: string;
  lat?: number;
  lng?: number;
  schemaTypes: string[];
}

export interface CitySeoMeta {
  city: string;
  citySlug: string;
  count: number;
  categories: Set<string>;
}

let shopSeoCache: {
  bySlug: Map<string, ShopSeoMeta>;
  byId: Map<string, ShopSeoMeta>;
  cities: Map<string, CitySeoMeta>;
  cachedAt: number;
} | null = null;
const SHOP_SEO_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function getShopSeoMaps(): Promise<{
  bySlug: Map<string, ShopSeoMeta>;
  byId: Map<string, ShopSeoMeta>;
  cities: Map<string, CitySeoMeta>;
}> {
  if (shopSeoCache && Date.now() - shopSeoCache.cachedAt < SHOP_SEO_TTL_MS) {
    return shopSeoCache;
  }
  try {
    const shopRows = await db
      .select({
        id: schema.shops.id,
        shopName: schema.shops.shopName,
        shopType: schema.shops.shopType,
        category: schema.shops.category,
        description: schema.shops.description,
        image: schema.shops.image,
        banner: schema.shops.banner,
        address: schema.shops.address,
        rating: schema.shops.rating,
        totalOrders: schema.shops.totalOrders,
        phone: schema.shops.phone,
        slug: schema.shops.slug,
        claimStatus: schema.shops.claimStatus,
        verificationStatus: schema.shops.verificationStatus,
        eta: schema.shops.eta,
        googleBusinessUrl: schema.shops.googleBusinessUrl,
      })
      .from(schema.shops)
      .where(or(eq(schema.shops.status, "approved"), eq(schema.shops.status, "active")));

    const bySlug = new Map<string, ShopSeoMeta>();
    const byId = new Map<string, ShopSeoMeta>();
    const cities = new Map<string, CitySeoMeta>();

    for (const s of shopRows) {
      const slug = s.slug || normalizeSlug(s.shopName);
      const addr = s.address as Record<string, any> | null;
      const city = addr?.city ? String(addr.city).trim() : "Local";
      const citySlug = normalizeSlug(city);
      const pincode = addr?.pincode ? String(addr.pincode).trim() : "";
      const streetAddress = addr?.line1 ? String(addr.line1).trim() : (addr?.city || "");
      const lat = typeof addr?.lat === "number" ? addr.lat : (typeof addr?.latitude === "number" ? addr.latitude : undefined);
      const lng = typeof addr?.lng === "number" ? addr.lng : (typeof addr?.longitude === "number" ? addr.longitude : undefined);
      const category = s.category || "General Store";
      const shopType = s.shopType || category;
      const schemaTypes = getMerchantSchemaType(category, shopType, s.shopName || "");

      // Dynamic ETA based on merchant capability
      let eta = s.eta;
      if (!eta) {
        if (schemaTypes.includes("Service")) {
          eta = "On-site visit & inspection";
        } else if (schemaTypes.includes("Bakery")) {
          eta = "Same-day delivery & pre-order";
        } else if (schemaTypes.includes("Restaurant")) {
          eta = "20-30 min";
        } else {
          eta = "15-25 min";
        }
      }

      // Dynamic human-readable meta description using actual merchant data
      let autoDesc = s.description;
      if (!autoDesc) {
        if (schemaTypes.includes("Service")) {
          autoDesc = `Official online storefront for ${s.shopName} in ${city}. Explore electronics, repair solutions, and book on-site inspection directly on SwiftMart.`;
        } else if (schemaTypes.includes("Restaurant")) {
          autoDesc = `Order food online from ${s.shopName} in ${city} on SwiftMart. Live menu, genuine prices, and fast ${eta} local delivery to your doorstep.`;
        } else if (schemaTypes.includes("Bakery")) {
          autoDesc = `Order delicious cakes, fresh pastries, and custom designer cakes from ${s.shopName} in ${city} on SwiftMart. ${eta} doorstep delivery or pickup.`;
        } else if (schemaTypes.includes("ClothingStore")) {
          autoDesc = `Shop apparel, footwear, and fashion collections from ${s.shopName} in ${city} on SwiftMart. ${eta} local doorstep delivery.`;
        } else {
          autoDesc = `Official online storefront for ${s.shopName} in ${city} on SwiftMart. Browse live products, verified prices, daily discounts, and order online with ${eta} delivery.`;
        }
      }

      const info: ShopSeoMeta = {
        id: s.id,
        name: s.shopName || "Local Store",
        slug,
        description: autoDesc,
        category,
        shopType,
        image: s.image || s.banner || `${BASE_URL}/opengraph.jpg`,
        streetAddress,
        city,
        citySlug,
        pincode,
        rating: Number(s.rating || 0),
        totalOrders: Number(s.totalOrders || 0),
        phone: s.phone || "+91 62961 18949",
        eta,
        claimStatus: s.claimStatus || "claimed",
        verificationStatus: s.verificationStatus || "verified",
        googleBusinessUrl: s.googleBusinessUrl || undefined,
        lat,
        lng,
        schemaTypes,
      };

      byId.set(s.id, info);
      if (slug) {
        bySlug.set(slug, info);
      }

      // Group cities for dynamic city discovery pages
      if (citySlug) {
        let cityRecord = cities.get(citySlug);
        if (!cityRecord) {
          cityRecord = { city, citySlug, count: 0, categories: new Set() };
          cities.set(citySlug, cityRecord);
        }
        cityRecord.count++;
        if (category) cityRecord.categories.add(normalizeSlug(category));
      }
    }

    shopSeoCache = { bySlug, byId, cities, cachedAt: Date.now() };
    return shopSeoCache;
  } catch (err) {
    logger.error({ err }, "Failed to load shop SEO cache");
    return shopSeoCache || { bySlug: new Map(), byId: new Map(), cities: new Map() };
  }
}

const RESERVED_ROOT_PATHS = new Set([
  "",
  "api",
  "assets",
  "auth",
  "admin",
  "cart",
  "checkout",
  "order",
  "orders",
  "profile",
  "notifications",
  "vendor",
  "vendor-register",
  "vendor-status",
  "delivery",
  "delivery-dashboard",
  "manager-panel",
  "privacy",
  "terms",
  "about",
  "contact-support",
  "refund-cancellation",
  "search",
  "categories",
  "category",
  "products",
  "product",
  "section",
  "shops",
  "stores",
  "grocery",
  "services",
  "service-corner",
  "send-parcel",
  "mall",
  "super-mall",
  "custom-cakes",
  "sitemap",
  "health",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
  "manifest.json",
  "sw.js",
  "complete-profile",
  "google-callback",
  "delete-account",
]);

const KNOWN_SPA_PREFIXES = new Set([
  "",
  "stores",
  "shop",
  "shops",
  "products",
  "product",
  "categories",
  "category",
  "section",
  "grocery",
  "services",
  "service-corner",
  "send-parcel",
  "mall",
  "super-mall",
  "cart",
  "checkout",
  "order",
  "orders",
  "custom-cakes",
  "profile",
  "notifications",
  "vendor-register",
  "vendor-status",
  "auth",
  "about",
  "contact-support",
  "privacy",
  "terms",
  "refund-cancellation",
  "search",
  "vendor",
  "admin",
  "delivery",
  "manager-panel",
  "complete-profile",
  "google-callback",
  "delete-account",
]);

const STATIC_PAGE_SEO: Record<string, { title: string; desc: string }> = {
  "": {
    title: "SwiftMart — Everything You Need, Delivered Fast | Local Stores, Food & Services",
    desc: "Shop from verified local stores, order food and fresh groceries, discover products, and book home electronics services across Balurghat on SwiftMart.",
  },
  "about": {
    title: "About SwiftMart | Local Commerce, Food, Groceries & Services",
    desc: "Learn about SwiftMart — Balurghat's local commerce platform connecting customers with verified local merchants, restaurants, and home service providers.",
  },
  "privacy": {
    title: "Privacy Policy | SwiftMart",
    desc: "Read the SwiftMart privacy policy to understand how customer, merchant, and delivery partner information is safely processed and protected.",
  },
  "terms": {
    title: "Terms of Service | SwiftMart",
    desc: "Terms and conditions governing the use of SwiftMart's local marketplace, delivery services, and vendor platform.",
  },
  "refund-cancellation": {
    title: "Refund & Cancellation Policy | SwiftMart",
    desc: "Transparent refund, return, and cancellation policies for grocery, food, retail orders and home service bookings on SwiftMart.",
  },
  "contact-support": {
    title: "Contact & Support | SwiftMart",
    desc: "Reach SwiftMart customer support for order tracking, payment inquiries, merchant help, and customer assistance.",
  },
  "search": {
    title: "Search Products, Stores & Services | SwiftMart",
    desc: "Search across hundreds of verified local stores, products, restaurant dishes, groceries, and home electronics repair services.",
  },
  "grocery": {
    title: "Grocery & Fresh Essentials | SwiftMart",
    desc: "Order fresh vegetables, fruits, dairy, staples, and daily household essentials from verified local grocers delivered fast to your doorstep.",
  },
  "services": {
    title: "Service Corner | TV, AC, Appliances & Home Services | SwiftMart",
    desc: "Book verified local technicians for TV, AC, refrigerator, washing machine, and electrical repairs with transparent pricing on SwiftMart.",
  },
  "service-corner": {
    title: "Service Corner | TV, AC, Appliances & Home Services | SwiftMart",
    desc: "Book verified local technicians for TV, AC, refrigerator, washing machine, and electrical repairs with transparent pricing on SwiftMart.",
  },
  "mall": {
    title: "SwiftMart Mall | Direct Products & Collections",
    desc: "Explore fashion, electronics, beauty, and home lifestyle collections delivered across India directly from SwiftMart Mall.",
  },
  "super-mall": {
    title: "SwiftMart Mall | Direct Products & Collections",
    desc: "Explore fashion, electronics, beauty, and home lifestyle collections delivered across India directly from SwiftMart Mall.",
  },
  "products": {
    title: "All Products & Catalog | SwiftMart",
    desc: "Browse our complete catalog of groceries, daily essentials, electronics, fashion, and home products with real-time stock and prices.",
  },
  "categories": {
    title: "Browse by Category | SwiftMart",
    desc: "Explore all product and store categories on SwiftMart including groceries, food, bakery, electronics, fashion, and home repairs.",
  },
  "send-parcel": {
    title: "Send Parcel | Fast Local Doorstep Pickup & Delivery | SwiftMart",
    desc: "Send documents, keys, packages, and parcels across the city with SwiftMart's reliable doorstep pickup and delivery partner network.",
  },
};
// ─────────────────────────────────────────────────────────────────────────────

const app: Express = express();

// Gzip compression — applied before all routes so every JSON and static
// response is compressed. Skips already-compressed content (images, etc.)
// via the default filter. No-op for responses smaller than 1 KB (threshold).
app.use(compression({ threshold: 1024 }));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res: any) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Security headers — applied before CORS so headers are always present.
// The server also serves the React SPA static assets, so the CSP must
// allow scripts, styles, fonts, and third-party resources used by the frontend.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc:    ["'self'"],
      scriptSrc:     ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com", "https://www.gstatic.com", "https://apis.google.com"],
      styleSrc:      ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:       ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc:        ["'self'", "data:", "blob:", "https:"],
      connectSrc:    ["'self'", "https:", "wss:", "https://www.googleapis.com", "https://firebaseinstallations.googleapis.com", "https://fcmregistrations.googleapis.com"],
      manifestSrc:   ["'self'"],
      workerSrc:     ["'self'", "blob:"],
      frameAncestors:["'none'"],
      formAction:    ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  // Allow external crawlers (Google Images, Bing, etc.) to load our assets
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // 'no-referrer' breaks Google Analytics referral signals; use the standard policy instead
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

// ─── CORS ────────────────────────────────────────────────────────────────────
// We implement CORS manually (instead of the `cors` package) so that the
// origin callback has access to `req.headers` for the same-origin check.
//
// Allowed origins (in production):
//   1. No Origin header  — server-to-server / curl / Googlebot crawl, always OK
//   2. Capacitor WebView — https://localhost or capacitor://localhost (APK)
//   3. Same-origin       — the request's Origin matches this server's own host
//                          (browser fetch from the deployed .replit.app page)
//   4. ALLOWED_ORIGINS   — explicit comma-separated override env var
//
// In development every origin is allowed (avoids Replit proxy IP confusion).
// ─────────────────────────────────────────────────────────────────────────────
const configuredOrigins = (process.env["ALLOWED_ORIGINS"] ?? "")
  .split(",").map(o => o.trim()).filter(Boolean);

const CAPACITOR_ORIGINS = new Set([
  "https://localhost",
  "capacitor://localhost",
  "http://localhost",
]);

const isProd = process.env["NODE_ENV"] === "production";

app.use((req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin as string | undefined;

  const resolveAllowed = (): string | null => {
    // No Origin header → not a browser cross-origin request; allow
    if (!origin) return "*";
    // Dev → allow everything
    if (!isProd) return origin;
    // Allow CORS for all GET requests to /api (public mobile app consumption for Flutter/web)
    if (req.method === "GET") return origin || "*";
    if (!req.path.startsWith("/api")) return "*";
    // API write routes: strict CORS — allow trusted origins
    if (CAPACITOR_ORIGINS.has(origin)) return origin;
    // Same-origin: browser fetch from the page served by THIS server.
    const host = ((req.headers["x-forwarded-host"] as string | undefined) ?? req.headers.host ?? "")
      .split(",")[0]?.trim() ?? "";
    const proto = ((req.headers["x-forwarded-proto"] as string | undefined) ?? "https")
      .split(",")[0]?.trim() ?? "https";
    if (host && origin === `${proto}://${host}`) return origin;
    // Explicit allowlist override
    if (configuredOrigins.includes(origin)) return origin;
    return origin || "*";
  };

  const allowed = resolveAllowed();

  if (allowed === null) {
    // Return 403 explicitly rather than escalating to the global error handler
    // (which would return 500 and be counted as a server error by Googlebot).
    logger.warn({ origin }, "CORS: blocked cross-origin request");
    res.status(403).json({ success: false, message: "Forbidden: cross-origin request not allowed" });
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,Accept,X-Requested-With");
  res.setHeader("Access-Control-Max-Age", "86400");

  // Respond to preflight immediately
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

app.use(express.json({
  verify: (req, _res, buf) => {
    // Capture raw body for Razorpay webhook signature verification
    if ((req as Request & { url?: string }).url?.includes("/payments/webhook")) {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    }
  },
}));
app.use(express.urlencoded({ extended: true }));

// ─── Health check — must be before rate limiter, API router, and maintenance ──
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: "swiftmart-api" });
});

// ─── www → non-www canonical redirect ────────────────────────────────────────
// www.swiftmart.space/... → swiftmart.space/... (301 permanent)
// Without this Google & SEO analyzers crawl both www and non-www.
app.use((req: Request, res: Response, next: NextFunction): void => {
  const host = (
    (req.headers["x-forwarded-host"] as string | undefined) ?? req.headers.host ?? ""
  ).split(",")[0]?.trim() ?? "";

  if (host.startsWith("www.")) {
    const proto = (
      (req.headers["x-forwarded-proto"] as string | undefined) ?? "https"
    ).split(",")[0]?.trim() ?? "https";
    const bare = host.slice(4); // strip leading "www."
    res.redirect(301, `${proto}://${bare}${req.url}`);
    return;
  }
  next();
});

// ─── Trailing-slash redirect ──────────────────────────────────────────────────
// /shops/ → /shops  (301 permanent)
app.use((req: Request, res: Response, next: NextFunction): void => {
  if (req.path.length > 1 && req.path.endsWith("/")) {
    const qs = req.url.slice(req.path.length); // preserve query string / hash
    res.redirect(301, req.path.slice(0, -1) + qs);
    return;
  }
  next();
});

// ─── Maintenance mode ─────────────────────────────────────────────────────────
// Placed after canonical redirects & body-parser but before API routes and static serving.
app.use(maintenanceMode);

// ─── Block scanner / exploit paths ───────────────────────────────────────────
const SCANNER_RE = /^\/(\.git|\.env|\.htaccess|wp-admin|wp-includes|wp-content|xmlrpc\.php|phpmyadmin|cgi-bin|admin\.php|config\.php)/i;
app.use((req: Request, res: Response, next: NextFunction): void => {
  if (SCANNER_RE.test(req.path)) {
    res.status(404).end();
    return;
  }
  next();
});

// ─── API routes ───────────────────────────────────────────────────────────────
// Add X-Robots-Tag: noindex to all /api responses so Googlebot never tries to
// index raw JSON endpoints as web pages (prevents spurious "discovered URLs").
app.use("/api", (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});

app.use("/api/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/api", globalApiLimiter, router);

// ─── Production: dynamic sitemap + React SPA ─────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const frontendDist = path.join(__dirname, "..", "..", "swiftmart", "dist", "public");

  // robots.txt — served inline (no dependency on build artifact) so it's always fresh
  // Explicit Allow: / as the first directive under User-agent: * is required for Google
  // Search Console to recognise the homepage as crawlable.
  const ROBOTS_TXT = [
    "User-agent: *",
    "Allow: /",
    "Allow: /stores",
    "Allow: /stores/",
    "Allow: /sitemap.xml",
    "Allow: /sitemap-pages.xml",
    "Allow: /sitemap-stores.xml",
    "Allow: /sitemap-categories.xml",
    "Allow: /sitemap-products.xml",
    "Allow: /robots.txt",
    "Disallow: /auth",
    "Disallow: /google-callback",
    "Disallow: /complete-profile",
    "Disallow: /cart",
    "Disallow: /checkout",
    "Disallow: /order/",
    "Disallow: /orders",
    "Disallow: /profile",
    "Disallow: /notifications",
    "Disallow: /vendor-register",
    "Disallow: /vendor-status",
    "Disallow: /vendor/",
    "Disallow: /admin",
    "Disallow: /manager-panel",
    "Disallow: /delivery-dashboard",
    "Disallow: /delivery/",
    "Disallow: /delete-account",
    "",
    "# AI Search & LLM Crawlers",
    "User-agent: GPTBot",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /cart",
    "Disallow: /checkout",
    "Disallow: /orders",
    "Disallow: /profile",
    "",
    "User-agent: ClaudeBot",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /cart",
    "Disallow: /checkout",
    "Disallow: /orders",
    "Disallow: /profile",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /cart",
    "Disallow: /checkout",
    "Disallow: /orders",
    "Disallow: /profile",
    "",
    "User-agent: Google-Extended",
    "Allow: /",
    "",
    "User-agent: Applebot",
    "Allow: /",
    "",
    "Sitemap: https://swiftmart.space/sitemap.xml",
    "Sitemap: https://swiftmart.space/sitemap-stores.xml",
    "Sitemap: https://swiftmart.space/sitemap-categories.xml",
    "Sitemap: https://swiftmart.space/sitemap-products.xml",
    "",
  ].join("\n");
  app.get("/robots.txt", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(ROBOTS_TXT);
  });

  // Dynamic split sitemaps — registered BEFORE express.static
  app.get("/sitemap.xml", async (_req: Request, res: Response) => {
    try {
      const xml = await buildSitemapIndex();
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
      res.send(xml);
    } catch (err) {
      logger.error({ err }, "Failed to generate sitemap index");
      res.status(200).setHeader("Content-Type", "application/xml; charset=utf-8")
        .send(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></sitemapindex>`);
    }
  });

  app.get("/sitemap-pages.xml", async (_req: Request, res: Response) => {
    try {
      const xml = await buildPagesSitemap();
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
      res.send(xml);
    } catch (err) {
      logger.error({ err }, "Failed to generate pages sitemap");
      res.status(200).setHeader("Content-Type", "application/xml; charset=utf-8")
        .send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
    }
  });

  app.get("/sitemap-stores.xml", async (_req: Request, res: Response) => {
    try {
      const xml = await buildStoresSitemap();
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
      res.send(xml);
    } catch (err) {
      logger.error({ err }, "Failed to generate stores sitemap");
      res.status(200).setHeader("Content-Type", "application/xml; charset=utf-8")
        .send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
    }
  });

  app.get("/sitemap-categories.xml", async (_req: Request, res: Response) => {
    try {
      const xml = await buildCategoriesSitemap();
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
      res.send(xml);
    } catch (err) {
      logger.error({ err }, "Failed to generate categories sitemap");
      res.status(200).setHeader("Content-Type", "application/xml; charset=utf-8")
        .send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
    }
  });

  app.get("/sitemap-products.xml", async (_req: Request, res: Response) => {
    try {
      const xml = await buildProductsSitemap();
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
      res.send(xml);
    } catch (err) {
      logger.error({ err }, "Failed to generate products sitemap");
      res.status(200).setHeader("Content-Type", "application/xml; charset=utf-8")
        .send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
    }
  });

  // Hashed assets (e.g. /assets/index-DP9kdDoW.js) are content-addressed — safe to cache forever.
  // HTML, manifest, robots.txt: use no-cache (revalidate) but NOT no-store.
  app.use(express.static(frontendDist, {
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
      }
    },
  }));

  app.get("/{*splat}", async (req: Request, res: Response) => {
    try {
      if (req.path.startsWith("/api")) {
        res.status(404).json({ success: false, message: "API endpoint not found" });
        return;
      }
      // Never serve SPA for dotfiles or scanner paths
      if (/\/\./.test(req.path) || SCANNER_RE.test(req.path)) {
        res.status(404).end();
        return;
      }
      const indexPath = path.join(frontendDist, "index.html");
      if (!fs.existsSync(indexPath)) {
        res.status(200).json({ ok: true, message: "SwiftMart API Server is running" });
        return;
      }

      const canonicalPath = req.path === "/" ? "/" : req.path.replace(/\/$/, "");
      const canonicalUrl = `${BASE_URL}${canonicalPath}`;
      res.setHeader("Link", `<${canonicalUrl}>; rel="canonical"`);
      res.setHeader("Cache-Control", "no-cache, must-revalidate");

      const cleanPath = req.path.replace(/^\/+|\/+$/g, "");
      try {
        const maps = await getShopSeoMaps();

      // ── 1. Legacy Permanent Redirects (301) ──────────────────────────────
      // /shops -> /stores
      if (cleanPath === "shops") {
        res.redirect(301, `${BASE_URL}/stores`);
        return;
      }

      // /shop/:id or /shops/:id -> /stores/:merchantSlug
      if (cleanPath.startsWith("shop/") || cleanPath.startsWith("shops/")) {
        const rawId = cleanPath.split("/")[1]?.trim();
        if (rawId) {
          const matched = maps.byId.get(rawId) || maps.bySlug.get(rawId.toLowerCase());
          if (matched?.slug) {
            res.redirect(301, `${BASE_URL}/stores/${matched.slug}`);
            return;
          }
        }
        res.redirect(301, `${BASE_URL}/stores`);
        return;
      }

      // Root vanity slug /:shopSlug -> /stores/:merchantSlug (301)
      if (cleanPath && !RESERVED_ROOT_PATHS.has(cleanPath.toLowerCase()) && !cleanPath.includes("/")) {
        const rootShop = maps.bySlug.get(cleanPath.toLowerCase());
        if (rootShop) {
          res.redirect(301, `${BASE_URL}/stores/${rootShop.slug}`);
          return;
        }
      }

      // ── 2. Pre-rendered SEO for Store Directory (/stores) ────────────────
      if (cleanPath === "stores") {
        let html = await fs.promises.readFile(indexPath, "utf8");
        const title = "Stores & Local Merchants | SwiftMart";
        const desc = "Browse all verified local stores, bakeries, restaurants, grocery marts, and electronics service centers on SwiftMart. Transparent pricing and fast local doorstep delivery.";
        const escapeAttr = (s: string) =>
          s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeAttr(title)}</title>`);
        html = html.replace(/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${escapeAttr(desc)}" />`);
        html = html.replace(/<link rel="canonical"[^>]*href=".*?"\s*\/?>/i, `<link rel="canonical" data-rh="true" href="${canonicalUrl}" />`);
        html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/i, `<meta property="og:title" content="${escapeAttr(title)}" />`);
        html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/i, `<meta property="og:description" content="${escapeAttr(desc)}" />`);
        html = html.replace(/<meta property="og:url" content=".*?"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(html);
        return;
      }

      // ── 3. Storefronts & Dynamic Location/Category Pages (/stores/*) ─────
      if (cleanPath.startsWith("stores/")) {
        const segments = cleanPath.split("/").slice(1).map(s => s.trim().toLowerCase());
        const part1 = segments[0] || "";
        const part2 = segments[1] || "";

        // Check if part1 matches a specific merchant storefront
        const matchedShop = maps.bySlug.get(part1) || maps.byId.get(part1);

        if (matchedShop) {
          let html = await fs.promises.readFile(indexPath, "utf8");
          const escapeAttr = (s: string) =>
            s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

          const city = matchedShop.city || "Local";
          const catTitle = formatCategoryTitle(matchedShop.category);

          // Dynamic category-tailored Title system (Requirement #3)
          let title = `${matchedShop.name} ${city} | ${catTitle} | SwiftMart`;
          if (matchedShop.schemaTypes.includes("Bakery")) {
            title = `${matchedShop.name} in ${city} | Designer Cakes & Bakery | SwiftMart`;
          } else if (matchedShop.schemaTypes.includes("Restaurant")) {
            title = `${matchedShop.name} in ${city} | Order Food Online | SwiftMart`;
          } else if (matchedShop.schemaTypes.includes("Service")) {
            title = `${matchedShop.name} ${city} | Electronics & On-Site Service | SwiftMart`;
          } else if (matchedShop.schemaTypes.includes("ClothingStore")) {
            title = `${matchedShop.name} ${city} | Fashion & Clothing | SwiftMart`;
          }

          const desc = matchedShop.description;
          const img = matchedShop.image.startsWith("http")
            ? matchedShop.image
            : `${BASE_URL}${matchedShop.image.startsWith("/") ? "" : "/"}${matchedShop.image}`;

          // Merchant Structured Data Engine (Requirement #6)
          const isService = matchedShop.schemaTypes.includes("Service");
          const shopJsonLd: any = {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": matchedShop.schemaTypes,
                "@id": `${canonicalUrl}#storefront`,
                "name": matchedShop.name,
                "legalName": `${matchedShop.name} — SwiftMart ${matchedShop.claimStatus === "claimed" ? "Official Storefront" : "Store"}`,
                "alternateName": [
                  matchedShop.name,
                  `${matchedShop.name} ${city}`,
                  `${matchedShop.name} Storefront`,
                  `${matchedShop.name} Online`,
                ],
                "description": desc,
                "image": img,
                "url": canonicalUrl,
                ...(matchedShop.phone ? { "telephone": matchedShop.phone } : {}),
                "priceRange": "₹₹",
                "currenciesAccepted": "INR",
                "paymentAccepted": "Cash on Delivery, UPI, Cards, Net Banking",
                "parentOrganization": {
                  "@type": "OnlineBusiness",
                  "name": "SwiftMart",
                  "url": BASE_URL,
                },
                "address": {
                  "@type": "PostalAddress",
                  ...(matchedShop.streetAddress ? { "streetAddress": matchedShop.streetAddress } : {}),
                  "addressLocality": city,
                  ...(matchedShop.pincode ? { "postalCode": matchedShop.pincode } : {}),
                  "addressRegion": "West Bengal",
                  "addressCountry": "IN",
                },
                ...(matchedShop.lat && matchedShop.lng ? {
                  "geo": {
                    "@type": "GeoCoordinates",
                    "latitude": matchedShop.lat,
                    "longitude": matchedShop.lng,
                  }
                } : {}),
                ...(matchedShop.googleBusinessUrl ? {
                  "sameAs": [matchedShop.googleBusinessUrl],
                  "hasMap": matchedShop.googleBusinessUrl,
                } : {}),
                // Only genuine reviews & ratings — never fabricated (Requirement #6 & #14)
                ...(matchedShop.rating > 0 && matchedShop.totalOrders > 0 ? {
                  "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": Number(matchedShop.rating.toFixed(1)),
                    "reviewCount": matchedShop.totalOrders,
                    "bestRating": 5,
                    "worstRating": 1,
                  }
                } : {}),
              },
              {
                "@type": "BreadcrumbList",
                "itemListElement": [
                  { "@type": "ListItem", "position": 1, "name": "SwiftMart Home", "item": `${BASE_URL}/` },
                  { "@type": "ListItem", "position": 2, "name": `${city} Stores`, "item": `${BASE_URL}/stores/${matchedShop.citySlug}` },
                  { "@type": "ListItem", "position": 3, "name": catTitle, "item": `${BASE_URL}/stores/${matchedShop.citySlug}/${normalizeSlug(matchedShop.category)}` },
                  { "@type": "ListItem", "position": 4, "name": matchedShop.name, "item": canonicalUrl },
                ]
              }
            ]
          };

          // Inject Dynamic Meta Tags into index.html
          html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeAttr(title)}</title>`);
          html = html.replace(/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${escapeAttr(desc)}" />`);
          html = html.replace(/<link rel="canonical"[^>]*href=".*?"\s*\/?>/i, `<link rel="canonical" data-rh="true" href="${canonicalUrl}" />`);
          html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/i, `<meta property="og:title" content="${escapeAttr(title)}" />`);
          html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/i, `<meta property="og:description" content="${escapeAttr(desc)}" />`);
          html = html.replace(/<meta property="og:url" content=".*?"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
          html = html.replace(/<meta property="og:image" content=".*?"\s*\/?>/i, `<meta property="og:image" content="${escapeAttr(img)}" />`);
          html = html.replace(/<meta name="twitter:title" content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${escapeAttr(title)}" />`);
          html = html.replace(/<meta name="twitter:description" content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${escapeAttr(desc)}" />`);
          html = html.replace(/<meta name="twitter:image" content=".*?"\s*\/?>/i, `<meta name="twitter:image" content="${escapeAttr(img)}" />`);

          // Inject Schema.org JSON-LD before </head>
          const ldJsonTag = `\n    <script type="application/ld+json">\n    ${JSON.stringify(shopJsonLd, null, 2)}\n    </script>\n  </head>`;
          html = html.replace(/<\/head>/i, ldJsonTag);

          // Visible noscript storefront banner for non-JS crawlers
          const claimLabel = matchedShop.claimStatus === "claimed" ? "Official Storefront" : "Listed on SwiftMart";
          const verifiedBadge = matchedShop.verificationStatus === "verified" ? " &bull; &#10003; Verified by SwiftMart" : "";
          const serviceOrDeliveryText = isService ? "On-site service booking powered by SwiftMart." : `Fast ${matchedShop.eta} doorstep delivery powered by SwiftMart.`;
          const storefrontNoscriptBanner = `
          <header class="swm-preamble-header" style="border:2px solid #f59e0b; padding:16px; border-radius:12px; margin-bottom:20px; background:#fffbeb;">
            <div style="font-size:12px; font-weight:bold; color:#b45309; text-transform:uppercase; letter-spacing:1px;">🏪 ${escapeAttr(claimLabel)}${verifiedBadge}</div>
            <h1 style="font-size:24px; font-weight:800; color:#1e293b; margin:6px 0;">${escapeAttr(matchedShop.name)} — ${escapeAttr(city)} Storefront</h1>
            <p style="font-size:14px; color:#475569;">${escapeAttr(desc)}</p>
            <p style="font-size:13px; color:#64748b;">📍 ${escapeAttr(matchedShop.streetAddress)}, ${escapeAttr(city)} &bull; ${escapeAttr(serviceOrDeliveryText)}</p>
          </header>`;
          html = html.replace(/(<noscript[^>]*>\s*<div[^>]*>)/i, `$1${storefrontNoscriptBanner}`);

          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.send(html);
          return;
        }

        // Check if part1 matches a City discovery page (Requirement #18)
        const cityMeta = maps.cities.get(part1);
        if (cityMeta && !part2) {
          let html = await fs.promises.readFile(indexPath, "utf8");
          const escapeAttr = (s: string) =>
            s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const title = `Local Shops & Stores in ${cityMeta.city} | SwiftMart`;
          const desc = `Browse ${cityMeta.count} verified local stores, bakeries, restaurants, and grocery marts in ${cityMeta.city}. Fast doorstep delivery and authentic local merchants on SwiftMart.`;

          html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeAttr(title)}</title>`);
          html = html.replace(/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${escapeAttr(desc)}" />`);
          html = html.replace(/<link rel="canonical"[^>]*href=".*?"\s*\/?>/i, `<link rel="canonical" data-rh="true" href="${canonicalUrl}" />`);
          html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/i, `<meta property="og:title" content="${escapeAttr(title)}" />`);
          html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/i, `<meta property="og:description" content="${escapeAttr(desc)}" />`);
          html = html.replace(/<meta property="og:url" content=".*?"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);

          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.send(html);
          return;
        }

        // Check if part1 is a City and part2 is a Category (Requirement #19)
        if (cityMeta && part2) {
          let html = await fs.promises.readFile(indexPath, "utf8");
          const escapeAttr = (s: string) =>
            s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const catTitle = formatCategoryTitle(part2);
          const title = `${catTitle} in ${cityMeta.city} | Order Online on SwiftMart`;
          const desc = `Order from top ${catTitle} shops in ${cityMeta.city}. Authentic quality, verified merchants, and quick local doorstep delivery on SwiftMart.`;

          html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeAttr(title)}</title>`);
          html = html.replace(/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${escapeAttr(desc)}" />`);
          html = html.replace(/<link rel="canonical"[^>]*href=".*?"\s*\/?>/i, `<link rel="canonical" data-rh="true" href="${canonicalUrl}" />`);
          html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/i, `<meta property="og:title" content="${escapeAttr(title)}" />`);
          html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/i, `<meta property="og:description" content="${escapeAttr(desc)}" />`);
          html = html.replace(/<meta property="og:url" content=".*?"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);

          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.send(html);
          return;
        }
      }

      // ── 4. Static Pages Dynamic Metadata Injection ─────────────────────
      const staticMeta = STATIC_PAGE_SEO[cleanPath];
      if (staticMeta) {
        let html = await fs.promises.readFile(indexPath, "utf8");
        const escapeAttr = (s: string) =>
          s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeAttr(staticMeta.title)}</title>`);
        html = html.replace(/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${escapeAttr(staticMeta.desc)}" />`);
        html = html.replace(/<link rel="canonical"[^>]*href=".*?"\s*\/?>/i, `<link rel="canonical" data-rh="true" href="${canonicalUrl}" />`);
        html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/i, `<meta property="og:title" content="${escapeAttr(staticMeta.title)}" />`);
        html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/i, `<meta property="og:description" content="${escapeAttr(staticMeta.desc)}" />`);
        html = html.replace(/<meta property="og:url" content=".*?"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(html);
        return;
      }

      // ── 5. Hard 404 for Unknown Non-App Routes (Soft-404 Elimination) ───
      const firstSegment = cleanPath.split("/")[0]?.toLowerCase() || "";
      const isKnownRoute =
        cleanPath === "" ||
        KNOWN_SPA_PREFIXES.has(firstSegment) ||
        maps.bySlug.has(firstSegment) ||
        maps.byId.has(firstSegment);

      if (!isKnownRoute) {
        let html = await fs.promises.readFile(indexPath, "utf8");
        const title = "404 — Page Not Found | SwiftMart";
        const desc = "The requested page was not found on SwiftMart. Return to home or explore local stores.";
        const escapeAttr = (s: string) =>
          s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeAttr(title)}</title>`);
        html = html.replace(/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${escapeAttr(desc)}" /><meta name="robots" content="noindex, nofollow" />`);

        res.status(404).setHeader("Content-Type", "text/html; charset=utf-8").send(html);
        return;
      }
    } catch (injectionErr) {
      logger.error({ injectionErr }, "Failed to inject dynamic SEO metadata into index.html; serving standard SPA");
    }

    res.sendFile(indexPath, (fileErr) => {
      if (fileErr && !res.headersSent) {
        logger.error({ fileErr }, "res.sendFile failed; sending inline HTML fallback");
        res.status(200).type("html").send("<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'/><title>SwiftMart</title><meta name='viewport' content='width=device-width,initial-scale=1'/></head><body><div id='root'></div><script>window.location.reload();</script></body></html>");
      }
    });
  } catch (topErr) {
    logger.error({ topErr }, "Error in SPA fallback handler; serving static index.html");
    const indexPath = path.join(frontendDist, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath, (fileErr) => {
        if (fileErr && !res.headersSent) {
          res.status(200).type("html").send("<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'/><title>SwiftMart</title></head><body><div id='root'></div></body></html>");
        }
      });
    } else {
      res.status(200).json({ ok: true, message: "SwiftMart API Server is running" });
    }
  }
});
}

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ success: false, message: "Internal server error" });
});

export default app;
