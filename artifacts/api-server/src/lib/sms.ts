const FAST2SMS_API_KEY = process.env["FAST2SMS_API_KEY"];
const IS_PRODUCTION = process.env["NODE_ENV"] === "production";

export interface SmsResult {
  success: boolean;
  error?: string;
}

export async function sendOtpSms(phone: string, otp: string): Promise<SmsResult> {
  if (!IS_PRODUCTION) {
    console.info(`[sms] DEV mode — OTP for ${phone}: ${otp}`);
    return { success: true };
  }

  if (!FAST2SMS_API_KEY) {
    return { success: false, error: "FAST2SMS_API_KEY is not set" };
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

    const data = await res.json() as { return?: boolean; message?: string[] | string; request_id?: string };

    if (!res.ok || data.return === false) {
      const msg = Array.isArray(data.message) ? data.message.join("; ") : (data.message ?? `HTTP ${res.status}`);
      return { success: false, error: `Fast2SMS error: ${msg}` };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Fast2SMS network error: ${msg}` };
  }
}
