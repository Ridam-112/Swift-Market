import { Router, type Request, type Response } from "express";
import { db, products, masterProducts, productWrongReports, shops, categories, users } from "@workspace/db";
import { eq, and, ilike, inArray, desc, count, gt, gte, sql, or } from "drizzle-orm";
import { authenticate, requireRole, optionalAuth, type AuthRequest } from "../../middlewares/auth.js";
import { vendorWriteLimiter } from "../../middlewares/rateLimiter.js";
import { deleteFromImageKit } from "../../lib/imagekit.js";
import { createNotificationLimited } from "../../utils/notification.js";
import { mi, miArr } from "../../utils/mapId.js";
import { cacheGet, cacheSet, invalidateProductCaches, productsCacheKey, TTL } from "../../lib/cache.js";
import { ProductLookupService } from "../../services/productLookupService.js";

const router = Router();
const A = requireRole("admin", "super_admin");
const V = requireRole("vendor", "admin", "super_admin");

// M6 fix: validate that each image value is a well-formed URL (prevents XSS / broken images)
function sanitizeImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => {
    if (typeof u !== "string") return false;
    try { new URL(u); return true; } catch { return false; }
  });
}

function sanitizeVariants(raw: unknown): Array<{ id: string; name: string; price: number; discountedPrice?: number; stock?: number; unit?: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null && typeof v["name"] === "string" && v["name"].trim().length > 0)
    .map((v, i) => {
      const price = Math.max(0, Number(v["price"] ?? 0) || 0);
      const discounted = v["discountedPrice"] != null && Number(v["discountedPrice"]) > 0 ? Number(v["discountedPrice"]) : undefined;
      return {
        id: String(v["id"] || `var_${Date.now()}_${i}`),
        name: String(v["name"]).trim(),
        price,
        ...(discounted != null ? { discountedPrice: discounted } : {}),
        stock: v["stock"] != null ? Math.max(0, Number(v["stock"]) || 0) : undefined,
        unit: v["unit"] ? String(v["unit"]).trim() : undefined,
      };
    });
}

// GET /api/products
router.get("/", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
  const authReq = req as AuthRequest;
  const isPrivileged = authReq.user?.role === "admin" || authReq.user?.role === "super_admin" || authReq.user?.role === "vendor";

  const { shopId, category, search, trending, page = "1", limit = "20", pincode } =
    req.query as Record<string, string>;

  // status=all is restricted to authenticated vendor/admin users — prevent customer bypass of active/stock filters
  const rawStatus = (req.query as Record<string, string>)["status"];
  const status = rawStatus === "all" && !isPrivileged ? "active" : (rawStatus ?? "active");

  // ── Cache check (public queries only — admin/vendor status=all always bypass) ──
  const query = req.query as Record<string, string>;
  const useCache = status !== "all";
  if (useCache) {
    const cacheKey = productsCacheKey(query);
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
  }

  const pg = parseInt(page), lm = parseInt(limit);
  const conditions = [];

  // status=all skips the status filter entirely (used by admin/vendor product management)
  if (status !== "all") {
    if (status === "active") {
      conditions.push(or(eq(products.status, "active"), eq(products.status, "approved")));
      conditions.push(gte(products.stock, 0));
    } else {
      conditions.push(eq(products.status, status));
    }
  }

  if (category) {
    const catLower = category.toLowerCase().trim();
    if (catLower === "fruits-vegetables") {
      conditions.push(or(
        eq(products.category, "fruits-vegetables"),
        eq(products.category, "vegetables"),
        eq(products.category, "fruits")
      ));
    } else if (catLower === "vegetables") {
      conditions.push(or(
        eq(products.category, "vegetables"),
        eq(products.category, "fruits-vegetables")
      ));
    } else {
      conditions.push(eq(products.category, category));
    }
  }
  if (search) conditions.push(ilike(products.name, `%${search}%`));
  if (trending === "true") conditions.push(eq(products.trending, true));

  // For customer-facing active queries, restrict by category only when a specific
  // category is requested — do NOT filter the general listing by active-category slugs
  // because vendor products may use shop-type slugs that don't map 1:1 to customer categories.
  if (status === "active" && category) {
    const activeCats = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.isActive, true));
    const activeSlugs = activeCats.map(c => c.slug);
    const catLower = category.toLowerCase().trim();
    const isAllowed = activeSlugs.includes(category) ||
      (catLower === "vegetables" && activeSlugs.includes("fruits-vegetables")) ||
      (catLower === "fruits" && activeSlugs.includes("fruits-vegetables")) ||
      (catLower === "fruits-vegetables" && activeSlugs.includes("vegetables"));
    if (activeSlugs.length > 0 && !isAllowed) {
      res.json({ success: true, products: [], total: 0, page: 1, pages: 0 });
      return;
    }
  }

  // Shop scope
  if (pincode) {
    const pincodeShops = await db.select({ id: shops.id })
      .from(shops)
      .where(and(
        sql`${shops.address}->>'pincode' = ${pincode}`,
        or(eq(shops.status, "approved"), eq(shops.status, "active")),
      ));
    if (pincodeShops.length === 0) {
      res.json({ success: true, products: [], total: 0, page: pg, pages: 0 });
      return;
    }
    conditions.push(inArray(products.shopId, pincodeShops.map(s => s.id)));
  } else if ((req.query as Record<string, string>)["shopIds"] || shopId) {
    const rawShopParam = ((req.query as Record<string, string>)["shopIds"] || shopId || "").trim();
    const parsedShopIds = rawShopParam.split(",").map(s => s.trim()).filter(Boolean);

    if (parsedShopIds.length > 0) {
      if (status === "all") {
        if (parsedShopIds.length === 1) {
          conditions.push(eq(products.shopId, parsedShopIds[0]));
        } else {
          conditions.push(inArray(products.shopId, parsedShopIds));
        }
      } else {
        const validShops = await db
          .select({ id: shops.id })
          .from(shops)
          .where(and(inArray(shops.id, parsedShopIds), or(eq(shops.status, "approved"), eq(shops.status, "active"))));

        if (validShops.length === 0) {
          res.json({ success: true, products: [], total: 0, page: pg, pages: 0 });
          return;
        }
        conditions.push(inArray(products.shopId, validShops.map(s => s.id)));
      }
    }
  } else {
    // No shopId, no pincode — restrict to products from approved shops.
    // Use a subquery so we never load the full approved-shops list into Node memory.
    conditions.push(
      inArray(
        products.shopId,
        db.select({ id: shops.id }).from(shops).where(or(eq(shops.status, "approved"), eq(shops.status, "active")))
      )
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const skip = (pg - 1) * lm;

  const [result, [{ total }]] = await Promise.all([
    db.select().from(products).where(where).orderBy(desc(products.createdAt)).offset(skip).limit(lm),
    db.select({ total: count() }).from(products).where(where),
  ]);

  // Batch-fetch shop names safely — if shop join fails, fallback to lean plain products
  let shopMap: Record<string, string> = {};
  try {
    const shopIds = [...new Set(result.map(p => p.shopId))];
    if (shopIds.length > 0) {
      const shopRows = await db.select({ id: shops.id, shopName: shops.shopName }).from(shops).where(inArray(shops.id, shopIds));
      shopMap = Object.fromEntries(shopRows.map(s => [s.id, s.shopName]));
    }
  } catch (_e) {
    // Return lean products directly if shop mapping errors out
  }

  let enriched: any[] = result.map(p => ({ ...mi(p), shopName: shopMap[p.shopId] ?? "" }));

  // Server-driven customizable cake product for Bakery / Cake shops
  if (pg === 1 && shopId) {
    try {
      const [targetShop] = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
      const cat = (targetShop?.category || "").toLowerCase();
      const name = (targetShop?.shopName || "").toLowerCase();
      if (cat.includes("bakery") || cat.includes("cake") || cat.includes("sweet") || name.includes("cake") || name.includes("bakery")) {
        const customCakeItem = buildCustomCakeProduct(targetShop!.id, targetShop!.shopName);
        enriched = [customCakeItem, ...enriched.filter(p => !p.id.startsWith("custom_cake_"))];
      }
    } catch (_) {}
  }

  const payload = {
    success: true,
    count: enriched.length,
    products: enriched,
    total: Number(total),
    page: pg,
    pages: Math.ceil(Number(total) / lm),
  };
  if (useCache) {
    void cacheSet(productsCacheKey(query), payload, TTL.PRODUCTS);
  }
  res.json(payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: "Failed to load products. Please try again.", _dbError: msg });
  }
});

