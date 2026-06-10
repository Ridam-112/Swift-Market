// OTP_MODE=real  → always call Fast2SMS (even in Replit preview/dev)
// OTP_MODE=demo  → use 123456 demo code, never call Fast2SMS
// Default (unset) → demo

export const OTP_MODE: "real" | "demo" =
  process.env["OTP_MODE"] === "real" ? "real" : "demo";

const FAST2SMS_API_KEY = process.env["FAST2SMS_API_KEY"];

export interface SmsResult {
  success: boolean;
  error?: string;
}

export async function sendOtpSms(phone: string, otp: string): Promise<SmsResult> {
  if (OTP_MODE === "demo") {
    console.info(`[sms] DEMO mode — OTP for ${phone}: ${otp}`);
    return { success: true };
  }

  // OTP_MODE=real — must call Fast2SMS, no fallback
  if (!FAST2SMS_API_KEY) {
    return { success: false, error: "OTP_MODE=real but FAST2SMS_API_KEY is not set. Add it to Replit Secrets." };
  }

  try {
    const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        Authorization: FAST2SMS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "otp",
        variables_values: otp,
        numbers: phone,
      }),
    });

    const raw = await res.text();
    let data: { return?: boolean; message?: string[] | string; request_id?: string };
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      return { success: false, error: `Fast2SMS non-JSON response (HTTP ${res.status}): ${raw.slice(0, 200)}` };
    }

    if (!res.ok || data.return === false) {
      const msg = Array.isArray(data.message)
        ? data.message.join("; ")
        : (data.message ?? `HTTP ${res.status}`);
      return { success: false, error: `Fast2SMS error: ${msg}` };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Fast2SMS network error: ${msg}` };
  }
}
