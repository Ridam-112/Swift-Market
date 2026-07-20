# SwiftMart — Technical Requirements Document (TRD)

**Version:** 1.0  
**Date:** July 2026  
**Scope:** Full-stack hyperlocal commerce platform  

---

## 1. System Architecture Overview

SwiftMart is a monorepo containing three packages under `artifacts/`:

```
artifacts/
├── api-server/          Express 5 + Drizzle ORM + TypeScript (port 8080)
├── swiftmart/           React 18 + Vite 7 + TailwindCSS v4 (port 5000)
└── mockup-sandbox/      Vite component preview server (port 8081)
```

Package manager: **pnpm workspaces** with a shared catalog in the root `pnpm-workspace.yaml`.  
Build orchestration: `bash start.sh` — symlinks `@workspace/db`, runs esbuild, starts both servers sequentially.

---

## 2. Frontend Technical Stack

| Concern | Technology | Version |
|---|---|---|
| Framework | React | 18 (catalog) |
| Build tool | Vite | 7.3.6 |
| Language | TypeScript | strict mode |
| Styling | TailwindCSS | v4 (Vite plugin) |
| Routing | Wouter | catalog |
| State management | React Context + hooks | — |
| Animations | Framer Motion | catalog |
| Charts | Recharts | ^2.15.2 |
| Maps | Leaflet + React-Leaflet | ^1.9.4 / ^5.0.0 |
| Form handling | React Hook Form + Zod resolvers | ^7.55.0 |
| Toast notifications | Sonner | ^2.0.7 |
| Component library | Radix UI primitives | full suite |
| Icons | Lucide React | catalog |
| Push notifications | Firebase (FCM) | ^12.14.0 |
| Auth (Google) | `@codetrix-studio/capacitor-google-auth` | 3.4.0-rc.4 |
| SEO | react-helmet-async | ^3.0.0 |
| Image carousel | Embla Carousel React | ^8.6.0 |
| Date utilities | date-fns | ^3.6.0 |
| OTP input | input-otp | ^1.4.2 |
| Lottie animations | lottie-react | ^2.4.1 |

### 2.1 Vite Configuration
- `@vitejs/plugin-react` — React fast refresh
- `@tailwindcss/vite` — TailwindCSS v4 integration
- Path alias: `@` → `src/`, `@assets` → workspace assets
- `VITE_NEON_AUTH_URL` bridged from server env via `define`
- Dev-only plugins: `@replit/vite-plugin-runtime-error-modal`, `cartographer`, `devBanner`
- Server host: `0.0.0.0` (required for Replit proxy iframe)
- Port: `5000` (env-configurable via `PORT`)

### 2.2 TypeScript Configuration
- Strict mode enabled
- Path aliases via `tsconfig.json` matching Vite aliases
- Pre-existing non-blocking errors in `main.tsx` (unbuilt lib) and `Search.tsx` (string/number) — do not affect runtime

---

## 3. Backend Technical Stack

| Concern | Technology | Version |
|---|---|---|
| Runtime | Node.js | LTS |
| Framework | Express | ^5 |
| Language | TypeScript | strict mode |
| ORM | Drizzle ORM | catalog |
| Database driver | pg (node-postgres) | ^8.20.0 |
| Database | Neon PostgreSQL | serverless |
| Auth | jsonwebtoken + bcryptjs | ^9.0.2 / ^2.4.3 |
| Validation | Zod | catalog |
| Logging | Pino + pino-http | ^9 / ^10 |
| File uploads | Multer | ^2.2.0 |
| Image storage | ImageKit SDK | ^6.0.0 |
| Payments | Razorpay | ^2.9.6 |
| Email | Resend | ^6.16.0 |
| Push notifications | firebase-admin | ^14.0.0 |
| Web Push (legacy) | web-push | ^3.6.7 |
| Caching | ioredis | ^5.11.1 |
| HTTP security | Helmet | ^8.2.0 |
| CORS | cors | ^2 |
| Google OAuth | google-auth-library | ^10.6.2 |
| MIME handling | mime-types | ^3.0.2 |
| Cookie parsing | cookie-parser | ^1.4.7 |
| Bundler | esbuild | 0.28.1 |

