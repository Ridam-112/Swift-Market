# SwiftMart — Product Requirements Document

**Version:** 1.0  
**Date:** July 2026  
**Platform:** Hyperlocal Quick Commerce — Balurghat, West Bengal  
**Stack:** React + Vite (Frontend) · Express 5 + Drizzle ORM + TypeScript (Backend) · Neon PostgreSQL · ImageKit · Razorpay · Firebase Cloud Messaging

---

## 1. Product Overview

SwiftMart is a hyperlocal quick-commerce and e-grocery marketplace connecting customers in Balurghat, West Bengal with trusted local shops for delivery in as fast as 10 minutes. The platform is a full-stack multi-role system serving four distinct actor types — Customers, Vendors, Delivery Partners, and Admins — each with a dedicated interface and workflow.

### 1.1 Core Value Proposition
- **For Customers:** Browse and order from local shops with fast, trackable delivery and flexible payment
- **For Vendors:** Zero-infrastructure digital storefront with order management and earnings visibility
- **For Delivery Partners:** Simple earnings-first dashboard with live navigation and OTP-secured delivery
- **For Admins:** Full platform control — catalogue, commerce, compliance, and commerce analytics

### 1.2 Geographic Scope
Pincode-based serviceability. Only pincodes listed in the `service_pincodes` master table are active. Shops and customers are matched by pincode. Customers outside serviceable pincodes cannot place orders.

---

## 2. User Roles & Permissions

| Role | Description | Key Capabilities |
|---|---|---|
| **Customer** | End shopper | Browse, search, cart, checkout, track orders, manage addresses |
| **Vendor** | Shop owner | Manage products, accept/prepare orders, view earnings and payouts |
| **Delivery Partner** | Rider | Accept & deliver orders, GPS sharing, OTP verification |
| **Admin** | Platform operator | All platform management (see Section 7) |
| **Super Admin** | Root operator | All admin capabilities + admin user management |

Role is stored on the `users` record. Vendors and Delivery Partners are sub-roles — a user account is still the primary identity, with a linked `shops` or `delivery_partners` record.

---

## 3. Authentication & Onboarding

### 3.1 Auth Methods
Three fully supported sign-in methods coexist on the same account:

| Method | Endpoints | Notes |
|---|---|---|
| **Phone + Password** | `POST /auth/check-phone` → `POST /auth/login` | Legacy OTP users migrated with `needsPasswordSetup` flag |
| **Email + Password** | `POST /auth/email-signup` · `POST /auth/email-login` | Resend-powered reset emails via `POST /auth/email-forgot-password` + `POST /auth/email-reset-password` |
| **Google OAuth 2.0** | `GET /auth/google/redirect` → `POST /auth/google/exchange` | Pure server-side OAuth2 flow. Firebase kept only for FCM push tokens, not auth |

### 3.2 Token Management
- JWT access token (short-lived) + refresh token (long-lived)
- `POST /auth/refresh` silently reissues tokens
- `POST /auth/logout` invalidates the session
- `GET /auth/me` returns the authenticated user profile

### 3.3 Profile Completion Flow
New users from Google or phone signup may land on `/complete-profile` if `needsProfile: true` is returned. They enter name, phone, and delivery address before continuing.

### 3.4 Password Setup (OTP-migrated users)
Users who registered before the password auth migration see a one-time `needsPasswordSetup` prompt. `POST /auth/set-password` sets their new password without re-authenticating.

### 3.5 Rate Limiting
All auth endpoints are individually rate-limited:
- Login: `loginLimiter`
- Signup: `signupLimiter`
- Password reset: `resetPasswordLimiter`
- Google OAuth: `googleAuthLimiter`
- Token refresh: `tokenRefreshLimiter`

---

## 4. Customer Experience

### 4.1 Home Page (`/`)
- **Hero Banner Slider:** Admin-uploaded promotional banners (ImageKit). Falls back to 5 built-in static slides. Auto-advances with swipe/click navigation. Banner views are tracked.
- **Bucket Bundles:** Admin-curated combo deal banners (`/buckets`) shown prominently above the fold. Each bucket has a title, subtitle, badge text, accent color, combo price, and a set of linked products.
- **Grocery Store Mini-Banner:** Static quick-link to `/grocery`
- **Shop by Category:** 8 priority-sorted category bubbles from the admin-defined category list, with "See more" link to full list
- **Popular Shops:** Up to 4 approved shops from the user's pincode area in a horizontal scroll. "Quick" badge shown when shop pincode matches user's saved pincode
- **Dynamic Admin Sections:** Up to N admin-configured homepage sections (curated product feeds, category spotlights, etc.) rendered in admin-defined order. Each section shows products with a "See all" link to `/section/:id`
- All static-ish home data (categories, sections, hero banners, buckets) is cached in module-level memory for 5 minutes — navigating back to Home does not re-fetch

