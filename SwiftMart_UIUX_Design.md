# SwiftMart — UI/UX Design Document

**Version:** 1.0  
**Date:** July 2026  

---

## 1. Design Philosophy

SwiftMart uses a **dark-first, neumorphic design language** — soft, tactile surfaces with subtle depth rather than flat or material shadows. The aesthetic is warm (saffron/orange primary), premium (dark backgrounds, high contrast text), and mobile-native (large touch targets, bottom-sheet patterns, snap-scroll carousels).

**Three design principles:**
1. **Tactile depth** — cards feel raised from the background; inputs feel recessed into it
2. **Warmth** — saffron orange as primary communicates energy and local market vibrancy
3. **Density without clutter** — information-rich cards (price, stock, rating, shop) with clear visual hierarchy

---

## 2. Design Tokens

### 2.1 Colour Palette

The default theme is **dark**. There is no light mode toggle exposed to users — the app always starts in dark mode.

#### Core Palette (CSS Custom Properties)

| Token | HSL Value | Hex Approx | Usage |
|---|---|---|---|
| `--background` | `0 0% 11.8%` | `#1E1E1E` | Page background |
| `--foreground` | `0 0% 96%` | `#F5F5F5` | Body text |
| `--card` | `207 13% 13.5%` | `#1E2327` | Card surfaces |
| `--card-foreground` | `0 0% 96%` | `#F5F5F5` | Card text |
| `--border` | `0 0% 22%` | `#383838` | Dividers, outlines |
| `--input` | `0 0% 24%` | `#3D3D3D` | Input field backgrounds |
| `--primary` | `35 90% 55%` | `#F59820` | CTA buttons, links, active states |
| `--primary-foreground` | `0 0% 11.8%` | `#1E1E1E` | Text on primary buttons |
| `--secondary` | `0 0% 20%` | `#333333` | Secondary buttons, tags |
| `--muted` | `0 0% 22%` | `#383838` | Skeleton backgrounds |
| `--muted-foreground` | `0 0% 60%` | `#999999` | Captions, labels, hints |
| `--accent` | `35 50% 22%` | `#3D2E15` | Accent surfaces (soft orange tint) |
| `--accent-foreground` | `35 90% 70%` | `#F7B84E` | Text on accent surfaces |
| `--destructive` | `0 72% 50%` | `#D93636` | Errors, delete actions |
| `--ring` | `35 90% 55%` | `#F59820` | Focus rings (matches primary) |

#### Semantic Status Colours (used in badges, order cards)

| Status | Background | Text |
|---|---|---|
| Placed | `bg-blue-100` | `text-blue-700` |
| Accepted/Confirmed | `bg-amber-100` | `text-amber-700` |
| Preparing | `bg-orange-100` | `text-orange-700` |
| Packed | `bg-indigo-100` | `text-indigo-700` |
| Out for Delivery | `bg-cyan-100` | `text-cyan-700` |
| Delivered | `bg-green-100` | `text-green-700` |
| Cancelled | `bg-red-100` | `text-red-700` |

#### Chart Colours

| Variable | Value | Usage |
|---|---|---|
| `--chart-1` | `35 90% 55%` | Primary data series |
| `--chart-2` | `15 90% 60%` | Secondary series |
| `--chart-3` | `45 90% 50%` | Tertiary series |
| `--chart-4` | `160 60% 45%` | Success/green data |
| `--chart-5` | `280 65% 60%` | Purple accent data |

### 2.2 Typography

| Token | Value |
|---|---|
| `--font-sans` | `'Inter', sans-serif` |
| `--font-serif` | `Georgia, serif` |
| `--font-mono` | `Menlo, monospace` |

**Type Scale (Tailwind defaults):**
- Page titles: `text-2xl font-bold` (24px, 700)
- Section headers: `text-lg font-bold` or `text-base font-semibold`
- Card titles: `text-sm font-bold`
- Body / descriptions: `text-sm` (14px, 400)
- Captions / metadata: `text-xs` (12px, 400)
- Micro labels: `text-[10px]` or `text-[11px]`