### 3.1 Build Process
```
esbuild src/index.ts
  → dist/index.mjs              (~4.2 MB, all deps inlined)
  → dist/pino-worker.mjs        (~153 KB)
  → dist/pino-file.mjs          (~142 KB)
  → dist/pino-pretty.mjs        (~114 KB)
  → dist/thread-stream-worker.mjs (~7.4 KB)
  + *.map source maps
```
- `--bundle`, `--platform=node`, `--format=esm`, `--sourcemap`
- esbuild-plugin-pino handles Pino worker thread splitting
- `@workspace/db` symlinked before build via `start.sh`

### 3.2 Server Startup Sequence
```
1. validateEnv()          — fail-fast on missing required secrets; warn on optional
2. connectRedis()         — no-op if REDIS_URL absent
3. app.listen(PORT, "0.0.0.0")  — bind before seeds so health check passes
4. seedSuperAdmins()      — idempotent
5. seedShopTypes()        — idempotent
6. seedCategories()       — idempotent (18 categories)
7. clearDemoData()        — idempotent
8. cleanupAbandonedOrders() — marks stale in-progress orders
```
- `AUTH_MODE` env var: `"otp"` | `"google"` | `"both"` (default: `"otp"`)
- `OTP_MODE` env var: `"real"` | `"demo"` (demo logs OTP to console, skips 2Factor API)

### 3.3 Graceful Shutdown
```
SIGTERM received
  → disconnectRedis()
  → server.close()
  → process.exit(0)
```

---

## 4. Database

### 4.1 Provider
**Neon PostgreSQL** — serverless, HTTP-based connection pooling. SSL mode enforced (`sslmode=verify-full`).

### 4.2 ORM
**Drizzle ORM** with `@workspace/db` shared package containing all schema definitions.  
Migrations managed via Drizzle Kit (`drizzle.config.ts`).

### 4.3 Schema — Table Specifications

#### `users`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `name` | `text` | NOT NULL |
| `phone` | `text` | UNIQUE |
| `email` | `text` | UNIQUE |
| `password_hash` | `text` | nullable |
| `role` | `text` | NOT NULL, default `'customer'` |
| `status` | `text` | NOT NULL, default `'active'` |
| `pincode` | `text` | nullable |
| `addresses` | `jsonb` | default `'[]'` |
| `profile_photo` | `text` | nullable |
| `needs_password_setup` | `boolean` | default `false` |
| `vendor_status` | `text` | nullable |
| `fcm_tokens` | `text[]` | default `'{}'` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

#### `shops`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `owner_id` | `uuid` | FK → users.id, nullable |
| `shop_name` | `text` | NOT NULL |
| `owner_name` | `text` | NOT NULL |
| `shop_type` | `text` | NOT NULL |
| `phone` | `text` | NOT NULL |
| `address` | `jsonb` | `{line1, city, pincode}` |
| `image` | `text` | nullable (ImageKit URL) |
| `status` | `text` | `'pending'|'approved'|'rejected'|'suspended'|'banned'` |
| `is_open` | `boolean` | default `false` |
| `rating` | `numeric` | default `0` |
| `total_orders` | `integer` | default `0` |
| `total_revenue` | `numeric` | default `0` |
| `commission_rate` | `numeric` | default `5` |
| `eta` | `text` | nullable |
| `fssai_licence` | `text` | nullable |
| `certificate_file` | `text` | nullable (ImageKit URL) |
| `certificate_status` | `text` | `'pending'|'verified'|'rejected'` |
| `drug_licence` | `text` | nullable |
| `gstin` | `text` | nullable |
| `pan_number` | `text` | nullable |
| `bank_account_number` | `text` | nullable |
| `bank_ifsc_code` | `text` | nullable |
| `bank_account_holder_name` | `text` | nullable |
| `upi_id` | `text` | nullable |
| `rejection_reason` | `text` | nullable |
| `created_at` | `timestamptz` | default `now()` |

