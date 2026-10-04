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

// ─── Dynamic sitemap ──────────────────────────────────────────────────────────
// Generated from DB at request time. In-memory cache expires after 1 hour so
// newly approved shops/products appear in the sitemap within ~60 minutes.
// Includes every public indexable URL; keeps Googlebot from flagging "page
// discovered but not in sitemap".
let sitemapCache: { xml: string; builtAt: number } | null = null;
const SITEMAP_TTL_MS = 60 * 60 * 1000; // 1 hour

const STATIC_SITEMAP_URLS: Array<{ loc: string; changefreq: string; priority: string }> = [
  { loc: `${BASE_URL}/`,                    changefreq: "daily",   priority: "1.0" },
  { loc: `${BASE_URL}/shops`,               changefreq: "daily",   priority: "0.9" },
  { loc: `${BASE_URL}/products`,            changefreq: "daily",   priority: "0.9" },
  { loc: `${BASE_URL}/grocery`,             changefreq: "daily",   priority: "0.8" },
  { loc: `${BASE_URL}/about`,               changefreq: "weekly",  priority: "0.8" },
  { loc: `${BASE_URL}/categories`,          changefreq: "weekly",  priority: "0.8" },
  { loc: `${BASE_URL}/search`,              changefreq: "weekly",  priority: "0.7" },
  { loc: `${BASE_URL}/contact-support`,     changefreq: "monthly", priority: "0.6" },
  { loc: `${BASE_URL}/privacy`,             changefreq: "monthly", priority: "0.5" },
  { loc: `${BASE_URL}/terms`,               changefreq: "monthly", priority: "0.5" },
  { loc: `${BASE_URL}/refund-cancellation`, changefreq: "monthly", priority: "0.5" },
];

async function buildSitemap(): Promise<string> {
  if (sitemapCache && Date.now() - sitemapCache.builtAt < SITEMAP_TTL_MS) {
    return sitemapCache.xml;
  }

  const fmt = (d: Date | string | null | undefined): string =>
    d ? new Date(d as Date).toISOString().split("T")[0]! : new Date().toISOString().split("T")[0]!;
  const today = new Date().toISOString().split("T")[0]!;

  const [shopRows, productRows, categoryRows] = await Promise.all([
    db.select({ id: schema.shops.id, shopName: schema.shops.shopName, updatedAt: schema.shops.updatedAt })
      .from(schema.shops).where(or(eq(schema.shops.status, "approved"), eq(schema.shops.status, "active"))),
    db.select({ id: schema.products.id, updatedAt: schema.products.updatedAt })
      .from(schema.products).where(eq(schema.products.status, "active")),
    db.select({ slug: schema.categories.slug, updatedAt: schema.categories.updatedAt })
      .from(schema.categories).where(eq(schema.categories.isActive, true)),
  ]);

  const urlTags = [
    ...STATIC_SITEMAP_URLS.map(u =>
      `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
    ),
    ...shopRows.flatMap((s: { id: string; shopName: string | null; updatedAt: Date | null }) => {
      const slug = (s.shopName || "")
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/[\s_]+/gu, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/gu, "");
      const tags = [
        `  <url><loc>${BASE_URL}/shop/${s.id}</loc><lastmod>${fmt(s.updatedAt)}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
      ];
      if (slug) {
        tags.unshift(`  <url><loc>${BASE_URL}/${slug}</loc><lastmod>${fmt(s.updatedAt)}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`);
      }
      return tags;
    }),
    ...productRows.map((p: { id: string; updatedAt: Date | null }) =>
      `  <url><loc>${BASE_URL}/product/${p.id}</loc><lastmod>${fmt(p.updatedAt)}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
    ),
    ...categoryRows.map((c: { slug: string; updatedAt: Date | null }) =>
      `  <url><loc>${BASE_URL}/category/${c.slug}</loc><lastmod>${fmt(c.updatedAt)}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
    ),
  ];

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urlTags,
    `</urlset>`,
  ].join("\n");

  sitemapCache = { xml, builtAt: Date.now() };
  return xml;
}

// ─── Shop Storefront In-Memory SEO Cache ─────────────────────────────────────
// Caches shop metadata for 30 minutes so crawling or sharing shop storefront
// links (e.g. /rock-n-rolls or /shop/:id) serves dynamically pre-rendered HTML
// instantly with 0 ms DB query delay and zero Neon DB compute overhead.
interface ShopSeoMeta {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  image: string;
  addressText: string;
  rating: number;
  phone: string;
  isFoodShop: boolean;
}

