#!/usr/bin/env node
/**
 * SwiftMart — Screenshot Frame Generator
 *
 * Generates SVG phone frame templates that you can use to composite
 * your actual app screenshots into Play-Store-ready graphics.
 *
 * Outputs:
 *   play-store-assets/frames/phone-frame.svg        — blank phone frame (overlay on screenshots)
 *   play-store-assets/frames/screenshot-template-1.svg  — "Browse local shops"
 *   play-store-assets/frames/screenshot-template-2.svg  — "10-Minute Delivery"
 *   play-store-assets/frames/screenshot-template-3.svg  — "Fresh from your neighbourhood"
 *
 * Usage:
 *   node scripts/generate-screenshot-frames.mjs
 *
 * To export as PNG (requires a browser or Inkscape):
 *   Open the SVG in Chrome → Ctrl+P → Save as PDF → convert with Inkscape or ImageMagick
 *   Or: npx @resvg/resvg-js  (install separately for CLI conversion)
 *
 * Play Store phone screenshot recommended dimensions: 1080×1920 px
 * These SVGs are set to that exact size.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, resolve }           from "path";
import { fileURLToPath }           from "url";

const ROOT   = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUTDIR = join(ROOT, "play-store-assets", "frames");
mkdirSync(OUTDIR, { recursive: true });

// ─── Brand colours ────────────────────────────────────────────────────────────
const BG      = "#1e1e1e";
const CARD    = "#1e2327";
const GREEN   = "#22c55e";
const GREEN2  = "#16a34a";
const WHITE   = "#ffffff";
const MUTED   = "#94a3b8";
const BORDER  = "#2d3748";

// ─── Phone frame SVG (1080×1920) ─────────────────────────────────────────────
// This is a pure overlay frame — composite this on top of a screenshot.
function phoneFrameSVG() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920"
     xmlns="http://www.w3.org/2000/svg">

  <!-- Outer phone body -->
  <rect x="20" y="20" width="1040" height="1880" rx="100" ry="100"
        fill="none" stroke="#2a2a2a" stroke-width="40"/>

  <!-- Screen bezel top -->
  <rect x="20" y="20" width="1040" height="120" rx="100" ry="100" fill="#111111"/>
  <rect x="20" y="80" width="1040" height="80" fill="#111111"/>

  <!-- Screen bezel bottom -->
  <rect x="20" y="1780" width="1040" height="120" rx="0" ry="0" fill="#111111"/>
  <rect x="20" y="1840" width="1040" height="60" rx="100" ry="100" fill="#111111"/>

  <!-- Notch / pill camera -->
  <rect x="440" y="45" width="200" height="50" rx="25" ry="25" fill="#0a0a0a"/>

  <!-- Home indicator bar -->
  <rect x="390" y="1850" width="300" height="12" rx="6" ry="6" fill="#555555"/>

  <!-- Side buttons (visual) -->
  <rect x="-5" y="400" width="10" height="80" rx="5" ry="5" fill="#1a1a1a"/>
  <rect x="-5" y="520" width="10" height="130" rx="5" ry="5" fill="#1a1a1a"/>
  <rect x="-5" y="680" width="10" height="130" rx="5" ry="5" fill="#1a1a1a"/>
  <rect x="1075" y="500" width="10" height="180" rx="5" ry="5" fill="#1a1a1a"/>

  <!-- Subtle glare effect -->
  <ellipse cx="300" cy="200" rx="120" ry="60"
           fill="white" fill-opacity="0.03"/>
</svg>`;
}

// ─── Shared status bar (top 100px of every screenshot) ───────────────────────
function statusBar(title = "SwiftMart", subtitle = "Delivery in 10 min") {
  return `
  <!-- Status bar -->
  <rect x="0" y="0" width="1080" height="100" fill="${BG}"/>
  <text x="54" y="32" font-family="system-ui,sans-serif" font-size="24"
        fill="${MUTED}" font-weight="400">9:41</text>
  <text x="1026" y="32" font-family="system-ui,sans-serif" font-size="24"
        fill="${MUTED}" text-anchor="end">●●● ᵥₒₗ 🔋</text>

  <!-- App header bar -->
  <rect x="0" y="100" width="1080" height="120" fill="${BG}"/>
  <text x="54" y="172" font-family="system-ui,sans-serif" font-size="52"
        fill="${WHITE}" font-weight="700">${title}</text>
  <text x="54" y="208" font-family="system-ui,sans-serif" font-size="30"
        fill="${GREEN}" font-weight="500">⚡ ${subtitle}</text>
  <!-- Search bar -->
  <rect x="54" y="230" width="972" height="70" rx="14" fill="${CARD}"/>
  <text x="90" y="275" font-family="system-ui,sans-serif" font-size="30"
        fill="${MUTED}">🔍  Search groceries, medicines...</text>`;
}

// ─── Template 1 — Home screen "Browse local shops" ───────────────────────────
function template1() {
  const cats = [
    { emoji: "🥦", label: "Vegetables", x: 54 },
    { emoji: "🍎", label: "Fruits",     x: 307 },
    { emoji: "🥛", label: "Dairy",      x: 560 },
    { emoji: "💊", label: "Medicines",  x: 813 },
  ];
  const shops = [
    { name: "Ram Kirana Store",   dist: "0.4 km", rating: "4.8", time: "8 min",  color: "#22c55e" },
    { name: "City Medical",       dist: "0.7 km", rating: "4.6", time: "11 min", color: "#3b82f6" },
    { name: "Fresh Basket",       dist: "1.1 km", rating: "4.9", time: "14 min", color: "#f59e0b" },
  ];

  const categoryTiles = cats.map((c) => `
    <rect x="${c.x}" y="340" width="220" height="200" rx="20" fill="${CARD}"/>
    <text x="${c.x + 110}" y="435" font-family="system-ui,sans-serif" font-size="72"
          text-anchor="middle">${c.emoji}</text>
    <text x="${c.x + 110}" y="508" font-family="system-ui,sans-serif" font-size="28"
          fill="${WHITE}" text-anchor="middle" font-weight="500">${c.label}</text>
  `).join("");

  const shopCards = shops.map((s, i) => {
    const y = 600 + i * 200;
    return `
    <rect x="54" y="${y}" width="972" height="170" rx="20" fill="${CARD}"/>
    <circle cx="127" cy="${y + 85}" r="55" fill="${s.color}" fill-opacity="0.2"/>
    <text x="127" cy="${y + 85}" font-family="system-ui,sans-serif" font-size="50"
          text-anchor="middle" dominant-baseline="middle" y="${y + 92}">🏪</text>
    <text x="210" y="${y + 60}" font-family="system-ui,sans-serif" font-size="36"
          fill="${WHITE}" font-weight="600">${s.name}</text>
    <text x="210" y="${y + 100}" font-family="system-ui,sans-serif" font-size="28"
          fill="${MUTED}">${s.dist} away</text>
    <rect x="210" y="${y + 115}" width="120" height="36" rx="8" fill="${GREEN}" fill-opacity="0.15"/>
    <text x="270" y="${y + 139}" font-family="system-ui,sans-serif" font-size="24"
          fill="${GREEN}" text-anchor="middle" font-weight="600">⚡ ${s.time}</text>
    <text x="980" y="${y + 75}" font-family="system-ui,sans-serif" font-size="28"
          fill="#f59e0b" text-anchor="end">★ ${s.rating}</text>
    `;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920"
     xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1920" fill="${BG}"/>
  ${statusBar()}
  ${categoryTiles}
  <!-- Section title -->
  <text x="54" y="580" font-family="system-ui,sans-serif" font-size="36"
        fill="${WHITE}" font-weight="700">Shops Near You</text>
  ${shopCards}
  <!-- Bottom nav bar -->
  <rect x="0" y="1820" width="1080" height="100" fill="${CARD}"/>
  <text x="135" y="1878" font-family="system-ui,sans-serif" font-size="32"
        fill="${GREEN}" text-anchor="middle" font-weight="600">🏠 Home</text>
  <text x="405" y="1878" font-family="system-ui,sans-serif" font-size="32"
        fill="${MUTED}" text-anchor="middle">🔍 Search</text>
  <text x="675" y="1878" font-family="system-ui,sans-serif" font-size="32"
        fill="${MUTED}" text-anchor="middle">📦 Orders</text>
  <text x="945" y="1878" font-family="system-ui,sans-serif" font-size="32"
        fill="${MUTED}" text-anchor="middle">👤 Account</text>
  <!-- Screenshot caption band -->
  <rect x="0" y="1720" width="1080" height="100" fill="${GREEN}" fill-opacity="0.12"/>
  <text x="540" y="1782" font-family="system-ui,sans-serif" font-size="38"
        fill="${GREEN}" text-anchor="middle" font-weight="700">Browse local shops near you</text>
</svg>`;
}

// ─── Template 2 — Order tracking "10-Minute Delivery" ────────────────────────
function template2() {
  const steps = [
    { label: "Order Placed",  done: true,  x: 100 },
    { label: "Picked Up",     done: true,  x: 370 },
    { label: "On the Way",    done: true,  x: 640 },
    { label: "Delivered",     done: false, x: 910 },
  ];

  const stepEls = steps.map((s) => `
    <circle cx="${s.x}" cy="900" r="28"
            fill="${s.done ? GREEN : CARD}"
            stroke="${s.done ? GREEN : BORDER}" stroke-width="4"/>
    ${s.done ? `<text x="${s.x}" y="910" font-family="system-ui,sans-serif" font-size="28"
              fill="${WHITE}" text-anchor="middle" dominant-baseline="middle">✓</text>` : ""}
    <text x="${s.x}" y="948" font-family="system-ui,sans-serif" font-size="24"
          fill="${s.done ? GREEN : MUTED}" text-anchor="middle">${s.label}</text>
  `).join("");

  const orderItems = [
    { emoji: "🍅", name: "Tomatoes 500g",   price: "₹28" },
    { emoji: "🧅", name: "Onions 1kg",       price: "₹35" },
    { emoji: "💊", name: "Paracetamol 10s",  price: "₹18" },
  ];
  const itemEls = orderItems.map((item, i) => `
    <text x="80"  y="${1100 + i * 70}" font-family="system-ui,sans-serif" font-size="42">${item.emoji}</text>
    <text x="145" y="${1105 + i * 70}" font-family="system-ui,sans-serif" font-size="32"
          fill="${WHITE}" font-weight="500">${item.name}</text>
    <text x="1000" y="${1105 + i * 70}" font-family="system-ui,sans-serif" font-size="32"
          fill="${GREEN}" text-anchor="end" font-weight="600">${item.price}</text>
  `).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920"
     xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1920" fill="${BG}"/>
  ${statusBar("Track Order", "Arriving in 8 minutes")}

  <!-- ETA card -->
  <rect x="54" y="340" width="972" height="220" rx="24" fill="${CARD}"/>
  <text x="540" y="415" font-family="system-ui,sans-serif" font-size="36"
        fill="${MUTED}" text-anchor="middle">Estimated Arrival</text>
  <text x="540" y="490" font-family="system-ui,sans-serif" font-size="100"
        fill="${GREEN}" text-anchor="middle" font-weight="800">8 min</text>
  <text x="540" y="535" font-family="system-ui,sans-serif" font-size="28"
        fill="${MUTED}" text-anchor="middle">Ram Kirana Store → Your location</text>

  <!-- Map placeholder -->
  <rect x="54" y="580" width="972" height="280" rx="24" fill="#0f1a10"/>
  <text x="540" y="680" font-family="system-ui,sans-serif" font-size="32"
        fill="${GREEN}" text-anchor="middle" fill-opacity="0.6">[ Live Map ]</text>
  <!-- Route line -->
  <line x1="200" y1="800" x2="880" y2="700" stroke="${GREEN}" stroke-width="6"
        stroke-dasharray="20 10"/>
  <circle cx="200" cy="800" r="18" fill="${GREEN}"/>
  <text x="200" y="808" font-family="system-ui,sans-serif" font-size="20"
        fill="${BG}" text-anchor="middle" dominant-baseline="middle">🏪</text>
  <circle cx="880" cy="700" r="18" fill="#ef4444"/>
  <text x="880" y="708" font-family="system-ui,sans-serif" font-size="20"
        fill="${WHITE}" text-anchor="middle" dominant-baseline="middle">📍</text>
  <!-- Delivery icon on route -->
  <circle cx="600" cy="755" r="28" fill="${GREEN}"/>
  <text x="600" y="763" font-family="system-ui,sans-serif" font-size="28"
        text-anchor="middle" dominant-baseline="middle">🛵</text>

  <!-- Progress steps -->
  <line x1="100" y1="900" x2="910" y2="900" stroke="${BORDER}" stroke-width="3"/>
  <line x1="100" y1="900" x2="640" y2="900" stroke="${GREEN}" stroke-width="4"/>
  ${stepEls}

  <!-- Order summary -->
  <text x="54" y="1055" font-family="system-ui,sans-serif" font-size="36"
        fill="${WHITE}" font-weight="700">Your Order</text>
  <rect x="54" y="1070" width="972" height="250" rx="20" fill="${CARD}"/>
  ${itemEls}
  <line x1="80" y1="1290" x2="1000" y2="1290" stroke="${BORDER}" stroke-width="1"/>
  <text x="80"   y="1340" font-family="system-ui,sans-serif" font-size="34"
        fill="${WHITE}" font-weight="600">Total</text>
  <text x="1000" y="1340" font-family="system-ui,sans-serif" font-size="34"
        fill="${GREEN}" text-anchor="end" font-weight="700">₹81</text>

  <!-- Caption band -->
  <rect x="0" y="1720" width="1080" height="100" fill="${GREEN}" fill-opacity="0.12"/>
  <text x="540" y="1782" font-family="system-ui,sans-serif" font-size="38"
        fill="${GREEN}" text-anchor="middle" font-weight="700">Track your delivery live</text>
</svg>`;
}

// ─── Template 3 — Shop product grid "Fresh from your neighbourhood" ───────────
function template3() {
  const products = [
    { emoji: "🥦", name: "Broccoli",      weight: "500g",  price: "₹45",  row: 0, col: 0 },
    { emoji: "🍅", name: "Tomatoes",      weight: "1 kg",  price: "₹38",  row: 0, col: 1 },
    { emoji: "🥛", name: "Full Cream Milk", weight: "500ml", price: "₹28", row: 1, col: 0 },
    { emoji: "🧄", name: "Garlic",        weight: "250g",  price: "₹22",  row: 1, col: 1 },
    { emoji: "💊", name: "Paracetamol",   weight: "10 tab", price: "₹18", row: 2, col: 0 },
    { emoji: "🍋", name: "Lemons",        weight: "6 pcs", price: "₹30",  row: 2, col: 1 },
  ];

  const productCards = products.map((p) => {
    const x = 54  + p.col * 510;
    const y = 420 + p.row * 390;
    return `
    <rect x="${x}" y="${y}" width="480" height="350" rx="20" fill="${CARD}"/>
    <rect x="${x}" y="${y}" width="480" height="220" rx="20" fill="#1a2820"/>
    <text x="${x + 240}" y="${y + 135}" font-family="system-ui,sans-serif" font-size="110"
          text-anchor="middle">${p.emoji}</text>
    <text x="${x + 24}" y="${y + 262}" font-family="system-ui,sans-serif" font-size="30"
          fill="${WHITE}" font-weight="600">${p.name}</text>
    <text x="${x + 24}" y="${y + 298}" font-family="system-ui,sans-serif" font-size="26"
          fill="${MUTED}">${p.weight}</text>
    <text x="${x + 24}" y="${y + 338}" font-family="system-ui,sans-serif" font-size="34"
          fill="${WHITE}" font-weight="700">${p.price}</text>
    <circle cx="${x + 440}" cy="${y + 318}" r="28" fill="${GREEN}"/>
    <text x="${x + 440}" y="${y + 328}" font-family="system-ui,sans-serif" font-size="36"
          fill="${WHITE}" text-anchor="middle" dominant-baseline="middle" font-weight="700">+</text>
    `;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920"
     xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1920" fill="${BG}"/>
  ${statusBar()}

  <!-- Shop header card -->
  <rect x="54" y="330" width="972" height="75" rx="16" fill="${CARD}"/>
  <text x="90" y="378" font-family="system-ui,sans-serif" font-size="34"
        fill="${WHITE}" font-weight="700">🏪 Ram Kirana Store</text>
  <text x="990" y="365" font-family="system-ui,sans-serif" font-size="28"
        fill="#f59e0b" text-anchor="end">★ 4.8</text>
  <text x="990" y="395" font-family="system-ui,sans-serif" font-size="24"
        fill="${MUTED}" text-anchor="end">⚡ 8 min</text>

  ${productCards}

  <!-- Cart footer -->
  <rect x="0" y="1820" width="1080" height="100" fill="${GREEN}"/>
  <text x="90" y="1882" font-family="system-ui,sans-serif" font-size="34"
        fill="${WHITE}" font-weight="600">🛒  3 items</text>
  <text x="990" y="1882" font-family="system-ui,sans-serif" font-size="36"
        fill="${WHITE}" text-anchor="end" font-weight="700">View Cart  →</text>

  <!-- Caption band -->
  <rect x="0" y="1720" width="1080" height="100" fill="${GREEN}" fill-opacity="0.12"/>
  <text x="540" y="1782" font-family="system-ui,sans-serif" font-size="38"
        fill="${GREEN}" text-anchor="middle" font-weight="700">Fresh from your neighbourhood</text>
</svg>`;
}

// ─── Write files ──────────────────────────────────────────────────────────────
const files = [
  { name: "phone-frame.svg",          content: phoneFrameSVG() },
  { name: "screenshot-home.svg",      content: template1()     },
  { name: "screenshot-tracking.svg",  content: template2()     },
  { name: "screenshot-shop.svg",      content: template3()     },
];

for (const { name, content } of files) {
  const path = join(OUTDIR, name);
  writeFileSync(path, content, "utf8");
  console.log(`✅  Written: play-store-assets/frames/${name}`);
}

console.log(`\nDone. Open any .svg file in your browser to preview.`);
console.log(`For PNG export: open in Chrome → Ctrl+P → Save as PDF,`);
console.log(`or use: npx @resvg/resvg-js <file.svg> <file.png>`);
