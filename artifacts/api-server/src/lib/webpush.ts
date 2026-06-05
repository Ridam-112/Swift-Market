import webpush from "web-push";

const publicKey  = process.env["VAPID_PUBLIC_KEY"]  ?? "";
const privateKey = process.env["VAPID_PRIVATE_KEY"] ?? "";
const subject    = process.env["VAPID_SUBJECT"]      ?? "mailto:admin@swiftmart.com";

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export { webpush, publicKey as vapidPublicKey };
