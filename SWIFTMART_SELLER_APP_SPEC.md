# 🏪 SwiftMart Dedicated Seller (Vendor) Mobile App
## Complete Architecture, Backend URLs, API Specs, & Implementation Blueprint

---

## 🌐 1. Backend Server & Base URLs

Your seller application will communicate with the live SwiftMart central API server.

| Environment | Base URL | Usage |
|---|---|---|
| **Production (Live)** | `https://swiftmart.space/api` | Live production servers (Custom Domain / Cloudflare) |
| **Vercel Cloud Backup** | `https://swiftmart-balurghat.vercel.app/api` | Vercel production deployment |
| **Local Development (Physical Device)** | `http://<YOUR_PC_LAN_IP>:5000/api` | Testing locally on Android / iOS via Wi-Fi |
| **Android Emulator (Localhost)** | `http://10.0.2.2:5000/api` | Android Studio emulator pointing to PC localhost |

### Mandatory HTTP Request Headers
Every request made from the Flutter Seller App must send these headers:
```http
Content-Type: application/json
Accept: application/json
X-Client-Source: app
Authorization: Bearer <accessToken>   <-- (Only for authenticated endpoints)
```
> **⚠️ Critical Note**: `X-Client-Source: app` allows the backend user-presence tracker to register the seller as active on mobile.

---

## 📦 2. Complete `pubspec.yaml` Dependencies

Add these exact packages to the new Flutter Seller App project:

```yaml
name: swiftmart_seller_app
description: "SwiftMart Partner - Dedicated Seller & Vendor Mobile App"
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # State Management & DI
  provider: ^6.1.2

  # Networking & HTTP
  http: ^1.2.1
  http_parser: ^4.0.2

  # Token & Persistent Storage
  shared_preferences: ^2.2.2
  flutter_secure_storage: ^9.0.0

  # Image & File Picking / Uploading
  image_picker: ^1.0.8
  file_picker: ^8.0.0

  # UI, Icons, Typography
  cached_network_image: ^3.3.1
  google_fonts: ^6.2.1
  lucide_icons: ^0.257.0
  flutter_svg: ^2.0.10+1

  # Analytics Charts & Visuals
  fl_chart: ^0.66.2

  # Live Order Ringtone / Audio Alert
  audioplayers: ^6.0.0

  # Notifications & Feedback
  fluttertoast: ^8.2.4
  intl: ^0.19.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/sounds/
    - assets/images/
```

---

## 📂 3. Recommended Flutter Project Structure

```text
lib/
├── main.dart                          # App entry point, theme & route setup
├── core/
│   ├── constants/
│   │   ├── api_endpoints.dart         # Base URL and API paths
│   │   └── app_colors.dart            # Brand colors (Primary #6C3DE8, Emerald, etc.)
│   └── utils/
│       ├── currency_formatter.dart    # Format INR (₹)
│       └── audio_alert.dart           # Order ringtone player using audioplayers
├── data/
│   ├── models/
│   │   ├── user_model.dart            # User data & role
│   │   ├── shop_model.dart            # Shop details, timings, status, isOpen
│   │   ├── order_model.dart           # Incoming order, items, customer, delivery type
│   │   ├── product_model.dart         # Product, variants (colors/sizes), stock, price
│   │   └── payout_model.dart          # Earnings, paid amount, pending balance
│   └── services/
│       ├── api_service.dart           # Core HTTP client with auto-refresh & headers
│       ├── auth_service.dart          # Login, OTP send/verify, logout
│       ├── shop_service.dart          # Register shop, toggle open, update profile
│       ├── order_service.dart         # Fetch orders, update order status
│       ├── product_service.dart       # CRUD products, upload image
│       └── payout_service.dart        # Fetch vendor earnings & history
├── providers/
│   ├── auth_provider.dart             # Auth state, session check
│   ├── shop_provider.dart             # Shop profile, open/close state
│   ├── orders_provider.dart           # Live order polling & ringtone alerts
│   └── products_provider.dart         # Product catalog management
└── screens/
    ├── splash/
    │   └── splash_screen.dart         # Silent bootstrap & intelligent router
    ├── auth/
    │   ├── login_screen.dart          # Phone + OTP or Password login
    │   └── otp_verify_screen.dart     # 6-digit OTP verification
    ├── onboarding/
    │   ├── vendor_register_screen.dart# 4-step store onboarding wizard
    │   └── vendor_status_screen.dart  # Under review & document re-upload screen
    ├── dashboard/
    │   └── vendor_dashboard_screen.dart# Metrics, Live Open/Closed switch, graphs
    ├── orders/
    │   ├── orders_list_screen.dart    # Live orders tabs (Placed -> Preparing -> Delivered)
    │   └── order_detail_screen.dart   # Order details, items, address, status updater
    ├── products/
    │   ├── products_list_screen.dart  # Catalog with status filter tabs
    │   ├── add_product_screen.dart    # 4-image uploader, price, variants
    │   └── edit_product_screen.dart   # Stock adjustment, price editing
    ├── profile/
    │   └── shop_profile_screen.dart   # Store timings, packaging, GST settings
    └── payouts/
        └── payouts_screen.dart        # Lifetime earnings, bank account, history
```

