export const SERVICE_PINCODES = ["733101", "733103"];

export const SERVICE_AREA_NAMES: Record<string, string> = {
  "733101": "Balurghat, South Dinajpur",
  "733103": "Balurghat, South Dinajpur",
};

export function isServicePincode(pincode: string): boolean {
  return SERVICE_PINCODES.includes(pincode.trim());
}

export function getServiceAreaName(pincode: string): string {
  return SERVICE_AREA_NAMES[pincode.trim()] ?? "";
}
