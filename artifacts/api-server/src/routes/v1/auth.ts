import { Router, type Request, type Response } from "express";
import { User } from "../../models/User.js";
import { OtpSession } from "../../models/OtpSession.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt.js";
import { authenticate, type AuthRequest } from "../../middlewares/auth.js";

const router = Router();
const DEMO_OTP = process.env["OTP_DEMO_CODE"] ?? "123456";

// POST /api/auth/send-otp
router.post("/send-otp", async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.body as { phone?: string };
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    res.status(400).json({ success: false, message: "Valid 10-digit phone number required" });
    return;
  }
  await OtpSession.deleteMany({ phone });
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await OtpSession.create({ phone, otp: DEMO_OTP, expiresAt });
  req.log.info({ phone }, "OTP sent (demo)");
  res.json({ success: true, message: "OTP sent successfully" });
});

// POST /api/auth/verify-otp
router.post("/verify-otp", async (req: Request, res: Response): Promise<void> => {
  const { phone, otp } = req.body as { phone?: string; otp?: string };
  if (!phone || !otp) {
    res.status(400).json({ success: false, message: "Phone and OTP required" });
    return;
  }
  const session = await OtpSession.findOne({ phone, verified: false }).sort({ createdAt: -1 });
  if (!session || session.otp !== otp || session.expiresAt < new Date()) {
    res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    return;
  }
  await OtpSession.deleteOne({ _id: session._id });

  let user = await User.findOne({ phone });
  const isNewUser = !user;
  if (!user) {
    user = await User.create({ phone, name: "User", role: "customer" });
  }
  user.lastLoginAt = new Date();
  await user.save();

  const payload = { userId: String(user._id), phone: user.phone, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  res.json({
    success: true,
    isNewUser,
    accessToken,
    refreshToken,
    user: {
      id: String(user._id),
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      vendorStatus: user.vendorStatus,
    },
  });
});

// POST /api/auth/refresh
router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ success: false, message: "Refresh token required" });
    return;
  }
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId);
    if (!user || user.status !== "active") {
      res.status(401).json({ success: false, message: "User not found or banned" });
      return;
    }
    const newPayload = { userId: String(user._id), phone: user.phone, role: user.role };
    res.json({
      success: true,
      accessToken: signAccessToken(newPayload),
      refreshToken: signRefreshToken(newPayload),
    });
  } catch {
    res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user!.userId).select("-__v");
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }
  res.json({
    success: true,
    user: {
      id: String(user._id),
      name: user.name,
      phone: user.phone,
      email: user.email ?? "",
      role: user.role,
      status: user.status,
      vendorStatus: user.vendorStatus,
      addresses: user.addresses,
    },
  });
});

// POST /api/auth/logout
router.post("/logout", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  req.log.info({ userId: req.user!.userId }, "User logged out");
  res.json({ success: true, message: "Logged out successfully" });
});

export default router;