### 2.3 Border Radius

The app uses very rounded corners — nearly pill-shaped for most elements.

| Token | Value | Usage |
|---|---|---|
| `--radius` | `1.5rem` (24px) | Base radius |
| `--radius-sm` | `calc(1.5rem - 4px)` = 20px | Small elements |
| `--radius-md` | `calc(1.5rem - 2px)` = 22px | Medium elements |
| `--radius-lg` | `1.5rem` = 24px | Standard cards |
| `--radius-xl` | `calc(1.5rem + 4px)` = 28px | Large modals/sheets |

**Utility classes:** `rounded-2xl` (16px), `rounded-3xl` (24px), `rounded-full` (pills) used throughout.

### 2.4 Elevation / Shadows (Neumorphic)

Two custom CSS utilities create the neumorphic depth effect:

```css
.neu-card {
  box-shadow:
    4px 4px 10px hsl(var(--neu-shadow-dark) / 0.6),
    -4px -4px 10px hsl(var(--neu-shadow-light) / 0.5);
}

.neu-inset {
  box-shadow:
    inset 3px 3px 8px hsl(var(--neu-shadow-dark) / 0.6),
    inset -3px -3px 8px hsl(var(--neu-shadow-light) / 0.4);
}
```

- `neu-card` — applied to cards and interactive tiles; makes them appear to protrude
- `neu-inset` — applied to input fields, quantity steppers, stat displays; makes them appear recessed

### 2.5 Spacing
Standard Tailwind spacing scale. Key patterns:
- Page container: `px-3 pb-24 pt-4` (mobile bottom padding for nav)
- Section gaps: `space-y-6`
- Card internal padding: `p-4` or `p-3`
- Grid gaps: `gap-3`

---

## 3. Layout Patterns

### 3.1 Mobile-First Layout
- Primary target: 375–430px viewport (mobile)
- Max content width: `max-w-7xl mx-auto` for wide layouts
- Bottom nav (`BottomNav`) fixed at bottom — requires `pb-24` on all scrollable pages
- Top header (`Header`) fixed at top — typically `h-14` or `h-16`

### 3.2 Grid Layouts
| Context | Columns | Class |
|---|---|---|
| Product cards | 2 (mobile) / 3 (md) / 4 (lg) | `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` |
| Category bubbles | 4 (mobile) / 6 (sm) / 8 (md) | `grid-cols-4 sm:grid-cols-6 md:grid-cols-8` |
| Stat cards | 2 | `grid-cols-2` |
| Admin panels | 1 (mobile sidebar) + content | Flex |

### 3.3 Horizontal Scroll (Snap Carousel)
Used for shop listings, featured items:
```css
flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-3 px-3
```
Cards: `snap-start shrink-0 w-[calc(75vw)] max-w-[260px]`

### 3.4 Bottom Sheets
Used for: delivery map, OTP entry, filter panels, feature sheets.
- Full-width, anchored to bottom, rounded top corners (`rounded-t-3xl`)
- Drag handle: `w-10 h-1 bg-border rounded-full mx-auto`
- Framer Motion animation: `initial: {y:"100%"}` → `animate: {y:0}`
- Backdrop: `fixed inset-0 bg-black/60`

### 3.5 Admin Dashboard Layout
Desktop: fixed left sidebar (w-64) + scrollable content area  
Mobile: hidden sidebar behind hamburger menu + overlay (`AnimatePresence` slide-in from left, `w-72`)

---

## 4. Component Library

Built on **Radix UI primitives** with Tailwind styling. Full component set:

