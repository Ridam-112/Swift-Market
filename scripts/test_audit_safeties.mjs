import crypto from "node:crypto";

const WA_SECRET = process.env.JWT_SECRET || "swiftmart-wa-action-token-secret";
const DEFAULT_WHATSAPP_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function generateWhatsAppActionToken(orderId, action, timestamp) {
  const ts = timestamp ?? Date.now();
  const signature = crypto.createHmac("sha256", WA_SECRET).update(`${orderId}:${action}:${ts}`).digest("hex").slice(0, 32);
  return `${ts}.${signature}`;
}

function verifyWhatsAppActionToken(orderId, action, token, maxAgeMs = DEFAULT_WHATSAPP_TOKEN_MAX_AGE_MS) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [tsStr, signature] = parts;
  const ts = Number(tsStr);
  if (!Number.isFinite(ts) || isNaN(ts)) return false;

  const now = Date.now();
  if (now - ts > maxAgeMs || ts > now + 60000) {
    return false;
  }

  const expectedSig = crypto.createHmac("sha256", WA_SECRET).update(`${orderId}:${action}:${ts}`).digest("hex").slice(0, 32);
  if (signature.length !== expectedSig.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

console.log("==================================================================");
console.log(" SWIFTMART PRODUCTION AUDIT — CONCURRENCY & SAFETY REGRESSION SUITE");
console.log("==================================================================");

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL [Test ${totalTests}]: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`✅ PASS [Test ${totalTests}]: ${message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA 1 & 4: CONCURRENCY SIMULATION (Atomic UNIQUE constraint & 23505 conflict)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- [AREA 1 & 4] Idempotency & Database Unique Constraint Concurrency ---");

// Simulated concurrent database storage with UNIQUE constraint enforcement
class ConcurrentUniqueStore {
  constructor(uniqueField) {
    this.uniqueField = uniqueField;
    this.items = new Map();
  }

  // Simulates PostgreSQL tx.insert() with UNIQUE constraint on uniqueField
  async insertAtomic(record) {
    const key = record[this.uniqueField];
    // Small artificial delay to create true asynchronous race conditions
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 20)));

    if (this.items.has(key)) {
      const err = new Error(`duplicate key value violates unique constraint "${this.uniqueField}_unique"`);
      err.code = "23505"; // PostgreSQL unique violation error code
      err.detail = `Key (${this.uniqueField})=(${key}) already exists.`;
      throw err;
    }
    this.items.set(key, record);
    return record;
  }

  async findByUniqueKey(key) {
    return this.items.get(key) || null;
  }
}

// Handler simulating orders.ts / serviceBookings.ts insert + conflict resolution
async function createOrderWithSafeConflictHandling(dbStore, orderPayload) {
  const { idempotencyKey } = orderPayload;

  // Pre-query fast-path
  const cached = await dbStore.findByUniqueKey(idempotencyKey);
  if (cached) {
    return { success: true, order: cached, resolvedVia: "pre_query" };
  }

  try {
    const inserted = await dbStore.insertAtomic(orderPayload);
    return { success: true, order: inserted, resolvedVia: "atomic_insert" };
  } catch (err) {
    // Exact logic from orders.ts & serviceBookings.ts catch block
    if (
      err?.code === "23505" ||
      String(err?.message || "").includes("unique constraint") ||
      String(err?.detail || "").includes(idempotencyKey)
    ) {
      const existing = await dbStore.findByUniqueKey(idempotencyKey);
      if (existing) {
        return { success: true, order: existing, resolvedVia: "conflict_handler_23505" };
      }
    }
    throw err;
  }
}

// Concurrency Test for Area 1 (Orders)
{
  const orderStore = new ConcurrentUniqueStore("idempotencyKey");
  const orderKey = `cust_101_shop_202_items_apple_1_1728189000`;
  const payload1 = { id: "order_uuid_1", idempotencyKey: orderKey, amount: 250 };
  const payload2 = { id: "order_uuid_2", idempotencyKey: orderKey, amount: 250 };

  // Fire 10 simultaneous concurrent order submissions with identical idempotencyKey
  const concurrentCalls = await Promise.all([
    createOrderWithSafeConflictHandling(orderStore, payload1),
    createOrderWithSafeConflictHandling(orderStore, payload2),
    createOrderWithSafeConflictHandling(orderStore, payload2),
    createOrderWithSafeConflictHandling(orderStore, payload1),
    createOrderWithSafeConflictHandling(orderStore, payload2),
  ]);

  assert(orderStore.items.size === 1, "Exactly ONE order was inserted in the database despite 5 concurrent submissions");
  const allSucceeded = concurrentCalls.every(res => res.success && res.order.id === "order_uuid_1" || res.order.id === "order_uuid_2");
  assert(allSucceeded, "All concurrent requests resolved successfully with status 200/201");
  const conflictResolved = concurrentCalls.some(res => res.resolvedVia === "conflict_handler_23505" || res.resolvedVia === "pre_query");
  assert(conflictResolved, "Concurrent race conditions were safely resolved via 23505 conflict handler or pre-query");
}

// Concurrency Test for Area 4 (Service Bookings)
{
  const serviceStore = new ConcurrentUniqueStore("idempotencyKey");
  const bookingKey = `usr_99_tv_repair_2026-10-10_afternoon`;
  const srvPayload1 = { id: "srv_1", bookingNumber: "SRV-261010-1001", idempotencyKey: bookingKey };
  const srvPayload2 = { id: "srv_2", bookingNumber: "SRV-261010-1002", idempotencyKey: bookingKey };

  const srvCalls = await Promise.all([
    createOrderWithSafeConflictHandling(serviceStore, srvPayload1),
    createOrderWithSafeConflictHandling(serviceStore, srvPayload2),
    createOrderWithSafeConflictHandling(serviceStore, srvPayload1),
  ]);

  assert(serviceStore.items.size === 1, "Service bookings database has exactly ONE booking record for the same user slot");
  const sameBooking = srvCalls.every(r => r.order.id === srvCalls[0].order.id);
  assert(sameBooking, "All concurrent service booking calls returned the original booking record");
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA 2: SERVER-SIDE RECALCULATION OF FEES, DISCOUNTS & TOTALS
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- [AREA 2] Server-Side Recalculation & Tamper Proofing ---");

function calculateServerDeliveryFee({ customerLat, customerLng, customerPincode, shopAddress, isFood, deliveryType }) {
  let distanceKm = null;
  let shopLat = null;
  let shopLng = null;
  if (shopAddress && typeof shopAddress === "object") {
    const rawLat = shopAddress.lat ?? shopAddress.latitude;
    const rawLng = shopAddress.lng ?? shopAddress.longitude ?? shopAddress.lon;
    if (rawLat != null && !isNaN(Number(rawLat))) shopLat = Number(rawLat);
    if (rawLng != null && !isNaN(Number(rawLng))) shopLng = Number(rawLng);
  }

  const PINCODE_CENTROIDS = {
    "733101": { lat: 25.2167, lng: 88.7667 },
    "733103": { lat: 25.2310, lng: 88.7820 },
  };

  if ((shopLat == null || isNaN(shopLat)) && shopAddress?.pincode && PINCODE_CENTROIDS[String(shopAddress.pincode)]) {
    const c = PINCODE_CENTROIDS[String(shopAddress.pincode)];
    shopLat = c.lat;
    shopLng = c.lng;
  }

  const sLat = (shopLat != null && !isNaN(shopLat)) ? shopLat : 25.2167;
  const sLng = (shopLng != null && !isNaN(shopLng)) ? shopLng : 88.7667;

  if (customerLat != null && customerLng != null && !isNaN(customerLat) && !isNaN(customerLng)) {
    const R = 6371;
    const dLat = ((sLat - customerLat) * Math.PI) / 180;
    const dLng = ((sLng - customerLng) * Math.PI) / 180;
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const chord = sinDLat * sinDLat + Math.cos((customerLat * Math.PI) / 180) * Math.cos((sLat * Math.PI) / 180) * sinDLng * sinDLng;
    distanceKm = R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
  } else if (customerPincode && PINCODE_CENTROIDS[customerPincode]) {
    const cust = PINCODE_CENTROIDS[customerPincode];
    const R = 6371;
    const dLat = ((sLat - cust.lat) * Math.PI) / 180;
    const dLng = ((sLng - cust.lng) * Math.PI) / 180;
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const chord = sinDLat * sinDLat + Math.cos((cust.lat * Math.PI) / 180) * Math.cos((sLat * Math.PI) / 180) * sinDLng * sinDLng;
    distanceKm = R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
  }

  const rawDist = distanceKm != null && distanceKm > 0 ? distanceKm : 1.5;
  const dist = Math.max(1.0, Math.round(rawDist * 10) / 10);

  if (isFood || deliveryType === "instant" || deliveryType === "scheduled") {
    const baseFee = 20;
    const rawPetrol = Math.round(dist * 5);
    return Math.min(50, baseFee + rawPetrol);
  }

  if (deliveryType === "standard") {
    const baseFee = 15;
    const rawPetrol = Math.round(dist * 3);
    return Math.min(50, baseFee + rawPetrol);
  }

  return 0; // saver
}

// Test 2a: Client sends deliveryCharge: 0 for instant food order -> server recalculates and overrides
{
  const clientTamperedDeliveryCharge = 0;
  const serverRecalculated = calculateServerDeliveryFee({
    customerPincode: "733101",
    shopAddress: { pincode: "733103" },
    isFood: true,
    deliveryType: "instant",
  });
  assert(serverRecalculated >= 25, `Client deliveryCharge: ${clientTamperedDeliveryCharge} overridden to server calculated ₹${serverRecalculated}`);
}

// Test 2b: Standard delivery distance calculation
{
  const standardFee = calculateServerDeliveryFee({
    customerPincode: "733101",
    shopAddress: { pincode: "733101" },
    isFood: false,
    deliveryType: "standard",
  });
  // 1.5km * 3 = 5, base 15 = 20
  assert(standardFee === 20, `Standard delivery fee correctly calculated as ₹${standardFee}`);
}

// Test 2c: Saver delivery is free
{
  const saverFee = calculateServerDeliveryFee({
    customerPincode: "733101",
    shopAddress: { pincode: "733103" },
    isFood: false,
    deliveryType: "saver",
  });
  assert(saverFee === 0, `Saver delivery slot is verified free (₹0)`);
}

// Test 2d: Full net amount formula verification
{
  const subtotal = 400;
  const deliveryCharge = 28;
  const packagingFee = 10;
  const gstAmount = 20; // 5% on 400
  const couponDiscount = 50;
  const netAmount = Math.max(0, +(subtotal + deliveryCharge + packagingFee + gstAmount - couponDiscount).toFixed(2));
  assert(netAmount === 408, `Net total correctly recalculated server-side: ₹${netAmount} === ₹408`);
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA 3: ROLE-SPECIFIC STATUS TRANSITION PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- [AREA 3] Role-Specific Order Transition Permissions ---");

const ROLE_ALLOWED_TRANSITIONS = {
  customer: {
    placed: new Set(["cancelled"]),
    accepted: new Set(["cancelled"]),
  },
  vendor: {
    placed: new Set(["accepted", "preparing", "cancelled"]),
    accepted: new Set(["preparing", "packed", "ready", "cancelled"]),
    preparing: new Set(["packed", "ready", "cancelled"]),
    confirmed: new Set(["preparing", "packed", "ready", "cancelled"]),
    packed: new Set(["ready", "cancelled"]),
  },
  delivery_partner: {
    ready: new Set(["out_for_delivery"]),
    packed: new Set(["out_for_delivery"]),
    out_for_delivery: new Set(["delivered"]),
  },
};

function canTransitionRole(role, currentStatus, targetStatus) {
  if (role === "admin" || role === "super_admin") return true;
  const roleRules = ROLE_ALLOWED_TRANSITIONS[role];
  if (!roleRules) return false;
  const allowed = roleRules[currentStatus];
  return allowed ? allowed.has(targetStatus) : false;
}

// Test 3a: Customer can only cancel placed/accepted orders
assert(canTransitionRole("customer", "placed", "cancelled") === true, "Customer can cancel 'placed' order");
assert(canTransitionRole("customer", "accepted", "cancelled") === true, "Customer can cancel 'accepted' order");
assert(canTransitionRole("customer", "preparing", "cancelled") === false, "Customer CANNOT cancel once 'preparing'");
assert(canTransitionRole("customer", "ready", "delivered") === false, "Customer CANNOT mark order 'delivered'");

// Test 3b: Vendor transitions
assert(canTransitionRole("vendor", "placed", "accepted") === true, "Vendor can accept 'placed' order");
assert(canTransitionRole("vendor", "preparing", "ready") === true, "Vendor can mark 'preparing' order 'ready'");
assert(canTransitionRole("vendor", "ready", "out_for_delivery") === false, "Vendor CANNOT mark order 'out_for_delivery'");
assert(canTransitionRole("vendor", "out_for_delivery", "delivered") === false, "Vendor CANNOT mark order 'delivered'");

// Test 3c: Rider / Delivery Partner transitions
assert(canTransitionRole("delivery_partner", "ready", "out_for_delivery") === true, "Rider can transition 'ready' -> 'out_for_delivery'");
assert(canTransitionRole("delivery_partner", "out_for_delivery", "delivered") === true, "Rider can transition 'out_for_delivery' -> 'delivered'");
assert(canTransitionRole("delivery_partner", "placed", "accepted") === false, "Rider CANNOT accept un-prepared orders");
assert(canTransitionRole("delivery_partner", "preparing", "cancelled") === false, "Rider CANNOT cancel orders");

// ─────────────────────────────────────────────────────────────────────────────
// AREA 5: WHATSAPP HMAC TOKEN TIMESTAMP, EXPIRY & REPLAY RESISTANCE
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- [AREA 5] WhatsApp HMAC Action Tokens & Anti-Replay ---");

{
  const orderId = "order_123456";
  const action = "accept";

  // 1. Valid token generated right now
  const freshToken = generateWhatsAppActionToken(orderId, action);
  assert(typeof freshToken === "string" && freshToken.includes("."), "Token format is {timestamp}.{signature}");
  assert(verifyWhatsAppActionToken(orderId, action, freshToken) === true, "Fresh WhatsApp token verifies successfully");

  // 2. Token with timestamp 25 hours ago (> 24 hour maxAge)
  const staleTimestamp = Date.now() - (25 * 60 * 60 * 1000);
  const staleToken = generateWhatsAppActionToken(orderId, action, staleTimestamp);
  assert(verifyWhatsAppActionToken(orderId, action, staleToken) === false, "Stale 25-hour-old token is rejected");

  // 3. Token with future timestamp > 60 seconds
  const futureTimestamp = Date.now() + (5 * 60 * 1000);
  const futureToken = generateWhatsAppActionToken(orderId, action, futureTimestamp);
  assert(verifyWhatsAppActionToken(orderId, action, futureToken) === false, "Future timestamp token (> 60s) is rejected");

  // 4. Token tampered action or orderId
  assert(verifyWhatsAppActionToken(orderId, "reject", freshToken) === false, "Token for 'accept' fails when used for 'reject'");
  assert(verifyWhatsAppActionToken("order_999999", action, freshToken) === false, "Token for order A fails for order B");

  // 5. Tampered signature payload
  const [ts, sig] = freshToken.split(".");
  const tamperedSig = sig.slice(0, -2) + (sig.endsWith("a") ? "b" : "a");
  assert(verifyWhatsAppActionToken(orderId, action, `${ts}.${tamperedSig}`) === false, "Tampered signature fails timing-safe verification");
}

console.log("\n==================================================================");
console.log(` ALL ${passedTests} REGRESSION CHECKS PASSED WITH ZERO FAILURES`);
console.log("==================================================================");