### 4.2 Search (`/search`)
- Full-text search across products from the global products cache
- 1200 ms debounce on keystroke for search history saving
- Recent search terms stored locally via `useRecentSearches` hook
- Results filtered by user's pincode / approved shops
- Accessible via full-screen `SearchOverlay` component on mobile

### 4.3 Shop Discovery
- **All Shops** (`/shops`): Full paginated list of approved shops, filterable by category/pincode
- **Shop Detail** (`/shop/:vendorId`): Shop header (image, name, rating, ETA, open/closed badge), full product grid of that shop's approved products. If shop is in the global context cache it renders instantly; otherwise falls back to direct API fetch

### 4.4 Product Detail (`/product/:id`)
- Full product page with image carousel, name, description, unit, stock, price / discounted price
- Color and size variant selectors (color swatches with hex mapping)
- Weight-based purchasing for applicable units (e.g. per-gram items)
- Quantity stepper with cart integration
- Related products grid (same category)
- Direct API fallback: if the product isn't in the global 1000-item cached list (e.g. from a homepage section link), fetches it by ID

### 4.5 Categories (`/category/:slug`, `/categories`)
- Browse all admin-defined categories
- Category page shows all approved products in that category, filterable/sortable

### 4.6 Grocery Store (`/grocery`)
- Dedicated view for grocery/kirana category products with fresh layout

### 4.7 Cart (`/cart`)
- Persistent cart state (Context + localStorage)
- Line items with quantity steppers and weight selectors
- Real-time subtotal, delivery charge, and packaging fee calculation
- Addon suggestions from admin-configured bucket packages
- Cart summary component shows itemised breakdown

### 4.8 Checkout (`/checkout`)
- Saved delivery address selector or new address entry
- Pincode serviceability validation before order submission
- Coupon code entry with server-side validation (`POST /coupons/validate`)
- Payment method selection:
  - **Razorpay (Online):** `POST /payments/create-order` → Razorpay JS SDK → `POST /payments/verify`
  - **COD:** Direct order submission, cash collected at delivery
- Order placed via `POST /orders`
- On success, redirects to `/order-success`

### 4.9 Order Success (`/order-success`)
- Confirmation screen with order ID, estimated delivery time
- Links to order tracking and home

### 4.10 Orders (`/orders`)
- Full order history for the authenticated customer
- Per-order: status badge, items, totals, payment method, timestamps
- Live rider tracking link when order is `out_for_delivery`

### 4.11 Live Order Tracking
- `GET /orders/:id/rider-location` — returns current rider GPS coordinates
- Customer sees a Leaflet map (Carto Voyager tiles, OSRM routing) with a blue route line from rider to delivery address
- Rider position shown as a pulsing 🛵 DivIcon, updates every 10 seconds
- Delivery OTP shown to customer only when status is `out_for_delivery`

### 4.12 Profile (`/profile`)
- Name, phone, email display
- Saved addresses (Home / Work / Other) — add, edit, delete
- Pincode management
- Order history shortcut
- Notifications access
- Vendor registration / vendor status links
- Delivery partner registration link
- Logout

### 4.13 Notifications (`/notifications`)
- In-app notification list: order updates, admin broadcasts, system messages
- `PATCH /notifications/:id/read` · `PATCH /notifications/read-all`
- FCM push notifications for real-time delivery updates (when browser permission granted)
- `NotificationPrompt` component requests push permission contextually

### 4.14 Section Products (`/section/:id`)
- Full paginated product list for a specific admin homepage section
- Title pulled from query param `?title=`

### 4.15 Address Management
- Inline add/edit/delete via `AddressForm` component
- Address fields: label (Home/Work/Other), line1, line2, city, pincode

---

## 5. Vendor Experience

