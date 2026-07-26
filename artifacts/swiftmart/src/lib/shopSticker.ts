/**
 * shopSticker.ts
 *
 * Uses the official SwiftMart sticker template (public/shop-sticker-template.png)
 * as the base image and overlays a shop-specific QR code onto the yellow
 * placeholder box in the center of the sticker.
 *
 * Template image: 3919×3919 px
 * QR placeholder box (measured via pixel scan):
 *   left  ≈ 1615   right  ≈ 2285   (width  ≈ 670 px)
 *   top   ≈ 2060   bottom ≈ 2465   (height ≈ 405 px)
 *   center ≈ (1950, 2262)
 *
 * The QR code is rendered as a square that fills the shorter dimension
 * (height = 405 px) with a small margin, leaving the yellow frame visible.
 */

import QRCode from "qrcode";

// ── Template image coordinates (3919 × 3919 px space) ───────────────────────
const TEMPLATE_W = 3919;
const TEMPLATE_H = 3919;

const QR_BOX = {
  left:   1615,
  right:  2285,
  top:    2060,
  bottom: 2465,
} as const;

const QR_BOX_CX = Math.round((QR_BOX.left + QR_BOX.right)  / 2); // 1950
const QR_BOX_CY = Math.round((QR_BOX.top  + QR_BOX.bottom) / 2); // 2262

// QR square side: fits inside the box height with a small yellow margin
const QR_SIDE = Math.round((QR_BOX.bottom - QR_BOX.top) * 0.88); // ≈ 356 px

// ── Main export ──────────────────────────────────────────────────────────────

export async function generateShopSticker(
  shopId: string,
  shopName: string,
): Promise<void> {
  // 1. Load the template image
  const templateImg = await loadImage("/shop-sticker-template.png");

  // 2. Generate the QR code as a data URL
  const shopUrl  = `https://swiftmart.space/shop/${shopId}`;
  const qrDataUrl = await QRCode.toDataURL(shopUrl, {
    width:                QR_SIDE,
    margin:               1,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#FFFFFF" },
  });
  const qrImg = await loadImage(qrDataUrl);

  // 3. Paint onto a canvas that matches the template dimensions
  const canvas  = document.createElement("canvas");
  canvas.width  = TEMPLATE_W;
  canvas.height = TEMPLATE_H;
  const ctx = canvas.getContext("2d")!;

  // Draw the unmodified template
  ctx.drawImage(templateImg, 0, 0, TEMPLATE_W, TEMPLATE_H);

  // 4. Overlay the QR code, centered inside the yellow placeholder box
  const qrX = QR_BOX_CX - QR_SIDE / 2;
  const qrY = QR_BOX_CY - QR_SIDE / 2;

  // White background behind QR (covers the "QR" placeholder text)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(qrX, qrY, QR_SIDE, QR_SIDE);

  // QR image
  ctx.drawImage(qrImg, qrX, qrY, QR_SIDE, QR_SIDE);

  // 5. Trigger download
  const safeName = shopName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const link      = document.createElement("a");
  link.download   = `${safeName}-swiftmart-sticker.png`;
  link.href       = canvas.toDataURL("image/png");
  link.click();
}

// ── Utility ──────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}