#### `products`
| Column | Type | Constraints |
|---|---|---|
| `id` | `text` | PK (NOT native UUID — do not cast to `::uuid`) |
| `shop_id` | `uuid` | FK → shops.id |
| `name` | `text` | NOT NULL |
| `category` | `text` | NOT NULL |
| `price` | `numeric` | NOT NULL |
| `discounted_price` | `numeric` | nullable |
| `unit` | `text` | default `'1 unit'` |
| `images` | `text[]` | default `'{}'` |
| `description` | `text` | nullable |
| `stock` | `integer` | default `0` |
| `status` | `text` | `'pending_approval'|'approved'|'rejected'` |
| `trending` | `boolean` | default `false` |
| `colors` | `jsonb` | nullable |
| `sizes` | `text[]` | nullable |
| `color_images` | `jsonb` | nullable |
| `rating` | `numeric` | default `0` |
| `shop_name` | `text` | nullable (denormalised) |
| `created_at` | `timestamptz` | default `now()` |

#### `orders`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `customer_id` | `uuid` | FK → users.id |
| `shop_id` | `uuid` | FK → shops.id |
| `delivery_partner_id` | `uuid` | FK → delivery_partners.id, nullable |
| `items` | `jsonb` | `[{name, qty, price, unit, productId}]` |
| `subtotal` | `numeric` | NOT NULL |
| `delivery_charge` | `numeric` | default `0` |
| `packaging_fee` | `numeric` | default `0` |
| `discount` | `numeric` | default `0` |
| `net_amount` | `numeric` | NOT NULL |
| `commission_amount` | `numeric` | default `0` |
| `status` | `text` | order status enum |
| `payment_method` | `text` | `'COD'|'online'` |
| `payment_status` | `text` | `'pending'|'paid'|'failed'|'refunded'` |
| `razorpay_order_id` | `text` | nullable |
| `razorpay_payment_id` | `text` | nullable |
| `delivery_otp` | `text` | 4-digit, nullable |
| `address` | `jsonb` | delivery address snapshot |
| `customer_name` | `text` | denormalised |
| `customer_phone` | `text` | denormalised |
| `shop_name` | `text` | denormalised |
| `shop_address` | `jsonb` | shop address snapshot |
| `coupon_code` | `text` | nullable |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

#### `delivery_partners`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → users.id, nullable |
| `name` | `text` | NOT NULL |
| `phone` | `text` | NOT NULL |
| `vehicle` | `text` | nullable |
| `is_available` | `boolean` | default `false` |
| `status` | `text` | `'pending'|'active'|'suspended'` |
| `total_earnings` | `numeric` | default `0` |
| `orders_delivered` | `integer` | default `0` |
| `current_order_id` | `uuid` | nullable |
| `current_lat` | `numeric` | nullable |
| `current_lon` | `numeric` | nullable |
| `location_updated_at` | `timestamptz` | nullable |

#### `notifications`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → users.id |
| `title` | `text` | NOT NULL |
| `body` | `text` | NOT NULL |
| `type` | `text` | `'order'|'promo'|'system'|'broadcast'` |
| `read` | `boolean` | default `false` |
| `data` | `jsonb` | nullable (metadata) |
| `created_at` | `timestamptz` | default `now()` |

#### `commissions`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `type` | `text` | `'percentage'|'fixed'` |
| `value` | `numeric` | NOT NULL |
| `applies_to` | `text` | `'shop'|'shop_type'|'global'` |
| `shop_id` | `uuid` | nullable |
| `shop_type` | `text` | nullable |

#### `payouts`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `vendor_id` | `uuid` | FK → shops.id |
| `amount` | `numeric` | NOT NULL |
| `status` | `text` | `'pending'|'paid'|'cancelled'` |
| `orders_included` | `uuid[]` | order IDs in this payout |
| `period_start` | `timestamptz` | nullable |
| `period_end` | `timestamptz` | nullable |
| `created_at` | `timestamptz` | default `now()` |

