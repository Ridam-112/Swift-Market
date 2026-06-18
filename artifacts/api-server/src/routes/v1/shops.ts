import { Router, type Request, type Response } from "express";
import { db, shops, shopTypes, users, products, orders } from "@workspace/db";
import { eq, and, ilike, or, inArray, desc, count, sql } from "drizzle-orm";
import { deleteFromCloudinary } from "../../lib/cloudinary.js";
import { authenticate, requireRole, optionalAuth, type AuthRequest } from "../../middlewares/auth.js";
import { createNotificationLimited } from "../../utils/notification.js";
import { mi, miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");
const ADMIN_ROLES = new Set(["admin", "super_admin"]);

const SENSITIVE_FIELDS = ["panNumber", "gstNumber", "bankAccountHolderName", "bankAccountNumber", "bankIfscCode", "upiId"] as const;

function stripSensitiveFields(shop: Record<string, unknown>): Record<string, unknown> {
  const safe = { ...shop };
  for (const field of SENSITIVE_FIELDS) delete safe[field];
  return safe;
}

// GET /api/shops
router.get("/", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  const isAdmin = authReq.user?.role === "admin" || authReq.user?.role === "super_admin";

  const { status, shopType, city, ownerId, pincode, page = "1", limit = "20", search, category } =
    req.query as Record<string, string>;

  const pg = Math.max(1, parseInt(page) || 1);
  const lm = Math.min(200, Math.max(1, parseInt(limit) || 20));
  const conditions = [];

  if (status) conditions.push(eq(shops.status, status));
  if (category) conditions.push(ilike(shops.category, `%${category}%`));
  if (city) conditions.push(sql`${shops.address}->>'city' ILIKE ${"%" + city + "%"}`);
  if (ownerId) conditions.push(eq(shops.ownerId, ownerId));
  if (pincode) conditions.push(sql`${shops.address}->>'pincode' = ${pincode}`);
  if (search) {
    conditions.push(or(
      ilike(shops.shopName, `%${search}%`),
      ilike(shops.ownerName, `%${search}%`),
      ilike(shops.phone, `%${search}%`),
    )!);
  }

  // Non-admin browsing without an explicit status filter must only see approved shops.
  // Vendors viewing their own shop (ownerId filter) are exempt so they can see pending/rejected too.
  if (!isAdmin && !status && !ownerId) {
    conditions.push(eq(shops.status, "approved"));
  }

  if (shopType) {
    conditions.push(eq(shops.shopType, shopType));
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const skip = (pg - 1) * lm;

  const [result, [{ total }]] = await Promise.all([
    db.select().from(shops).where(where).orderBy(desc(shops.createdAt)).offset(skip).limit(lm),
    db.select({ total: count() }).from(shops).where(where),
  ]);

  const mapped = miArr(result);
  const sanitised = isAdmin ? mapped : mapped.map(s => stripSensitiveFields(s as Record<string, unknown>));
  res.json({ success: true, shops: sanitised, total: Number(total), page: pg, pages: Math.ceil(Number(total) / lm) });
});

// GET /api/shops/:id/details — admin: shop + products + recent orders + owner
router.get("/:id/details", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const [shop] = await db.select().from(shops).where(eq(shops.id, req.params["id"] as string)).limit(1);
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }

  const [shopProducts, shopOrders, ownerArr] = await Promise.all([
    db.select().from(products).where(eq(products.shopId, shop.id)),
    db.select().from(orders).where(eq(orders.shopId, shop.id)).orderBy(desc(orders.createdAt)).limit(50),
    db.select({
      id: users.id, name: users.name, phone: users.phone, email: users.email,
      role: users.role, vendorStatus: users.vendorStatus, status: users.status, createdAt: users.createdAt,
    }).from(users).where(eq(users.id, shop.ownerId)).limit(1),
  ]);

  const revenue = shopOrders.reduce((sum, o) => sum + (o.netAmount ?? o.subtotal ?? 0), 0);
  const owner = ownerArr[0] ? { ...ownerArr[0], _id: ownerArr[0].id } : null;

  res.json({ success: true, shop: mi(shop), products: miArr(shopProducts), orders: miArr(shopOrders), owner, totalProducts: shopProducts.length, totalOrders: shopOrders.length, revenue });
});