function buildCustomCakeProduct(shopId: string, shopName: string) {
  return {
    _id: `custom_cake_${shopId}`,
    id: `custom_cake_${shopId}`,
    name: "🎂 Custom Design Cake (Customize Your Cake)",
    price: 450,
    mrp: 550,
    discountedPrice: 450,
    unit: "1 lb (Pound)",
    category: "bakery",
    subcategory: "Custom Cakes",
    description: "Design and order personalized fresh cakes for Birthdays, Anniversaries & Parties! Choose your flavour, weight in pounds (1 lb, 2 lbs, 3 lbs...), tiers, eggless preference, custom message, and reference photo.",
    images: [
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600",
      "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=600"
    ],
    primaryImage: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600",
    stock: 999,
    status: "active",
    trending: true,
    shopId,
    shopName,
    isCustomizable: true,
    customCake: true,
    customCakeConfig: {
      unit: "pound",
      weights: [
        { label: "1 Pound (1 lb)", value: 1.0, popular: true, approxGrams: 450 },
        { label: "1.5 Pounds (1.5 lbs)", value: 1.5, approxGrams: 680 },
        { label: "2 Pounds (2 lbs)", value: 2.0, popular: true, approxGrams: 900 },
        { label: "2.5 Pounds (2.5 lbs)", value: 2.5, approxGrams: 1130 },
        { label: "3 Pounds (3 lbs)", value: 3.0, approxGrams: 1350 },
        { label: "4 Pounds (4 lbs)", value: 4.0, approxGrams: 1800 },
        { label: "5 Pounds (5 lbs)", value: 5.0, approxGrams: 2250 },
        { label: "6+ Pounds (Custom)", value: 6.0, approxGrams: 2700 }
      ],
      flavours: [
        "Chocolate Truffle", "Black Forest", "Red Velvet", "Butterscotch", "Vanilla",
        "Pineapple", "Strawberry", "Mango", "Blueberry", "Fruit & Nut", "Rasmalai", "Custom Flavour"
      ],
      occasions: ["Birthday", "Anniversary", "Wedding / Reception", "Baby Shower", "Celebration", "Other"],
      tiers: [1, 2, 3, 4]
    }
  };
}