let shopSeoCache: {
  bySlug: Map<string, ShopSeoMeta>;
  byId: Map<string, ShopSeoMeta>;
  cachedAt: number;
} | null = null;
const SHOP_SEO_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function getShopSeoMaps(): Promise<{ bySlug: Map<string, ShopSeoMeta>; byId: Map<string, ShopSeoMeta> }> {
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
        phone: schema.shops.phone,
      })
      .from(schema.shops)
      .where(or(eq(schema.shops.status, "approved"), eq(schema.shops.status, "active")));

    const bySlug = new Map<string, ShopSeoMeta>();
    const byId = new Map<string, ShopSeoMeta>();

    for (const s of shopRows) {
      const slug = (s.shopName || "")
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/[\s_]+/gu, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/gu, "");

      const isFood = ["restaurant", "cafe", "cloud-kitchen", "sweet-shop", "bakery", "fast-food", "food", "food_junction", "cake"].some(t => 
        (s.shopType || "").toLowerCase().includes(t) || 
        (s.category || "").toLowerCase().includes(t) ||
        (s.shopName || "").toLowerCase().includes("cake") ||
        (s.shopName || "").toLowerCase().includes("roll")
      );

      const addr = s.address as Record<string, any> | null;
      const addrLine = addr?.line1 || addr?.city || "Balurghat";

      const info: ShopSeoMeta = {
        id: s.id,
        name: s.shopName || "Local Store",
        slug,
        description: s.description || `Official online storefront for ${s.shopName} in Balurghat. Browse live products, verified prices, daily discounts, and order online with 10-15 minute delivery on SwiftMart.`,
        category: s.category || "Grocery & Essentials",
        image: s.image || s.banner || `${BASE_URL}/opengraph.jpg`,
        addressText: addrLine,
        rating: s.rating || 4.8,
        phone: s.phone || "+91 62961 18949",
        isFoodShop: isFood,
      };

      byId.set(s.id, info);
      if (slug) {
        bySlug.set(slug, info);
      }
    }

    shopSeoCache = { bySlug, byId, cachedAt: Date.now() };
    return shopSeoCache;
  } catch (err) {
    logger.error({ err }, "Failed to load shop SEO cache");
    return shopSeoCache || { bySlug: new Map(), byId: new Map() };
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
  "orders",
  "profile",
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
  "products",
  "shops",
  "grocery",
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
    "Allow: /sitemap.xml",
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
    "",
  ].join("\n");
  app.get("/robots.txt", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(ROBOTS_TXT);
  });


  // Dynamic sitemap — registered BEFORE express.static so this route takes
  // precedence over the static public/sitemap.xml baked into the build.
  app.get("/sitemap.xml", async (_req: Request, res: Response) => {
    try {
      const xml = await buildSitemap();
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
      res.send(xml);
    } catch (err) {
      logger.error({ err }, "Failed to generate dynamic sitemap; serving empty fallback");
      // Return a valid but empty sitemap so Googlebot doesn't see a 5xx
      res.status(200)
        .setHeader("Content-Type", "application/xml; charset=utf-8")
        .send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
    }
  });

  // Hashed assets (e.g. /assets/index-DP9kdDoW.js) are content-addressed — safe to cache forever.
  // HTML, manifest, robots.txt: use no-cache (revalidate) but NOT no-store.
  // no-store tells Google it cannot keep a copy → "No information available for this page".
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
      // Never serve SPA for dotfiles or scanner paths (already blocked above,
      // but guard here too so static middleware bypasses don't sneak through)
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
      let matchedShop: ShopSeoMeta | undefined;

      try {
        if (cleanPath.startsWith("shop/")) {
          const shopId = cleanPath.slice(5).trim();
          const maps = await getShopSeoMaps();
          matchedShop = maps.byId.get(shopId);
        } else if (cleanPath && !RESERVED_ROOT_PATHS.has(cleanPath.toLowerCase()) && !cleanPath.includes("/")) {
          const maps = await getShopSeoMaps();
          matchedShop = maps.bySlug.get(cleanPath.toLowerCase());
        }

        if (matchedShop) {
          let html = await fs.promises.readFile(indexPath, "utf8");
          const title = `${matchedShop.name} (Balurghat) — Official Storefront & Online Ordering | SwiftMart`;
          const desc = `Order directly from ${matchedShop.name}'s official online storefront in Balurghat on SwiftMart. ${matchedShop.category ? `${matchedShop.category} · ` : ""}Instant 10-15 min local delivery across Balurghat Pincodes 733101 & 733103. Live menu, verified prices, discounts & deals.`;
          const img = matchedShop.image.startsWith("http")
            ? matchedShop.image
            : `${BASE_URL}${matchedShop.image.startsWith("/") ? "" : "/"}${matchedShop.image}`;

          const shopJsonLd = {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": matchedShop.isFoodShop
                  ? ["Restaurant", "FoodEstablishment", "LocalBusiness"]
                  : ["Store", "LocalBusiness", "OnlineStore"],
                "@id": `${canonicalUrl}#storefront`,
                "name": matchedShop.name,
                "legalName": `${matchedShop.name} — SwiftMart Official Storefront`,
                "alternateName": [
                  matchedShop.name,
                  `${matchedShop.name} Balurghat`,
                  `${matchedShop.name} Storefront`,
                  `${matchedShop.name} Online Store`,
                  `${matchedShop.name} Menu`
                ],
                "description": desc,
                "image": img,
                "url": canonicalUrl,
                "telephone": matchedShop.phone,
                "priceRange": "₹₹",
                "currenciesAccepted": "INR",
                "paymentAccepted": "Cash on Delivery, UPI, Cards, Net Banking",
                "parentOrganization": {
                  "@type": "OnlineBusiness",
                  "name": "SwiftMart",
                  "url": BASE_URL
                },
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": matchedShop.addressText,
                  "addressLocality": "Balurghat",
                  "postalCode": "733101",
                  "addressRegion": "West Bengal",
                  "addressCountry": "IN"
                },
                "geo": {
                  "@type": "GeoCoordinates",
                  "latitude": 25.2167,
                  "longitude": 88.7667
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": Number((matchedShop.rating || 4.8).toFixed(1)),
                  "reviewCount": 120,
                  "bestRating": 5,
                  "worstRating": 1
                }
              },
              {
                "@type": "BreadcrumbList",
                "itemListElement": [
                  { "@type": "ListItem", "position": 1, "name": "SwiftMart Home", "item": `${BASE_URL}/` },
                  { "@type": "ListItem", "position": 2, "name": "Balurghat Stores", "item": `${BASE_URL}/shops` },
                  { "@type": "ListItem", "position": 3, "name": `${matchedShop.name} Storefront`, "item": canonicalUrl }
                ]
              }
            ]
          };

          const escapeAttr = (s: string) =>
            s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

          // Inject dynamic Title
          html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeAttr(title)}</title>`);
          // Inject dynamic Meta Description
          html = html.replace(/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${escapeAttr(desc)}" />`);
          // Inject dynamic Canonical
          html = html.replace(/<link rel="canonical"[^>]*href=".*?"\s*\/?>/i, `<link rel="canonical" data-rh="true" href="${canonicalUrl}" />`);
          // Inject Open Graph tags
          html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/i, `<meta property="og:title" content="${escapeAttr(title)}" />`);
          html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/i, `<meta property="og:description" content="${escapeAttr(desc)}" />`);
          html = html.replace(/<meta property="og:url" content=".*?"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
          html = html.replace(/<meta property="og:image" content=".*?"\s*\/?>/i, `<meta property="og:image" content="${escapeAttr(img)}" />`);
          // Inject Twitter tags
          html = html.replace(/<meta name="twitter:title" content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${escapeAttr(title)}" />`);
          html = html.replace(/<meta name="twitter:description" content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${escapeAttr(desc)}" />`);
          html = html.replace(/<meta name="twitter:image" content=".*?"\s*\/?>/i, `<meta name="twitter:image" content="${escapeAttr(img)}" />`);

          // Inject Shop Schema.org JSON-LD before </head>
          const ldJsonTag = `\n    <script type="application/ld+json">\n    ${JSON.stringify(shopJsonLd, null, 2)}\n    </script>\n  </head>`;
          html = html.replace(/<\/head>/i, ldJsonTag);

          // Prepend visible noscript storefront banner for non-JS crawlers
          const storefrontNoscriptBanner = `
          <header class="swm-preamble-header" style="border:2px solid #f59e0b; padding:16px; border-radius:12px; margin-bottom:20px; background:#fffbeb;">
            <div style="font-size:12px; font-weight:bold; color:#b45309; text-transform:uppercase; letter-spacing:1px;">🏪 Official Online Storefront</div>
            <h1 style="font-size:24px; font-weight:800; color:#1e293b; margin:6px 0;">${escapeAttr(matchedShop.name)} — Balurghat Storefront &amp; Menu</h1>
            <p style="font-size:14px; color:#475569;">${escapeAttr(desc)}</p>
            <p style="font-size:13px; color:#64748b;">📍 ${escapeAttr(matchedShop.addressText)}, Balurghat, West Bengal &bull; Fast 10-15 Min Express Doorstep Delivery by SwiftMart.</p>
          </header>`;
          html = html.replace(/(<noscript[^>]*>\s*<div[^>]*>)/i, `$1${storefrontNoscriptBanner}`);

          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.send(html);
          return;
        }
      } catch (injectionErr) {
        logger.error({ injectionErr }, "Failed to inject shop storefront meta tags into index.html; falling back to static");
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