#### `coupons`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `code` | `text` | UNIQUE, NOT NULL |
| `type` | `text` | `'flat'|'percent'` |
| `value` | `numeric` | NOT NULL |
| `min_order_value` | `numeric` | default `0` |
| `max_uses` | `integer` | nullable (null = unlimited) |
| `used_count` | `integer` | default `0` |
| `expires_at` | `timestamptz` | nullable |
| `is_active` | `boolean` | default `true` |

#### `hero_banners`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `image_url` | `text` | NOT NULL (ImageKit) |
| `title` | `text` | nullable |
| `subtitle` | `text` | nullable |
| `button_text` | `text` | nullable |
| `redirect_type` | `text` | `'category'|'shop'|'product'|'internal'|'external'` |
| `redirect_value` | `text` | NOT NULL |
| `is_active` | `boolean` | default `true` |
| `sort_order` | `integer` | default `0` |

#### `homepage_sections`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `title` | `text` | NOT NULL |
| `type` | `text` | section type |
| `enabled` | `boolean` | default `true` |
| `sort_order` | `integer` | NOT NULL |
| `config` | `jsonb` | `{layout, limit, categorySlug, ...}` |

#### `buckets`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `title` | `text` | NOT NULL |
| `subtitle` | `text` | nullable |
| `badge_text` | `text` | nullable |
| `accent_color` | `text` | nullable |
| `combo_price` | `numeric` | nullable |
| `product_ids` | `uuid[]` | linked product IDs |
| `is_active` | `boolean` | default `true` |
| `sort_order` | `integer` | default `0` |

#### `service_pincodes`
| Column | Type | Constraints |
|---|---|---|
| `pincode` | `text` | PK |
| `label` | `text` | nullable |
| `is_active` | `boolean` | default `true` |

#### `categories`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | NOT NULL |
| `slug` | `text` | UNIQUE, NOT NULL |
| `emoji` | `text` | nullable |
| `color` | `text` | nullable |
| `sort_order` | `integer` | default `0` |

#### `shop_types`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | NOT NULL |
| `slug` | `text` | UNIQUE, NOT NULL |
| `is_active` | `boolean` | default `true` |

#### `reports`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `type` | `text` | `'shop'|'product'` |
| `target_id` | `text` | NOT NULL |
| `target_name` | `text` | NOT NULL |
| `reported_by` | `uuid` | FK → users.id |
| `reporter_phone` | `text` | NOT NULL |
| `reason` | `text` | NOT NULL |
| `description` | `text` | nullable |
| `status` | `text` | `'open'|'resolved'|'ignored'` |
| `created_at` | `timestamptz` | default `now()` |

#### `support_tickets`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → users.id |
| `subject` | `text` | NOT NULL |
| `message` | `text` | NOT NULL |
| `status` | `text` | `'open'|'resolved'|'closed'` |
| `created_at` | `timestamptz` | default `now()` |

---

## 5. API Specification

### 5.1 Base URL
- Development: `http://localhost:8080/api`
- Production: `https://<domain>/api`

### 5.2 Authentication
All protected endpoints require:
```
Authorization: Bearer <access_token>
```
Tokens issued at login/signup. Refresh via `POST /auth/refresh`.

### 5.3 Response Envelope
All responses follow:
```json
{
  "success": true | false,
  "<resource>": { ... }   // or array
}
```
Errors:
```json
{
  "success": false,
  "error": "Human-readable message"
}
```

### 5.4 Complete Route Inventory

#### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/config` | Public | Returns enabled auth methods & Google client ID |
| POST | `/check-phone` | Public | Check if phone exists + has password |
| POST | `/signup` | Public | Phone + password signup |
| POST | `/login` | Public | Phone + password login |
| POST | `/set-password` | Public | Set password for OTP-migrated user |
| POST | `/forgot-password` | Public | Request password reset (phone) |
| POST | `/reset-password` | Public | Reset password with token (phone) |
| POST | `/check-email` | Public | Check if email exists |
| POST | `/email-signup` | Public | Email + password signup |
| POST | `/email-login` | Public | Email + password login |
| POST | `/email-forgot-password` | Public | Request password reset (email → Resend) |
| POST | `/email-reset-password` | Public | Reset password with token (email) |
| POST | `/google` | Public | Google Sign-In with ID token |
| GET | `/google/redirect` | Public | OAuth2 redirect initiation |
| POST | `/google/exchange` | Public | OAuth2 code exchange |
| POST | `/neon-bridge` | Public | Neon Auth JWT bridge |
| POST | `/complete-profile` | Auth | Complete profile after social login |
| POST | `/refresh` | Public | Refresh access token |
| GET | `/me` | Auth | Get current user profile |
| POST | `/logout` | Auth | Invalidate session |

#### Shops (`/api/shops`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Optional | List shops (filterable by status, pincode, type) |
| GET | `/:id` | Optional | Get single shop |
| GET | `/:id/details` | Admin | Full shop details with financials |
| POST | `/` | Auth | Create shop (vendor registration) |
| POST | `/admin-create` | Admin | Admin-create shop bypassing registration |
| PATCH | `/my/profile` | Auth | Update own shop profile |
| PATCH | `/my/toggle-open` | Auth | Toggle own shop open/closed |
| PATCH | `/my/certificate` | Auth | Re-upload compliance certificate |
| POST | `/:id/verify` | Admin | Verify shop compliance certificate |
| POST | `/:id/reject-certificate` | Admin | Reject compliance certificate |
| POST | `/:id/approve` | Admin | Approve shop |
| POST | `/:id/reject` | Admin | Reject shop with reason |
| POST | `/:id/ban` | Admin | Ban shop |
| POST | `/:id/unban` | Admin | Unban shop |
| PATCH | `/:id` | Admin | Update any shop field |
| PATCH | `/:id/toggle-open` | Admin | Admin toggle shop open/closed |
| PATCH | `/:id/owner` | Admin | Update shop owner |
| PATCH | `/:id/link-owner` | Admin | Link existing user as owner |
| DELETE | `/:id` | Admin | Delete shop |

#### Products (`/api/products`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Optional | List products (paginated, filterable) |
| GET | `/admin-review` | Admin | Products pending approval |
| GET | `/trending-manager` | Admin | Trending products management view |
| GET | `/:id` | Optional | Get single product |
| POST | `/` | Vendor | Create product (enters pending_approval) |
| PATCH | `/:id/approval` | Admin | Approve or reject product |
| PATCH | `/:id` | Vendor | Update own product |
| DELETE | `/:id` | Admin | Delete product |

**Query params for `GET /`:** `limit`, `offset`, `category`, `shopId`, `status`, `search`, `trending`, `sort`

#### Orders (`/api/orders`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Auth | Customer's own orders / Admin all orders |
| GET | `/:id` | Auth | Get single order |
| GET | `/:id/rider-location` | Auth | Current rider GPS for live tracking |
| POST | `/` | Auth | Place new order |
| PATCH | `/:id/status` | Auth | Update order status (role-gated) |
| PATCH | `/:id/assign-partner` | Admin | Assign delivery partner to order |
| POST | `/:id/refund` | Admin | Initiate refund |

#### Payments (`/api/payments`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/create-order` | Auth | Create Razorpay order |
| POST | `/verify` | Auth | Verify payment signature |
| POST | `/webhook` | Public (HMAC) | Razorpay webhook handler |