---

## 🛠️ 4. Ready-to-Use `api_service.dart` (Production Ready)

Save this file at `lib/data/services/api_service.dart`:

```dart
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // ── Change Base URL here ─────────────────────────────────────────────
  static const String baseUrl = 'https://swiftmart.space/api';
  // Fallback: 'https://swiftmart-balurghat.vercel.app/api'

  static String? _accessToken;
  static String? _refreshToken;

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _accessToken = prefs.getString('access_token');
    _refreshToken = prefs.getString('refresh_token');
  }

  static String? get accessToken => _accessToken;
  static bool get isAuthenticated => _accessToken != null;

  static Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', accessToken);
    await prefs.setString('refresh_token', refreshToken);
  }

  static Future<void> clearTokens() async {
    _accessToken = null;
    _refreshToken = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
    await prefs.remove('cached_user');
  }

  static Map<String, String> _headers({bool authenticated = true, Map<String, String>? extra}) {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Source': 'app',
    };
    if (authenticated && _accessToken != null) {
      headers['Authorization'] = 'Bearer $_accessToken';
    }
    if (extra != null) headers.addAll(extra);
    return headers;
  }

  // Auto Token Refresh
  static Future<bool> refreshAccessToken() async {
    if (_refreshToken == null) return false;
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/refresh-token'),
        headers: _headers(authenticated: false),
        body: jsonEncode({'refreshToken': _refreshToken}),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['accessToken'] != null) {
          await saveTokens(
            accessToken: data['accessToken'].toString(),
            refreshToken: (data['refreshToken'] ?? _refreshToken).toString(),
          );
          return true;
        }
      }
      if (response.statusCode >= 400 && response.statusCode < 500) {
        await clearTokens();
      }
    } catch (_) {}
    return false;
  }

  // GET Request
  static Future<http.Response> get(String path, {bool authenticated = true}) async {
    final uri = Uri.parse('$baseUrl$path');
    var res = await http.get(uri, headers: _headers(authenticated: authenticated))
        .timeout(const Duration(seconds: 15));
    if (res.statusCode == 401 && authenticated) {
      if (await refreshAccessToken()) {
        res = await http.get(uri, headers: _headers(authenticated: true))
            .timeout(const Duration(seconds: 15));
      }
    }
    return res;
  }

  // POST Request
  static Future<http.Response> post(String path, Map<String, dynamic> body, {bool authenticated = true}) async {
    final uri = Uri.parse('$baseUrl$path');
    var res = await http.post(uri, headers: _headers(authenticated: authenticated), body: jsonEncode(body))
        .timeout(const Duration(seconds: 15));
    if (res.statusCode == 401 && authenticated) {
      if (await refreshAccessToken()) {
        res = await http.post(uri, headers: _headers(authenticated: true), body: jsonEncode(body))
            .timeout(const Duration(seconds: 15));
      }
    }
    return res;
  }

  // PATCH Request
  static Future<http.Response> patch(String path, Map<String, dynamic> body, {bool authenticated = true}) async {
    final uri = Uri.parse('$baseUrl$path');
    var res = await http.patch(uri, headers: _headers(authenticated: authenticated), body: jsonEncode(body))
        .timeout(const Duration(seconds: 15));
    if (res.statusCode == 401 && authenticated) {
      if (await refreshAccessToken()) {
        res = await http.patch(uri, headers: _headers(authenticated: true), body: jsonEncode(body))
            .timeout(const Duration(seconds: 15));
      }
    }
    return res;
  }

  // DELETE Request
  static Future<http.Response> delete(String path, {bool authenticated = true}) async {
    final uri = Uri.parse('$baseUrl$path');
    var res = await http.delete(uri, headers: _headers(authenticated: authenticated))
        .timeout(const Duration(seconds: 15));
    if (res.statusCode == 401 && authenticated) {
      if (await refreshAccessToken()) {
        res = await http.delete(uri, headers: _headers(authenticated: true))
            .timeout(const Duration(seconds: 15));
      }
    }
    return res;
  }

  // Multipart File Upload (for Shop Logo, Product Images, FSSAI Documents)
  static Future<String> uploadFile({
    required String endpoint,
    required File file,
    required String fieldName, // "image" for photos, "file" for certificates
  }) async {
    final uri = Uri.parse('$baseUrl$endpoint');
    final req = http.MultipartRequest('POST', uri);
    req.headers['X-Client-Source'] = 'app';
    if (_accessToken != null) {
      req.headers['Authorization'] = 'Bearer $_accessToken';
    }

    final ext = file.path.split('.').last.toLowerCase();
    MediaType contentType = MediaType('image', ext == 'png' ? 'png' : 'jpeg');
    if (ext == 'pdf') contentType = MediaType('application', 'pdf');

    req.files.add(await http.MultipartFile.fromPath(
      fieldName,
      file.path,
      contentType: contentType,
    ));

    final streamedRes = await req.send().timeout(const Duration(seconds: 30));
    final res = await http.Response.fromStream(streamedRes);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final url = data['imageUrl'] ?? data['fileUrl'] ?? data['url'];
      if (url != null) return url.toString();
    }
    throw Exception('Upload failed (${res.statusCode}): ${res.body}');
  }
}
```

