/**
 * pickupSticker.ts
 *
 * Generates the official SwiftMart Partner Store Pickup Counter QR Poster/Sticker.
 * Designed for shopkeepers to stick on their counters or walls.
 * Delivery riders scan this permanent QR via the SwiftMart Rider App.
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
  const { shopName, storeCode, pickupQrToken, address, phone } = options;
  const displayCode = storeCode || `SW-BLG-${options.shopId.slice(0, 4).toUpperCase()}`;
  const qrPayload = `SWIFTMART_PICKUP:${pickupQrToken}`;

  // Canvas Dimensions: 1200 x 1600 (High-Res 3:4 Poster Ratio for Crisp Counter Printouts)
  const W = 1200;
  const H = 1600;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // 1. Background Gradient (Clean Premium White/Cream with SwiftMart Yellow Header)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#FFFFFF");
  bgGrad.addColorStop(1, "#F8F7FF");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Outer Border Frame
  ctx.strokeStyle = "#6C3DE8";
  ctx.lineWidth = 16;
  ctx.strokeRect(20, 20, W - 40, H - 40);

  // Inner Accent Border
  ctx.strokeStyle = "#FACC15";
  ctx.lineWidth = 6;
  ctx.strokeRect(36, 36, W - 72, H - 72);

  // 2. Top Header Banner (Purple Brand Background)
  const headerHeight = 220;
  ctx.fillStyle = "#6C3DE8";
  ctx.beginPath();
  ctx.roundRect(50, 50, W - 100, headerHeight, 28);
  ctx.fill();

  // Top Badge
  ctx.fillStyle = "#FACC15";
  ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("⚡ OFFICIAL PARTNER STORE • RIDER PICKUP COUNTER", W / 2, 105);

  // SwiftMart Logo & Tagline
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 52px system-ui, -apple-system, sans-serif";
  ctx.fillText("SwiftMart", W / 2, 175);

  ctx.fillStyle = "#E9D5FF";
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
  ctx.fillText("Instant 10-Minute Hyperlocal Delivery", W / 2, 220);

  // 3. Store Name & Store ID Badge Card
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowColor = "rgba(108, 61, 232, 0.12)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.beginPath();
  ctx.roundRect(80, 300, W - 160, 190, 24);
  ctx.fill();
  ctx.shadowColor = "transparent";

  // Store ID Pill Badge
  ctx.fillStyle = "#F3EEFF";
  ctx.beginPath();
  ctx.roundRect(W / 2 - 140, 325, 280, 42, 21);
  ctx.fill();

  ctx.fillStyle = "#6C3DE8";
  ctx.font = "900 20px system-ui, -apple-system, sans-serif";
  ctx.fillText(`STORE ID: ${displayCode}`, W / 2, 353);

  // Store Name
  ctx.fillStyle = "#111827";
  ctx.font = "bold 44px system-ui, -apple-system, sans-serif";
  const truncatedShopName = shopName.length > 28 ? shopName.slice(0, 26) + "..." : shopName;
  ctx.fillText(truncatedShopName, W / 2, 425);

  // Address & Phone
  ctx.fillStyle = "#6B7280";
  ctx.font = "600 20px system-ui, -apple-system, sans-serif";
  const addressText = address ? (address.length > 48 ? address.slice(0, 45) + "..." : address) : "Balurghat, West Bengal";
  ctx.fillText(addressText, W / 2, 465);

  // 4. QR Code Box (Center Stage)
  const qrSize = 580;
  const qrX = (W - qrSize) / 2;
  const qrY = 525;

  // Yellow Glow Container Box around QR
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(qrX - 25, qrY - 25, qrSize + 50, qrSize + 50, 32);
  ctx.fill();
  ctx.stroke();

  // Generate QR Matrix
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: qrSize,
    margin: 1,
    errorCorrectionLevel: "H",
    color: {
      dark: "#111827",
      light: "#FFFFFF",
    },
  });

  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Center QR SwiftMart Logo Icon Badge
  const badgeSize = 88;
  const badgeX = (W - badgeSize) / 2;
  const badgeY = qrY + (qrSize - badgeSize) / 2;
  ctx.fillStyle = "#6C3DE8";
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 18);
  ctx.fill();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = "#FACC15";
  ctx.font = "900 40px system-ui, -apple-system, sans-serif";
  ctx.fillText("⚡", W / 2, badgeY + 58);

  // 5. Scan Instructions Banner (Clay Style)
  ctx.fillStyle = "#FEF3C7";
  ctx.strokeStyle = "#FDE68A";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(80, 1160, W - 160, 160, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#92400E";
  ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
  ctx.fillText("📱 RIDER INSTRUCTIONS", W / 2, 1205);

  ctx.fillStyle = "#1F2937";
  ctx.font = "600 22px system-ui, -apple-system, sans-serif";
  ctx.fillText("1. Open SwiftMart Rider App → Arrived at Store", W / 2, 1248);
  ctx.fillText("2. Scan this counter QR to verify store & active orders", W / 2, 1285);

  // 6. Bottom Notice / Shopkeeper Advice
  ctx.fillStyle = "#6B7280";
  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  ctx.fillText("🔒 Secure Store Identification Token • Valid for all SwiftMart Delivery Partners", W / 2, 1375);
  ctx.fillText("Keep this permanent QR sticker clearly visible at the billing/packaging counter.", W / 2, 1405);

  // Footer
  ctx.fillStyle = "#9CA3AF";
  ctx.font = "600 16px system-ui, -apple-system, sans-serif";
  ctx.fillText(`Token: ${pickupQrToken.slice(0, 8)}••••${pickupQrToken.slice(-6)} | Support: +91 62961 18949 | swiftmart.space`, W / 2, 1530);

  return canvas.toDataURL("image/png");
}

export async function downloadPickupSticker(options: PickupStickerOptions): Promise<void> {
  const dataUrl = await generatePickupStickerDataUrl(options);
  const safeName = options.shopName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const link = document.createElement("a");
  link.download = `${safeName}-pickup-counter-qr.png`;
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
        <title>SwiftMart Pickup Counter QR - ${options.shopName}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; font-family: system-ui, sans-serif; }
          img { max-width: 100%; height: auto; max-height: 96vh; object-fit: contain; box-shadow: 0 4px 20px rgba(0,0,0,0.1); border-radius: 12px; }
          @media print {
            body { background: transparent; }
            img { box-shadow: none; max-height: 100vh; width: 100%; }
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}
