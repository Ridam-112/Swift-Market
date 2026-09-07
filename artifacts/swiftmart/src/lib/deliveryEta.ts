/**
 * Delivery ETA estimation
 *
 * Strategy:
 *  - Use browser GPS for customer position
 *  - Map shop pincode → approximate lat/lng centroid (Balurghat area)
 *  - Haversine distance → transit time at 20 km/h average local speed
 *  - Add: rider pickup time (5 min flat) + shop prep time (parsed from shop.eta)
 *  - Multi-shop: fixed 30-45 min with explanation
 */

export interface LatLng {
  lat: number;
  lng: number;
}

// Approximate centroids for Balurghat pincodes.
// These are the only two service pincodes; tighten coordinates if needed.
const PINCODE_COORDS: Record<string, LatLng> = {
  "733101": { lat: 25.2167, lng: 88.7667 }, // Balurghat main town
  "733103": { lat: 25.2310, lng: 88.7820 }, // North-east Balurghat
};

const RIDER_SPEED_KMPH = 20; // conservative local scooter speed
const RIDER_PICKUP_MIN = 5;  // flat time for rider to reach the shop

/** Haversine distance in kilometres between two lat/lng points */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const chord =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
}

/** Parse a shop eta string like "10-15 min" → midpoint in minutes */
export function parseShopEtaMin(eta: string): number {
  if (!eta) return 10;
  const nums = eta.match(/\d+/g);
  if (!nums || nums.length === 0) return 10;
  const vals = nums.map(Number);
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

export interface EtaBreakdown {
  riderPickupMin: number;   // time for rider to reach shop
  shopPrepMin: number;      // shop packing/prep time
  transitMin: number;       // rider → customer transit
  totalMin: number;         // sum
  distanceKm: number | null;
  customerCoordsUsed: boolean;
}

export interface MultiShopEta {
  kind: "multi-shop";
  shopCount: number;
  minMin: number;  // 30
  maxMin: number;  // 45
}

export interface SingleShopEta {
  kind: "single-shop";
  breakdown: EtaBreakdown;
  rangeMin: number;   // totalMin - 5
  rangeMax: number;   // totalMin + 5
}

export type DeliveryEta = MultiShopEta | SingleShopEta;

/**
 * Get customer GPS coordinates via browser API.
 * Resolves to null if permission denied or unavailable.
 */
export function getCustomerCoords(): Promise<LatLng | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60000 }
    );
  });
}

/**
 * Coords for a given pincode. Falls back to null if unknown.
 */
export function coordsForPincode(pincode: string): LatLng | null {
  return PINCODE_COORDS[pincode] ?? null;
}

/**
 * Compute a single-shop ETA given customer location (optional),
 * shop pincode, and the shop's eta string.
 */
export function computeSingleShopEta(
  customerCoords: LatLng | null,
  shopPincode: string,
  shopEta: string,
  shopCoordsOverride?: LatLng | null,
): SingleShopEta {
  // Use exact shop GPS coordinates if available, otherwise fallback to pincode centroid
  const shopCoords = (shopCoordsOverride && typeof shopCoordsOverride.lat === "number" && typeof shopCoordsOverride.lng === "number")
    ? shopCoordsOverride
    : coordsForPincode(shopPincode);
  let distanceKm: number | null = null;
  let customerCoordsUsed = false;

  if (customerCoords && shopCoords) {
    distanceKm = haversineKm(shopCoords, customerCoords);
    customerCoordsUsed = true;
  } else if (shopCoords) {
    // Fallback: assume 1.5 km if no GPS (city is small)
    distanceKm = 1.5;
  }

  const shopPrepMin = parseShopEtaMin(shopEta);
  const transitMin = distanceKm != null
    ? Math.round((distanceKm / RIDER_SPEED_KMPH) * 60)
    : 10;

  const totalMin = RIDER_PICKUP_MIN + shopPrepMin + transitMin;

  return {
    kind: "single-shop",
    breakdown: {
      riderPickupMin: RIDER_PICKUP_MIN,
      shopPrepMin,
      transitMin,
      totalMin,
      distanceKm,
      customerCoordsUsed,
    },
    rangeMin: Math.max(8, totalMin - 5),
    rangeMax: totalMin + 5,
  };
}

// ─── Food & Vegetable Category Detection ──────────────────────────────────────
export const FOOD_SHOP_TYPES = new Set([
  "restaurant",
  "fast-food",
  "fastfood",
  "cloud-kitchen",
  "bakery",
  "sweet-shop",
  "sweetshop",
  "sweets",
  "cafe",
  "food_junction",
  "dhaba",
]);

