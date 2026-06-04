---
name: Commission & Payout system
description: How commission rules, payout creation, and admin management tabs work in SwiftMart
---

## Commission Rules (`CommissionRule` model)
- Levels: `global` → `shop_type` → `category` → `vendor` → `product` (higher specificity wins)
- Field `type`: `"percentage"` (rate = 0–100) or `"fixed"` (rate = rupee amount); default `"percentage"`
- `resolveCommission()` in `utils/commission.ts` returns `{ rate, type, level }` — use `calculateCommissionAmount(netAmount, resolved)` for the rupee value
- Backward-compat shim: `resolveCommissionRate()` returns just the number

## Payout auto-creation
- `POST /api/orders` now creates a `Payout` record immediately after order creation (non-fatal, wrapped in try/catch)
- Fields: `vendorId`, `vendorName`, `shopId`, `amount` (= `vendorPayable`), `status: "pending"`, `ordersIncluded: [orderId]`
- Admin can mark payouts as `processing` → `paid` or `failed` via `PATCH /api/payouts/:id/status`

## Admin tabs added
- **Commissions** (`/commissions`): full CRUD for commission rules — level picker, type (% vs fixed), targetId/targetName, rate, isActive toggle
- **Shop Types** (`/shop-types`): toggle `isActive`, inline-edit `commissionRate`, create/delete shop types
- **Payouts** (`/payouts`): filterable by status, summary cards (pending/paid totals), mark processing/paid/failed with optional notes

## Categories
- `GET /api/categories` — active only (vendor + customer use)
- `GET /api/categories/all` — all including inactive (admin only, requires auth + admin role)
- Vendor product forms (`AddProduct`, `EditProduct`) now fetch from API instead of static file; use `slug` as category value

**Why:** Static categories couldn't reflect admin enable/disable; commission resolution needed percentage vs fixed to support flat-fee tiers.
