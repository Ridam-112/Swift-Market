export interface ServicePincodeEntry {
  pincode: string;
  area: string;
  state: string;
}

let _pincodes: string[] = ["733101", "733102", "733103"];
let _areas: string[] = ["balurghat", "south dinajpur", "dakshin dinajpur"];

const _names: Record<string, string> = {
  "733101": "Balurghat, South Dinajpur",
  "733102": "Balurghat, South Dinajpur",
  "733103": "Balurghat, South Dinajpur",
};

/**
 * Called once during bootstrap when the API /auth/config returns live service pincodes.
 * Allows adding new delivery areas via the admin panel without a frontend redeploy.
 */
export function setServicePincodes(entries: ServicePincodeEntry[]): void {
  if (entries.length > 0) {
    _pincodes = entries.map(e => e.pincode.trim());
    _areas = entries
      .map(e => e.area.toLowerCase().trim())
      .concat(["balurghat", "south dinajpur", "dakshin dinajpur"]);
    for (const e of entries) {
      _names[e.pincode] = e.area ? `${e.area}, ${e.state}` : e.state;
    }
  }
}

export function getServicePincodes(): string[] {
  return _pincodes;
}

export function isServicePincode(pincode: string): boolean {
  if (!pincode) return false;
  const clean = pincode.replace(/\D/g, "").slice(0, 6);
  return _pincodes.includes(clean);
}

export function getServiceAreaName(pincode: string): string {
  return _names[pincode.trim()] ?? "";
}

/**
 * Robust check if a user's address/city/pincode is serviceable.
 * Returns true for all Balurghat/Dakshin Dinajpur areas or any active pincode.
 */
export function isAddressServiceable(address?: { pincode?: string; city?: string; line1?: string; line2?: string } | null): boolean {
  if (!address) return true; // Default to serviceable if no address is set

  const pin = (address.pincode || "").replace(/\D/g, "").slice(0, 6);
  if (pin && _pincodes.includes(pin)) return true;

  const city = (address.city || "").toLowerCase();
  const line1 = (address.line1 || "").toLowerCase();
  const line2 = (address.line2 || "").toLowerCase();

  const fullText = `${city} ${line1} ${line2}`;

  // Check if text matches any active service area keywords
  for (const a of _areas) {
    if (a && fullText.includes(a)) return true;
  }

  // If pincode is non-empty and not in active service pincodes AND city doesn't match Balurghat
  if (pin.length === 6 && !_pincodes.includes(pin)) {
    return false;
  }

  // If city is explicitly set to an unserved major city (Kolkata, Delhi, Mumbai, etc.)
  const UNSERVED_CITIES = ["kolkata", "delhi", "mumbai", "bengaluru", "bangalore", "hyderabad", "chennai", "pune", "patna", "siliguri", "malda", "raiganj"];
  for (const uc of UNSERVED_CITIES) {
    if (city.includes(uc) && !city.includes("balurghat")) return false;
  }

  return true;
}