// GET /api/shops/:id
router.get("/:id", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  const isAdmin = authReq.user?.role === "admin" || authReq.user?.role === "super_admin";
  const [shop] = await db.select().from(shops).where(eq(shops.id, req.params["id"] as string)).limit(1);
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  const mapped = mi(shop) as Record<string, unknown>;
  res.json({ success: true, shop: isAdmin ? mapped : stripSensitiveFields(mapped) });
});

// POST /api/shops/admin-create
router.post("/admin-create", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const phone = String(body["phone"] ?? "").trim();
  if (!phone) { res.status(400).json({ success: false, message: "Owner phone is required" }); return; }
  if (!body["shopName"]) { res.status(400).json({ success: false, message: "Shop name is required" }); return; }

  // Wrap user upsert + shop insert in one transaction so a crash mid-way
  // can't leave an owner with no shop (or a shop with no owner).
  const { shop, owner } = await db.transaction(async (tx) => {
    let [owner] = await tx.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (!owner) {
      [owner] = await tx.insert(users).values({
        name: String(body["ownerName"] ?? body["shopName"] ?? "Vendor"),
        phone,
        email: body["ownerEmail"] ? String(body["ownerEmail"]) : undefined,
        role: "vendor",
        vendorStatus: "approved",
        status: "active",
      }).returning();
    } else {
      const updates: Record<string, string> = { vendorStatus: "approved" };
      if (!ADMIN_ROLES.has(owner.role)) updates["role"] = "vendor";
      [owner] = await tx.update(users).set(updates).where(eq(users.id, owner.id)).returning();
    }

    const [shop] = await tx.insert(shops).values({
      shopName: String(body["shopName"]),
      ownerName: String(body["ownerName"] ?? owner.name),
      phone,
      ownerId: owner.id,
      address: (body["address"] ?? {}) as Record<string, string>,
      shopType: body["shopType"] ? String(body["shopType"]) : (body["category"] ? String(body["category"]) : undefined),
      category: body["category"] ? String(body["category"]) : undefined,
      description: body["description"] ? String(body["description"]) : undefined,
      image: body["image"] ? String(body["image"]) : undefined,
      status: "approved",
      isOpen: true,
      panNumber: String(body["panNumber"] ?? "ADMIN000000A"),
      bankAccountNumber: String(body["bankAccountNumber"] ?? "0000000000"),
      bankIfscCode: String(body["bankIfscCode"] ?? "ADMIN0000000"),
      upiId: String(body["upiId"] ?? `${phone}@upi`),
    }).returning();

    return { shop: shop!, owner };
  });

  // Notification is a non-critical side effect — runs outside the transaction
  void createNotificationLimited(owner.id, {
    type: "system",
    title: "Vendor Account Created",
    message: "Your shop has been created and approved by SwiftMart Admin.",
  });

  res.status(201).json({ success: true, shop: mi(shop), owner: mi(owner) });
});

// POST /api/shops — vendor applies
router.post("/", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;

  // Shop insert + user status update must be atomic — a partial write
  // would leave the user's role and the shop record out of sync.
  const shop = await db.transaction(async (tx) => {
    const [shop] = await tx.insert(shops).values({
      shopName: String(body["shopName"] ?? ""),
      ownerName: String(body["ownerName"] ?? ""),
      phone: String(body["phone"] ?? ""),
      ownerId: req.user!.userId,
      address: (body["address"] ?? {}) as Record<string, string>,
      shopType: body["shopType"] ? String(body["shopType"]) : undefined,
      category: body["category"] ? String(body["category"]) : undefined,
      subcategory: body["subcategory"] ? String(body["subcategory"]) : undefined,
      description: body["description"] ? String(body["description"]) : undefined,
      image: body["image"] ? String(body["image"]) : undefined,
      banner: body["banner"] ? String(body["banner"]) : undefined,
      panNumber: String(body["panNumber"] ?? ""),
      gstNumber: body["gstNumber"] ? String(body["gstNumber"]) : undefined,
      bankAccountHolderName: body["bankAccountHolderName"] ? String(body["bankAccountHolderName"]) : undefined,
      bankAccountNumber: String(body["bankAccountNumber"] ?? ""),
      bankIfscCode: String(body["bankIfscCode"] ?? ""),
      upiId: body["upiId"] ? String(body["upiId"]) : undefined,
      certificateType: body["certificateType"] ? String(body["certificateType"]) : undefined,
      certificateNumber: body["certificateNumber"] ? String(body["certificateNumber"]) : undefined,
      certificateExpiryDate: body["certificateExpiryDate"] ? String(body["certificateExpiryDate"]) : undefined,
      certificateFile: body["certificateFile"] ? String(body["certificateFile"]) : undefined,
      certificateStatus: body["certificateFile"] ? "pending" : undefined,
      verificationStatus: "pending",
      status: "pending",
    }).returning();
    await tx.update(users).set({ vendorStatus: "pending" }).where(eq(users.id, req.user!.userId));
    return shop!;
  });

  res.status(201).json({ success: true, shop: mi(shop) });
});

