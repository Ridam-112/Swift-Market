# SwiftMart — Google Play Store Listing

---

## App Identity

| Field | Value |
|---|---|
| **App name** | SwiftMart — 10-Min Grocery Delivery |
| **Developer name** | SwiftMart Technologies |
| **Package / App ID** | `com.swiftmart.app` |
| **Category** | Shopping |
| **Content rating** | Everyone |
| **App type** | App (not Game) |

---

## Short Description

*(Max 80 characters — shown in search results)*

```
Hyperlocal grocery & medicine delivery in 10 minutes.
```

---

## Full Description

*(Max 4000 characters — use blank lines to separate paragraphs)*

```
🛒 SwiftMart — Your Neighbourhood Store, Delivered in 10 Minutes

SwiftMart connects you with local grocery shops, pharmacies, and general stores
in your area for ultra-fast delivery. Browse real products from real shops near
you, place your order, and get it delivered to your door in about 10 minutes.

No dark stores. No warehouses. Just your local shops, made instant.

─────────────────────────────────────────
🥦 GROCERIES & FRESH PRODUCE
─────────────────────────────────────────
• Fresh vegetables, fruits, and dairy from local vendors
• Packaged foods, snacks, beverages, and pantry staples
• Real-time product availability from your nearest shop

─────────────────────────────────────────
💊 MEDICINES & HEALTH
─────────────────────────────────────────
• OTC medicines, supplements, and health products
• Baby care, personal care, and hygiene essentials
• Delivered from licensed local pharmacies

─────────────────────────────────────────
⚡ HOW IT WORKS
─────────────────────────────────────────
1. Enter your pincode — see only shops that can deliver to you
2. Browse products from local shops near you
3. Add to cart and checkout in seconds
4. Track your order live — delivered in ~10 minutes

─────────────────────────────────────────
✨ FEATURES
─────────────────────────────────────────
• Pincode-based shop & product filtering
• Live order tracking with delivery updates
• Secure checkout via Razorpay (UPI, cards, net banking)
• OTP phone login — no password needed
• Google sign-in support
• Order history and reorder in one tap
• Vendor ratings and shop profiles
• Push notifications for order updates

─────────────────────────────────────────
🏪 FOR LOCAL SHOP OWNERS
─────────────────────────────────────────
Grow your business with SwiftMart's vendor platform:
• List your products with photos, prices, and stock
• Accept and manage orders from a simple dashboard
• Set your delivery area by pincode
• Get paid directly to your bank account

─────────────────────────────────────────
📍 HYPERLOCAL DIFFERENCE
─────────────────────────────────────────
SwiftMart is built for your specific neighbourhood — not a pan-city warehouse.
When you shop on SwiftMart, you support local businesses and get fresher
products with faster delivery.

Download SwiftMart and experience your neighbourhood, made instant.
```

---

## Contact & Support

| Field | Value |
|---|---|
| **Support email** | support@swiftmart.co.in |
| **Website** | https://your-app.replit.app *(replace with your deployed URL)* |
| **Privacy Policy URL** | https://your-app.replit.app/privacy *(replace `your-app` with your deployed subdomain — required by Play Store)* |
| **Terms of Service URL** | https://your-app.replit.app/terms *(replace `your-app` with your deployed subdomain — required by Play Store)* |

> Play Store requires a live, publicly accessible Privacy Policy URL before your app can be published.
> It must be hosted on a real domain (not localhost or Replit dev URL).

---

## Data Safety Section

*(Complete this in Play Console → Store Presence → Data Safety)*

### Data collected

| Data type | Collected | Shared | Required | Purpose |
|---|---|---|---|---|
| Phone number | Yes | No | Yes | Account login via OTP |
| Email address | Yes (Google login) | No | No | Google sign-in authentication |
| Name | Yes (Google login) | No | No | Account profile |
| Precise location | No | — | — | — |
| Approximate location | No | — | — | Pincode entered manually |
| Purchase history | Yes | No | Yes | Order history, reorder feature |
| Payment info | No | — | — | Payments handled by Razorpay (PCI-compliant) |
| Device identifiers | Yes | No | Yes | Push notification delivery |
| Crash logs | Yes | No | Yes | App stability and bug fixing |

### Data handling notes

- Phone numbers are used only for OTP authentication. Not sold or shared with third parties.
- Payment processing is handled entirely by Razorpay — SwiftMart never stores card numbers or CVVs.
- Location is not tracked. Users enter their pincode manually to see nearby shops.
- Crash logs are used internally only for app improvement.

---

## Store Assets Checklist

| Asset | Size | Status |
|---|---|---|
| App icon | 512×512 px PNG, no alpha | `play-store-assets/icon-512.png` |
| Feature graphic | 1024×500 px PNG/JPG | `play-store-assets/feature-graphic.png` |
| Phone screenshots (min 2) | 1080×1920 px or 1284×2778 px | `play-store-assets/screenshot-*.png` |
| Promo graphic (optional) | 180×120 px | — |
| TV banner (if TV) | 1280×720 px | Not applicable |

### Screenshot captions (add these in Play Console)

| Screenshot | Caption |
|---|---|
| screenshot-home.png | "Browse local shops near you" |
| screenshot-tracking.png | "Track your delivery in real time" |
| screenshot-shop.png | "Fresh products from your neighbourhood" |

---

## App Store Optimisation (ASO) Keywords

*(Add to the "Tags" field in Play Console if available)*

```
grocery delivery, hyperlocal, 10 minute delivery, local shops, medicine delivery,
quick commerce, neighbourhood grocery, instant delivery, online grocery, pharmacy delivery
```

---

## Release Notes Template

*(Use for every new release under "What's New")*

```
What's new in this version:
• [Describe main change]
• [Describe second change]
• Bug fixes and performance improvements
```

---

## Pre-Launch Checklist

- [ ] Privacy Policy hosted at a live public URL
- [ ] Terms of Service hosted at a live public URL
- [ ] Support email inbox is monitored
- [ ] App tested on Android 7 (API 24) and Android 14 (API 34)
- [ ] All screenshots taken at correct resolution
- [ ] App icon has no alpha/transparency (Play Store rejects transparent icons)
- [ ] `versionCode` incremented in `android/app/build.gradle`
- [ ] Signed with release keystore (NOT debug keystore)
- [ ] Content rating questionnaire completed in Play Console
- [ ] Data Safety form completed in Play Console
- [ ] Razorpay test mode disabled — production key used
- [ ] `OTP_MODE=real` set in production environment
- [ ] Firebase Authorized Domains includes your `.replit.app` production URL