export function isFoodCategory(category?: string | null, shopType?: string | null): boolean {
  const c = (category || "").toLowerCase().trim();
  const s = (shopType || "").toLowerCase().trim();
  return FOOD_SHOP_TYPES.has(c) || FOOD_SHOP_TYPES.has(s);
}

export const VEG_FRUIT_CATEGORIES = new Set([
  "fruits-vegetables",
  "vegetables",
  "fruits",
  "mandi",
]);

export function isVegFruitCategory(category?: string | null, shopType?: string | null): boolean {
  const c = (category || "").toLowerCase().trim();
  const s = (shopType || "").toLowerCase().trim();
  return VEG_FRUIT_CATEGORIES.has(c) || VEG_FRUIT_CATEGORIES.has(s);
}

// ─── Distance & Delivery Fee Calculation ──────────────────────────────────────
export interface DeliveryFeeBreakdown {
  distanceKm: number;
  baseFee: number;     // ₹20/km
  petrolFee: number;   // ₹5/km rider petrol
  totalFee: number;    // base + petrol
}

/**
 * Calculates delivery fee based on customer distance:
 * - Express / Instant / Food: ₹20/km base + ₹5/km petrol = ₹25/km (min ₹25)
 * - Standard: ₹12/km base + ₹3/km petrol = ₹15/km (min ₹15)
 * - Saver: FREE (₹0)
 */
export function calculateDeliveryFee(
  distanceKm: number | null | undefined,
  slot: "instant" | "standard" | "saver",
  isFood: boolean = false
): DeliveryFeeBreakdown {
  const rawDist = distanceKm != null && distanceKm > 0 ? distanceKm : 1.5;
  // Round distance to 1 decimal place, minimum 1.0 km
  const dist = Math.max(1.0, Math.round(rawDist * 10) / 10);

  if (isFood || slot === "instant") {
    // Base delivery fee = ₹20, Rider petrol allowance = ₹5 per km (capped at ₹50 max)
    // 1 km: ₹20 + ₹5 = ₹25
    // 2 km: ₹20 + ₹10 = ₹30
    // 3 km: ₹20 + ₹15 = ₹35
    // 6+ km: capped at ₹50
    const baseFee = 20;
    const rawPetrol = Math.round(dist * 5);
    const totalFee = Math.min(50, baseFee + rawPetrol);
    const petrolFee = totalFee - baseFee;
    return {
      distanceKm: dist,
      baseFee,
      petrolFee,
      totalFee,
    };
  }

  if (slot === "standard") {
    // Standard: Base fee ₹15, Rider petrol allowance = ₹3 per km (capped at ₹50 max)
    // 1 km: ₹15 + ₹3 = ₹18
    // 2 km: ₹15 + ₹6 = ₹21
    // 3 km: ₹15 + ₹9 = ₹24
    const baseFee = 15;
    const rawPetrol = Math.round(dist * 3);
    const totalFee = Math.min(50, baseFee + rawPetrol);
    const petrolFee = totalFee - baseFee;
    return {
      distanceKm: dist,
      baseFee,
      petrolFee,
      totalFee,
    };
  }

  // Saver is FREE
  return {
    distanceKm: dist,
    baseFee: 0,
    petrolFee: 0,
    totalFee: 0,
  };
}

/**
 * Returns dynamic delivery timing and slot description based on category:
 * - Food: Single slot "30–40 mins"
 * - Veg & Fruits:
 *     - Instant: "Within 1 hour"
 *     - Standard: "Within 2–3 hours"
 *     - Saver: "Next day or within 12 hours"
 * - Grocery & Others:
 *     - Instant: "30 mins to 1 hour"
 *     - Standard: "Within 2–3 hours"
 *     - Saver: "Within 12 hours"
 */
export function getSlotTimingLabel(
  slot: "instant" | "standard" | "saver",
  isFood: boolean,
  isVegFruit: boolean
): string {
  if (isFood) {
    return "30–40 min";
  }

  if (isVegFruit) {
    switch (slot) {
      case "instant":
        return "Within 1 hour";
      case "standard":
        return "Within 2–3 hours";
      case "saver":
        return "Next day or 12 hrs";
    }
  }

  // Grocery & All Others
  switch (slot) {
    case "instant":
      return "30 min to 1 hr";
    case "standard":
      return "Within 2–3 hours";
    case "saver":
      return "Within 12 hours";
  }
}
