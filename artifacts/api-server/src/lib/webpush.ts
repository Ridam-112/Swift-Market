import webpush from "web-push";

const publicKey  = process.env["VAPID_PUBLIC_KEY"]  ?? "";
const privateKey = process.env["VAPID_PRIVATE_KEY"] ?? "";
const subject    = process.env["VAPID_SUBJECT"]      ?? "mailto:admin@swiftmart.com";

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch (err) {
    console.warn("[webpush] VAPID key configuration failed — push notifications will be disabled:", (err as Error).message);
  }
}

export { webpush, publicKey as vapidPublicKey };
