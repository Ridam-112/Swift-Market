import { Router, type Request, type Response } from "express";
import { Shop } from "../../models/Shop.js";
import { User } from "../../models/User.js";
import { Product } from "../../models/Product.js";
import { Order } from "../../models/Order.js";
import { deleteFromCloudinary } from "../../lib/cloudinary.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { createNotificationLimited } from "../../utils/notification.js";

const router = Router();
const A = requireRole("admin", "super_admin");

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

// GET /api/shops
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { status, shopType, city, ownerId, pincode, page = "1", limit = "20", search, category } =
    req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (status) filter["status"] = status;
  if (shopType) filter["shopType"] = shopType;
  if (category) filter["category"] = { $regex: category, $options: "i" };
  if (city) filter["address.city"] = { $regex: city, $options: "i" };
  if (ownerId) filter["ownerId"] = ownerId;
  if (pincode) filter["address.pincode"] = pincode;
  if (search) {
    filter["$or"] = [
      { shopName: { $regex: search, $options: "i" } },
      { ownerName: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [shops, total] = await Promise.all([
    Shop.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
    Shop.countDocuments(filter),
  ]);
  res.json({ success: true, shops, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// GET /api/shops/:id/details — admin: shop + products + recent orders + owner
router.get("/:id/details", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const shop = await Shop.findById(req.params["id"]);
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  const shopIdStr = String(shop._id);
  const [products, orders, owner] = await Promise.all([
    Product.find({ shopId: shopIdStr }).lean(),
    Order.find({ shopId: shopIdStr }).sort({ createdAt: -1 }).limit(50).lean(),
    User.findById(shop.ownerId).select("name phone email role vendorStatus status createdAt").lean(),
  ]);
  const revenue = orders.reduce((sum, o) => sum + (o.netAmount ?? o.subtotal ?? 0), 0);
  res.json({
    success: true, shop, products, orders, owner,
    totalProducts: products.length,
    totalOrders: orders.length,
    revenue,
  });
});

// GET /api/shops/:id
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const shop = await Shop.findById(req.params["id"]);
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  res.json({ success: true, shop });
});

// POST /api/shops/admin-create
router.post("/admin-create", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const phone = String(body.phone ?? "").trim();
  if (!phone) { res.status(400).json({ success: false, message: "Owner phone is required" }); return; }
  if (!body.shopName) { res.status(400).json({ success: false, message: "Shop name is required" }); return; }

  let owner = await User.findOne({ phone });
  if (!owner) {
    owner = await User.create({
      name: body.ownerName ?? body.shopName,
      phone,
      email: body.ownerEmail ?? undefined,
      role: "vendor",
      vendorStatus: "approved",
      status: "active",
    });
  } else {
    // Only set role to vendor if not already admin/super_admin
    const updates: Record<string, unknown> = { vendorStatus: "approved" };
    if (!ADMIN_ROLES.has(owner.role)) updates["role"] = "vendor";
    await User.findByIdAndUpdate(owner._id, updates);
  }

  const shop = await Shop.create({
    shopName: body.shopName,
    ownerName: body.ownerName ?? (owner as { name: string }).name,
    phone,
    ownerId: String(owner._id),
    address: body.address,
    shopType: body.shopType ?? body.category,
    category: body.category,
    description: body.description,
    image: body.image,
    status: "approved",
    isOpen: true,
    panNumber: body.panNumber ?? "ADMIN000000A",
    bankAccountNumber: body.bankAccountNumber ?? "0000000000",
    bankIfscCode: body.bankIfscCode ?? "ADMIN0000000",
    upiId: body.upiId ?? `${phone}@upi`,
  });

  await createNotificationLimited(String(owner._id), {
    type: "system",
    title: "Vendor Account Created",
    message: "Your shop has been created and approved by SwiftMart Admin.",
  });

  res.status(201).json({ success: true, shop, owner });
});

// POST /api/shops — vendor applies
router.post("/", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const shop = await Shop.create({ ...body, ownerId: req.user!.userId, status: "pending" });
  await User.findByIdAndUpdate(req.user!.userId, { vendorStatus: "pending" });
  res.status(201).json({ success: true, shop });
});