// GET /api/products/admin-review — admin: list products for approval with shop name
// IMPORTANT: must be defined before /:id to avoid route conflict
router.get("/admin-review", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status = "pending", page = "1", limit = "50" } = req.query as Record<string, string>;
  const pg = parseInt(page), lm = parseInt(limit);
  const where = status !== "all" ? eq(products.status, status) : undefined;
  const skip = (pg - 1) * lm;

  const [result, [{ total }]] = await Promise.all([
    db.select().from(products).where(where).orderBy(desc(products.createdAt)).offset(skip).limit(lm),
    db.select({ total: count() }).from(products).where(where),
  ]);

  // Batch-fetch shop names
  const shopIds = [...new Set(result.map(p => p.shopId))];
  const shopRows = shopIds.length > 0
    ? await db.select({ id: shops.id, shopName: shops.shopName }).from(shops).where(inArray(shops.id, shopIds))
    : [];
  const shopMap = Object.fromEntries(shopRows.map(s => [s.id, s.shopName]));

  const enriched = result.map(p => ({ ...mi(p), shopName: shopMap[p.shopId] ?? "Unknown Shop" }));
  res.json({ success: true, products: enriched, total: Number(total), page: pg, pages: Math.ceil(Number(total) / lm) });
});

// GET /api/products/trending-manager — admin: all products enriched with sales stats for trending management
// IMPORTANT: defined before /:id to avoid route conflict
router.get("/trending-manager", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.query as Record<string, string>;

  const where = status && status !== "all" ? eq(products.status, status) : undefined;
  const allProducts = await db.select().from(products).where(where).orderBy(desc(products.createdAt)).limit(2000);

  // Sales stats by productId from orders JSONB
  const salesRows = await db.execute(sql`
    SELECT
      item->>'productId' AS product_id,
      SUM((item->>'qty')::int)::int AS units_sold,
      SUM((item->>'qty')::int * (item->>'price')::float)::float AS revenue
    FROM orders, jsonb_array_elements(items::jsonb) AS item
    WHERE item->>'productId' IS NOT NULL
    GROUP BY item->>'productId'
  `);
  const salesMap = new Map(
    (salesRows.rows as { product_id: string; units_sold: number; revenue: number }[])
      .map(r => [r.product_id, { unitsSold: Number(r.units_sold), revenue: Number(r.revenue) }])
  );

  const shopIds = [...new Set(allProducts.map(p => p.shopId))];
  const shopRows = shopIds.length > 0
    ? await db.select({ id: shops.id, shopName: shops.shopName }).from(shops).where(inArray(shops.id, shopIds))
    : [];
  const shopMap = Object.fromEntries(shopRows.map(s => [s.id, s.shopName]));

  const enriched = allProducts.map(p => ({
    ...mi(p),
    shopName: shopMap[p.shopId] ?? "Unknown Shop",
    unitsSold: salesMap.get(p.id)?.unitsSold ?? 0,
    revenue: salesMap.get(p.id)?.revenue ?? 0,
  }));

  res.json({ success: true, products: enriched });
});

// GET /api/products/barcode/:barcode — Exact Master Catalog & External Lookup
router.get("/barcode/:barcode", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const rawBarcode = String(req.params["barcode"] || "").trim();
    if (!rawBarcode) {
      res.status(400).json({ success: false, status: "INVALID_BARCODE", message: "Barcode is required" });
      return;
    }

    const result = await ProductLookupService.lookupByBarcode(rawBarcode);
    res.json({
      success: result.status === "FOUND",
      ...result,
    });
  } catch (_err) {
    res.status(500).json({ success: false, status: "NOT_FOUND", message: "Failed to lookup barcode" });
  }
});

// GET /api/products/master-catalog — Search master catalog
router.get("/master-catalog", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, category, limit = "30" } = req.query as Record<string, string>;
    const lm = Math.min(100, Math.max(1, parseInt(limit) || 30));
    const conditions = [];

    if (search && search.trim().length > 0) {
      const q = search.trim();
      conditions.push(or(
        ilike(masterProducts.name, `%${q}%`),
        ilike(masterProducts.brand, `%${q}%`),
        eq(masterProducts.barcode, q)
      ));
    }

    if (category && category !== "All") {
      conditions.push(eq(masterProducts.category, category));
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const list = await db.select().from(masterProducts).where(where).orderBy(desc(masterProducts.createdAt)).limit(lm);

    res.json({ success: true, count: list.length, products: list.map(mi) });
  } catch (_err) {
    res.status(500).json({ success: false, message: "Failed to search master catalog" });
  }
});

