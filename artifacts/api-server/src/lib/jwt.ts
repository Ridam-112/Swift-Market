import jwt from "jsonwebtoken";

const ACCESS_SECRET: string = process.env["JWT_SECRET"] || "swiftmart-default-jwt-secret-key-prod";
const REFRESH_SECRET: string = process.env["JWT_REFRESH_SECRET"] || "swiftmart-default-refresh-secret-key-prod";
const ACCESS_EXPIRY = "30d";
const REFRESH_EXPIRY = "3650d"; // 10 years — never auto-logout users

export interface JwtPayload {
  userId: string;
  phone: string;
  role: "customer" | "vendor" | "delivery_partner" | "admin" | "super_admin" | "city_manager";
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