#### Delivery (`/api/delivery`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Admin | All delivery partners |
| POST | `/` | Admin | Create delivery partner |
| PATCH | `/:id` | Admin | Update delivery partner |
| POST | `/:id/link-user` | Admin | Link partner to user account |
| GET | `/charges` | Public | Get delivery charge tiers |
| GET | `/charges/calculate` | Public | Calculate charge for order |
| POST | `/charges` | Admin | Create charge tier |
| PATCH | `/charges/:id` | Admin | Update charge tier |
| DELETE | `/charges/:id` | Admin | Delete charge tier |
| POST | `/rain-mode` | Admin | Toggle rain mode surcharge |
| GET | `/fleet` | Admin | All riders with GPS coordinates |
| GET | `/me` | Auth | Own delivery partner profile |
| PATCH | `/me/location` | Auth | Push GPS coordinates |
| PATCH | `/me/availability` | Auth | Toggle availability |
| GET | `/me/orders` | Auth | Own assigned orders + partner profile |
| PATCH | `/me/orders/:orderId/status` | Auth | Update order status (pickup) |
| POST | `/me/orders/:orderId/verify-otp` | Auth | Verify delivery OTP |
| PATCH | `/me/orders/:orderId/confirm-payment` | Auth | Confirm COD cash collected |

#### Users (`/api/users`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Admin | All customers (paginated) |
| PATCH | `/:id/ban` | Admin | Ban user |
| PATCH | `/:id/unban` | Admin | Unban user |
| POST | `/:id/send-setup-email` | Admin | Send account setup email |
| GET | `/me/profile` | Auth | Get own full profile |
| PATCH | `/me/profile` | Auth | Update own profile (name, phone, pincode, addresses) |

#### Admin (`/api/admin`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/stats` | Admin | Platform-wide stats |
| GET | `/user-signups` | Admin | Signup time-series data |
| GET | `/admins` | Super Admin | List admin accounts |
| POST | `/admins` | Super Admin | Create admin account |
| PATCH | `/admins/:id` | Super Admin | Update admin account |
| DELETE | `/admins/:id` | Super Admin | Delete admin account |

#### Notifications (`/api/notifications`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Auth | Own notifications (paginated) |
| PATCH | `/read-all` | Auth | Mark all as read |
| PATCH | `/:id/read` | Auth | Mark single notification as read |
| POST | `/broadcast` | Admin | Broadcast to all users / role |
| GET | `/broadcasts` | Admin | Broadcast history |
| POST | `/admin/cleanup` | Admin | Delete old notifications |

#### Commissions (`/api/commissions`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Admin | All commission rules |
| POST | `/` | Admin | Create rule |
| PATCH | `/:id` | Admin | Update rule |
| DELETE | `/:id` | Admin | Delete rule |

#### Payouts (`/api/payouts`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Admin | All payouts |
| GET | `/my` | Auth | Own vendor payouts |
| PATCH | `/:id/status` | Admin | Update payout status (mark paid) |

#### Coupons (`/api/coupons`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Admin | All coupons |
| POST | `/validate` | Auth | Validate coupon at checkout |
| POST | `/` | Admin | Create coupon |
| PATCH | `/:id` | Admin | Update coupon |
| DELETE | `/:id` | Admin | Delete coupon |

#### Hero Banners (`/api/hero-banners`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | Active banners (ordered) |
| POST | `/` | Admin | Upload new banner |
| PATCH | `/reorder` | Admin | Reorder banners |
| PATCH | `/:id` | Admin | Update banner |
| DELETE | `/:id` | Admin | Delete banner |

#### Homepage Sections (`/api/homepage-sections`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | All enabled sections with resolved products |
| POST | `/` | Admin | Create section |
| PATCH | `/reorder` | Admin | Reorder sections |
| PATCH | `/:id` | Admin | Update section config |
| DELETE | `/:id` | Admin | Delete section |

#### Buckets (`/api/buckets`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | Active buckets with products |
| POST | `/` | Admin | Create bucket |
| PATCH | `/:id` | Admin | Update bucket |
| DELETE | `/:id` | Admin | Delete bucket |

#### Categories (`/api/categories`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | All categories |
| POST | `/` | Admin | Create category |
| PATCH | `/:id` | Admin | Update category |
| DELETE | `/:id` | Admin | Delete category |

#### Shop Types (`/api/shop-types`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | All shop types |
| GET | `/active` | Public | Active shop types only |
| POST | `/` | Admin | Create shop type |
| PATCH | `/:id` | Admin | Update shop type |
| DELETE | `/:id` | Admin | Delete shop type |