// POST /api/products/master — Create or update master catalog product
router.post("/master", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const rawBarcode = ProductLookupService.normalizeBarcode(String(body["barcode"] || ""));
    const name = String(body["name"] || "").trim();
    const category = String(body["category"] || "Grocery").trim();

    if (!name || name.length < 2) {
      res.status(400).json({ success: false, message: "Product name is required" });
      return;
    }

    // Check existing master product with this barcode
    if (rawBarcode) {
      const [existing] = await db.select().from(masterProducts).where(eq(masterProducts.barcode, rawBarcode)).limit(1);
      if (existing) {
        res.json({ success: true, masterProduct: mi(existing), isExisting: true });
        return;
      }
    }

    const images = sanitizeImages(body["images"] || (body["primaryImage"] ? [body["primaryImage"]] : []));
    const primaryImage = images.length > 0 ? images[0] : (body["primaryImage"] ? String(body["primaryImage"]) : undefined);

    const [created] = await db.insert(masterProducts).values({
      barcode: rawBarcode || undefined,
      gtin: body["gtin"] ? String(body["gtin"]) : undefined,
      name,
      brand: body["brand"] ? String(body["brand"]).trim() : undefined,
      category,
      subcategory: body["subcategory"] ? String(body["subcategory"]).trim() : undefined,
      variant: body["variant"] ? String(body["variant"]).trim() : undefined,
      netQuantity: body["netQuantity"] ? String(body["netQuantity"]).trim() : undefined,
      unit: body["unit"] ? String(body["unit"]).trim() : "1 unit",
      mrp: Math.max(0, Number(body["mrp"] ?? 0) || 0),
      description: body["description"] ? String(body["description"]).trim() : undefined,
      primaryImage,
      images,
      manufacturer: body["manufacturer"] ? String(body["manufacturer"]).trim() : undefined,
      countryOfOrigin: body["countryOfOrigin"] ? String(body["countryOfOrigin"]).trim() : "India",
      source: body["source"] ? String(body["source"]) : "MANUAL",
      verificationStatus: req.user?.role === "admin" || req.user?.role === "super_admin" ? "VERIFIED" : "PENDING_REVIEW",
      productType: body["productType"] ? String(body["productType"]) : (rawBarcode ? "PACKAGED" : "STORE_ITEM"),
      createdBy: req.user?.userId,
    }).returning();

    res.status(201).json({ success: true, masterProduct: mi(created!) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: "Failed to save master product", error: msg });
  }
});

// POST /api/products/link-master — Link a seller listing to an existing master product
router.post("/link-master", authenticate, vendorWriteLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const masterProductId = String(body["masterProductId"] || "");
    const sellingPrice = Math.max(0, Number(body["sellingPrice"] ?? body["price"] ?? 0) || 0);
    const stock = Math.max(0, Number(body["stock"] ?? 10) || 0);
    const inStock = body["inStock"] !== false && stock > 0;

    const [master] = await db.select().from(masterProducts).where(eq(masterProducts.id, masterProductId)).limit(1);
    if (!master) {
      res.status(404).json({ success: false, message: "Master product not found" });
      return;
    }

    const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.ownerId, req.user!.userId)).limit(1);
    const targetShopId = shop?.id || String(body["shopId"] || "");
    if (!targetShopId) {
      res.status(400).json({ success: false, message: "No approved shop found for this vendor" });
      return;
    }

    // Check if seller already has a listing for this master product
    const [existingListing] = await db
      .select()
      .from(products)
      .where(and(eq(products.shopId, targetShopId), eq(products.masterProductId, master.id)))
      .limit(1);

    if (existingListing) {
      const [updated] = await db.update(products).set({
        price: master.mrp && master.mrp > 0 ? master.mrp : sellingPrice,
        discountedPrice: master.mrp && master.mrp > sellingPrice ? sellingPrice : undefined,
        stock,
        status: inStock ? "active" : "out_of_stock",
      }).where(eq(products.id, existingListing.id)).returning();

      void invalidateProductCaches();
      res.json({ success: true, product: mi(updated!), isUpdate: true });
      return;
    }

    const [newListing] = await db.insert(products).values({
      name: master.name,
      description: master.description ?? undefined,
      brand: master.brand ?? undefined,
      barcode: master.barcode ?? undefined,
      sku: master.barcode ?? body["sellerSku"]?.toString(),
      masterProductId: master.id,
      price: master.mrp && master.mrp > 0 ? master.mrp : sellingPrice,
      discountedPrice: master.mrp && master.mrp > sellingPrice ? sellingPrice : undefined,
      category: master.category,
      subcategory: master.subcategory ?? undefined,
      shopId: targetShopId,
      images: Array.isArray(master.images) && master.images.length > 0 ? master.images : (master.primaryImage ? [master.primaryImage] : []),
      stock,
      unit: master.unit ?? "1 unit",
      status: "active",
      source: "SWIFTMART",
      verificationStatus: master.verificationStatus,
    }).returning();

    void invalidateProductCaches();
    res.status(201).json({ success: true, product: mi(newListing!) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: "Failed to link product to store", error: msg });
  }
});

// POST /api/products/report-wrong — Report incorrect barcode matching
router.post("/report-wrong", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const barcode = ProductLookupService.normalizeBarcode(String(body["barcode"] || ""));
    if (!barcode) {
      res.status(400).json({ success: false, message: "Barcode is required" });
      return;
    }

    await db.insert(productWrongReports).values({
      barcode,
      reportedBy: req.user?.userId,
      shopId: body["shopId"] ? String(body["shopId"]) : undefined,
      actualName: body["actualName"] ? String(body["actualName"]).trim() : undefined,
      photoUrl: body["photoUrl"] ? String(body["photoUrl"]).trim() : undefined,
      note: body["note"] ? String(body["note"]).trim() : undefined,
      status: "pending",
    });

    res.json({ success: true, message: "Report submitted to admin for review. Thank you for keeping catalog accurate!" });
  } catch (_err) {
    res.status(500).json({ success: false, message: "Failed to submit report" });
  }
});

