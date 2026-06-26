export interface ServicePincodeEntry {
  pincode: string;
  area: string;
  state: string;
}

let _pincodes: string[] = ["733101", "733102", "733103"];

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
    _pincodes = entries.map(e => e.pincode);
    for (const e of entries) {
      _names[e.pincode] = e.area ? `${e.area}, ${e.state}` : e.state;
    }
  }
}

export function getServicePincodes(): string[] {
  return _pincodes;
}

export function isServicePincode(pincode: string): boolean {
  return _pincodes.includes(pincode.trim());
}

export function getServiceAreaName(pincode: string): string {
  return _names[pincode.trim()] ?? "";
}
