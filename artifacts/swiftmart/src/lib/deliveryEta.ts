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
): SingleShopEta {
  const shopCoords = coordsForPincode(shopPincode);
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