// GET /api/products/:id
// L4 fix: strip admin-only fields (rejectionReason, commissionRate) for public/non-admin callers
router.get("/:id", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const isAdmin = authReq.user?.role === "admin" || authReq.user?.role === "super_admin";
    const [product] = await db.select().from(products).where(eq(products.id, req.params["id"] as string)).limit(1);
    if (!product) { res.status(404).json({ success: false, message: "Not found" }); return; }
    const mapped = mi(product) as Record<string, unknown>;
    if (!isAdmin) {
      delete mapped["rejectionReason"];
      delete mapped["commissionRate"];
    }
    res.json({ success: true, product: mapped });
  } catch {
    res.status(500).json({ success: false, message: "Failed to load product. Please try again." });
  }
});

// POST /api/products
router.post("/", authenticate, vendorWriteLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const VENDOR_ROLES = new Set(["vendor", "admin", "super_admin"]);

  // Self-heal: if the user's JWT says "customer" but they own an approved shop,
  // their role was never updated (e.g. Google-login account linking gap). Fix it now.
  if (!VENDOR_ROLES.has(req.user!.role)) {
    const [ownedShop] = await db.select({ id: shops.id })
      .from(shops)
      .where(and(eq(shops.ownerId, req.user!.userId), eq(shops.status, "approved")))
      .limit(1);
    if (ownedShop) {
      await db.update(users).set({ role: "vendor", vendorStatus: "approved" }).where(eq(users.id, req.user!.userId));
      req.user!.role = "vendor";
    } else {
      res.status(403).json({ success: false, message: "Forbidden: insufficient role" });
      return;
    }
  }

  const isAdmin = req.user!.role === "admin" || req.user!.role === "super_admin";

  // Admin can create a product for any shop by passing shopId directly (may specify status)
  if (isAdmin && body["shopId"]) {
    const [shopExists] = await db.select({ id: shops.id }).from(shops).where(eq(shops.id, String(body["shopId"]))).limit(1);
    if (!shopExists) { res.status(400).json({ success: false, message: "Shop not found" }); return; }
    const adminPrice = Math.max(0, Number(body["price"] ?? 0) || 0);
    const adminDiscounted = body["discountedPrice"] != null ? (Number(body["discountedPrice"]) || undefined) : undefined;
    if (adminDiscounted != null && adminDiscounted >= adminPrice) {
      res.status(400).json({ success: false, message: "Sale price must be less than MRP" });
      return;
    }
    const [product] = await db.insert(products).values({
      name: String(body["name"] ?? ""),
      description: body["description"] ? String(body["description"]) : undefined,
      price: adminPrice,
      discountedPrice: adminDiscounted,
      category: String(body["category"] ?? ""),
      subcategory: body["subcategory"] ? String(body["subcategory"]) : undefined,
      shopId: String(body["shopId"]),
      images: sanitizeImages(body["images"]),
      stock: Math.max(0, Number(body["stock"] ?? 0) || 0),
      sku: body["sku"] ? String(body["sku"]) : undefined,
      unit: body["unit"] ? String(body["unit"]) : undefined,
      commissionRate: body["commissionRate"] != null ? (Number(body["commissionRate"]) || undefined) : undefined,
      trending: Boolean(body["trending"] ?? false),
      status: body["status"] ? String(body["status"]) : "pending",
      colors: Array.isArray(body["colors"]) ? body["colors"] : undefined,
      sizes: Array.isArray(body["sizes"]) ? body["sizes"] : undefined,
      colorImages: (body["colorImages"] && typeof body["colorImages"] === "object" && !Array.isArray(body["colorImages"])) ? body["colorImages"] : undefined,
      variants: sanitizeVariants(body["variants"]),
      fomoTag: body["fomoTag"] ? String(body["fomoTag"]) : undefined,
    }).returning();
    void invalidateProductCaches();
    res.status(201).json({ success: true, product: mi(product!) });
    return;
  }

  const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.ownerId, req.user!.userId)).limit(1);
  if (!shop) { res.status(400).json({ success: false, message: "No approved shop found for this vendor" }); return; }

  // Vendor uploads always start as pending — strip any status the client may have sent
  const { status: _ignored, ...safeBody } = body;
  const vendorPrice = Math.max(0, Number(safeBody["price"] ?? 0) || 0);
  const vendorDiscounted = safeBody["discountedPrice"] != null ? (Number(safeBody["discountedPrice"]) || undefined) : undefined;
  if (vendorDiscounted != null && vendorDiscounted >= vendorPrice) {
    res.status(400).json({ success: false, message: "Sale price must be less than MRP" });
    return;
  }
  const [product] = await db.insert(products).values({
    name: String(safeBody["name"] ?? ""),
    description: safeBody["description"] ? String(safeBody["description"]) : undefined,
    price: vendorPrice,
    discountedPrice: vendorDiscounted,
    category: String(safeBody["category"] ?? ""),
    subcategory: safeBody["subcategory"] ? String(safeBody["subcategory"]) : undefined,
    shopId: shop.id,
    images: sanitizeImages(safeBody["images"]),
    stock: Math.max(0, Number(safeBody["stock"] ?? 0) || 0),
    sku: safeBody["sku"] ? String(safeBody["sku"]) : undefined,
    unit: safeBody["unit"] ? String(safeBody["unit"]) : undefined,
    commissionRate: safeBody["commissionRate"] != null ? (Number(safeBody["commissionRate"]) || undefined) : undefined,
    trending: Boolean(safeBody["trending"] ?? false),
    status: "pending",
    colors: Array.isArray(safeBody["colors"]) ? safeBody["colors"] : undefined,
    sizes: Array.isArray(safeBody["sizes"]) ? safeBody["sizes"] : undefined,
    colorImages: (safeBody["colorImages"] && typeof safeBody["colorImages"] === "object" && !Array.isArray(safeBody["colorImages"])) ? safeBody["colorImages"] : undefined,
    variants: sanitizeVariants(safeBody["variants"]),
    fomoTag: safeBody["fomoTag"] ? String(safeBody["fomoTag"]) : undefined,
  }).returning();

  // Notify all admins & super_admins that a new product is pending review
  try {
    const adminUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.role, "admin"), eq(users.role, "super_admin")));
    await Promise.all(
      adminUsers.map(admin =>
        createNotificationLimited(admin.id, {
          type: "system",
          title: "🛒 New Product Pending Review",
          message: `A vendor submitted "${product!.name}" for approval. Review it in the admin panel.`,
          data: { productId: product!.id },
        })
      )
    );
  } catch {
    // Non-fatal — product was created; notification failure should not block response
  }

  void invalidateProductCaches();
  res.status(201).json({ success: true, product: mi(product!) });
});

