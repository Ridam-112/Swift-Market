/**
 * shopSticker.ts
 * Generates a print-quality 1200×1200px circular SwiftMart shop sticker
 * and triggers a PNG download. The embedded QR code links to the shop's
 * public page on swiftmart.space.
 */

import QRCode from "qrcode";

const YELLOW = "#FFBA00";
const YELLOW_DARK = "#E5A800";
const DARK = "#1A1A1A";
const WHITE = "#FFFFFF";
const GRAY = "#666666";

// ── Helpers ──────────────────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Draws the SpeedCart icon (simplified cart + motion lines) */
function drawCartIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size / 100; // scale factor
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = DARK;
  ctx.fillStyle = DARK;
  ctx.lineWidth = 6 * s;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Speed lines (left side)
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = 5.5 * s;
  [[- 55, -18, -75, -18], [-55, -3, -78, -3], [-55, 12, -72, 12]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1 * s, y1 * s);
    ctx.lineTo(x2 * s, y2 * s);
    ctx.stroke();
  });

  // Cart body (trapezoid shape)
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 6.5 * s;
  ctx.beginPath();
  ctx.moveTo(-40 * s, -30 * s);
  ctx.lineTo(48 * s, -30 * s);
  ctx.lineTo(38 * s, 22 * s);
  ctx.lineTo(-30 * s, 22 * s);
  ctx.closePath();
  ctx.stroke();

  // Cart handle/pole
  ctx.beginPath();
  ctx.moveTo(-40 * s, -30 * s);
  ctx.lineTo(-52 * s, -52 * s);
  ctx.stroke();

  // Wheels
  ctx.fillStyle = DARK;
  ctx.lineWidth = 5 * s;
  [-22, 22].forEach(wx => {
    ctx.beginPath();
    ctx.arc(wx * s, 35 * s, 11 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();
  });

  ctx.restore();
}