#### Service Pincodes (`/api/service-pincodes`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Admin | All service pincodes |
| POST | `/` | Admin | Add pincode |
| PATCH | `/:pincode` | Admin | Update pincode |
| DELETE | `/:pincode` | Admin | Remove pincode |

#### Analytics (`/api/analytics`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Admin | Platform analytics (revenue, orders, time-series) |

#### Upload (`/api/upload`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/product-image` | Auth | Upload product image → ImageKit |
| POST | `/shop-image` | Auth | Upload shop/logo image → ImageKit |
| POST | `/banner-image` | Admin | Upload hero banner → ImageKit |
| POST | `/certificate` | Auth | Upload compliance doc → ImageKit |

#### Other
| Path | Description |
|---|---|
| `GET /api/reports` | Admin: all reports |
| `POST /api/reports` | Auth: submit report |
| `PATCH /api/reports/:id/resolve` | Admin |
| `PATCH /api/reports/:id/ignore` | Admin |
| `POST /api/support` | Auth: submit ticket |
| `GET /api/support/mine` | Auth: own tickets |
| `GET /api/support` | Admin: all tickets |
| `PATCH /api/support/:id/resolve` | Admin |
| `PATCH /api/support/:id/close` | Admin |
| `POST /api/fcm/register-token` | Auth: register FCM device token |
| `POST /api/push/subscribe` | Auth: VAPID push subscribe (legacy) |
| `GET /health` | Public: health check |

---

## 6. Security Architecture

### 6.1 Authentication
- **JWT access tokens:** Short-lived, signed with `JWT_SECRET`
- **Refresh tokens:** Long-lived, signed with `JWT_REFRESH_SECRET`, stored server-side
- **Password hashing:** bcryptjs (salt rounds: 10)
- **Google OAuth:** Server-side code exchange only — no client-side token trust

### 6.2 Authorisation
Four middleware guards layered on routes:
- `authenticate` — verifies JWT, attaches `req.user`
- `optionalAuth` — attaches user if token present, proceeds unauthenticated if absent
- `A` — requires `role IN ('admin', 'super_admin')`
- `SA` — requires `role = 'super_admin'`
- `V` — requires `role = 'vendor'`

### 6.3 Input Validation
- `validateUuidParams(...params)` middleware — rejects non-UUID route params with 400 before handler runs
- Zod schemas on all request bodies via `@workspace/api-zod`
- MIME type validation on file uploads (multer + mime-types)

### 6.4 Rate Limiting (`express-rate-limit`)
| Limiter | Applies To | Window / Limit |
|---|---|---|
| `loginLimiter` | POST /auth/login, /auth/check-phone, /auth/check-email, /auth/email-login | 15 min / 20 |
| `signupLimiter` | POST /auth/signup, /auth/email-signup | 1 hr / 10 |
| `resetPasswordLimiter` | POST /auth/forgot-password, /auth/email-forgot-password | 1 hr / 5 |
| `googleAuthLimiter` | POST /auth/google, /auth/google/exchange | 15 min / 30 |
| `tokenRefreshLimiter` | POST /auth/refresh | 15 min / 60 |
| `couponValidateLimiter` | POST /coupons/validate | 5 min / 30 |
| `orderLimiter` | POST /orders | 10 min / 5 |
| `vendorWriteLimiter` | POST/PATCH /products, PATCH /shops | 1 min / 10 |

### 6.5 HTTP Security (Helmet)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS)
- Content-Security-Policy
- `X-XSS-Protection`

### 6.6 CORS
- Explicit origin whitelist in production (includes `https://localhost` for Capacitor APK)
- Permissive in development

### 6.7 Webhook Verification
Razorpay webhook: HMAC-SHA256 signature verified against `RAZORPAY_WEBHOOK_SECRET` before processing

---

## 7. External Service Integrations

