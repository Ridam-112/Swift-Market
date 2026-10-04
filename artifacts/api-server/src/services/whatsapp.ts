import path from "node:path";
import fs from "node:fs";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WASocket,
  type ConnectionState,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import { logger } from "../lib/logger.js";

// Session directory on local disk — ZERO database writes or queries
const SESSION_DIR = path.resolve(process.cwd(), "data/whatsapp_session");

interface WhatsAppServiceState {
  status: "disconnected" | "connecting" | "qr_ready" | "connected";
  qrCodeDataUrl: string | null;
  connectedPhone: string | null;
  lastConnectedAt: Date | null;
  disconnectReason: string | null;
}

class WhatsAppService {
  private sock: WASocket | null = null;
  private state: WhatsAppServiceState = {
    status: "disconnected",
    qrCodeDataUrl: null,
    connectedPhone: null,
    lastConnectedAt: null,
    disconnectReason: null,
  };
  private isInitializing = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    // Ensure session directory exists
    try {
      if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
      }
    } catch (err) {
      logger.error({ err }, "[WhatsApp] Failed to create session directory");
    }
  }

  public getStatus() {
    return {
      status: this.state.status,
      qr: this.state.qrCodeDataUrl,
      phone: this.state.connectedPhone,
      lastConnectedAt: this.state.lastConnectedAt,
      disconnectReason: this.state.disconnectReason,
    };
  }

  /**
   * Initializes the WhatsApp Baileys connection.
   * Uses disk-based multi-file auth to guarantee zero database load.
   */
  public async init(): Promise<void> {
    if (this.isInitializing || this.state.status === "connected") {
      return;
    }

    this.isInitializing = true;
    this.state.status = "connecting";

    try {
      const { state: authState, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
      const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] as [number, number, number] }));

      // Silent logger to prevent memory spikes & console flooding
      const silentLogger = pino({ level: "silent" });

      this.sock = makeWASocket({
        version,
        logger: silentLogger,
        auth: authState,
        printQRInTerminal: true,
        // Critical: Do NOT sync full history to keep memory & bandwidth close to zero
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        browser: ["SwiftMart POS", "Chrome", "1.0.0"],
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            // Generate base64 Data URL for display in Admin panel
            this.state.qrCodeDataUrl = await QRCode.toDataURL(qr, {
              margin: 2,
              scale: 6,
              color: { dark: "#000000", light: "#ffffff" },
            });
            this.state.status = "qr_ready";
            logger.info("[WhatsApp] QR Code generated successfully. Scan from WhatsApp mobile app.");
          } catch (qrErr) {
            logger.error({ qrErr }, "[WhatsApp] Failed to render QR data URL");
          }
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          this.state.status = "disconnected";
          this.state.connectedPhone = null;
          this.state.qrCodeDataUrl = null;
          this.state.disconnectReason = statusCode ? `Code ${statusCode}` : "Connection closed";

          logger.warn({ statusCode, shouldReconnect }, "[WhatsApp] Connection closed");

          if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            logger.info(`[WhatsApp] Reconnecting in ${delay / 1000}s (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => {
              this.isInitializing = false;
              this.init().catch(() => {});
            }, delay);
          } else if (!shouldReconnect) {
            // Explicitly logged out — clean session directory
            this.clearSession();
            this.isInitializing = false;
          } else {
            this.isInitializing = false;
          }
        } else if (connection === "open") {
          this.state.status = "connected";
          this.state.qrCodeDataUrl = null;
          this.state.lastConnectedAt = new Date();
          this.state.disconnectReason = null;
          this.reconnectAttempts = 0;
          this.isInitializing = false;

          const userJid = this.sock?.user?.id ?? "";
          const phone = userJid.split(":")[0]?.replace(/\D/g, "") || userJid.split("@")[0] || "Unknown";
          this.state.connectedPhone = phone;

          logger.info(`[WhatsApp] 🚀 CONNECTED SUCCESSFULLY to WhatsApp as +${phone}!`);
        }
      });
    } catch (err) {
      this.isInitializing = false;
      this.state.status = "disconnected";
      this.state.disconnectReason = err instanceof Error ? err.message : "Initialization failed";
      logger.error({ err }, "[WhatsApp] Error during socket initialization");
    }
  }

  /**
   * Log out and wipe stored session from disk.
   */
  public async logout(): Promise<void> {
    try {
      if (this.sock) {
        await this.sock.logout().catch(() => {});
        this.sock = null;
      }
    } finally {
      this.clearSession();
      this.state = {
        status: "disconnected",
        qrCodeDataUrl: null,
        connectedPhone: null,
        lastConnectedAt: null,
        disconnectReason: "Logged out by user",
      };
    }
  }

  private clearSession(): void {
    try {
      if (fs.existsSync(SESSION_DIR)) {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        fs.mkdirSync(SESSION_DIR, { recursive: true });
      }
    } catch (err) {
      logger.error({ err }, "[WhatsApp] Failed to clear session directory");
    }
  }

  /**
   * Normalize an Indian phone number to WhatsApp JID (e.g. 919876543210@s.whatsapp.net).
   */
  private formatJid(phone: string): string | null {
    let cleaned = phone.replace(/\D/g, "");
    if (!cleaned) return null;
    if (cleaned.length === 10) {
      cleaned = "91" + cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
      // already 91...
    } else if (cleaned.length === 11 && cleaned.startsWith("0")) {
      cleaned = "91" + cleaned.slice(1);
    }
    return `${cleaned}@s.whatsapp.net`;
  }

  /**
   * Send a plain text message to any phone number.
   */
  public async sendMessage(phone: string, text: string): Promise<boolean> {
    if (this.state.status !== "connected" || !this.sock) {
      logger.warn("[WhatsApp] Cannot send message: WhatsApp is not connected");
      return false;
    }

    const jid = this.formatJid(phone);
    if (!jid) {
      logger.warn({ phone }, "[WhatsApp] Invalid phone number provided");
      return false;
    }

    try {
      await this.sock.sendMessage(jid, { text });
      logger.info({ jid }, "[WhatsApp] Message dispatched successfully");
      return true;
    } catch (err) {
      logger.error({ err, jid }, "[WhatsApp] Failed to send message");
      return false;
    }
  }

  /**
   * Sends a rich new order notification to the vendor with items, total, and 1-tap Accept/Reject links.
   */
  public async sendOrderAlertToVendor(params: {
    vendorPhone: string;
    vendorName?: string;
    shopName: string;
    orderNumber: string;
    orderId: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    items: Array<{
      productName: string;
      qty: number;
      price: number;
      totalPrice?: number;
      selectedWeight?: string;
    }>;
    netAmount: number;
    paymentMethod: string;
  }): Promise<boolean> {
    const {
      vendorPhone,
      shopName,
      orderNumber,
      orderId,
      customerName,
      customerPhone,
      deliveryAddress,
      items,
      netAmount,
      paymentMethod,
    } = params;

    // Compose formatted item list
    const itemsText = items
      .map((it, idx) => {
        const weight = it.selectedWeight ? ` (${it.selectedWeight})` : "";
        const lineTotal = it.totalPrice ?? it.price * it.qty;
        return `${idx + 1}. *${it.productName}${weight}* × ${it.qty} = ₹${lineTotal}`;
      })
      .join("\n");

    const baseUrl = process.env.PUBLIC_APP_URL || "https://swiftmart.space";
    const acceptUrl = `${baseUrl}/vendor/orders?orderId=${orderId}&action=accept`;
    const rejectUrl = `${baseUrl}/vendor/orders?orderId=${orderId}&action=reject`;

    const message = [
      `🔔 *NEW ORDER RECEIVED — SWIFTMART* 🚀`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📦 *Order ID:* #${orderNumber}`,
      `🏪 *Shop:* ${shopName}`,
      `👤 *Customer:* ${customerName} (${customerPhone})`,
      `📍 *Address:* ${deliveryAddress || "Balurghat"}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📋 *ITEMS ORDERED:*`,
      itemsText,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `💰 *Total Bill:* ₹${netAmount} (${paymentMethod.toUpperCase()})`,
      ``,
      `⚡ *TAKE QUICK ACTION:*`,
      `👉 *Accept Order:* ${acceptUrl}`,
      `👉 *Reject Order:* ${rejectUrl}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `_Please accept the order promptly so a delivery partner can be assigned._`,
    ].join("\n");

    return this.sendMessage(vendorPhone, message);
  }
}

export const whatsappService = new WhatsAppService();