| Category | Components |
|---|---|
| **Overlay** | Dialog, AlertDialog, Drawer, Sheet, Popover, HoverCard, ContextMenu, DropdownMenu |
| **Form** | Input, Textarea, Select, Checkbox, RadioGroup, Switch, Slider, Toggle, ToggleGroup |
| **Navigation** | NavigationMenu, Tabs, Breadcrumb, Menubar |
| **Feedback** | Toast (Sonner), Progress, Skeleton, Badge, Alert |
| **Layout** | Card, Separator, Accordion, Collapsible, ResizablePanels, ScrollArea, AspectRatio |
| **Data** | Table, Calendar, Command (Autocomplete) |
| **Utility** | Avatar, Tooltip, Label |

### 4.1 Custom Components

| Component | Description |
|---|---|
| `ProductCard` | Product tile with image, name, price, discount, stock badge, add-to-cart stepper |
| `ProductGrid` | Responsive 2/3/4-col grid wrapping ProductCards with skeleton fallback |
| `SkeletonProductCard` | Animated skeleton matching ProductCard dimensions |
| `SkeletonShopCard` / `SkeletonShopCardHorizontal` | Skeleton loaders for shop cards |
| `SkeletonGrid` | Grid of skeleton cards |
| `HeroBannerSlider` | Auto-advancing image/gradient banner carousel with swipe, dots, pause-on-hover |
| `BucketBanner` | Combo deal card with gradient accent color, badge, combo price, product thumbnails |
| `CategoryBubble` | Emoji + label pill in a coloured rounded tile |
| `SectionHeader` | Bold title + optional right action (link / count) |
| `SearchOverlay` | Full-screen search modal on mobile with recent history chips |
| `QuantityStepper` | +/- stepper with animated count, min 0 |
| `WeightStepper` | Preset weight chip selector (50g, 100g, 250g, 500g, 1kg) |
| `AddressCard` | Saved address tile with edit/delete actions |
| `AddressForm` | Label, Line1, Line2, City, Pincode fields |
| `PincodeSelector` | Pincode entry with serviceability validation |
| `LiveOrderTracker` | Leaflet map: OSRM route + pulsing rider marker |
| `DeliveryMapSheet` | Bottom-sheet Leaflet map for riders with action buttons |
| `RiderTrackingSheet` | Customer-facing rider location sheet |
| `StatCard` | Labelled metric card with icon |
| `Header` | Top navigation bar: logo, pincode indicator, cart icon, notification bell |
| `BottomNav` | 5-item fixed bottom tab bar (Home, Search, Cart, Orders, Profile) |
| `DeliveryBanner` | Delivery partner promo/status banner |
| `BucketBanner` | Admin combo bundles highlight |
| `SEO` | Helmet-based per-page meta + JSON-LD |
| `EmptyState` | Icon + title + description + optional CTA for empty lists |
| `ErrorBoundary` | Catches React render errors |
| `InstallPrompt` | PWA "Add to Home Screen" banner |
| `NotificationPrompt` | Push permission request banner |
| `RoleSwitcher` | Customer ↔ Vendor role toggle (visible to vendor users) |
| `FleetMapTab` | Admin fleet map with all rider positions |
| `AnimatedLoginBackground` | Animated background for auth page |
| `HandwritingBackground` | Decorative SVG background for onboarding |

---

## 5. Page-by-Page UX Specification

### 5.1 Home (`/`)
**Layout:** Single-column scroll  
**Scroll order (top → bottom):**
1. Mobile search bar (tap → SearchOverlay full-screen)
2. HeroBannerSlider (auto-advance 4s, swipe, pause on hover)
3. BucketBanner (combo deals — high visual priority)
4. Grocery Store mini-banner (gradient, emoji cluster)
5. Shop by Category (8 bubbles grid, "See more" →)
6. Popular Shops (horizontal snap-scroll, "Quick" badge on pincode match)
7. Dynamic sections (n × product grids, admin-configured)
8. About SwiftMart footer block

**Loading states:**
- Shops: `SkeletonShopCardHorizontal ×3` in horizontal row
- Sections: 8× `SkeletonProductCard` in 2-col grid
- Categories: 8× `Skeleton` bubbles

