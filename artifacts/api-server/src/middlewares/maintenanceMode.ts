/**
 * Maintenance Mode Middleware
 *
 * Reads MAINTENANCE_MODE env var (true/false). When enabled:
 *  - /health and /api/maintenance-bypass always pass through
 *  - Valid admin/super_admin JWTs (Authorization header or sm_admin_bypass cookie) bypass freely
 *  - /api/* routes return 503 JSON
 *  - All other routes get a full-page HTML maintenance screen
 *
 * Optional env vars:
 *  MAINTENANCE_MESSAGE   — custom message shown on the page
 *  MAINTENANCE_END_TIME  — ISO-8601 or human-readable string shown as ETA
 */

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger.js";

const ADMIN_ROLES = new Set(["admin", "super_admin"]);
const BYPASS_COOKIE = "sm_admin_bypass";

// ─── helpers ─────────────────────────────────────────────────────────────────

function isAdminToken(token: string): boolean {
  try {
    const secret = process.env["JWT_SECRET"];
    if (!secret) return false;
    const payload = jwt.verify(token, secret) as { role?: string };
    return ADMIN_ROLES.has(payload.role ?? "");
  } catch {
    return false;
  }
}

function extractBypassToken(req: Request): string | null {
  // 1) Authorization: Bearer <token>
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  // 2) sm_admin_bypass cookie (set by /api/maintenance-bypass)
  const raw = req.headers["cookie"] ?? "";
  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name?.trim() === BYPASS_COOKIE) {
      return decodeURIComponent(rest.join("=").trim());
    }
  }
  return null;
}

// ─── Maintenance HTML page ────────────────────────────────────────────────────

function buildMaintenanceHtml(message: string, endTime: string | null): string {
  const endTimeBlock = endTime
    ? `
      <div class="eta-box">
        <p class="eta-label">Estimated back online</p>
        <p class="eta-time" id="eta-display">${endTime}</p>
        <p class="countdown" id="countdown"></p>
      </div>`
    : "";

  const countdownScript = endTime
    ? `
    <script>
      (function () {
        var target = new Date(${JSON.stringify(endTime)});
        if (isNaN(target.getTime())) return;
        function tick() {
          var diff = target - Date.now();
          if (diff <= 0) {
            document.getElementById('countdown').textContent = 'We should be back any moment — refresh the page!';
            return;
          }
          var h = Math.floor(diff / 3600000);
          var m = Math.floor((diff % 3600000) / 60000);
          var s = Math.floor((diff % 60000) / 1000);
          var parts = [];
          if (h) parts.push(h + 'h');
          if (m || h) parts.push(m + 'm');
          parts.push(s + 's');
          document.getElementById('countdown').textContent = parts.join(' ') + ' remaining';
          setTimeout(tick, 1000);
        }
        tick();
      })();
    </script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SwiftMart — Under Maintenance</title>
  <meta name="robots" content="noindex, nofollow" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --amber:    #f59e0b;
      --amber-lt: #fbbf24;
      --bg:       #0d0d0d;
      --surface:  #161616;
      --border:   rgba(245,158,11,0.18);
      --text:     #e5e7eb;
      --muted:    #6b7280;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      overflow-x: hidden;
    }

    /* Radial glow behind card */
    body::before {
      content: '';
      position: fixed;
      top: -200px;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 600px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 65%);
      pointer-events: none;
      animation: glow-pulse 4s ease-in-out infinite;
    }
    @keyframes glow-pulse {
      0%,100% { opacity: 0.6; transform: translateX(-50%) scale(0.95); }
      50%      { opacity: 1;   transform: translateX(-50%) scale(1.05); }
    }

    .card {
      position: relative;
      width: 100%;
      max-width: 520px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 48px 40px 40px;
      text-align: center;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.4), 0 24px 64px rgba(0,0,0,0.5);
      animation: card-in 0.6s cubic-bezier(0.22,1,0.36,1) both;
    }
    @keyframes card-in {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 560px) {
      .card { padding: 36px 24px 32px; border-radius: 20px; }
    }

    /* Logo */
    .logo-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 32px;
    }
    .logo-icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, var(--amber), var(--amber-lt));
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 16px rgba(245,158,11,0.35);
    }
    .logo-text {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #fff;
    }
    .logo-text span { color: var(--amber); }

    /* Gear animation */
    .gear-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      margin-bottom: 28px;
    }
    .gear {
      font-size: 36px;
      display: inline-block;
      filter: drop-shadow(0 0 8px rgba(245,158,11,0.4));
    }
    .gear-a { animation: spin-cw  3s linear infinite; }
    .gear-b { animation: spin-ccw 2s linear infinite; font-size: 24px; margin-bottom: -4px; }
    .gear-c { animation: spin-cw  4s linear infinite; font-size: 28px; }
    @keyframes spin-cw  { to { transform: rotate(360deg);  } }
    @keyframes spin-ccw { to { transform: rotate(-360deg); } }

    /* Status badge */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(245,158,11,0.12);
      border: 1px solid rgba(245,158,11,0.3);
      color: var(--amber-lt);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 5px 14px;
      border-radius: 99px;
      margin-bottom: 20px;
    }
    .badge::before {
      content: '';
      width: 7px; height: 7px;
      border-radius: 50%;
      background: var(--amber);
      box-shadow: 0 0 6px var(--amber);
      animation: blink 1.4s ease-in-out infinite;
    }
    @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

    h1 {
      font-size: 26px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.3px;
      margin-bottom: 14px;
      line-height: 1.25;
    }
    @media (max-width: 400px) { h1 { font-size: 22px; } }

    .message {
      font-size: 15px;
      line-height: 1.65;
      color: var(--muted);
      margin-bottom: 28px;
    }

    /* ETA box */
    .eta-box {
      background: rgba(245,158,11,0.07);
      border: 1px solid rgba(245,158,11,0.2);
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 28px;
    }
    .eta-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--amber);
      margin-bottom: 6px;
    }
    .eta-time {
      font-size: 17px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 4px;
    }
    .countdown {
      font-size: 13px;
      color: var(--muted);
      min-height: 20px;
    }

    /* Divider */
    .divider {
      border: none;
      border-top: 1px solid rgba(255,255,255,0.06);
      margin: 24px 0;
    }

    /* Contact section */
    .contact-title {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 14px;
    }
    .contact-links {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
    }
    .contact-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 18px;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
      text-decoration: none;
      background: rgba(255,255,255,0.03);
      transition: border-color 0.2s, background 0.2s, color 0.2s;
    }
    .contact-link:hover {
      border-color: var(--amber);
      background: rgba(245,158,11,0.08);
      color: var(--amber-lt);
    }

    /* Footer */
    .footer {
      margin-top: 32px;
      font-size: 12px;
      color: rgba(107,114,128,0.6);
    }
  </style>
</head>
<body>
  <div class="card">
    <!-- Logo -->
    <div class="logo-wrap">
      <div class="logo-icon">🛒</div>
      <div class="logo-text">Swift<span>Mart</span></div>
    </div>

    <!-- Animated gears -->
    <div class="gear-wrap">
      <span class="gear gear-a">⚙️</span>
      <span class="gear gear-b">⚙️</span>
      <span class="gear gear-c">⚙️</span>
    </div>

    <!-- Status badge -->
    <div class="badge">Under Maintenance</div>

    <h1>We'll be back shortly</h1>

    <p class="message">${message}</p>

    ${endTimeBlock}

    <hr class="divider" />

    <p class="contact-title">Need help in the meantime?</p>
    <div class="contact-links">
      <a class="contact-link" href="https://wa.me/916296118949" target="_blank" rel="noopener">
        💬 WhatsApp Support
      </a>
      <a class="contact-link" href="mailto:support@swiftmart.space">
        ✉️ Email Us
      </a>
    </div>
  </div>

  <p class="footer">© ${new Date().getFullYear()} SwiftMart. All rights reserved.</p>

  ${countdownScript}
</body>
</html>`;
}

