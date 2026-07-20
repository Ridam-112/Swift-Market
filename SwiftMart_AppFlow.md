# SwiftMart — App Flow Document

**Version:** 1.0  
**Date:** July 2026  

This document maps every user journey through the SwiftMart platform — entry points, decision trees, transitions, and terminal states — for all four actor types.

---

## 1. App Entry & Auth Gate

```
App Load (/)
    │
    ├─ Token in localStorage? ──YES──► Validate token (GET /auth/me)
    │                                       │
    │                                  Valid? ──YES──► Restore session → Home
    │                                       │
    │                                       NO ──► Try refresh token
    │                                                   │
    │                                              Success? ──YES──► Restore session → Home
    │                                                   │
    │                                                   NO ──► Clear tokens → /auth
    │
    └─ No token ──────────────────────────────────────► /auth (unauthenticated)
```

---

## 2. Authentication Flows

### 2.1 Phone + Password Login
```
/auth
  │
  ├─ Enter phone number
  │       │
  │   POST /auth/check-phone
  │       │
  │   ┌───┴───────────────────────────────┐
  │   │                                   │
  │  exists=true                      exists=false
  │   │                                   │
  │  hasPassword=true?                  Show signup form
  │   │                                   │
  │  YES → Enter password             POST /auth/signup
  │         │                             │
  │     POST /auth/login           needsProfile? ──YES──► /complete-profile
  │         │                             │
  │     Success → JWT issued             NO → Home
  │         │
  │   needsPasswordSetup=true? ──YES──► Prompt set password
  │         │                                 │
  │         NO                         POST /auth/set-password
  │         │                                 │
  │       Home ◄─────────────────────────────┘
  │
  └─ User taps "Forgot password"
            │
        Enter phone → POST /auth/forgot-password
            │
        Token sent → Enter token + new password
            │
        POST /auth/reset-password → Login
```

### 2.2 Email + Password
```
/auth (Email tab)
  │
  ├─ POST /auth/check-email
  │       │
  │   exists? ──YES──► Enter password → POST /auth/email-login → Home
  │           │
  │           NO ──► Enter name + password → POST /auth/email-signup
  │                       │
  │               needsProfile? ──YES──► /complete-profile
  │                       │
  │                       NO → Home
  │
  └─ Forgot password → POST /auth/email-forgot-password
            │
        Email sent (Resend) → Token link → /reset-password?token=
            │
        POST /auth/email-reset-password → /auth
```

### 2.3 Google OAuth
```
/auth (Google button)
  │
  GET /auth/google/redirect
  │
  Google OAuth2 consent screen
  │
  Redirect → /google-callback?code=
  │
  POST /auth/google/exchange
  │
  ┌──────────────────────────────────┐
  │                                  │
  isNewUser=true                 isNewUser=false
  │                                  │
  needsProfile? ──YES──► /complete-profile    Home
  │
  NO → Home
```

### 2.4 Profile Completion
```
/complete-profile
  │
  Enter: name, phone, delivery address, pincode
  │
  POST /auth/complete-profile
  │
  ─► Home
```

---

## 3. Customer Flows

### 3.1 Home Page
```
Home (/)
  │
  ├─ Hero banner tap ──► category / shop / product / URL (per redirect_type)
  ├─ Bucket bundle tap ──► /product/:id (per linked product)
  ├─ Category bubble tap ──► /category/:slug
  ├─ "Shop by Category → See more" ──► /categories
  ├─ Shop card tap ──► /shop/:vendorId
  ├─ "Popular Shops → See more" ──► /shops
  ├─ Section product card tap ──► /product/:id
  ├─ Section "See all" / "See more" ──► /section/:id
  ├─ Grocery mini-banner tap ──► /grocery
  └─ Search bar (mobile) tap ──► SearchOverlay (full-screen)
```

### 3.2 Product Discovery
```
/shops  (All Shops)
  │
  Browse / filter by category, pincode
  │
  Shop card tap ──► /shop/:vendorId
                          │
                     Product grid (shop's approved products)
                          │
                     Product card tap ──► /product/:id


/search
  │
  Type query (1200ms debounce saves to history)
  │
  Results filtered from global products cache
  │
  Product tap ──► /product/:id


/category/:slug
  │
  All products in category
  │
  Product card tap ──► /product/:id
```

