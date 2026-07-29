/**
 * Maintenance Bypass Endpoint
 *
 * GET /api/maintenance-bypass?token=<admin_jwt>
 *   Verifies the token is a valid admin/super_admin JWT.
 *   Sets the sm_admin_bypass cookie and redirects to /.
 *
 * DELETE /api/maintenance-bypass
 *   Clears the bypass cookie (staff logout from bypass).
 *
 * This endpoint is always reachable even when maintenance mode is on
 * (the maintenanceMode middleware explicitly skips it).
 */

import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";

const router = Router();

const BYPASS_COOKIE = "sm_admin_bypass";
const ADMIN_ROLES = new Set(["admin", "super_admin"]);

// Cookie options: HttpOnly + SameSite=Lax so it's sent on same-site navigations
// but not on cross-site requests.  Secure in production.
const cookieHeader = (token: string): string => {
  const isProd = process.env["NODE_ENV"] === "production";
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  const parts = [
    `${BYPASS_COOKIE}=${encodeURIComponent(token)}`,
    `Path=/`,
    `Max-Age=${maxAge}`,
    `HttpOnly`,
    `SameSite=Lax`,
    ...(isProd ? ["Secure"] : []),
  ];
  return parts.join("; ");
};

// GET /api/maintenance-bypass?token=<jwt>
router.get("/", (req: Request, res: Response): void => {
  const token = (req.query["token"] as string | undefined) ?? "";

  if (!token) {
    res.status(400).json({ success: false, message: "Missing token query parameter." });
    return;
  }

  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    res.status(500).json({ success: false, message: "Server misconfigured — JWT_SECRET missing." });
    return;
  }

  let payload: { role?: string };
  try {
    payload = jwt.verify(token, secret) as { role?: string };
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token." });
    return;
  }

  if (!ADMIN_ROLES.has(payload.role ?? "")) {
    res.status(403).json({ success: false, message: "Admin or super_admin role required." });
    return;
  }

  // Set bypass cookie and redirect to homepage
  res.setHeader("Set-Cookie", cookieHeader(token));
  res.redirect(302, "/");
});

// DELETE /api/maintenance-bypass  — clears the bypass cookie
router.delete("/", (_req: Request, res: Response): void => {
  const expire = `${BYPASS_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
  res.setHeader("Set-Cookie", expire);
  res.json({ success: true, message: "Maintenance bypass cleared." });
});

export default router;