### 5.2 Product Card (everywhere)
```
┌──────────────────────┐
│  [  Product Image  ] │  ← aspect-square, rounded-xl, object-cover
│  ──── category ────  │  ← text-[10px] muted
│  Product Name        │  ← text-sm font-bold, 2-line clamp
│  ₹120  ~~₹150~~     │  ← price green, original struck-through
│  [Stock] [+ Add]     │  ← badge left, add-to-cart right
└──────────────────────┘
```
- `neu-card` elevated surface
- `bg-card rounded-2xl p-2.5`
- Add to Cart renders inline QuantityStepper once added

### 5.3 Shop Detail (`/shop/:vendorId`)
**Header:**
- Full-width shop image banner (h-48 md:h-64)
- Overlaid: shop name, type tag, rating stars, orders count, ETA pill, open/closed badge
- Back button top-left

**Body:**
- Product grid (same component as everywhere else)
- Filter bar: search within shop

### 5.4 Product Detail (`/product/:id`)
**Layout:** Single-column scroll  
**Sections:**
1. Image carousel (Embla, full-width, with thumbnail dots)
2. Shop name + category breadcrumb
3. Product name (`text-2xl font-bold`)
4. Pricing block (discounted price large + original struck, % off badge)
5. Rating bar
6. Unit / weight selector
7. Color variant swatches (colored circles, selected = ring)
8. Size variant chips (outlined pills, selected = filled primary)
9. Stock indicator
10. Quantity stepper / Add to Cart CTA
11. Description section
12. Related products grid

### 5.5 Cart (`/cart`)
**Layout:** List + sticky bottom summary  

Cart item row:
```
[Image] Name            ₹120
        1 unit    [- 2 +]   [🗑]
```
- Swipe-to-delete gesture on mobile
- Packaging fee row shown if applicable
- Coupon field at bottom
- Sticky bottom: subtotal, delivery, total, "Proceed to Checkout" button

### 5.6 Checkout (`/checkout`)
**Sections:**
1. Delivery address selector (saved cards or "Add New")
2. Order summary (collapsible items list)
3. Coupon code input
4. Price breakdown: subtotal, delivery, packaging, discount, **Total**
5. Payment method radio: Online (Razorpay) / COD
6. "Place Order" / "Pay ₹X" CTA button

### 5.7 Auth (`/auth`)
**Background:** `AnimatedLoginBackground` (floating shapes/gradients)  
**Card:** Centered white/card surface, `rounded-3xl`, `neu-card`  
**Tabs:** Phone · Email · Google  
**Transitions:** Framer Motion fade between steps

### 5.8 Vendor Dashboard (`/vendor/dashboard`)
**Stats row:** 4 `StatCard` components (Revenue, Orders, Today's, Today's Revenue)  
**Chart:** Recharts `BarChart`, custom tooltip, 7d/30d tab toggle  
**Order status pills:** Horizontal scroll of count badges per status  
**Quick actions:** Large CTA tiles for Products, Orders, Shop Profile

### 5.9 Admin Panel (`/admin`)
**Desktop layout:**
```
┌─────────────┬────────────────────────────────┐
│   Sidebar   │                                │
│  (w-64)     │     Content Area               │
│  - Overview │     (scrollable)               │
│  - Requests │                                │
│  - Shops    │                                │
│  ...        │                                │
└─────────────┴────────────────────────────────┘
```
**Mobile layout:** Hamburger → slide-in overlay sidebar (`w-72`, `spring` animation)

**Section content patterns:**
- Data tables with search + filter
- Card grids for visual content (banners, buckets)
- Inline modals for create/edit
- Confirmation dialogs before destructive actions