### 5.1 Registration (`/vendor-register`)
- Multi-step form: shop name, shop type, city, pincode, GSTIN (optional), FSSAI licence number, Drug Licence (if applicable), bank account details (account number, IFSC, holder name), UPI ID, PAN
- Shop logo upload (mandatory — ImageKit)
- Compliance document uploads: FSSAI certificate, Drug Licence certificate, optional additional docs (ImageKit)
- Submitted shop enters `pending` status and appears in admin Shop Requests queue

### 5.2 Vendor Status (`/vendor-status`)
- Status screen shown to vendors awaiting admin approval
- Shows current status: pending / approved / rejected / suspended
- Rejection reason displayed if rejected

### 5.3 Vendor Dashboard (`/vendor/dashboard`)
- Stats cards: Total Revenue, Total Orders, Today's Orders, Today's Revenue
- Revenue chart: 7-day or 30-day bar chart (Recharts)
- Order status breakdown: New / Confirmed / Packed / Out / Delivered / Cancelled
- Shortcut navigation to Products, Orders, Shop Profile, Payouts

### 5.4 Vendor Products (`/vendor/products`)
- Full product list for the vendor's shop
- Status badges: approved / pending / rejected
- Quick stock toggle
- Navigate to Add or Edit product

### 5.5 Add Product (`/vendor/products/add`)
- Fields: name, category, price, discounted price, unit, stock, description
- Multi-image upload (up to N images via ImageKit `product-image` endpoint)
- Color variants: add named swatches with per-color images
- Size variants: add size options
- Products enter `pending_approval` status and appear in admin Product Approvals queue

### 5.6 Edit Product (`/vendor/products/:id/edit`)
- Same form as Add with pre-populated values
- Image management: add/remove images
- Stock and pricing updates take effect immediately

### 5.7 Vendor Orders (`/vendor/orders`)
- All orders for the vendor's shop, filterable by status
- Vendor drives the order lifecycle:
  - `placed` → **Accept** → `accepted`
  - `accepted` → **Preparing** → `preparing`
  - `preparing` → **Pack** → `packed`
  - Admin/platform assigns a delivery partner when packed
- Order cards show: items, customer info, net amount, payment method, delivery address

### 5.8 Shop Profile (`/vendor/shop-profile`)
- Edit shop details: name, description, address, phone, ETA, logo image
- Compliance re-upload: if a certificate was rejected by admin, vendor can re-upload via `PATCH /shops/my/certificate`
- Toggle shop open/closed via `PATCH /shops/my/toggle-open`

### 5.9 Payouts (`/payouts/my`)
- Vendor views their payout history: amount, period, status (pending / paid / cancelled)
- Payouts are auto-created by the platform when orders are delivered
- Commission is deducted before payout amount is calculated

---

## 6. Delivery Partner Experience

### 6.1 Registration
- Delivery partner registers via profile page flow
- Admin creates / approves the delivery partner account via `POST /delivery` and `PATCH /delivery/:id`
- Partner status: pending → active → suspended

### 6.2 Delivery Dashboard (`/delivery/dashboard`)
- **Overview Tab:**
  - Partner profile card with online/offline availability toggle (`PATCH /delivery/me/availability`)
  - Stats: Total Delivered, Today's Deliveries, Total Earnings, Today's Revenue
  - Active orders list (up to 3 preview cards) with quick action buttons
- **Orders Tab:**
  - All assigned orders with full detail cards
  - Order actions:
    - **Picked Up** → status transitions to `out_for_delivery`
    - **Enter OTP** → opens 4-digit OTP entry dialog
  - COD orders show "Confirm Cash Collected" button after delivery

### 6.3 Order Lifecycle (Partner Side)
- Partner receives orders in `packed` / `confirmed` / `accepted` / `preparing` status
- Taps **Picked Up** → `PATCH /delivery/me/orders/:orderId/status` → `out_for_delivery`
- Taps **Enter OTP** → enters customer's 4-digit delivery OTP → `POST /delivery/me/orders/:orderId/verify-otp` → `delivered`
- For COD orders, partner checks "I collected cash" checkbox in OTP dialog
- COD payment confirmation (after delivery): `PATCH /delivery/me/orders/:orderId/confirm-payment`

### 6.4 Live GPS Sharing
- Location permission requested on dashboard load
- When order is `out_for_delivery`, `navigator.geolocation.watchPosition` starts
- Coordinates pushed to `PATCH /delivery/me/location` on every GPS update (maximumAge: 3000ms)
- Location sharing stops when no active deliveries or permission denied
- Sharing status banner shown: pulsing green dot + "Sharing live location with customer"

