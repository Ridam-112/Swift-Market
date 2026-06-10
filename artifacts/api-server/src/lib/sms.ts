// OTP_MODE=real  → always call 2Factor (even in Replit preview/dev)
// OTP_MODE=demo  → use 123456 demo code, never call 2Factor
// Default (unset) → demo

export const OTP_MODE: "real" | "demo" =
  process.env["OTP_MODE"] === "real" ? "real" : "demo";

const TWO_FACTOR_API_KEY = process.env["TWO_FACTOR_API_KEY"];

export interface SmsResult {
  success: boolean;
  error?: string;
}

export async function sendOtpSms(phone: string, otp: string): Promise<SmsResult> {
  if (OTP_MODE === "demo") {
    console.info(`[sms] DEMO mode — OTP for ${phone}: ${otp}`);
    return { success: true };
  }

  // OTP_MODE=real — must call 2Factor, no fallback
  if (!TWO_FACTOR_API_KEY) {
    return { success: false, error: "OTP_MODE=real but TWO_FACTOR_API_KEY is not set. Add it to Replit Secrets." };
  }

  try {
    const url = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${phone}/${otp}`;
    const res = await fetch(url);

    const raw = await res.text();
    let data: { Status?: string; Details?: string };
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      return { success: false, error: `2Factor non-JSON response (HTTP ${res.status}): ${raw.slice(0, 200)}` };
    }

    if (!res.ok || data.Status !== "Success") {
      return { success: false, error: `2Factor error: ${data.Details ?? data.Status ?? `HTTP ${res.status}`}` };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `2Factor network error: ${msg}` };
  }
}