### 3.3 Product Detail & Add to Cart
```
/product/:id
  │
  ├─ Load: check global products cache (1000 items)
  │         │
  │     Found? ──YES──► Render immediately
  │         │
  │         NO (global loading done) ──► GET /products/:id (direct fetch)
  │
  ├─ Select color variant (if available) → updates displayed image
  ├─ Select size variant (if available)
  ├─ Select weight (if weight-based unit)
  │
  ├─ Add to Cart button
  │       │
  │   Cart item created / qty incremented (CartContext + localStorage)
  │
  └─ Related products grid → /product/:id
```

### 3.4 Cart
```
/cart
  │
  ├─ Line items: qty stepper, weight selector, remove
  ├─ Addon suggestions from bucket packages
  │
  ├─ Cart empty? ──YES──► "Shop now" → Home
  │
  └─ Proceed to Checkout ──► /checkout
```

### 3.5 Checkout & Payment
```
/checkout
  │
  ├─ Select / add delivery address
  │       │
  │   Pincode validated against service_pincodes
  │       │
  │   Not serviceable? ──► Show "Delivery not available" warning
  │
  ├─ Apply coupon (optional)
  │       │
  │   POST /coupons/validate
  │       │
  │   Invalid? ──► Show error, clear coupon field
  │
  ├─ Review order summary (items, charges, discount, total)
  │
  ├─ Select payment method
  │       │
  │   ┌───┴───────────────────────┐
  │   │                           │
  │  COD                     Razorpay Online
  │   │                           │
  │ POST /orders            POST /payments/create-order
  │   │                           │
  │ Order created          Razorpay JS SDK modal
  │   │                           │
  │ /order-success         Payment success?
  │                               │
  │                    YES ──► POST /payments/verify
  │                               │
  │                          Order created → /order-success
  │                               │
  │                     NO ──► Show payment failed toast
  │                               │
  │                          Retry or change method
  │
  └─ /order-success
```

### 3.6 Order Tracking
```
/orders
  │
  Order list → tap order
  │
  Order detail:
  │
  ├─ Status: placed / accepted / preparing / packed
  │       │
  │   Delivery OTP not shown yet
  │
  ├─ Status: out_for_delivery
  │       │
  │   ┌── Delivery OTP shown to customer (4-digit)
  │   └── "Track Rider" button
  │               │
  │         LiveOrderTracker (Leaflet map)
  │               │
  │         GET /orders/:id/rider-location (polled)
  │               │
  │         Pulsing 🛵 on map + blue OSRM route line
  │
  └─ Status: delivered
          │
      Order history entry
      │
      COD? ──► Payment status shows "Collected" after rider confirms
```

### 3.7 Profile Management
```
/profile
  │
  ├─ Edit name / phone / email / pincode → PATCH /users/me/profile
  │
  ├─ Addresses
  │       │
  │   ├─ Add address → AddressForm → saved to user.addresses
  │   ├─ Edit address
  │   └─ Delete address
  │
  ├─ Orders ──► /orders
  ├─ Notifications ──► /notifications
  │
  ├─ Become a Vendor?
  │       │
  │   Not a vendor ──► /vendor-register
  │   Vendor pending ──► /vendor-status
  │   Vendor approved ──► /vendor/dashboard
  │
  ├─ Delivery Partner ──► /delivery/dashboard (if active partner)
  │
  └─ Logout → clear tokens → /auth
```

### 3.8 Notifications
```
/notifications
  │
  Notification list (GET /notifications)
  │
  ├─ Tap notification ──► navigate to relevant order/page
  ├─ Mark all read ──► PATCH /notifications/read-all
  └─ Mark single read ──► PATCH /notifications/:id/read
```

---

## 4. Vendor Flows

