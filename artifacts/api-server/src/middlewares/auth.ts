import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type JwtPayload } from "../lib/jwt.js";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Authorization token required" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

export function requireRole(...roles: JwtPayload["role"][]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: "Forbidden: insufficient role" });
      return;
    }
    next();
  };
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    try {
      req.user = verifyAccessToken(authHeader.slice(7));
    } catch {
      // ignore
    }
  }
  next();
}