// PATCH /api/shops/my/certificate — vendor re-uploads rejected certificate
router.patch("/my/certificate", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (!body["certificateFile"]) {
    res.status(400).json({ success: false, message: "certificateFile is required" });
    return;
  }
  const update: Record<string, unknown> = {
    certificateFile: String(body["certificateFile"]),
    certificateStatus: "pending",
    certificateRejectReason: null,
  };
  if (body["certificateNumber"]) update["certificateNumber"] = String(body["certificateNumber"]);
  if (body["certificateExpiryDate"]) update["certificateExpiryDate"] = String(body["certificateExpiryDate"]);
  const [updated] = await db.update(shops).set(update).where(eq(shops.ownerId, req.user!.userId)).returning();
  if (!updated) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  res.json({ success: true, shop: mi(updated) });
});

// POST /api/shops/:id/verify — admin verifies vendor compliance
router.post("/:id/verify", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const [shop] = await db.update(shops)
    .set({ verificationStatus: "verified", certificateStatus: "verified" })
    .where(eq(shops.id, req.params["id"] as string))
    .returning();
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  void createNotificationLimited(shop.ownerId, {
    type: "system",
    title: "Vendor Verified",
    message: "Your shop compliance has been verified. You can now access all vendor features.",
  });
  res.json({ success: true, shop: mi(shop) });
});

// POST /api/shops/:id/reject-certificate — admin rejects the certificate
router.post("/:id/reject-certificate", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { reason } = req.body as { reason?: string };
  const [shop] = await db.update(shops)
    .set({
      certificateStatus: "rejected",
      certificateRejectReason: reason ?? null,
      verificationStatus: "pending",
    })
    .where(eq(shops.id, req.params["id"] as string))
    .returning();
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  void createNotificationLimited(shop.ownerId, {
    type: "system",
    title: "Compliance Document Rejected",
    message: reason
      ? `Your compliance document was rejected: ${reason}. Please re-upload.`
      : "Your compliance document was rejected. Please re-upload a valid document.",
  });
  res.json({ success: true, shop: mi(shop) });
});

// PATCH /api/shops/my/profile — vendor updates their own shop profile (safe fields only)
router.patch("/my/profile", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const allowed = ["shopName", "description", "image", "banner", "address", "shopType", "category", "timings"] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }
  // M2: fetch old image/banner before update so we can clean up replaced Cloudinary assets
  const [oldShop] = await db.select({ image: shops.image, banner: shops.banner })
    .from(shops).where(eq(shops.ownerId, req.user!.userId)).limit(1);

  const [updated] = await db.update(shops).set(update).where(eq(shops.ownerId, req.user!.userId)).returning();
  if (!updated) { res.status(404).json({ success: false, message: "Shop not found" }); return; }

  // Delete old Cloudinary assets that were replaced
  if (oldShop) {
    const toDelete: string[] = [];
    if ("image" in update && update["image"] !== oldShop.image && oldShop.image) toDelete.push(oldShop.image);
    if ("banner" in update && update["banner"] !== oldShop.banner && oldShop.banner) toDelete.push(oldShop.banner);
    if (toDelete.length > 0) void Promise.all(toDelete.map(url => deleteFromCloudinary(url)));
  }

  res.json({ success: true, shop: mi(updated) });
});

// PATCH /api/shops/my/toggle-open — vendor toggles their own shop open/close
router.patch("/my/toggle-open", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const [shop] = await db.select().from(shops).where(eq(shops.ownerId, req.user!.userId)).limit(1);
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  if (shop.status !== "approved") {
    res.status(403).json({ success: false, message: "Only approved shops can change their open status" });
    return;
  }
  const [updated] = await db.update(shops).set({ isOpen: !shop.isOpen }).where(eq(shops.id, shop.id)).returning();
  res.json({ success: true, isOpen: updated!.isOpen, shop: mi(updated!) });
});