### 4.1 Vendor Registration
```
/vendor-register
  │
  Multi-step form:
  ├─ Step 1: Shop details (name, type, city, pincode, phone)
  ├─ Step 2: Legal (GSTIN, FSSAI, Drug Licence)
  ├─ Step 3: Banking (account number, IFSC, holder name, UPI ID, PAN)
  ├─ Step 4: Logo upload (mandatory) → POST /upload/shop-image → ImageKit
  └─ Step 5: Compliance docs upload → POST /upload/certificate → ImageKit
  │
  POST /shops (creates shop with status=pending)
  │
  ──► /vendor-status (waiting for admin approval)
```

### 4.2 Vendor Status Screen
```
/vendor-status
  │
  ├─ Status = pending ──► "Under review" message
  ├─ Status = rejected ──► Show rejection reason + re-apply option
  └─ Status = approved ──► Auto-redirect to /vendor/dashboard
```

### 4.3 Vendor Dashboard
```
/vendor/dashboard
  │
  Stats (fetched on mount):
  ├─ GET /orders (own shop orders) → revenue + order counts
  ├─ GET /products (own products) → product count
  └─ GET /payouts/my → payout history
  │
  Revenue chart (7d / 30d toggle) → Recharts bar chart
  │
  Quick nav:
  ├─ Products ──► /vendor/products
  ├─ Orders ──► /vendor/orders
  ├─ Shop Profile ──► /vendor/shop-profile
  └─ Payouts section
```

### 4.4 Product Management
```
/vendor/products
  │
  Product list (own shop, all statuses)
  │
  ├─ "Add Product" ──► /vendor/products/add
  │
  └─ Product card actions:
          ├─ Edit ──► /vendor/products/:id/edit
          ├─ Toggle stock
          └─ Status badge (pending/approved/rejected)


/vendor/products/add  OR  /vendor/products/:id/edit
  │
  Form:
  ├─ Name, category, price, discounted price, unit, stock, description
  ├─ Images: upload up to N → POST /upload/product-image (each) → ImageKit URLs
  ├─ Colors: add named swatches + per-color image uploads
  └─ Sizes: add size text options
  │
  POST /products (new) or PATCH /products/:id (edit)
  │
  New products → status=pending_approval → awaits admin review
  Edits → visible immediately (if already approved)
```

### 4.5 Vendor Orders
```
/vendor/orders
  │
  Order list (own shop, filterable by status)
  │
  Active order card:
  ├─ Status: placed
  │       │
  │   "Accept" button → PATCH /orders/:id/status {status: "accepted"}
  │
  ├─ Status: accepted
  │       │
  │   "Start Preparing" → PATCH → preparing
  │
  ├─ Status: preparing
  │       │
  │   "Pack Order" → PATCH → packed
  │                         │
  │                   Admin assigns delivery partner
  │
  └─ Status: out_for_delivery / delivered (read-only for vendor)
```

### 4.6 Shop Profile
```
/vendor/shop-profile
  │
  ├─ Edit: name, description, address, phone, ETA
  │       │
  │   PATCH /shops/my/profile
  │
  ├─ Logo update → POST /upload/shop-image → PATCH /shops/my/profile
  │
  ├─ Certificate status = rejected?
  │       │
  │   Re-upload → POST /upload/certificate
  │             → PATCH /shops/my/certificate
  │
  └─ Toggle open/closed → PATCH /shops/my/toggle-open
```

---

## 5. Delivery Partner Flows

### 5.1 Dashboard Entry
```
/delivery/dashboard
  │
  DeliveryGuard: checks auth + delivery partner status
  │
  GET /delivery/me/orders (on mount + every 15s)
  │
  Returns: partner profile + assigned orders
  │
  ├─ partner.status = pending ──► "Account pending approval" state
  ├─ partner.status = suspended ──► "Account suspended" banner
  └─ partner.status = active ──► Full dashboard
```

### 5.2 Location Permission Flow
```
Dashboard mounts
  │
  Check navigator.permissions.query({name: "geolocation"})
  │
  ├─ granted ──► Start watching immediately (when active orders present)
  ├─ prompt ──► Show "Allow location" banner
  │                   │
  │               User taps "Allow" → browser permission dialog
  │                   │
  │               Granted → start watchPosition
  └─ denied ──► Show "Location blocked" banner with instructions
```