// POST /api/products/bulk — Bulk create products for vendor
router.post("/bulk", authenticate, vendorWriteLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as { items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
    const rawItems = Array.isArray(body) ? body : (Array.isArray(body.items) ? body.items : []);

    if (rawItems.length === 0) {
      res.status(400).json({ success: false, message: "No products provided in bulk payload" });
      return;
    }

    if (rawItems.length > 100) {
      res.status(400).json({ success: false, message: "Maximum 100 products allowed per batch" });
      return;
    }

    const VENDOR_ROLES = new Set(["vendor", "admin", "super_admin"]);
    if (!VENDOR_ROLES.has(req.user!.role)) {
      const [ownedShop] = await db.select({ id: shops.id })
        .from(shops)
        .where(and(eq(shops.ownerId, req.user!.userId), eq(shops.status, "approved")))
        .limit(1);
      if (ownedShop) {
        await db.update(users).set({ role: "vendor", vendorStatus: "approved" }).where(eq(users.id, req.user!.userId));
        req.user!.role = "vendor";
      } else {
        res.status(403).json({ success: false, message: "Forbidden: insufficient role" });
        return;
      }
    }

    const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.ownerId, req.user!.userId)).limit(1);
    const targetShopId = shop?.id || (req.body as Record<string, unknown>)["shopId"]?.toString();
    if (!targetShopId) {
      res.status(400).json({ success: false, message: "Shop ID is required" });
      return;
    }

    const insertedProducts = [];
    for (const item of rawItems) {
      const price = Math.max(0, Number(item["price"] ?? item["mrp"] ?? 0) || 0);
      const discountedPrice = item["discountedPrice"] != null
        ? Number(item["discountedPrice"])
        : (item["price"] != null && item["mrp"] != null && Number(item["price"]) < Number(item["mrp"]) ? Number(item["price"]) : undefined);
      
      const [newProd] = await db.insert(products).values({
        name: String(item["name"] || "Untitled Product").trim(),
        description: item["description"] ? String(item["description"]) : undefined,
        price: price,
        discountedPrice: discountedPrice && discountedPrice < price ? discountedPrice : undefined,
        category: String(item["category"] || "Grocery").trim(),
        subcategory: item["subcategory"] ? String(item["subcategory"]) : undefined,
        shopId: targetShopId,
        images: sanitizeImages(item["images"] || (item["imageUrl"] ? [item["imageUrl"]] : item["image"] ? [item["image"]] : [])),
        stock: Math.max(0, Number(item["stock"] ?? 10) || 10),
        sku: item["sku"] ? String(item["sku"]) : (item["barcode"] ? String(item["barcode"]) : undefined),
        unit: item["unit"] ? String(item["unit"]) : "1 unit",
        status: "pending",
      }).returning();
      if (newProd) insertedProducts.push(mi(newProd));
    }

    void invalidateProductCaches();
    res.status(201).json({
      success: true,
      count: insertedProducts.length,
      products: insertedProducts,
      message: `Successfully created ${insertedProducts.length} products.`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: "Failed to bulk create products", error: msg });
  }
});