/** Draws a delivery scooter icon */
function drawScooterIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size / 60;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = DARK;
  ctx.fillStyle = DARK;
  ctx.lineWidth = 4 * s;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Body
  ctx.beginPath();
  ctx.moveTo(-30 * s, 0);
  ctx.quadraticCurveTo(-20 * s, -20 * s, 0, -20 * s);
  ctx.lineTo(20 * s, -20 * s);
  ctx.lineTo(25 * s, 0);
  ctx.closePath();
  ctx.fill();

  // Seat / Handlebar
  ctx.beginPath();
  ctx.moveTo(-15 * s, -20 * s);
  ctx.lineTo(-5 * s, -35 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(18 * s, -20 * s);
  ctx.lineTo(28 * s, -32 * s);
  ctx.stroke();

  // Wheels
  [[-28, 10], [22, 10]].forEach(([wx, wy]) => {
    ctx.beginPath();
    ctx.arc(wx * s, wy * s, 12 * s, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Speed lines
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = 3 * s;
  [[-42, -5], [-45, 3], [-40, 11]].forEach(([lx, ly]) => {
    ctx.beginPath();
    ctx.moveTo(lx * s, ly * s);
    ctx.lineTo((lx - 12) * s, ly * s);
    ctx.stroke();
  });

  ctx.restore();
}

/** Draws a smiley face icon */
function drawSmileyIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";

  // Face circle
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Eyes
  ctx.fillStyle = DARK;
  [[-r * 0.3, -r * 0.2], [r * 0.3, -r * 0.2]].forEach(([ex, ey]) => {
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  });

  // Smile
  ctx.beginPath();
  ctx.arc(0, r * 0.1, r * 0.45, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

// ── Main sticker generator ────────────────────────────────────────────────────

export async function generateShopSticker(shopId: string, shopName: string): Promise<void> {
  const SIZE = 1200;
  const CX = SIZE / 2;   // 600
  const CY = SIZE / 2;   // 600
  const R_OUTER = 555;   // outer ring edge
  const R_CLIP = 530;    // clip radius (inside border)

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  // ── Generate QR code ──────────────────────────────────────────────────
  const shopUrl = `https://swiftmart.space/shop/${shopId}`;
  const qrDataUrl = await QRCode.toDataURL(shopUrl, {
    width: 280,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  const qrImg = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = reject;
    qrImg.src = qrDataUrl;
  });

  // ── Outer shadow + border ─────────────────────────────────────────────
  // Drop shadow behind the circle
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;
  ctx.beginPath();
  ctx.arc(CX, CY, R_OUTER, 0, Math.PI * 2);
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.restore();

  // Yellow outer ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, R_OUTER, 0, Math.PI * 2);
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = 32;
  ctx.stroke();

  // Thin inner dark ring
  ctx.beginPath();
  ctx.arc(CX, CY, R_OUTER - 22, 0, Math.PI * 2);
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // ── Clip everything to the circle ────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, R_CLIP, 0, Math.PI * 2);
  ctx.clip();

  // White background fill
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // ══ TOP SECTION ══════════════════════════════════════════════════════

  // Cart icon
  drawCartIcon(ctx, CX, 195, 145);

  // "SWIFT MART" — two colors
  ctx.font = "900 94px 'Arial Black', Arial, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const swiftW = ctx.measureText("SWIFT ").width;
  const martW  = ctx.measureText("MART").width;
  const brandStart = CX - (swiftW + martW) / 2;
  ctx.fillStyle = DARK;
  ctx.fillText("SWIFT ", brandStart, 340);
  ctx.fillStyle = YELLOW;
  ctx.fillText("MART", brandStart + swiftW, 340);

  // Tagline with decorative dashes
  ctx.textAlign = "center";
  ctx.font = "26px Arial, sans-serif";
  ctx.fillStyle = GRAY;
  ctx.fillText("— LOCAL SHOPS, FAST DELIVERY —", CX, 384);

  // ══ YELLOW CURVED BANNER ═════════════════════════════════════════════

  const BAND_TOP = 410;
  const BAND_BOT = 672;
  const BAND_CURVE = 28;

  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  // Top edge: concave curve
  ctx.moveTo(0, BAND_TOP + BAND_CURVE);
  ctx.bezierCurveTo(
    CX - 260, BAND_TOP - BAND_CURVE,
    CX + 260, BAND_TOP - BAND_CURVE,
    SIZE, BAND_TOP + BAND_CURVE,
  );
  ctx.lineTo(SIZE, BAND_BOT - BAND_CURVE);
  // Bottom edge: convex curve
  ctx.bezierCurveTo(
    CX + 260, BAND_BOT + BAND_CURVE,
    CX - 260, BAND_BOT + BAND_CURVE,
    0, BAND_BOT - BAND_CURVE,
  );
  ctx.closePath();
  ctx.fill();

  // "— WE ARE —" row
  const ROW1_Y = BAND_TOP + 72;
  ctx.fillStyle = DARK;
  ctx.fillRect(CX - 230, ROW1_Y - 6, 78, 5);
  ctx.fillRect(CX + 153, ROW1_Y - 6, 78, 5);
  ctx.font = "bold 40px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = DARK;
  ctx.fillText("WE ARE", CX, ROW1_Y);

  // "AVAILABLE ON" (large white)
  ctx.font = "900 84px 'Arial Black', Arial, sans-serif";
  ctx.fillStyle = WHITE;
  ctx.fillText("AVAILABLE ON", CX, BAND_TOP + 170);

  // "SWIFTMART" (dark)
  ctx.font = "900 80px 'Arial Black', Arial, sans-serif";
  ctx.fillStyle = DARK;
  ctx.fillText("SWIFTMART", CX, BAND_TOP + 255);

  // ══ BOTTOM SECTION ═══════════════════════════════════════════════════

  const QR_SIZE = 215;
  const QR_X = CX - QR_SIZE / 2;
  const QR_Y = BAND_BOT + 28;

  // QR yellow border frame
  const FRAME_PAD = 10;
  ctx.fillStyle = YELLOW;
  roundRect(ctx, QR_X - FRAME_PAD, QR_Y - FRAME_PAD, QR_SIZE + FRAME_PAD * 2, QR_SIZE + FRAME_PAD * 2, 10);
  ctx.fill();

  // White inner for QR
  ctx.fillStyle = WHITE;
  roundRect(ctx, QR_X - 2, QR_Y - 2, QR_SIZE + 4, QR_SIZE + 4, 6);
  ctx.fill();

  // QR image
  ctx.drawImage(qrImg, QR_X, QR_Y, QR_SIZE, QR_SIZE);

  // ── Left: scooter + text ──────────────────────────────────────────────
  const ICON_Y = QR_Y + QR_SIZE / 2 - 35;
  drawScooterIcon(ctx, CX - 200, ICON_Y, 60);

  ctx.font = "bold 24px Arial, sans-serif";
  ctx.fillStyle = DARK;
  ctx.textAlign = "center";
  ctx.fillText("SHOP LOCAL", CX - 200, ICON_Y + 65);
  ctx.fillText("DELIVERED FAST", CX - 200, ICON_Y + 95);

  // ── Right: smiley + text ─────────────────────────────────────────────
  drawSmileyIcon(ctx, CX + 200, ICON_Y, 33);

  ctx.font = "bold 24px Arial, sans-serif";
  ctx.fillStyle = DARK;
  ctx.textAlign = "center";
  ctx.fillText("SUPPORT LOCAL", CX + 200, ICON_Y + 65);
  ctx.fillText("GET MORE", CX + 200, ICON_Y + 95);

  // ── "SCAN & ORDER" pill button ────────────────────────────────────────
  const BTN_Y = QR_Y + QR_SIZE + 18;
  const BTN_W = 260;
  const BTN_H = 46;
  ctx.fillStyle = YELLOW_DARK;
  roundRect(ctx, CX - BTN_W / 2, BTN_Y, BTN_W, BTN_H, BTN_H / 2);
  ctx.fill();
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.fillStyle = DARK;
  ctx.textAlign = "center";
  ctx.fillText("SCAN & ORDER", CX, BTN_Y + 31);

  // ── Bottom yellow band with domain ────────────────────────────────────
  const BOT_BAND_Y = BTN_Y + BTN_H + 22;
  const BOT_BAND_H = 66;

  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  ctx.moveTo(0, BOT_BAND_Y + 14);
  ctx.bezierCurveTo(CX - 220, BOT_BAND_Y - 8, CX + 220, BOT_BAND_Y - 8, SIZE, BOT_BAND_Y + 14);
  ctx.lineTo(SIZE, BOT_BAND_Y + BOT_BAND_H - 14);
  ctx.bezierCurveTo(CX + 220, BOT_BAND_Y + BOT_BAND_H + 8, CX - 220, BOT_BAND_Y + BOT_BAND_H + 8, 0, BOT_BAND_Y + BOT_BAND_H - 14);
  ctx.closePath();
  ctx.fill();

  // Globe + domain text
  ctx.font = "28px Arial, sans-serif";
  ctx.fillStyle = DARK;
  ctx.textAlign = "center";
  ctx.fillText("🌐  swiftmart.space", CX, BOT_BAND_Y + BOT_BAND_H / 2 + 10);

  ctx.restore(); // end clip

  // ── Trigger download ─────────────────────────────────────────────────
  const safeName = shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const link = document.createElement("a");
  link.download = `${safeName}-swiftmart-sticker.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