### 5.3 GPS Sharing
```
Order status = out_for_delivery
  │
  navigator.geolocation.watchPosition starts
  │
  Each position update:
  │
  PATCH /delivery/me/location {lat, lon}
  │
  (Customer side polls GET /orders/:id/rider-location every 10s)
  │
  Order delivered / no more active orders
  │
  navigator.geolocation.clearWatch()
  │
  GPS sharing stops
```

### 5.4 Order Lifecycle (Rider)
```
Order appears in dashboard (status: packed/confirmed/accepted/preparing)
  │
  Rider taps "Map" ──► DeliveryMapSheet opens
  │                         │
  │                    Leaflet map: shop → delivery address
  │                    OSRM blue route line
  │
  Rider taps "Picked Up" (from card OR from map)
  │
  PATCH /delivery/me/orders/:orderId/status {status: "out_for_delivery"}
  │
  GPS sharing begins → customer can see live position
  │
  Rider arrives at delivery address
  │
  Rider taps "Enter OTP"
  │
  4-digit input dialog:
  ├─ COD order? ──► Checkbox: "I collected ₹X cash"
  │
  POST /delivery/me/orders/:orderId/verify-otp {otp, confirmCash}
  │
  ├─ OTP incorrect ──► "Incorrect OTP" toast, retry
  │
  └─ OTP correct:
          │
      Order → delivered
      GPS sharing stops
      │
      COD + cash NOT confirmed?
          │
      "Confirm Cash Collected" button appears on order card
          │
      PATCH /delivery/me/orders/:orderId/confirm-payment
          │
      paymentStatus → paid
```

### 5.5 Availability Toggle
```
Overview tab → Availability toggle
  │
  PATCH /delivery/me/availability
  │
  ├─ isAvailable: true → "You are now Online" toast
  └─ isAvailable: false → "You are now Offline" toast
```

---

## 6. Admin Flows

### 6.1 Admin Entry
```
/admin
  │
  AdminGuard: role must be 'admin' or 'super_admin'
  │
  Default section: overview
  │
  Sidebar navigation → 20 sections
```

### 6.2 Shop Request Processing
```
Admin → "Shop Requests" tab
  │
  List of pending shops
  │
  Click shop ──► ShopDetailsPanel (full info + docs)
  │
  ├─ "Approve" ──► POST /shops/:id/approve
  │                     │
  │               Shop status = approved
  │               Owner notified (FCM push if token registered)
  │
  └─ "Reject" ──► Enter rejection reason → POST /shops/:id/reject
                       │
                  Shop status = rejected
                  Owner notified
```

### 6.3 Product Approval
```
Admin → "Product Approvals" tab
  │
  List of pending_approval products
  │
  ├─ "Approve" ──► PATCH /products/:id/approval {status: "approved"}
  │                     │
  │               Product visible to customers
  │
  └─ "Reject" ──► PATCH /products/:id/approval {status: "rejected"}
                       │
                  Vendor notified
```

### 6.4 Order Management
```
Admin → "Orders" tab
  │
  All platform orders, filterable by status
  │
  Order card actions:
  ├─ PATCH /orders/:id/status (force any status)
  ├─ PATCH /orders/:id/assign-partner {partnerId}
  └─ POST /orders/:id/refund
```

### 6.5 Homepage Curation
```
Admin → "Hero Banners" tab
  │
  ├─ Upload image → POST /upload/banner-image → ImageKit URL
  ├─ Fill title, subtitle, CTA text, redirect type + value
  ├─ POST /hero-banners
  ├─ Reorder: PATCH /hero-banners/reorder
  └─ Delete: DELETE /hero-banners/:id


Admin → "Home Sections" tab
  │
  ├─ POST /homepage-sections (type, title, config.limit, config.layout)
  ├─ Drag to reorder: PATCH /homepage-sections/reorder
  ├─ Toggle enabled/disabled: PATCH /homepage-sections/:id
  └─ DELETE /homepage-sections/:id


Admin → "Buckets" tab
  │
  ├─ POST /buckets (title, subtitle, badge, color, products[])
  ├─ PATCH /buckets/:id
  └─ DELETE /buckets/:id
```