---

## 📌 5. Screen Breakdown & Exact API Endpoints

### 1. Splash & Session Routing (`SplashScreen`)
* **Logic**:
  1. Call `ApiService.init()`.
  2. If no saved token ➔ Go to `LoginScreen`.
  3. If token exists ➔ Call `GET /auth/me`.
  4. Call `GET /shops?ownerId={user.id}`.
  5. Routing decision:
     * No shop record exists ➔ `VendorRegisterScreen`.
     * `shop.status == 'pending'` or `'rejected'` ➔ `VendorStatusScreen`.
     * `shop.status == 'approved'` ➔ `VendorDashboardScreen`.

---

### 2. Login & OTP (`LoginScreen` & `OtpVerifyScreen`)
* **Request OTP**: `POST /auth/otp/send`
  ```json
  { "phone": "9876543210" }
  ```
* **Verify OTP**: `POST /auth/otp/verify`
  ```json
  { "phone": "9876543210", "otp": "123456" }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": {
      "id": "usr_123",
      "name": "Ridam",
      "phone": "9876543210",
      "role": "vendor",
      "vendorStatus": "approved"
    }
  }
  ```

---

### 3. 4-Step Vendor Registration Wizard (`VendorRegisterScreen`)
* **Upload Store Logo**: `POST /upload/shop-image` (multipart, field: `image`) ➔ Returns `{ "imageUrl": "https://ik.imagekit.io/..." }`
* **Upload FSSAI/Drug License**: `POST /upload/certificate` (multipart, field: `file`) ➔ Returns `{ "fileUrl": "https://ik.imagekit.io/..." }`
* **Submit Complete Application**: `POST /shops`
  ```json
  {
    "shopName": "Maa Tara Grocery",
    "ownerName": "Bapi Paul",
    "phone": "9876543210",
    "shopType": "grocery",
    "category": "grocery",
    "subcategory": "kirana",
    "description": "Daily fresh grocery & stationary items",
    "image": "https://ik.imagekit.io/.../logo.jpg",
    "panNumber": "ABCDE1234F",
    "gstNumber": "19ABCDE1234F1Z5",
    "bankAccountHolderName": "Bapi Paul",
    "bankAccountNumber": "123456789012",
    "bankIfscCode": "SBIN0001234",
    "upiId": "bapi@oksbi",
    "certificateType": "fssai",
    "certificateNumber": "12345678901234",
    "certificateExpiryDate": "2028-12-31",
    "certificateFile": "https://ik.imagekit.io/.../fssai.pdf",
    "address": {
      "line1": "Near Bus Stand, Station Road",
      "line2": "Ward No 12",
      "city": "Balurghat",
      "pincode": "733101",
      "state": "West Bengal"
    }
  }
  ```

---

### 4. Application Review & Document Fix (`VendorStatusScreen`)
* Checks `GET /shops?ownerId={user.id}&limit=1`.
* If `shop.certificateStatus == 'rejected'`:
  * Shows Admin's rejection reason (e.g. *"Certificate expired"*).
  * Re-upload widget calling `PATCH /shops/my/certificate`:
    ```json
    {
      "certificateFile": "https://ik.imagekit.io/.../new_fssai.pdf",
      "certificateNumber": "12345678901234",
      "certificateExpiryDate": "2029-01-01"
    }
    ```