### 6.5 Delivery Map (`DeliveryMapSheet`)
- Full-screen bottom sheet map for active orders
- Leaflet map with Carto Voyager tiles
- Blue OSRM-routed line from shop → delivery address
- Rider can tap **Picked Up** and **Deliver (OTP)** directly from the map sheet

### 6.6 Rain Mode
- Admin can activate Rain Mode via `POST /delivery/rain-mode`
- Increases delivery charges across the platform during adverse weather

### 6.7 Fleet Map (Admin)
- `GET /delivery/fleet` returns all active riders with current coordinates
- Admin sees all riders on a live map via `FleetMapTab` component

---

## 7. Admin Panel (`/admin`)

Full-featured single-page admin dashboard with 20 sections accessed via collapsible sidebar.

### 7.1 Overview
- Platform stats: total orders, revenue, active shops, registered users, active riders
- Quick navigation to all sections

### 7.2 Shop Requests
- Lists all shops with `pending` status
- Approve: `POST /shops/:id/approve` — shop becomes visible to customers
- Reject: `POST /shops/:id/reject` with reason
- View full shop details including uploaded compliance documents

### 7.3 Shops Management
- Full list of all shops (any status)
- Inline status filter: pending / approved / rejected / suspended / banned
- Actions: Edit, Approve, Reject, Ban, Unban, Toggle Open, Change Owner, Link to existing user
- Admin-create shop: `POST /shops/admin-create` (bypasses registration flow)
- Verify compliance certificate: `POST /shops/:id/verify`
- Reject certificate: `POST /shops/:id/reject-certificate`

### 7.4 Users
- Full customer list with search
- Ban / Unban customer: `PATCH /users/:id/ban` · `PATCH /users/:id/unban`
- Send account setup email to existing user: `POST /users/:id/send-setup-email`

### 7.5 Orders
- All platform orders with status filter
- Manual status override: `PATCH /orders/:id/status`
- Assign delivery partner: `PATCH /orders/:id/assign-partner`
- Refund order: `POST /orders/:id/refund`

### 7.6 Product Approvals
- Products submitted by vendors in `pending_approval` status
- Approve / Reject: `PATCH /products/:id/approval`

### 7.7 Trending Products
- Admin manages which products appear in trending sections
- `GET /products/trending-manager`

### 7.8 Analytics
- Revenue analytics: daily/weekly/monthly time-series via `GET /analytics`
- User signup trends: `GET /admin/user-signups`
- Order volume breakdowns

### 7.9 Transactions
- Full payment transaction log
- Razorpay payment status, COD confirmation records

### 7.10 Commissions
- Define commission rules: percentage or fixed per shop / shop-type / category
- `GET /commissions` · `POST /commissions` · `PATCH /commissions/:id` · `DELETE /commissions/:id`
- Commission is auto-applied when orders are delivered; deducted from vendor payout

### 7.11 Payouts
- View all pending / paid / cancelled payouts: `GET /payouts`
- Process payout (mark as paid): `PATCH /payouts/:id/status`
- Vendors view their own payouts: `GET /payouts/my`

### 7.12 Coupons
- Create discount coupons: code, type (flat/percent), value, min order value, max uses, expiry
- `POST /coupons` · `PATCH /coupons/:id` · `DELETE /coupons/:id`
- Customers validate at checkout: `POST /coupons/validate`

### 7.13 Hero Banners
- Upload promotional banners (ImageKit) with title, subtitle, CTA text
- Set redirect type: category / shop / product / internal URL / external URL
- Reorder, toggle visibility, delete

### 7.14 Homepage Sections
- Create curated product sections: type (trending, category, manual, etc.), title, layout, item limit, display order
- `POST /homepage-sections` · `PATCH /homepage-sections/reorder` · `PATCH /homepage-sections/:id` · `DELETE /homepage-sections/:id`
- Each section resolves live product data at request time

### 7.15 Bucket Bundles
- Admin-curated combo/highlight packages shown on Home above the fold
- Title, subtitle, badge text, accent color, combo price, linked products
- `POST /buckets` · `PATCH /buckets/:id` · `DELETE /buckets/:id`