// PATCH /api/shops/my/toggle-open — vendor toggles their own shop open/close
router.patch("/my/toggle-open", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const shop = await Shop.findOne({ ownerId: req.user!.userId });
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  if (shop.status !== "approved") {
    res.status(403).json({ success: false, message: "Only approved shops can change their open status" });
    return;
  }
  shop.isOpen = !shop.isOpen;
  await shop.save();
  res.json({ success: true, isOpen: shop.isOpen, shop });
});

// PATCH /api/shops/:id
router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const shop = await Shop.findByIdAndUpdate(req.params["id"], req.body as Record<string, unknown>, {
    new: true,
    runValidators: true,
  });
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  res.json({ success: true, shop });
});

// POST /api/shops/:id/approve
router.post("/:id/approve", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const shop = await Shop.findByIdAndUpdate(req.params["id"], { status: "approved", isOpen: true }, { new: true });
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  // Only promote to vendor if not already admin/super_admin
  const owner = await User.findOne({ phone: shop.phone }).select("role").lean();
  if (owner && !ADMIN_ROLES.has(owner.role)) {
    await User.findOneAndUpdate({ phone: shop.phone }, { vendorStatus: "approved", role: "vendor" });
  } else {
    await User.findOneAndUpdate({ phone: shop.phone }, { vendorStatus: "approved" });
  }
  res.json({ success: true, shop });
});

// POST /api/shops/:id/reject
router.post("/:id/reject", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { reason } = req.body as { reason?: string };
  const shop = await Shop.findByIdAndUpdate(
    req.params["id"],
    { status: "rejected", rejectionReason: reason },
    { new: true }
  );
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  await User.findOneAndUpdate({ phone: shop.phone }, { vendorStatus: "rejected" });
  res.json({ success: true, shop });
});

// POST /api/shops/:id/ban
router.post("/:id/ban", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const shop = await Shop.findByIdAndUpdate(req.params["id"], { status: "banned", isOpen: false }, { new: true });
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }

  // Never downgrade admin/super_admin role
  const owner = await User.findById(shop.ownerId).select("role").lean();
  if (owner && !ADMIN_ROLES.has(owner.role)) {
    await User.findByIdAndUpdate(shop.ownerId, { vendorStatus: "rejected", role: "customer" });
  } else {
    await User.findByIdAndUpdate(shop.ownerId, { vendorStatus: "rejected" });
  }

  await createNotificationLimited(shop.ownerId, {
    type: "system",
    title: "Vendor Access Removed",
    message: "Your vendor access is no longer active. Please contact admin or register again.",
  });
  res.json({ success: true, shop });
});

// POST /api/shops/:id/unban
router.post("/:id/unban", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const shop = await Shop.findByIdAndUpdate(req.params["id"], { status: "approved", isOpen: true }, { new: true });
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  const owner = await User.findById(shop.ownerId).select("role").lean();
  if (owner && !ADMIN_ROLES.has(owner.role)) {
    await User.findByIdAndUpdate(shop.ownerId, { vendorStatus: "approved", role: "vendor" });
  } else {
    await User.findByIdAndUpdate(shop.ownerId, { vendorStatus: "approved" });
  }
  res.json({ success: true, shop });
});

// DELETE /api/shops/:id
router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const shop = await Shop.findById(req.params["id"]);
  if (shop) {
    const shopIdStr = shop._id.toString();
    const products = await Product.find({ shopId: shopIdStr }).select("images").lean();
    const allImages = products.flatMap(p => p.images ?? []);
    await Promise.all(allImages.map(url => deleteFromCloudinary(url)));

    // Never downgrade admin/super_admin role
    const owner = await User.findById(shop.ownerId).select("role").lean();
    const roleUpdate = owner && ADMIN_ROLES.has(owner.role)
      ? { vendorStatus: "none" }
      : { vendorStatus: "none", role: "customer" };

    await Promise.all([
      Product.deleteMany({ shopId: shopIdStr }),
      User.findByIdAndUpdate(shop.ownerId, roleUpdate),
      createNotificationLimited(shop.ownerId, {
        type: "system",
        title: "Shop Removed",
        message: "Your shop has been removed by admin. Please register again to continue selling.",
      }),
    ]);
    await shop.deleteOne();
  }
  res.json({ success: true, message: "Shop deleted" });
});

export default router;
