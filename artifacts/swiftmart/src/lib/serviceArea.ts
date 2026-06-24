let _pincodes: string[] = ["733101", "733103"];

const _names: Record<string, string> = {
  "733101": "Balurghat, South Dinajpur",
  "733103": "Balurghat, South Dinajpur",
};

/**
 * Called once during bootstrap when the API /auth/config returns live service pincodes.
 * Allows adding new delivery areas via SERVICE_PINCODES env var without a frontend redeploy.
 */
export function setServicePincodes(pincodes: string[]): void {
  if (pincodes.length > 0) _pincodes = pincodes;
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