### 7.16 Categories
- CRUD for product categories: name, slug, emoji, color
- `POST /categories` · `PATCH /categories/:id` · `DELETE /categories/:id`
- 18 categories seeded on first run

### 7.17 Shop Types
- CRUD for shop type definitions (used in vendor registration and filtering)
- Public endpoint: `GET /shop-types/active`

### 7.18 Delivery Charges
- Configure delivery charge tiers and rules
- `POST /delivery/charges` · `PATCH /delivery/charges/:id` · `DELETE /delivery/charges/:id`
- `GET /delivery/charges/calculate` — public endpoint, used at checkout

### 7.19 Service Areas (Pincodes)
- Master list of serviceable pincodes
- Add / update / remove pincodes: `POST /service-pincodes` · `PATCH /service-pincodes/:pincode` · `DELETE /service-pincodes/:pincode`
- Orders and shop discovery are gated on this list

### 7.20 Delivery Partners
- View all registered delivery partners
- Create partner profile: `POST /delivery` · Update: `PATCH /delivery/:id`
- Link partner to a user account: `POST /delivery/:id/link-user`
- Activate / suspend partner

### 7.21 Fleet Map
- Live map showing all active riders' current GPS coordinates
- Refreshes via `GET /delivery/fleet`

### 7.22 Notifications
- Broadcast notification to all users or a role subset: `POST /notifications/broadcast`
- View broadcast history: `GET /notifications/broadcasts`
- Cleanup old notifications: `POST /notifications/admin/cleanup`

### 7.23 Reports
- User-submitted shop/product reports (abuse, quality, etc.)
- Resolve: `PATCH /reports/:id/resolve` · Ignore: `PATCH /reports/:id/ignore`

### 7.24 Support Tickets
- Customer-submitted support tickets: `POST /support` (customer) · `GET /support/mine` (customer history)
- Admin list: `GET /support` · Resolve: `PATCH /support/:id/resolve` · Close: `PATCH /support/:id/close`

### 7.25 Admin User Management (Super Admin only)
- List all admin accounts: `GET /admin/admins`
- Create new admin: `POST /admin/admins`
- Update admin: `PATCH /admin/admins/:id`
- Delete admin: `DELETE /admin/admins/:id`

---

## 8. Order Lifecycle (Complete)

```
Customer places order (POST /orders)
        │
        ▼
    [ placed ]
        │  Vendor accepts
        ▼
   [ accepted ]
        │  Vendor starts preparing
        ▼
   [ preparing ]
        │  Vendor packs order
        ▼
    [ packed ]
        │  Admin assigns delivery partner
        ▼
  [ out_for_delivery ]  ◄── Rider picks up, GPS sharing starts
        │  Rider arrives, customer shares OTP
        ▼
   [ delivered ]  ◄── OTP verified by rider
        │
        └── COD: rider confirms cash collection
            Online: payment already captured at checkout
```

**Cancellation:** Can be triggered before `out_for_delivery`. Stock is auto-restored on cancellation.

**Status transitions owned by role:**
- Vendor: `placed` → `accepted` → `preparing` → `packed`
- Admin: any status, assign partner
- Delivery Partner: `packed/confirmed/accepted/preparing` → `out_for_delivery` → `delivered` (OTP)
- Customer: read-only view + cancellation window

---

## 9. Payment System

### 9.1 Razorpay (Online Payment)
1. Checkout calls `POST /payments/create-order` → returns Razorpay order ID
2. Razorpay JS SDK opens native payment modal
3. On success, frontend calls `POST /payments/verify` with payment signature
4. Server verifies HMAC signature; on valid → order is created with `paymentStatus: paid`
5. Razorpay Webhooks (`POST /payments/webhook`) handle async payment events (refunds, failures)

### 9.2 Cash on Delivery (COD)
- Order placed immediately without upfront payment
- `paymentStatus: pending` until delivery partner confirms collection
- Rider taps "I collected cash" during OTP verification
- `PATCH /delivery/me/orders/:orderId/confirm-payment` sets `paymentStatus: paid`

### 9.3 Refunds
- Admin initiates via `POST /orders/:id/refund`
- Razorpay refund API called for online payments; COD refunds handled off-platform

---

## 10. Commission & Payout Engine

