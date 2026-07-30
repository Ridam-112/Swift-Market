import express, { type Express, type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { globalApiLimiter } from "./middlewares/rateLimiter.js";
import { maintenanceMode } from "./middlewares/maintenanceMode.js";
import { db } from "@workspace/db";
import * as schema from "@workspace/db";
import { eq } from "drizzle-orm";

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
    db.select({ id: schema.shops.id, updatedAt: schema.shops.updatedAt })
      .from(schema.shops).where(eq(schema.shops.status, "approved")),
    db.select({ id: schema.products.id, updatedAt: schema.products.updatedAt })
      .from(schema.products).where(eq(schema.products.status, "active")),
    db.select({ slug: schema.categories.slug, updatedAt: schema.categories.updatedAt })
      .from(schema.categories).where(eq(schema.categories.isActive, true)),
  ]);

  const urlTags = [
    ...STATIC_SITEMAP_URLS.map(u =>
      `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
    ),
    ...shopRows.map((s: { id: string; updatedAt: Date | null }) =>
      `  <url><loc>${BASE_URL}/shop/${s.id}</loc><lastmod>${fmt(s.updatedAt)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
    ),
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
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
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
    // Non-API routes (SPA pages, robots.txt, sitemap.xml, static assets) are
    // public and must be reachable by any origin — browsers, crawlers, social
    // previewers, and Google's Inspection Tool all send an Origin header but
    // are not making authenticated cross-origin API calls.  Enforcing CORS
    // here would return 403 to Googlebot and cause "Blocked by robots.txt"
    // errors in Google Search Console even when robots.txt explicitly allows /.
    if (!req.path.startsWith("/api")) return "*";
    // API routes: strict CORS — only allow trusted origins
    // Capacitor APK WebView
    if (CAPACITOR_ORIGINS.has(origin)) return origin;
    // Same-origin: browser fetch from the page served by THIS server.
    // The Replit reverse proxy forwards x-forwarded-host / x-forwarded-proto.
    const host = ((req.headers["x-forwarded-host"] as string | undefined) ?? req.headers.host ?? "")
      .split(",")[0]?.trim() ?? "";
    const proto = ((req.headers["x-forwarded-proto"] as string | undefined) ?? "https")
      .split(",")[0]?.trim() ?? "https";
    if (host && origin === `${proto}://${host}`) return origin;
    // Explicit allowlist override
    if (configuredOrigins.includes(origin)) return origin;
    return null;
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

// ─── Maintenance mode ─────────────────────────────────────────────────────────
// Placed after helmet/CORS/body-parser (so the bypass cookie can be read and
// headers are already set) but before API routes and static serving.
// /health and /api/maintenance-bypass are explicitly allowed through.
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

// ─── www → non-www canonical redirect ────────────────────────────────────────
// www.swiftmart.space/... → swiftmart.space/... (301 permanent)
// Without this Google crawls both www and non-www, triggering "Duplicate without
// user-selected canonical" in Search Console even when the <link rel="canonical">
// in the HTML points to the non-www version.
// We read x-forwarded-host because Replit's reverse proxy strips the Host header.
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
// Prevents Google from treating /path and /path/ as separate duplicate pages.
// The root "/" is explicitly excluded so it is never redirected to "".
app.use((req: Request, res: Response, next: NextFunction): void => {
  if (req.path.length > 1 && req.path.endsWith("/")) {
    const qs = req.url.slice(req.path.length); // preserve query string / hash
    res.redirect(301, req.path.slice(0, -1) + qs);
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

  app.get("/{*splat}", (req: Request, res: Response) => {
    // Never serve SPA for dotfiles or scanner paths (already blocked above,
    // but guard here too so static middleware bypasses don't sneak through)
    if (/\/\./.test(req.path) || SCANNER_RE.test(req.path)) {
      res.status(404).end();
      return;
    }
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ success: false, message: "Internal server error" });
});

export default app;