| Service | Purpose | Secrets Required |
|---|---|---|
| **Neon PostgreSQL** | Primary database | `DATABASE_URL` |
| **ImageKit** | Image CDN + storage | `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` |
| **Razorpay** | Online payments | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| **Firebase Admin** | FCM server-side push | `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` |
| **Firebase Client** | FCM token registration | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_STORAGE_BUCKET` |
| **Resend** | Transactional email | `RESEND_API_KEY` |
| **Google OAuth** | Social sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **2Factor (optional)** | OTP SMS delivery | `TWO_FACTOR_API_KEY` |
| **Redis/Upstash (optional)** | Response caching | `REDIS_URL` |
| **Supabase (legacy)** | Non-image storage | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` |
| **Leaflet + Carto** | Map tiles (no API key) | — |
| **OSRM (public)** | Route calculation | — |

---

## 8. Caching Strategy

### 8.1 Server-Side (Redis — optional)
| Cache Key | TTL | Invalidated By |
|---|---|---|
| `sm:categories` | 30 min | POST/PATCH/DELETE /categories |
| `sm:homepage` | 5 min | POST/PATCH/DELETE /homepage-sections, product writes |
| `sm:products:{sortedQueryJSON}` | 5 min | POST/PATCH/DELETE /products, product approval |

Pattern deletion uses Redis `SCAN` (never `KEYS`) — safe for production workloads.

### 8.2 Client-Side (Module Memory)
| Data | TTL | Component |
|---|---|---|
| Categories list | 5 min | `Home.tsx` (`_categoriesCache`) |
| Homepage sections | 5 min | `Home.tsx` (`_sectionsCache`) |
| Hero banners | 5 min | `HeroBannerSlider.tsx` (`_bannersCache`) |
| Bucket bundles | 5 min | `BucketBanner.tsx` (`_bucketsCache`) |

### 8.3 Context-Level (React)
- `ProductsContext` — holds up to 1000 products; bg interval 60s; visibility-change refetch if >30s stale; double-fetch prevented via `prevUserIdRef`
- `ShopsContext` — same pattern; holds all approved shops

---

## 9. Performance Characteristics

| Metric | Behaviour |
|---|---|
| Initial API server bundle | ~4.2 MB (all deps inlined via esbuild) |
| First meaningful paint | Context mounts + auth resolves → single products+shops fetch |
| Home page (repeat visit) | Zero network calls for categories, sections, banners, buckets (module cache) |
| Delivery dashboard polling | 15s interval (~4 calls/min per active rider) |
| GPS push frequency | Every GPS update when `watchPosition` fires (maximumAge: 3000ms) |
| Razorpay webhook | Async; does not block order creation |

---

## 10. Deployment Configuration

| Env Var | Default | Notes |
|---|---|---|
| `PORT` | `10000` | Overridden by platform (Render injects at runtime) |
| `NODE_ENV` | `development` | Set to `production` in deployment |
| `AUTH_MODE` | `"otp"` | `"otp" | "google" | "both"` |
| `OTP_MODE` | `"demo"` | Set to `"real"` in production |
| `DATABASE_URL` | — | Required; must include `sslmode=verify-full` |
| `BASE_PATH` | `"/"` | Vite base path for sub-directory deployments |

**Android (Capacitor):** CORS must include `https://localhost` — Android WebView sends this as the origin. Already whitelisted in production CORS config.

---

## 11. Known Technical Debt & Constraints

| Item | Detail |
|---|---|
| `products.id` type | Column is `text`, not PostgreSQL native UUID. Do not cast to `::uuid` in raw SQL |
| Pre-existing TS errors | `src/main.tsx` (unbuilt lib), `src/pages/Search.tsx` (string/number) — non-blocking |
| `products.certificate_file` | Column naming: `certificate_file`, not `fssai_doc_url` (migration artefact) |
| Redis inactive | Code complete; awaiting `REDIS_URL` secret to activate |
| Razorpay key length | Verify `RAZORPAY_KEY_ID` is the full `rzp_test_*` / `rzp_live_*` string |
| `web-push` (VAPID) | Retained as dependency; superseded by FCM for push notifications |
| `api.delete` body | Axios `delete` with request body requires explicit config — existing workaround in place |
