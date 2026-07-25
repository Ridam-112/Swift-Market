/**
 * Capacitor bridge for the native Truecaller Android plugin.
 *
 * This module is ONLY imported on native Android (isCapacitorShell === true).
 * It is lazy-loaded so it never executes on web builds.
 *
 * Usage:
 *   const { login, isAvailable } = await import("@/lib/truecallerNativeAuth");
 *   const available = await isAvailable();
 *   if (available) {
 *     const profile = await login();
 *     // profile.accessToken → POST /api/auth/truecaller
 *   }
 */

import { registerPlugin } from "@capacitor/core";

interface TruecallerPlugin {
  /** Open the Truecaller bottom-sheet consent UI and return the profile on success. */
  login(): Promise<{
    accessToken: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    countryCode: string;
  }>;
  /** Returns true if the Truecaller app is installed and the SDK is usable. */
  isAvailable(): Promise<{ available: boolean }>;
}

const TruecallerNative = registerPlugin<TruecallerPlugin>("Truecaller");

/**
 * Initiates Truecaller login. Resolves with the user profile on success.
 * Throws if Truecaller is not installed or user declines.
 */
export async function truecallerLogin(): Promise<{
  accessToken: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  countryCode: string;
}> {
  return TruecallerNative.login();
}

/**
 * Returns true when the Truecaller app is installed and usable.
 * Use this to decide whether to show the "Continue with Truecaller" button.
 */
export async function isTruecallerAvailable(): Promise<boolean> {
  try {
    const { available } = await TruecallerNative.isAvailable();
    return available;
  } catch {
    return false;
  }
}
