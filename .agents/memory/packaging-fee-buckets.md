---
name: Packaging fee & bucket packages
description: Flat packaging fee accounting split and bucket (curated bundle) feature design for SwiftMart
---

**Packaging fee**: flat ₹6, computed server-side only (`PACKAGING_FEE` constant in orders.ts route), never trusted from client. Added to `netAmount` alongside `deliveryCharge`, but excluded from `vendorPayable` — it flows entirely into `platformRevenue` instead, since packaging is a platform cost, not something the vendor should be paid for. Applied per shop-order (like delivery fee — not split across a multi-shop cart).

**Why:** packaging materials are provided/paid for by the platform, not the vendor, so crediting it to vendorPayable would overpay vendors relative to actual cost sharing.

**Buckets feature**: `buckets` DB table (`lib/db/src/schema/buckets.ts`) — admin-curated product bundles with `productIds` (manual picks), `showOnHomepage` and `showAsAddon` boolean flags, `badgeText`/`accentColor` for attention-seeker styling, `sortOrder`. One table serves both the homepage highlight banner and the cart upsell strip via query flags, rather than two separate tables — keeps admin curation in one place per bundle.

**How to apply:** when adding new "curated product group" features, check whether they can reuse the buckets table (adding a new boolean placement flag) before creating a new table — mirrors how `homepageSections` already works for admin-driven curation.