### 5.10 Delivery Dashboard (`/delivery/dashboard`)
**Same desktop/mobile sidebar pattern as Admin**  
**Overview tab:** Partner card + availability toggle (ToggleRight/ToggleLeft icon, green/muted) + stat cards  
**Orders tab:** Stack of `OrderCard` components  
**Order card anatomy:**
```
┌─────────────────────────────────────┐
│  Shop Name          [Status Badge]  │
│  "12 May, 3:45 PM"                  │
├─────────────────────────────────────┤
│  📦 Item1 ×2, Item2 ×1             │
│  👤 Customer Name    📞 Phone      │
│  📍 Delivery address                │
├─────────────────────────────────────┤
│  ₹450 total    Your cut: ₹40       │
│  [COD · Collect Cash]               │
│  [Map]  [Picked Up / Enter OTP]     │
└─────────────────────────────────────┘
```
Active orders: `ring-2 ring-primary/30` highlight

---

## 6. Animation & Motion

All animations use **Framer Motion**.

| Pattern | Animation |
|---|---|
| Page transitions | `opacity 0→1, y 8→0, duration 0.18s` |
| Bottom sheets | `y "100%"→0, spring(damping:28, stiffness:220)` |
| Sidebar (mobile) | `x -288→0, spring(damping:25, stiffness:200)` |
| Toast notifications | Sonner default (slide up from bottom) |
| Location banner | `opacity 0→1, y -8→0` |
| Product add animation | Scale pulse on add-to-cart |
| Skeleton loading | `animate-pulse` (Tailwind) |
| Spinner | `animate-spin border-primary border-t-transparent rounded-full` |
| Rider GPS dot | `animate-ping` (pulsing ring) |

---

## 7. Loading & Empty States

### 7.1 Loading Patterns
| Context | Loading UI |
|---|---|
| Global products/shops | Skeleton cards (`SkeletonProductCard`, `SkeletonShopCard`) |
| Home sections | 8× skeleton product cards in grid |
| Home shops | 3× `SkeletonShopCardHorizontal` |
| Home categories | 8× small `Skeleton` rectangles |
| Page-level loading | Centered spinner (`w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin`) |
| Button loading | `Loader2` icon with `animate-spin`, button disabled |
| Form submitting | Button text replaced with spinner |

### 7.2 Empty States (`EmptyState` component)
Centered icon (Lucide) + bold title + description + optional CTA button.

| Screen | Icon | Message |
|---|---|---|
| Empty cart | `ShoppingCart` | "Your cart is empty · Browse shops to add items" |
| No orders | `Package` | "No orders yet · Start shopping" |
| Shop not found | `Store` | "Shop not found · Back to Shops" |
| No products in shop | `PackageOpen` | "No products available" |
| No search results | `Search` | "No results for '…'" |
| No notifications | `Bell` | "You're all caught up" |

---

## 8. Forms & Validation

- All forms use **React Hook Form** with **Zod** schema validation
- Inline error messages below fields (`text-destructive text-xs`)
- Field labels above inputs (`text-sm font-medium`)
- Required fields have no explicit asterisk — validated on submit
- Success states use `sonner` toasts (bottom-right, auto-dismiss 3s)
- Error states use `sonner` toasts (`toast.error(...)`)

**Input styling:**
```css
border border-input bg-input rounded-xl px-3 py-2.5 text-sm
focus:outline-none focus:ring-2 focus:ring-ring
```

**Upload fields:**
- Dashed border box with upload icon + "Tap to upload" label
- Image preview appears inline after selection
- Loading spinner while uploading to ImageKit

---

## 9. Navigation Architecture

### 9.1 Bottom Navigation (Customer — mobile)
5 tabs, fixed at bottom:

| Tab | Icon | Route |
|---|---|---|
| Home | `Home` | `/` |
| Search | `Search` | `/search` |
| Cart | `ShoppingCart` | `/cart` (with item count badge) |
| Orders | `Package` | `/orders` |
| Profile | `User` | `/profile` |

Active tab: primary colour icon + primary colour label text  
Inactive: muted-foreground

### 9.2 Header (Customer)
- Left: SwiftMart logo / wordmark
- Centre: Pincode display (`MapPin` icon + current pincode or "Set location")
- Right: notification bell (unread count badge) + cart icon