// PATCH /api/shops/:id — admin updates shop fields (allowlist-validated to prevent arbitrary injection)
const SHOP_PATCH_ALLOWED = new Set([
  "shopName", "ownerName", "phone", "address", "shopType", "category", "subcategory",
  "description", "image", "banner", "timings", "commissionRate", "status", "isOpen",
  "panNumber", "gstNumber", "bankAccountHolderName", "bankAccountNumber", "bankIfscCode", "upiId",
]);
router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (SHOP_PATCH_ALLOWED.has(k)) update[k] = v;
  }
  if (Object.keys(update).length === 0) {
    res.status(400).json({ success: false, message: "No valid fields provided. Allowed: " + [...SHOP_PATCH_ALLOWED].join(", ") });
    return;
  }
  // M2: fetch old image/banner before update so we can clean up replaced Cloudinary assets
  const [oldShop] = await db.select({ image: shops.image, banner: shops.banner })
    .from(shops).where(eq(shops.id, req.params["id"] as string)).limit(1);

  const [shop] = await db.update(shops).set(update).where(eq(shops.id, req.params["id"] as string)).returning();
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }

  if (oldShop) {
    const toDelete: string[] = [];
    if ("image" in update && update["image"] !== oldShop.image && oldShop.image) toDelete.push(oldShop.image);
    if ("banner" in update && update["banner"] !== oldShop.banner && oldShop.banner) toDelete.push(oldShop.banner);
    if (toDelete.length > 0) void Promise.all(toDelete.map(url => deleteFromCloudinary(url)));
  }

  res.json({ success: true, shop: mi(shop) });
});

// POST /api/shops/:id/approve
router.post("/:id/approve", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const shopId = req.params["id"] as string;

  // C1 fix: if compliance docs have been uploaded they must be verified before the shop can go live.
  // A shop with certificateFile set but certificateStatus !== "verified" is blocked until an admin
  // runs POST /api/shops/:id/verify.
  const [existing] = await db.select({
    certificateFile: shops.certificateFile,
    certificateStatus: shops.certificateStatus,
  }).from(shops).where(eq(shops.id, shopId)).limit(1);

  if (!existing) { res.status(404).json({ success: false, message: "Shop not found" }); return; }

  if (existing.certificateFile && existing.certificateStatus !== "verified") {
    res.status(422).json({
      success: false,
      message: "Cannot approve shop: compliance document is uploaded but not yet verified. Please verify or reject the certificate first (POST /api/shops/:id/verify).",
    });
    return;
  }

  const shop = await db.transaction(async (tx) => {
    const [shop] = await tx.update(shops).set({ status: "approved", isOpen: true }).where(eq(shops.id, shopId)).returning();
    if (!shop) return null;
    const [owner] = await tx.select({ role: users.role }).from(users).where(eq(users.phone, shop.phone)).limit(1);
    if (owner) {
      const updates: Record<string, string> = { vendorStatus: "approved" };
      if (!ADMIN_ROLES.has(owner.role)) updates["role"] = "vendor";
      await tx.update(users).set(updates).where(eq(users.phone, shop.phone));
    }
    return shop;
  });
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  res.json({ success: true, shop: mi(shop) });
});

// POST /api/shops/:id/reject
router.post("/:id/reject", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { reason } = req.body as { reason?: string };
  const shop = await db.transaction(async (tx) => {
    const [shop] = await tx.update(shops)
      .set({ status: "rejected", rejectionReason: reason ?? null })
      .where(eq(shops.id, req.params["id"] as string))
      .returning();
    if (!shop) return null;
    await tx.update(users).set({ vendorStatus: "rejected" }).where(eq(users.phone, shop.phone));
    return shop;
  });
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  res.json({ success: true, shop: mi(shop) });
});

// POST /api/shops/:id/ban
router.post("/:id/ban", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const shop = await db.transaction(async (tx) => {
    const [shop] = await tx.update(shops).set({ status: "banned", isOpen: false }).where(eq(shops.id, req.params["id"] as string)).returning();
    if (!shop) return null;
    const [owner] = await tx.select({ role: users.role }).from(users).where(eq(users.id, shop.ownerId)).limit(1);
    const updates: Record<string, string> = { vendorStatus: "rejected" };
    if (owner && !ADMIN_ROLES.has(owner.role)) updates["role"] = "customer";
    await tx.update(users).set(updates).where(eq(users.id, shop.ownerId));
    return shop;
  });
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  void createNotificationLimited(shop.ownerId, {
    type: "system",
    title: "Vendor Access Removed",
    message: "Your vendor access is no longer active. Please contact admin or register again.",
  });
  res.json({ success: true, shop: mi(shop) });
});