* If `shop.status == 'approved'`:
  * Green badge: *"You're approved!"* with button to enter Dashboard.

---

### 5. Vendor Dashboard (`VendorDashboardScreen`)
* **Toggle Shop Live Status**: `PATCH /shops/my/toggle-open`
  * Switches store between Open (taking customer orders) and Closed (temporarily paused).
* **Fetch Shop Stats**:
  * `GET /shops?ownerId={user.id}` (Shop profile & status)
  * `GET /orders?shopId={shop.id}&limit=200` (Calculates today's revenue, active orders, pipeline)
  * `GET /products?shopId={shop.id}&status=all&limit=500` (Calculates low stock alerts)
  * `GET /payouts/my` (Calculates total earned & pending balance)

---

### 6. Live Order Manager & Audio Alarm (`OrdersListScreen`)
* **Auto-Polling**: The app runs a `Timer.periodic(Duration(seconds: 5))` calling:
  `GET /orders?shopId={shop.id}&limit=200`
* **Audio Ringtone Trigger**:
  When a newly detected order has `status == 'placed'`, play a loud ringtone:
  ```dart
  final player = AudioPlayer();
  await player.play(AssetSource('sounds/new_order.mp3'));
  ```
* **Order Status Progression**: `PATCH /orders/:id/status`
  ```json
  { "status": "accepted" }   // Step 1: Accept Order
  { "status": "preparing" }  // Step 2: Preparing in Kitchen/Store
  { "status": "packed" }     // Step 3: Packed & Ready for Rider Pickup
  { "status": "cancelled" }  // Reject Order
  ```
* **Order Item Details Handled**:
  * Color, Size, Grams/Weight, Variant price, Delivery Slot (Instant ⚡ or Saver 🌱).

---

### 7. Product Catalog & Add/Edit (`ProductsListScreen` & `AddProductScreen`)
* **List Products**: `GET /products?shopId={shop.id}&status=all&limit=200`
* **Upload Image**: `POST /upload/product-image` (multipart, field: `image`, max 10MB)
* **Create Product**: `POST /products`
  ```json
  {
    "name": "Fortune Sunlite Refined Sunflower Oil",
    "category": "grocery",
    "subcategory": "edible-oils",
    "price": 160,
    "discountedPrice": 142,
    "unit": "1 Liter",
    "stock": 50,
    "description": "Refined sunflower oil with vitamins A & D",
    "images": [
      "https://ik.imagekit.io/.../oil1.jpg",
      "https://ik.imagekit.io/.../oil2.jpg"
    ],
    "shopId": "shp_123",
    "colors": ["Yellow", "Clear"],
    "sizes": ["1L", "5L"]
  }
  ```
* **Update Product**: `PATCH /products/:id` (Stock updates, Price adjustments)
* **Delete Product**: `DELETE /products/:id`

---

### 8. Store Profile & Operating Hours (`ShopProfileScreen`)
* Updates shop information via `PATCH /shops/my/profile`:
  ```json
  {
    "shopName": "Maa Tara Grocery",
    "description": "Best grocery store in Balurghat",
    "image": "https://ik.imagekit.io/.../new_logo.jpg",
    "banner": "https://ik.imagekit.io/.../banner.jpg",
    "timings": {
      "open": "08:30",
      "close": "22:00"
    },
    "packagingCharge": 15,
    "gstEnabled": true,
    "gstRate": 5
  }
  ```

---

### 9. Payouts & Earnings (`PayoutsScreen`)
* **Endpoint**: `GET /payouts/my`
* **Response**:
  ```json
  {
    "success": true,
    "totalEarned": 45200,
    "pendingAmount": 3400,
    "payouts": [
      {
        "_id": "pay_01",
        "amount": 12500,
        "status": "paid",
        "createdAt": "2026-08-25T10:00:00.000Z",
        "notes": "Weekly settlement"
      }
    ]
  }
  ```

---

## 🚀 6. Next Steps to Build the App

1. Open your terminal and create the project:
   ```bash
   flutter create --org com.swiftmart swiftmart_seller_app
   cd swiftmart_seller_app
   ```
2. Replace `pubspec.yaml` with the dependencies listed in Section 2.
3. Run `flutter pub get`.
4. Copy the production `api_service.dart` from Section 4 into `lib/data/services/api_service.dart`.
5. Provide the master prompt in Section 7 of [`SWIFTMART_SELLER_APP_SPEC.md`](file:///c:/Users/thrid/Downloads/swiftmart%20web/SWIFTMART_SELLER_APP_SPEC.md) to your Antigravity agent to generate all the UI screens and state providers.