// POST /api/products/bulk-import-csv — Process and match CSV/Excel rows against Master Catalog
router.post("/bulk-import-csv", authenticate, vendorWriteLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows, shopId: reqShopId } = req.body as { rows?: Array<Record<string, unknown>>; shopId?: string };
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ success: false, message: "No rows provided for import" });
      return;
    }

    if (rows.length > 500) {
      res.status(400).json({ success: false, message: "Maximum 500 rows allowed per import batch" });
      return;
    }

    const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.ownerId, req.user!.userId)).limit(1);
    const targetShopId = shop?.id || reqShopId;
    if (!targetShopId) {
      res.status(400).json({ success: false, message: "Shop ID is required" });
      return;
    }

    let matchedExisting = 0;
    let newProductsCreated = 0;
    const errors: Array<{ row: number; reason: string }> = [];
    const seenBarcodes = new Set<string>();
    let duplicateBarcodes = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rawBarcode = ProductLookupService.normalizeBarcode(String(row["barcode"] || row["Barcode"] || row["sku"] || row["SKU"] || ""));
      const rawName = String(row["name"] || row["productName"] || row["Product Name"] || "").trim();
      const rawPrice = Math.max(0, Number(row["sellingPrice"] ?? row["Selling Price"] ?? row["price"] ?? row["Price"] ?? 0) || 0);
      const rawMrp = Math.max(0, Number(row["mrp"] ?? row["MRP"] ?? rawPrice) || 0);
      const rawStock = Math.max(0, Number(row["stock"] ?? row["Stock"] ?? 10) || 0);
      const rawCategory = String(row["category"] || row["Category"] || "Grocery").trim();
      const rawUnit = String(row["unit"] || row["Unit"] || row["size"] || row["Size"] || "1 unit").trim();
      const brand = String(row["brand"] || row["Brand"] || "").trim() || undefined;

      if (rawBarcode) {
        if (seenBarcodes.has(rawBarcode)) {
          duplicateBarcodes++;
          continue;
        }
        seenBarcodes.add(rawBarcode);

        // Check exact match in masterProducts
        const [master] = await db.select().from(masterProducts).where(eq(masterProducts.barcode, rawBarcode)).limit(1);
        if (master) {
          // Link to existing master product
          await db.insert(products).values({
            name: master.name,
            description: master.description ?? undefined,
            brand: master.brand ?? undefined,
            barcode: master.barcode ?? undefined,
            sku: master.barcode ?? undefined,
            masterProductId: master.id,
            price: master.mrp && master.mrp > 0 ? master.mrp : rawPrice,
            discountedPrice: master.mrp && master.mrp > rawPrice ? rawPrice : undefined,
            category: master.category,
            subcategory: master.subcategory ?? undefined,
            shopId: targetShopId,
            images: Array.isArray(master.images) && master.images.length > 0 ? master.images : (master.primaryImage ? [master.primaryImage] : []),
            stock: rawStock,
            unit: master.unit ?? rawUnit,
            status: "active",
            source: "SWIFTMART",
          });
          matchedExisting++;
          continue;
        }
      }

      // Not in master catalog — validate product name
      if (!rawName || rawName.length < 2) {
        errors.push({ row: i + 1, reason: "Product Name is required" });
        continue;
      }

      // Create new Master Product if barcode is present
      let createdMasterId: string | undefined;
      if (rawBarcode) {
        const [newMaster] = await db.insert(masterProducts).values({
          barcode: rawBarcode,
          name: rawName,
          brand,
          category: rawCategory,
          unit: rawUnit,
          mrp: rawMrp > 0 ? rawMrp : rawPrice,
          source: "MANUAL",
          verificationStatus: "PENDING_REVIEW",
          createdBy: req.user?.userId,
        }).onConflictDoNothing().returning();
        if (newMaster) createdMasterId = newMaster.id;
      }

      // Create Store Listing
      await db.insert(products).values({
        name: rawName,
        brand,
        barcode: rawBarcode || undefined,
        sku: rawBarcode || undefined,
        masterProductId: createdMasterId,
        price: rawMrp > 0 ? rawMrp : rawPrice,
        discountedPrice: (rawPrice > 0 && rawPrice < rawMrp) ? rawPrice : undefined,
        category: rawCategory,
        shopId: targetShopId,
        stock: rawStock,
        unit: rawUnit,
        status: "active",
        source: "MANUAL",
      });
      newProductsCreated++;
    }

    void invalidateProductCaches();
    res.json({
      success: true,
      summary: {
        totalRows: rows.length,
        matchedExisting,
        newProductsCreated,
        duplicateBarcodes,
        errorCount: errors.length,
        errors: errors.slice(0, 20),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: "Failed to process bulk import", error: msg });
  }
});

// PATCH /api/products/:id/approval — admin: approve or reject a product with notification
router.patch("/:id/approval", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { action, rejectionReason } = req.body as { action: "approve" | "reject"; rejectionReason?: string };

  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ success: false, message: "action must be 'approve' or 'reject'" });
    return;
  }
  if (action === "reject" && !rejectionReason?.trim()) {
    res.status(400).json({ success: false, message: "rejectionReason is required when rejecting" });
    return;
  }

  const updatePayload = action === "approve"
    ? { status: "active", rejectionReason: null as string | null }
    : { status: "rejected", rejectionReason: rejectionReason!.trim() };

  const [product] = await db.update(products).set(updatePayload).where(eq(products.id, req.params["id"] as string)).returning();
  if (!product) { res.status(404).json({ success: false, message: "Product not found" }); return; }

  void invalidateProductCaches();

  // Notify the vendor who owns this product
  try {
    const [shop] = await db.select({ ownerId: shops.ownerId }).from(shops).where(eq(shops.id, product.shopId)).limit(1);
    if (shop?.ownerId) {
      if (action === "approve") {
        await createNotificationLimited(shop.ownerId, {
          type: "system",
          title: "✅ Product Approved",
          message: `Your product "${product.name}" has been approved by SwiftMart and is now visible to customers.`,
          data: { productId: product.id },
        });
      } else {
        await createNotificationLimited(shop.ownerId, {
          type: "system",
          title: "❌ Product Rejected",
          message: `Your product "${product.name}" has been rejected.\n\nReason:\n${rejectionReason}`,
          data: { productId: product.id, rejectionReason },
        });
      }
    }
  } catch {
    // Non-fatal — product status was updated; notification failure should not block response
  }

  res.json({ success: true, product: mi(product) });
});

