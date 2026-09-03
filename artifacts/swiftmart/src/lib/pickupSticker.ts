/**
 * pickupSticker.ts
 *
 * Generates the official SwiftMart Partner Store Pickup Counter QR.
 * Features:
 * - Rounded squircle modules and custom rounded corner eyes
 * - Official SwiftMart logo badge in the dead center (High Error Correction 'H')
 * - Store ID pill badge and Store Name directly below
 * - Clean standalone sticker format without unnecessary poster/mockup clutter
 */

import QRCode from "qrcode";

export interface PickupStickerOptions {
  shopId: string;
  shopName: string;
  storeCode?: string;
  pickupQrToken: string;
  address?: string;
  phone?: string;
}

export async function generatePickupStickerDataUrl(options: PickupStickerOptions): Promise<string> {
  const { shopName, storeCode, pickupQrToken } = options;
  const displayCode = storeCode || `SW-BLG-${options.shopId.slice(0, 4).toUpperCase()}`;
  const qrPayload = `SWIFTMART_PICKUP:${pickupQrToken}`;

  // 1. Generate QR Code matrix with High Error Correction Level 'H' (~30% recovery)
  const qr = QRCode.create(qrPayload, { errorCorrectionLevel: "H" });
  const moduleCount = qr.modules.size;
  const moduleData = qr.modules.data; // Uint8Array of size moduleCount * moduleCount (1 = dark, 0 = light)

  // Canvas size: 800 x 940 (Clean dedicated sticker card)
  const W = 800;
  const H = 940;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.imageSmoothingEnabled = true;

  // Background: Pure Clean White rounded card
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 36);
  ctx.fill();

  // Subtle sleek outer border
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(2, 2, W - 4, H - 4, 34);
  ctx.stroke();

  // QR Code Area Geometry
  const qrMargin = 60;
  const qrSize = W - qrMargin * 2; // 680px
  const qrX = qrMargin;
  const qrY = 60;
  const cellSize = qrSize / moduleCount;

  // Eye detection helper (3 corners, each 7x7 modules)
  function isEye(r: number, c: number): boolean {
    if (r < 7 && c < 7) return true; // Top-Left
    if (r < 7 && c >= moduleCount - 7) return true; // Top-Right
    if (r >= moduleCount - 7 && c < 7) return true; // Bottom-Left
    return false;
  }

  // Center logo cutout helper (keep modules in middle clear for logo)
  const centerRadius = 4;
  const centerMid = Math.floor(moduleCount / 2);
  function isCenter(r: number, c: number): boolean {
    return Math.abs(r - centerMid) <= centerRadius && Math.abs(c - centerMid) <= centerRadius;
  }

  // 1. Draw rounded QR modules (excluding eyes and center cutout)
  ctx.fillStyle = "#0F172A"; // Deep premium dark slate / charcoal
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (isEye(r, c) || isCenter(r, c)) continue;
      const isDark = moduleData[r * moduleCount + c] === 1;
      if (isDark) {
        const x = qrX + c * cellSize;
        const y = qrY + r * cellSize;
        const radius = cellSize * 0.35; // Smooth rounded module dot
        ctx.beginPath();
        ctx.roundRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1, radius);
        ctx.fill();
      }
    }
  }

  // 2. Draw Custom Stylish Rounded Eyes (Top-Left, Top-Right, Bottom-Left)
  function drawEye(startX: number, startY: number) {
    const eyeSize = 7 * cellSize;
    // Outer rounded square
    ctx.fillStyle = "#6C3DE8"; // Brand Purple
    ctx.beginPath();
    ctx.roundRect(startX, startY, eyeSize, eyeSize, eyeSize * 0.28);
    ctx.fill();

    // Inner white cutout
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(
      startX + cellSize,
      startY + cellSize,
      eyeSize - 2 * cellSize,
      eyeSize - 2 * cellSize,
      (eyeSize - 2 * cellSize) * 0.22
    );
    ctx.fill();

    // Center rounded pupil
    ctx.fillStyle = "#6C3DE8";
    ctx.beginPath();
    ctx.roundRect(
      startX + 2 * cellSize,
      startY + 2 * cellSize,
      eyeSize - 4 * cellSize,
      eyeSize - 4 * cellSize,
      (eyeSize - 4 * cellSize) * 0.35
    );
    ctx.fill();
  }

  // Draw 3 eyes
  drawEye(qrX, qrY); // Top-Left
  drawEye(qrX + (moduleCount - 7) * cellSize, qrY); // Top-Right
  drawEye(qrX, qrY + (moduleCount - 7) * cellSize); // Bottom-Left

  // 3. Draw Center Official SwiftMart Circular Logo Badge (from official brand asset)
  const centerX = qrX + qrSize / 2;
  const centerY = qrY + qrSize / 2;
  const logoRadius = (centerRadius + 0.4) * cellSize;

  // Outer clean white circular container with soft shadow
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.arc(centerX, centerY, logoRadius + 5, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();

  // Clean white border ring
  ctx.beginPath();
  ctx.arc(centerX, centerY, logoRadius + 4, 0, Math.PI * 2);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Draw the official circular SwiftMart Logo
  const logoImg = await loadOfficialLogo();
  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, logoRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImg, centerX - logoRadius, centerY - logoRadius, logoRadius * 2, logoRadius * 2);
    ctx.restore();
  } else {
    // Fallback: Black circular emblem with cart & brand text
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, logoRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.fillStyle = "#FACC15";
    ctx.font = "900 30px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🛒", centerX, centerY - 10);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 13px system-ui, -apple-system, sans-serif";
    ctx.fillText("SWIFTMART", centerX, centerY + 16);
    ctx.restore();
  }

  // 4. Clean Bottom Area (Store Name + Store ID Badge only)
  const bottomY = qrY + qrSize + 28;

  // Store ID Pill Badge
  const pillW = 340;
  const pillH = 46;
  const pillX = (W - pillW) / 2;
  ctx.fillStyle = "#F3EEFF";
  ctx.beginPath();
  ctx.roundRect(pillX, bottomY, pillW, pillH, 23);
  ctx.fill();

  ctx.strokeStyle = "#DDD6FE";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(pillX, bottomY, pillW, pillH, 23);
  ctx.stroke();

  ctx.fillStyle = "#6C3DE8";
  ctx.font = "900 20px system-ui, -apple-system, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`STORE ID: ${displayCode}`, W / 2, bottomY + pillH / 2);

  // Store Name below ID
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "top";
  const truncatedShopName = shopName.length > 26 ? shopName.slice(0, 24) + "..." : shopName;
  ctx.fillText(truncatedShopName, W / 2, bottomY + pillH + 12);

  return canvas.toDataURL("image/png");
}

export async function downloadPickupSticker(options: PickupStickerOptions): Promise<void> {
  const dataUrl = await generatePickupStickerDataUrl(options);
  const safeName = options.shopName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const link = document.createElement("a");
  link.download = `${safeName}-pickup-qr.png`;
  link.href = dataUrl;
  link.click();
}

export async function printPickupSticker(options: PickupStickerOptions): Promise<void> {
  const dataUrl = await generatePickupStickerDataUrl(options);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>SwiftMart Store Pickup QR - ${options.shopName}</title>
        <style>
          @page { size: auto; margin: 10mm; }
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; font-family: system-ui, sans-serif; }
          img { max-width: 480px; width: 100%; height: auto; object-fit: contain; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-radius: 20px; }
          @media print {
            body { background: transparent; }
            img { box-shadow: none; max-width: 140mm; }
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="window.print(); setTimeout(() => window.close(), 1000);" />
      </body>
    </html>
  `);
  printWindow.document.close();
}

async function loadOfficialLogo(): Promise<HTMLImageElement | null> {
  const sources = [
    "/swiftmart-badge-logo.png",
    "/logo.png",
  ];
  for (const src of sources) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
      });
      return img;
    } catch {}
  }
  return null;
}
