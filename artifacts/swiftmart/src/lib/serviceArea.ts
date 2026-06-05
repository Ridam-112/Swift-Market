export function isServicePincode(pincode: string): boolean {
  return /^[1-9]\d{5}$/.test(pincode.trim());
}

export function getServiceAreaName(_pincode: string): string {
  return "";
}