// POST /api/shops/:id/unban
router.post("/:id/unban", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const shop = await db.transaction(async (tx) => {
    const [shop] = await tx.update(shops).set({ status: "approved", isOpen: true }).where(eq(shops.id, req.params["id"] as string)).returning();
    if (!shop) return null;
    const [owner] = await tx.select({ role: users.role }).from(users).where(eq(users.id, shop.ownerId)).limit(1);
    const updates: Record<string, string> = { vendorStatus: "approved" };
    if (owner && !ADMIN_ROLES.has(owner.role)) updates["role"] = "vendor";
    await tx.update(users).set(updates).where(eq(users.id, shop.ownerId));
    return shop;
  });
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  res.json({ success: true, shop: mi(shop) });
});

// PATCH /api/shops/:id/toggle-open — admin opens or closes any shop
router.patch("/:id/toggle-open", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const [shop] = await db.select().from(shops).where(eq(shops.id, req.params["id"] as string)).limit(1);
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  if (shop.status !== "approved") {
    res.status(400).json({ success: false, message: "Only approved shops can change open status" });
    return;
  }
  const [updated] = await db.update(shops).set({ isOpen: !shop.isOpen }).where(eq(shops.id, shop.id)).returning();
  res.json({ success: true, isOpen: updated!.isOpen, shop: mi(updated!) });
});

// PATCH /api/shops/:id/owner — admin assigns/changes the owner of a shop
router.patch("/:id/owner", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { phone, ownerName } = req.body as { phone: string; ownerName?: string };
  if (!phone) { res.status(400).json({ success: false, message: "Phone is required" }); return; }

  const [existingShop] = await db.select().from(shops).where(eq(shops.id, req.params["id"] as string)).limit(1);
  if (!existingShop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }

  // User upsert + shop owner reassignment must be atomic
  const { newOwner, updatedShop } = await db.transaction(async (tx) => {
    let [newOwner] = await tx.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (!newOwner) {
      [newOwner] = await tx.insert(users).values({
        name: ownerName ?? "Vendor",
        phone,
        role: "vendor",
        vendorStatus: "approved",
        status: "active",
      }).returning();
    } else {
      const updates: Record<string, string> = { vendorStatus: "approved" };
      if (!ADMIN_ROLES.has(newOwner.role)) updates["role"] = "vendor";
      [newOwner] = await tx.update(users).set(updates).where(eq(users.id, newOwner.id)).returning();
    }

    const [updatedShop] = await tx.update(shops).set({
      ownerId: newOwner.id,
      phone,
      ownerName: ownerName ?? newOwner.name,
    }).where(eq(shops.id, req.params["id"] as string)).returning();

    return { newOwner, updatedShop: updatedShop! };
  });

  res.json({ success: true, shop: mi(updatedShop), owner: mi(newOwner) });
});

// DELETE /api/shops/:id
router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const [shop] = await db.select().from(shops).where(eq(shops.id, req.params["id"] as string)).limit(1);
  if (!shop) { res.json({ success: true, message: "Shop deleted" }); return; }

  // Fetch images for Cloudinary cleanup before the transaction
  const shopProducts = await db.select({ images: products.images }).from(products).where(eq(products.shopId, shop.id));
  const allImages = shopProducts.flatMap(p => (p.images as string[]) ?? []);

  // Wrap all DB mutations atomically — products delete + user reset + shop delete
  // Cloudinary cleanup is external and runs outside (can't be rolled back anyway)
  await db.transaction(async (tx) => {
    const [owner] = await tx.select({ role: users.role }).from(users).where(eq(users.id, shop.ownerId)).limit(1);
    const roleUpdate: Record<string, string> = owner && ADMIN_ROLES.has(owner.role)
      ? { vendorStatus: "none" }
      : { vendorStatus: "none", role: "customer" };

    await Promise.all([
      tx.delete(products).where(eq(products.shopId, shop.id)),
      tx.update(users).set(roleUpdate).where(eq(users.id, shop.ownerId)),
    ]);
    await tx.delete(shops).where(eq(shops.id, shop.id));
  });

  // Side effects outside the transaction — best-effort, non-blocking
  void Promise.all(allImages.map(url => deleteFromCloudinary(url)));
  void createNotificationLimited(shop.ownerId, {
    type: "system",
    title: "Shop Removed",
    message: "Your shop has been removed by admin. Please register again to continue selling.",
  });

  res.json({ success: true, message: "Shop deleted" });
});

export default router;
