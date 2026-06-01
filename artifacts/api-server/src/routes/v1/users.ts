import { Router, type Response } from "express";
import { User } from "../../models/User.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";

const router = Router();
const A = requireRole("admin", "super_admin");

// GET /api/users — admin lists all users
router.get("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, status, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (role) filter["role"] = role;
  if (status) filter["status"] = status;
  if (search) {
    filter["$or"] = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).select("-__v"),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// PATCH /api/users/:id/ban
router.patch("/:id/ban", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findByIdAndUpdate(req.params["id"], { status: "banned" }, { new: true });
  if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }
  res.json({ success: true, user });
});

// PATCH /api/users/:id/unban
router.patch("/:id/unban", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findByIdAndUpdate(req.params["id"], { status: "active" }, { new: true });
  if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }
  res.json({ success: true, user });
});

// GET /api/users/me/profile
router.get("/me/profile", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user!.userId).select("-__v");
  if (!user) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, user });
});

// PATCH /api/users/me/profile
router.patch("/me/profile", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const allowed = ["name", "email", "addresses", "pincode"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if ((req.body as Record<string, unknown>)[key] !== undefined) {
      updates[key] = (req.body as Record<string, unknown>)[key];
    }
  }
  const user = await User.findByIdAndUpdate(req.user!.userId, updates, { new: true }).select("-__v");
  if (!user) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, user: { ...user.toObject(), id: String(user._id) } });
});

export default router;