### 6.6 Payout Processing
```
Admin → "Payouts" tab
  │
  List of pending payouts
  │
  ├─ Verify amount (= order subtotal - commission)
  │
  └─ "Mark Paid" ──► PATCH /payouts/:id/status {status: "paid"}
                          │
                     Vendor payout record updated
                     (manual bank transfer done off-platform)
```

### 6.7 Delivery Partner Management
```
Admin → "Delivery Partners" tab
  │
  ├─ View all partners (status, earnings, orders delivered)
  │
  ├─ Create partner:
  │       │
  │   POST /delivery {name, phone, vehicle}
  │       │
  │   PATCH /delivery/:id/link-user (if user account exists)
  │
  ├─ Activate: PATCH /delivery/:id {status: "active"}
  └─ Suspend: PATCH /delivery/:id {status: "suspended"}


Admin → "Fleet Map" tab
  │
  GET /delivery/fleet
  │
  All active riders shown on Leaflet map with GPS coordinates
  Live refresh on tab visit
```

### 6.8 Coupon Management
```
Admin → "Coupons" tab
  │
  ├─ Create: POST /coupons
  │       {code, type, value, minOrderValue, maxUses, expiresAt}
  │
  ├─ Edit: PATCH /coupons/:id
  └─ Delete: DELETE /coupons/:id
```

### 6.9 Notification Broadcast
```
Admin → "Notifications" tab
  │
  ├─ Compose: title, body, target (all / role)
  │
  POST /notifications/broadcast
  │
  ├─ In-app notification created for all target users
  └─ FCM push sent to registered device tokens
```

---

## 7. Cross-Cutting Flows

### 7.1 Pincode Serviceability Check
```
Any checkout attempt
  │
  User has saved pincode?
  │
  ├─ YES ──► Check against service_pincodes table
  │               │
  │           Active? ──YES──► Continue to payment
  │               │
  │               NO ──► "Delivery not available to your area"
  │
  └─ NO ──► PincodeSelector prompt
                 │
             Enter pincode → validate → save to user.pincode
```

### 7.2 Report Submission
```
Any product/shop page (report button)
  │
  POST /reports {type, targetId, reason, description}
  │
  Report created (status: open)
  │
  Admin → Reports tab → Resolve or Ignore
```

### 7.3 Support Ticket
```
/contact-support
  │
  POST /support {subject, message}
  │
  Ticket created (status: open)
  │
  Customer views own tickets: GET /support/mine
  │
  Admin resolves: PATCH /support/:id/resolve or /close
```

### 7.4 Push Notification Permission
```
NotificationPrompt mounts (after login)
  │
  Notification.permission === 'default'?
  │
  YES ──► Show permission prompt banner
              │
          User allows ──► firebase.messaging().getToken()
                               │
                          POST /fcm/register-token {token}
                               │
                          Token stored in users.fcm_tokens[]
```

---

## 8. Error & Edge Case Flows

| Scenario | Behaviour |
|---|---|
| JWT expired, refresh valid | Silent token refresh → retry original request |
| JWT + refresh both expired | Redirect to /auth |
| Shop offline (`isOpen=false`) | Products shown but "Shop is currently closed" banner; checkout blocked |
| Product out of stock (`stock=0`) | "Out of stock" label; add-to-cart disabled |
| Payment verification fails | Toast "Payment verification failed"; order NOT created; user retried |
| Razorpay modal closed/cancelled | No order created; user returned to checkout |
| OTP incorrect (delivery) | Toast "Incorrect OTP"; dialog stays open; rider retries |
| Delivery partner GPS denied | "Location blocked" banner; delivery still possible but no live tracking |
| Admin broadcasts to offline user | FCM push queued by Firebase; in-app notification always persisted |
| Vendor uploads invalid file type | Multer rejects; "Invalid file type" error returned |
| Coupon expired | `validate` returns error message; discount not applied |
| Order cancelled mid-flow | Stock auto-restored; payment refunded if online |