// GET /api/products/:id — Fetch single product details (supports custom cake products)
router.get("/:id", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params["id"] as string;
    if (id.startsWith("custom_cake_") || id === "custom_cake") {
      const targetShopId = id.replace("custom_cake_", "");
      let shopName = "Bakery & Cake Shop";
      if (targetShopId && targetShopId !== "custom_cake") {
        const [shop] = await db.select({ shopName: shops.shopName }).from(shops).where(eq(shops.id, targetShopId)).limit(1);
        if (shop) shopName = shop.shopName;
      }
      res.json({
        success: true,
        product: buildCustomCakeProduct(targetShopId || "bakery", shopName),
      });
      return;
    }

    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    let shopName = "";
    try {
      const [shop] = await db.select({ shopName: shops.shopName }).from(shops).where(eq(shops.id, product.shopId)).limit(1);
      if (shop) shopName = shop.shopName;
    } catch (_) {}

    res.json({
      success: true,
      product: { ...mi(product), shopName },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch product" });
  }
});

// PATCH /api/products/:id — vendor/admin edit
// Vendor edits always reset status to "pending" and verify ownership (M2)
router.patch("/:id", authenticate, V, vendorWriteLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  const isAdmin = req.user!.role === "admin" || req.user!.role === "super_admin";
  const body = req.body as Record<string, unknown>;

  // Fetch existing product upfront for ownership check + old image cleanup (M2)
  const [existing] = await db.select({ shopId: products.shopId, images: products.images })
    .from(products).where(eq(products.id, req.params["id"] as string)).limit(1);
  if (!existing) { res.status(404).json({ success: false, message: "Not found" }); return; }

  if (!isAdmin) {
    const [shop] = await db.select({ id: shops.id }).from(shops)
      .where(eq(shops.ownerId, req.user!.userId)).limit(1);
    if (!shop || shop.id !== existing.shopId) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }
  }

  // Allowlist: only permit known product fields to prevent mass-assignment
  // (e.g. prevents a vendor from overwriting shopId, vendorId, or status directly)
  const VENDOR_ALLOWED_FIELDS = new Set([
    "name", "description", "price", "discountedPrice", "unit",
    "stock", "category", "subcategory", "images", "trending", "colors", "sizes", "colorImages", "variants", "fomoTag",
  ]);
  const ADMIN_EXTRA_FIELDS = new Set(["status", "rejectionReason", "shopId"]);

  const updateData: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(body)) {
    if (VENDOR_ALLOWED_FIELDS.has(key) || (isAdmin && ADMIN_EXTRA_FIELDS.has(key))) {
      updateData[key] = val;
    }
  }

  const isStockOnlyUpdate = Object.keys(body).every(k => k === "stock" || k === "inStock" || k === "status");
  if (!isAdmin && !isStockOnlyUpdate) {
    // Vendor general edits must go through re-approval — force status back to pending
    updateData["status"] = "pending";
    delete updateData["rejectionReason"];
  } else if (body["status"]) {
    updateData["status"] = body["status"];
  }
  // Validate: sale price must be less than MRP when both are present
  if ("discountedPrice" in updateData && updateData["discountedPrice"] != null) {
    const updatedMrp = "price" in updateData
      ? Number(updateData["price"])
      : (await db.select({ price: products.price }).from(products).where(eq(products.id, req.params["id"] as string)).limit(1))[0]?.price ?? 0;
    const updatedSale = Number(updateData["discountedPrice"]);
    if (updatedSale >= updatedMrp) {
      res.status(400).json({ success: false, message: "Sale price must be less than MRP" });
      return;
    }
  }
  // M6 fix: sanitize image URLs on update too
  if ("images" in updateData) {
    updateData["images"] = sanitizeImages(updateData["images"]);
  }
  if ("variants" in updateData) {
    updateData["variants"] = sanitizeVariants(updateData["variants"]);
  }

  const [product] = await db.update(products)
    .set(updateData)
    .where(eq(products.id, req.params["id"] as string))
    .returning();
  if (!product) { res.status(404).json({ success: false, message: "Not found" }); return; }

  void invalidateProductCaches();

  // M2: delete Cloudinary images that were removed from the images array
  if ("images" in updateData) {
    const oldImages = (existing.images as string[]) ?? [];
    const newImages = (updateData["images"] as string[]) ?? [];
    const removed = oldImages.filter(url => !newImages.includes(url));
    if (removed.length > 0) {
      void Promise.all(removed.map(url => deleteFromImageKit(url)));
    }
  }

  res.json({ success: true, product: mi(product) });
});

// DELETE /api/products/:id — Vendor (own shop) or Admin delete
router.delete("/:id", authenticate, V, async (req: AuthRequest, res: Response): Promise<void> => {
  const isAdmin = req.user!.role === "admin" || req.user!.role === "super_admin";
  const [product] = await db.select({ id: products.id, shopId: products.shopId, images: products.images }).from(products).where(eq(products.id, req.params["id"] as string)).limit(1);
  if (!product) { res.status(404).json({ success: false, message: "Product not found" }); return; }

  if (!isAdmin) {
    const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.ownerId, req.user!.userId)).limit(1);
    if (!shop || shop.id !== product.shopId) {
      res.status(403).json({ success: false, message: "Forbidden: You can only delete products from your own store" });
      return;
    }
  }

  if (product.images && (product.images as string[]).length > 0) {
    await Promise.all((product.images as string[]).map(url => deleteFromImageKit(url)));
  }
  await db.delete(products).where(eq(products.id, req.params["id"] as string));
  void invalidateProductCaches();
  res.json({ success: true, message: "Product deleted successfully" });
});

export default router;