### 9.3 Vendor Navigation
- `RoleSwitcher` component in header/profile for Customer↔Vendor toggle
- Vendor routes accessed via dedicated sidebar or profile shortcuts

### 9.4 Admin Sidebar
20 sections grouped:

```
📊 Overview
──────────────
🏪 SHOPS
  ├─ Shop Requests
  ├─ Shops
  └─ Shop Types
──────────────
📦 CATALOGUE
  ├─ Product Approvals
  ├─ Trending Products
  └─ Categories
──────────────
🛍️ COMMERCE
  ├─ Orders
  ├─ Transactions
  ├─ Coupons
  ├─ Commissions
  └─ Payouts
──────────────
🏠 HOME PAGE
  ├─ Hero Banners
  ├─ Home Sections
  └─ Buckets
──────────────
🚚 DELIVERY
  ├─ Delivery Partners
  ├─ Fleet Map
  └─ Delivery Charges
──────────────
👥 USERS & SUPPORT
  ├─ Users
  ├─ Reports
  ├─ Support
  └─ Notifications
──────────────
⚙️ PLATFORM
  ├─ Analytics
  └─ Service Areas
```

---

## 10. Responsive Breakpoints

| Breakpoint | Width | Behaviour |
|---|---|---|
| Default (mobile) | < 768px | Single column, bottom nav, hamburger menus, compact cards |
| `md` | ≥ 768px | 3-col product grids, 6-col category grid, wider cards |
| `lg` | ≥ 1024px | 4-col product grids, 8-col categories, desktop sidebars appear |
| `xl` / `2xl` | ≥ 1280px | Max-width containers, increased padding |

---

## 11. Accessibility

| Concern | Implementation |
|---|---|
| Focus management | Radix UI primitives handle focus trapping in modals/dialogs |
| Focus visible ring | `focus:ring-2 focus:ring-ring` on all interactive elements |
| ARIA labels | Lucide icons wrapped in buttons have sr-only labels where needed |
| Semantic HTML | `<section>`, `<nav>`, `<main>`, `<h1>`–`<h3>` used appropriately |
| Touch targets | Minimum `h-9` (36px) on buttons; most interactive areas `h-12`+ |
| Colour contrast | Foreground `#F5F5F5` on `#1E1E1E` background = ~14:1 ratio |
| Motion | `framer-motion` respects `prefers-reduced-motion` via Framer's built-in support |
| Images | `alt` text on all product/shop images |

---

## 12. PWA & Mobile Considerations

| Feature | Implementation |
|---|---|
| PWA manifest | `manifest.json` with icons, theme colour (`#F59820`), display: standalone |
| Service worker | Firebase Messaging service worker (`firebase-messaging-sw.js`) |
| Install prompt | `InstallPrompt` component surfaces browser install event |
| Capacitor (Android) | `@codetrix-studio/capacitor-google-auth` for native Google sign-in |
| Android CORS | `https://localhost` whitelisted — Android WebView sends this origin |
| Viewport | `viewport-fit=cover` for notch/island devices |
| Overscroll | `overflow-x-hidden` on body; custom scroll containers for carousels |
| Scroll behaviour | `scrollbar-hide` on horizontal carousels; snap-scroll for shop cards |

---

## 13. SEO & Structured Data

| Page | Title Pattern | JSON-LD |
|---|---|---|
| Home | "SwiftMart Balurghat \| Grocery, Food, Medicine & Quick Commerce Delivery" | Organization, WebSite, LocalBusiness, WebApplication |
| Product | "{Product Name} — SwiftMart" | Product |
| Shop | "{Shop Name} — SwiftMart" | LocalBusiness |
| Category | "{Category} — SwiftMart" | ItemList |
| Admin / Dashboard | (no index) | — |

`<SEO noIndex />` applied to all internal dashboard routes.  
Canonical domain: `https://swiftmart.space`