// ─── Middleware export ────────────────────────────────────────────────────────

export function maintenanceMode(req: Request, res: Response, next: NextFunction): void {
  const enabled = (process.env["MAINTENANCE_MODE"] ?? "false").toLowerCase() === "true";
  if (!enabled) { next(); return; }

  // Always pass through: health check, bypass endpoint, robots.txt, and sitemap.xml
  if (
    req.path === "/health" ||
    req.path.startsWith("/api/maintenance-bypass") ||
    req.path === "/robots.txt" ||
    req.path === "/sitemap.xml"
  ) {
    next(); return;
  }

  // Admin bypass — check JWT in Authorization header or bypass cookie
  const token = extractBypassToken(req);
  if (token && isAdminToken(token)) {
    next(); return;
  }

  const message =
    process.env["MAINTENANCE_MESSAGE"] ??
    "We're performing scheduled maintenance to improve your experience. Our team is working hard to get everything back up as quickly as possible.";

  const endTime = process.env["MAINTENANCE_END_TIME"] ?? null;

  logger.info({ path: req.path }, "[maintenance] blocked request");

  // API routes → 503 JSON
  if (req.path.startsWith("/api/")) {
    res
      .status(503)
      .setHeader("Content-Type", "application/json")
      .setHeader("X-Robots-Tag", "noindex, nofollow")
      .setHeader("Retry-After", "3600")
      .json({
        success: false,
        maintenance: true,
        message: "SwiftMart is currently under maintenance. Please try again later.",
        ...(endTime ? { estimatedEndTime: endTime } : {}),
      });
    return;
  }

  // All other routes → beautiful HTML maintenance page
  const html = buildMaintenanceHtml(message, endTime);
  res
    .status(503)
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .setHeader("X-Robots-Tag", "noindex, nofollow")
    .setHeader("Retry-After", "3600")
    .setHeader("Cache-Control", "no-store")
    .send(html);
}
