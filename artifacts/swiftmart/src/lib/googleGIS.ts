/**
 * Google Identity Services (GIS) — REMOVED.
 * Google Sign-In now uses the server-side OAuth2 flow:
 *   GET /api/auth/google/redirect  → Google consent page
 *   GET /auth/google/callback      → frontend picks up code
 *   POST /api/auth/google/exchange → server issues JWT
 *
 * This file is kept as a placeholder to avoid import errors in old branches.
 */
export {};