- Commission rules defined per shop, shop-type, or globally (percentage or fixed amount)
- When an order reaches `delivered` status, commission is calculated and deducted
- `netAmount` (vendor's payout amount) = subtotal − platform commission
- Payout records are auto-created per delivery; admin reviews and marks as paid
- Vendors see their payout history with per-period breakdowns

---

## 11. Notifications

### 11.1 In-App Notifications
- Stored in `notifications` table, associated with user
- Triggers: order placed, order status updates, payout processed, admin broadcast
- Frontend fetches on load, marks read individually or all-at-once
- Bell icon in header with unread count badge

### 11.2 FCM Push Notifications
- Firebase Cloud Messaging (server-side via `firebase-admin`)
- Device token registered via `POST /fcm/register-token`
- Push sent on: order status updates, broadcast campaigns
- `artifacts/swiftmart/src/lib/fcm.ts` handles token retrieval + service worker registration
- Requires 3 Firebase secrets: `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, and `VITE_FIREBASE_*` keys

---

## 12. Media Storage

All user-uploaded images are stored on **ImageKit**:

| Upload Type | Endpoint | Path |
|---|---|---|
| Product image | `POST /upload/product-image` | `/swiftmart/products/` |
| Shop image / logo | `POST /upload/shop-image` | `/swiftmart/shops/` |
| Hero banner | `POST /upload/banner-image` | `/swiftmart/banners/` |
| Compliance certificate | `POST /upload/certificate` | `/swiftmart/certificates/` |

Delete operations use ImageKit's `listFiles` (by URL) to resolve fileId before deletion. Requires `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` secrets.

---

## 13. Data Model Summary

| Table | Purpose | Key Fields |
|---|---|---|
| `users` | All accounts across roles | `id`, `name`, `phone`, `email`, `role`, `status`, `pincode`, `addresses[]`, `profilePhoto` |
| `shops` | Vendor shop profiles | `id`, `shopName`, `shopType`, `status`, `isOpen`, `rating`, `image`, `fssaiLicence`, `certificateFile`, `commissionRate`, `bankAccountNumber`, `bankIfscCode`, `upiId`, `address` |
| `products` | Product catalogue | `id`, `name`, `category`, `price`, `discountedPrice`, `unit`, `images[]`, `stock`, `status`, `shopId`, `trending`, `colors`, `sizes`, `colorImages` |
| `orders` | Purchase records | `id`, `customerId`, `shopId`, `items[]`, `subtotal`, `deliveryCharge`, `packagingFee`, `netAmount`, `commissionAmount`, `status`, `paymentMethod`, `paymentStatus`, `deliveryOtp`, `deliveryPartnerId`, `address` |
| `delivery_partners` | Rider profiles | `id`, `userId`, `name`, `phone`, `vehicle`, `isAvailable`, `status`, `totalEarnings`, `ordersDelivered`, `currentLat`, `currentLon`, `locationUpdatedAt` |
| `categories` | Product categories | `id`, `name`, `slug`, `emoji`, `color` |
| `shop_types` | Shop type definitions | `id`, `name`, `slug`, `isActive` |
| `commissions` | Commission rules | `id`, `type` (percent/fixed), `value`, `appliesTo`, `shopId`, `shopType` |
| `payouts` | Vendor payouts | `id`, `vendorId`, `amount`, `status`, `ordersIncluded[]`, `period` |
| `coupons` | Discount codes | `id`, `code`, `type`, `value`, `minOrderValue`, `maxUses`, `usedCount`, `expiresAt` |
| `notifications` | In-app alerts | `id`, `userId`, `title`, `body`, `type`, `read`, `createdAt` |
| `hero_banners` | Homepage sliders | `id`, `imageUrl`, `title`, `subtitle`, `redirectType`, `redirectValue`, `isActive`, `sortOrder` |
| `homepage_sections` | Curated sections | `id`, `title`, `type`, `enabled`, `sortOrder`, `config` |
| `buckets` | Combo bundle cards | `id`, `title`, `subtitle`, `badgeText`, `accentColor`, `comboPrice`, `products[]` |
| `service_pincodes` | Serviceability map | `pincode`, `label`, `isActive` |
| `reports` | Abuse reports | `id`, `type`, `targetId`, `reason`, `status` |
| `support_tickets` | Customer support | `id`, `userId`, `subject`, `message`, `status` |

---

## 14. Frontend Architecture

### 14.1 State Management
- **AuthContext** — user session, login/logout, profile refresh
- **ProductsContext** — global products list (up to 1000 items), background-refreshed every 60s
- **ShopsContext** — all approved shops, background-refreshed every 60s
- **CartContext** — cart items, quantities, weight selections (persisted to localStorage)
- Double-fetch prevention: on app start, mount fetch fires immediately; auth-effect skips if data is <10s old

### 14.2 Routing
Wouter (lightweight router). All routes defined in `App.tsx`:

| Path | Component | Auth |
|---|---|---|
| `/` | Home | Public |
| `/shops` | Shops | Public |
| `/shop/:vendorId` | ShopDetail | Public |
| `/product/:id` | Product | Public |
| `/search` | Search | Public |
| `/grocery` | GroceryStore | Public |
| `/category/:slug` | Category | Public |
| `/categories` | AllProducts | Public |
| `/cart` | Cart | Customer |
| `/checkout` | Checkout | Customer |
| `/order-success` | OrderSuccess | Customer |
| `/orders` | Orders | Customer |
| `/profile` | Profile | Customer |
| `/notifications` | Notifications | Customer |
| `/section/:id` | SectionProducts | Public |
| `/vendor/dashboard` | vendor/Dashboard | Vendor |
| `/vendor/products` | vendor/Products | Vendor |
| `/vendor/products/add` | vendor/AddProduct | Vendor |
| `/vendor/products/:id/edit` | vendor/EditProduct | Vendor |
| `/vendor/orders` | vendor/Orders | Vendor |
| `/vendor/shop-profile` | vendor/ShopProfile | Vendor |
| `/vendor-register` | VendorRegister | Customer |
| `/vendor-status` | VendorStatus | Customer |
| `/admin` | Admin | Admin |
| `/delivery/dashboard` | DeliveryDashboard | Delivery |
| `/auth` | Auth | Public |
| `/complete-profile` | CompleteProfile | Public |
| `/privacy`, `/terms`, `/refund-cancellation`, `/contact-support`, `/delete-account` | Legal pages | Public |

### 14.3 Guards
- `AuthGuard` — redirects unauthenticated users to `/auth`
- `RoleGuard` — checks role against required role
- `AdminGuard` — checks admin or super_admin role
- `VendorGuard` — checks vendor role + approved shop
- `DeliveryGuard` — checks delivery partner status

### 14.4 Key Shared Components
- `ProductCard` — universal product tile with add-to-cart, quantity stepper
- `ProductGrid` — responsive 2/3/4 column grid of ProductCards
- `HeroBannerSlider` — auto-advancing banner carousel
- `BucketBanner` — combo deal cards
- `SearchOverlay` — full-screen mobile search
- `LiveOrderTracker` — Leaflet map with OSRM routing for customer tracking
- `DeliveryMapSheet` — bottom-sheet map for rider navigation
- `RiderTrackingSheet` — customer-facing live rider location view
- `PincodeSelector` — pincode entry + validation UI
- `SEO` — per-page meta tags and JSON-LD structured data

---

## 15. SEO & Structured Data

- Per-page `<SEO>` component sets `<title>`, `<meta description>`, Open Graph tags, canonical URL
- Home page includes JSON-LD for: `Organization`, `WebSite`, `LocalBusiness/Store`, `WebApplication`
- `SearchAction` potential action for Google Sitelinks Search Box
- Admin pages set `noIndex: true`
- Canonical domain: `swiftmart.space`

---

## 16. Backend Architecture

### 16.1 Server
- **Express 5** with async error handling
- **Drizzle ORM** + **Neon PostgreSQL** (serverless driver with connection pooling)
- **esbuild** for production bundling (single `dist/index.mjs`, ~4.2 MB)
- TypeScript throughout; strict mode

### 16.2 Middleware Stack
- `helmet` — HTTP security headers
- `cors` — production: whitelist of known origins; development: permissive
- `express.json()` — body parsing
- `pino` — structured JSON logging
- `authenticate` — JWT verification middleware (attaches `req.user`)
- `optionalAuth` — attaches user if token present, continues unauthenticated if not
- Role guards: `A` (admin/super_admin), `SA` (super_admin only), `V` (vendor)
- `validateUuidParams` — UUID format validation on route params to prevent injection

### 16.3 Rate Limiting
Per-endpoint limiters using `express-rate-limit`:
- Login, Signup, OTP, Google, Token Refresh, Password Reset, Coupon Validate, Vendor Writes, Orders

### 16.4 Startup Sequence
1. Validate required/optional environment secrets (warns on missing optional)
2. Run DB seed (categories, shop types, super admins) — idempotent
3. Connect Redis (no-op if `REDIS_URL` absent)
4. `app.listen(8080)`
5. SIGTERM handler: disconnect Redis → `process.exit(0)`

### 16.5 Redis Caching (Optional)
When `REDIS_URL` is set, the following endpoints cache their responses:
- `GET /categories` — 30 min TTL, key `sm:categories`
- `GET /homepage-sections` — 5 min TTL, key `sm:homepage`
- `GET /products` (public queries) — 5 min TTL, key `sm:products:{sortedQueryParams}`

Write operations (create/update/delete) call `invalidateCategoryCache()`, `cacheDel(sm:homepage)`, or `invalidateProductCaches()` respectively. Caching is fully optional and gracefully disabled when Redis is unavailable.

---

## 17. Environment Secrets Reference

| Secret | Required | Purpose |
|---|---|---|
| `NEON_DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Access token signing |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token signing |
| `SESSION_SECRET` | ✅ | Session middleware |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth server exchange |
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase client (FCM) |
| `VITE_FIREBASE_APP_ID` | ✅ | Firebase client (FCM) |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase client (FCM) |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase client (FCM) |
| `FIREBASE_CLIENT_EMAIL` | ✅ | FCM server-side push |
| `FIREBASE_PRIVATE_KEY` | ✅ | FCM server-side push |
| `IMAGEKIT_PUBLIC_KEY` | ✅ | Image upload auth |
| `IMAGEKIT_PRIVATE_KEY` | ✅ | Image upload auth |
| `IMAGEKIT_URL_ENDPOINT` | ✅ | ImageKit CDN base URL |
| `RAZORPAY_KEY_ID` | ✅ | Payment gateway |
| `RAZORPAY_KEY_SECRET` | ✅ | Payment gateway |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ | Webhook HMAC verification |
| `RESEND_API_KEY` | ✅ | Transactional emails (password reset) |
| `TWO_FACTOR_API_KEY` | ⚠️ Optional | OTP SMS (legacy path) |
| `SUPABASE_URL` | ⚠️ Optional | Supabase (kept for non-image uses) |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Optional | Supabase |
| `SUPABASE_ANON_KEY` | ⚠️ Optional | Supabase |
| `VAPID_PRIVATE_KEY` | ⚠️ Optional | Web-push (legacy, superseded by FCM) |
| `REDIS_URL` | ⚠️ Optional | Redis caching (disabled if absent) |

---

## 18. Non-Functional Requirements

| Requirement | Implementation |
|---|---|
| **Availability** | Neon serverless PostgreSQL (auto-scales); esbuild single-file deployment |
| **Security** | Helmet headers, CORS whitelist, JWT auth, UUID param validation, RBAC, HMAC webhook verification, rate limiting on all auth endpoints |
| **Performance** | Module-level 5-min in-memory cache on Home page fetches; optional Redis cache on products/categories/homepage; double-fetch prevention in global contexts |
| **Mobile** | PWA-ready (service worker, manifest); responsive Tailwind layout; Capacitor Android support (CORS whitelist includes `https://localhost`) |
| **Observability** | Pino structured logging on all requests; startup/shutdown events logged with metadata |
| **Data Integrity** | Stock auto-restored on order cancellation; commission auto-calculated on delivery; idempotent seed on startup |
| **Image Delivery** | All media served via ImageKit CDN (transformation + optimisation at edge) |

---

## 19. Known Gaps / Outstanding Items

| Item | Status | Notes |
|---|---|---|
| Redis caching | Code complete, inactive | Add `REDIS_URL` secret to activate — zero code changes needed |
| Razorpay keys | Potentially misconfigured | Verify `RAZORPAY_KEY_ID` is full `rzp_test_*` / `rzp_live_*` string |
| Review/rating system | Backend field exists (`rating` on shops/products), no customer-facing submit flow | Post-launch backlog |
| Order cancellation by customer | Status check exists but no dedicated cancel UI | Post-launch backlog |
| Vendor payout disbursement | Manual admin process (mark paid) | No bank transfer automation |
| Push notification topic subscriptions | Per-user FCM tokens only | No topic-based broadcast segmentation |
