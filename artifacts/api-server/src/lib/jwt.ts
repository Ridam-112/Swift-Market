import jwt from "jsonwebtoken";

const _ACCESS_SECRET = process.env["JWT_SECRET"];
const _REFRESH_SECRET = process.env["JWT_REFRESH_SECRET"];

if (!_ACCESS_SECRET || !_REFRESH_SECRET) {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be set in production");
  }
  console.warn("[jwt] WARNING: JWT secrets not set — using insecure fallback. Set JWT_SECRET and JWT_REFRESH_SECRET.");
}

const ACCESS_SECRET = _ACCESS_SECRET ?? "fallback-dev-secret-change-me";
const REFRESH_SECRET = _REFRESH_SECRET ?? "fallback-refresh-secret-change-me";
const ACCESS_EXPIRY = "15m";
const REFRESH_EXPIRY = "30d";

export interface JwtPayload {
  userId: string;
  phone: string;
  role: "customer" | "vendor" | "delivery_partner" | "admin" | "super_admin";
  tokenVersion: number;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
