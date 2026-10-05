import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  generateWAMessageFromContent,
  proto,
  type WASocket,
  type ConnectionState,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import { logger } from "../lib/logger.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

// Detect serverless environment (Vercel / Lambda) where only /tmp is writable
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

const SESSION_DIR = isServerless
  ? path.resolve(os.tmpdir(), "whatsapp_session")
  : path.resolve(process.cwd(), "data/whatsapp_session");

interface WhatsAppServiceState {
  status: "disconnected" | "connecting" | "qr_ready" | "connected";
  qrCodeDataUrl: string | null;
  connectedPhone: string | null;
  lastConnectedAt: Date | null;
  disconnectReason: string | null;
}

let isGatewayTableEnsured = false;
async function ensureGatewayTable(): Promise<void> {
  if (isGatewayTableEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS whatsapp_gateway_state (
        id TEXT PRIMARY KEY DEFAULT 'current',
        status TEXT NOT NULL,
        qr TEXT,
        phone TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    isGatewayTableEnsured = true;
  } catch (err) {
    logger.warn({ err }, "[WhatsApp] Non-fatal: Could not ensure whatsapp_gateway_state table");
  }
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
  private qrListeners: Array<(status: ReturnType<WhatsAppService["getStatus"]>) => void> = [];

  constructor() {
    this.ensureSessionDir();
  }

  private ensureSessionDir(): void {
    try {
      if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
      }
    } catch (err) {
      logger.error({ err }, "[WhatsApp] Failed to create session directory");
    }
  }

  private notifyListeners(): void {
    const current = this.getStatus();
    for (const listener of [...this.qrListeners]) {
      try {
        listener(current);
      } catch {
        // ignore listener errors
      }
    }
  }

  private async syncGatewayStateToDb(): Promise<void> {
    try {
      await ensureGatewayTable();
      await db.execute(sql`
        INSERT INTO whatsapp_gateway_state (id, status, qr, phone, updated_at)
        VALUES (
          'current',
          ${this.state.status},
          ${this.state.qrCodeDataUrl},
          ${this.state.connectedPhone},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET status = EXCLUDED.status,
            qr = EXCLUDED.qr,
            phone = EXCLUDED.phone,
            updated_at = NOW();
      `);
    } catch {
      // Non-fatal
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

  public async getStatusAsync(): Promise<ReturnType<WhatsAppService["getStatus"]>> {
    // If memory has an active QR or is connected, return immediately
    if (this.state.status === "connected" || this.state.qrCodeDataUrl) {
      return this.getStatus();
    }

    // Check shared database state across serverless instances
    try {
      await ensureGatewayTable();
      const res = await db.execute(sql`
        SELECT status, qr, phone, updated_at
        FROM whatsapp_gateway_state
        WHERE id = 'current'
        LIMIT 1;
      `);
      const row = (res as any)?.rows?.[0];
      if (row) {
        const updatedAt = new Date(row.updated_at).getTime();
        const isFresh = Date.now() - updatedAt < 120000; // QR valid for 2 min
        if (row.status === "connected" || (row.qr && isFresh)) {
          return {
            status: row.status as WhatsAppServiceState["status"],
            qr: isFresh ? row.qr : null,
            phone: row.phone,
            lastConnectedAt: this.state.lastConnectedAt,
            disconnectReason: this.state.disconnectReason,
          };
        }
      }
    } catch {
      // Non-fatal
    }

    return this.getStatus();
  }

  public waitForQrOrStatus(timeoutMs = 9000): Promise<ReturnType<WhatsAppService["getStatus"]>> {
    if (this.state.qrCodeDataUrl || this.state.status === "connected") {
      return Promise.resolve(this.getStatus());
    }

    return new Promise((resolve) => {
      let resolved = false;
      let timer: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        this.qrListeners = this.qrListeners.filter((l) => l !== onUpdate);
      };

      const onUpdate = (st: ReturnType<WhatsAppService["getStatus"]>) => {
        if (!resolved && (st.qr || st.status === "connected" || st.status === "disconnected")) {
          resolved = true;
          cleanup();
          resolve(st);
        }
      };

      timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(this.getStatus());
        }
      }, timeoutMs);

      this.qrListeners.push(onUpdate);
    });
  }

  public waitForConnection(timeoutMs = 20000): Promise<ReturnType<WhatsAppService["getStatus"]>> {
    if (this.state.status === "connected") {
      return Promise.resolve(this.getStatus());
    }

    return new Promise((resolve) => {
      let resolved = false;
      let timer: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        this.qrListeners = this.qrListeners.filter((l) => l !== onUpdate);
      };

      const onUpdate = (st: ReturnType<WhatsAppService["getStatus"]>) => {
        if (!resolved && st.status === "connected") {
          resolved = true;
          cleanup();
          resolve(st);
        }
      };

      timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(this.getStatus());
        }
      }, timeoutMs);

      this.qrListeners.push(onUpdate);
    });
  }

  /**
   * Initializes the WhatsApp Baileys connection.
   */
  public async init(): Promise<void> {
    if (this.state.status === "connected") {
      return;
    }
    if (this.isInitializing) {
      return;
    }

    this.ensureSessionDir();
    this.isInitializing = true;
    this.state.status = "connecting";
    void this.syncGatewayStateToDb();
    this.notifyListeners();

    try {
      const { state: authState, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
      const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] as [number, number, number] }));

      // Silent logger to prevent memory spikes & console flooding
      const silentLogger = pino({ level: "silent" });

      if (this.sock) {
        try {
          this.sock.end(undefined);
        } catch {}
        this.sock = null;
      }

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
            void this.syncGatewayStateToDb();
            this.notifyListeners();
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
          void this.syncGatewayStateToDb();
          this.notifyListeners();

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
          void this.syncGatewayStateToDb();
          this.notifyListeners();
        }
      });
    } catch (err) {
      this.isInitializing = false;
      this.state.status = "disconnected";
      this.state.disconnectReason = err instanceof Error ? err.message : "Initialization failed";
      logger.error({ err }, "[WhatsApp] Error during socket initialization");
      void this.syncGatewayStateToDb();
      this.notifyListeners();
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
      void this.syncGatewayStateToDb();
      this.notifyListeners();
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
   * Ensures the Baileys socket is connected.
   * If not connected but session credentials exist on disk or DB indicates connected,
   * attempts to initialize and waits up to timeoutMs.
   */
  public async ensureConnected(timeoutMs = 6000): Promise<boolean> {
    if (this.state.status === "connected" && this.sock) {
      return true;
    }

    const credsPath = path.join(SESSION_DIR, "creds.json");
    const hasCreds = fs.existsSync(credsPath);

    if (!hasCreds) {
      const dbStatus = await this.getStatusAsync();
      if (dbStatus.status !== "connected") {
        return false;
      }
    }

    if (!this.sock && !this.isInitializing) {
      logger.info("[WhatsApp] Socket disconnected. Auto-restoring connection using stored session...");
      void this.init();
    }

    const result = await this.waitForConnection(timeoutMs);
    return result.status === "connected" && this.sock !== null;
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
      const reconnected = await this.ensureConnected();
      if (!reconnected || !this.sock) {
        logger.warn("[WhatsApp] Cannot send message: WhatsApp is not connected");
        return false;
      }
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
   * Send an interactive message with CTA buttons (like Amazon/WhatsApp Business).
   * Renders native action buttons directly at the bottom of the card.
   * Seamlessly falls back to formatted text with links if the client does not support native flow.
   */
  public async sendInteractiveButtonsMessage(
    phone: string,
    params: {
      header?: string;
      body: string;
      footer?: string;
      buttons: Array<{
        type: "url" | "quick_reply";
        text: string;
        url?: string;
        id?: string;
      }>;
    }
  ): Promise<boolean> {
    if (this.state.status !== "connected" || !this.sock) {
      const reconnected = await this.ensureConnected();
      if (!reconnected || !this.sock) {
        logger.warn("[WhatsApp] Cannot send interactive message: WhatsApp is not connected");
        return false;
      }
    }

    const jid = this.formatJid(phone);
    if (!jid) {
      logger.warn({ phone }, "[WhatsApp] Invalid phone number provided");
      return false;
    }

    try {
      const nativeButtons = params.buttons.map((btn) => {
        if (btn.type === "url" && btn.url) {
          return {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: btn.text,
              url: btn.url,
              merchant_url: btn.url,
            }),
          };
        }
        return {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: btn.text,
            id: btn.id || btn.text,
          }),
        };
      });

      const interactiveMsg = proto.Message.InteractiveMessage.create({
        body: proto.Message.InteractiveMessage.Body.create({
          text: params.body,
        }),
        footer: proto.Message.InteractiveMessage.Footer.create({
          text: params.footer || "SwiftMart Order Automation",
        }),
        header: proto.Message.InteractiveMessage.Header.create({
          title: params.header || "SwiftMart Notification",
          hasMediaAttachment: false,
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
          buttons: nativeButtons,
        }),
      });

      const waMsg = generateWAMessageFromContent(
        jid,
        {
          viewOnceMessage: {
            message: {
              interactiveMessage: interactiveMsg,
            },
          },
        },
        { userJid: this.sock.user?.id || jid }
      );

      await this.sock.relayMessage(jid, waMsg.message!, { messageId: waMsg.key.id! });
      logger.info({ jid }, "[WhatsApp] Interactive button message dispatched successfully");
      return true;
    } catch (err) {
      logger.warn({ err, jid }, "[WhatsApp] Failed to dispatch interactive button message, falling back to text");
      let fallbackText = `${params.header ? `${params.header}\n\n` : ""}${params.body}`;
      if (params.buttons.length > 0) {
        fallbackText += "\n\n━━━━━━━━━━━━━━━━━━━━━━\n⚡ *ACTIONS:*\n";
        for (const b of params.buttons) {
          if (b.type === "url" && b.url) {
            fallbackText += `👉 *${b.text}:* ${b.url}\n`;
          }
        }
      }
      return this.sendMessage(phone, fallbackText);
    }
  }

  /**
   * Sends a rich new order notification to the vendor with native 1-tap Accept/Reject buttons.
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
    const acceptUrl = `${baseUrl}/api/v1/whatsapp/order-action?orderId=${orderId}&action=accept`;
    const rejectUrl = `${baseUrl}/api/v1/whatsapp/order-action?orderId=${orderId}&action=reject`;
    const dashboardUrl = `${baseUrl}/vendor/orders`;

    const bodyText = [
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
      `_Tap an option button below to accept or reject the order promptly._`,
    ].join("\n");

    return this.sendInteractiveButtonsMessage(vendorPhone, {
      header: `🔔 *NEW ORDER RECEIVED — SWIFTMART* 🚀`,
      body: bodyText,
      footer: `SwiftMart 1-Tap Order Actions`,
      buttons: [
        {
          type: "url",
          text: "✅ Accept Order",
          url: acceptUrl,
        },
        {
          type: "url",
          text: "❌ Reject Order",
          url: rejectUrl,
        },
        {
          type: "url",
          text: "📊 Open Dashboard",
          url: dashboardUrl,
        },
      ],
    });
  }

  /**
   * Sends a WhatsApp update to the shop owner after they accept an order,
   * containing a 1-tap "🛵 Order is Ready — Call Rider" CTA button.
   */
  public async sendOrderPreparingToVendor(params: {
    vendorPhone: string;
    vendorName?: string;
    shopName: string;
    orderNumber: string;
    orderId: string;
    itemCount: number;
    netAmount?: number;
  }): Promise<boolean> {
    const {
      vendorPhone,
      shopName,
      orderNumber,
      orderId,
      itemCount,
      netAmount,
    } = params;

    const baseUrl = process.env.PUBLIC_APP_URL || "https://swiftmart.space";
    const readyCallRiderUrl = `${baseUrl}/api/v1/whatsapp/order-action?orderId=${orderId}&action=ready_call_rider`;
    const dashboardUrl = `${baseUrl}/vendor/orders`;

    const bodyText = [
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📦 *Order ID:* #${orderNumber}`,
      `🏪 *Shop:* ${shopName}`,
      `📋 *Total Items:* ${itemCount} item${itemCount > 1 ? "s" : ""}`,
      netAmount != null ? `💰 *Amount:* ₹${netAmount}` : null,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🍳 *NEXT ACTION REQUIRED:*`,
      `Please pack the items carefully at your store.`,
      ``,
      `*When the order is packed and ready:*`,
      `👉 Tap *🛵 Order is Ready — Call Rider* below.`,
      `This will immediately summon a delivery partner to your store counter for pickup.`,
    ].filter(Boolean).join("\n");

    return this.sendInteractiveButtonsMessage(vendorPhone, {
      header: `👨‍🍳 *ORDER IN PREPARATION — SWIFTMART*`,
      body: bodyText,
      footer: `SwiftMart Quick Commerce Dispatch`,
      buttons: [
        {
          type: "url",
          text: "🛵 Order Ready — Call Rider",
          url: readyCallRiderUrl,
        },
        {
          type: "url",
          text: "📊 View on Dashboard",
          url: dashboardUrl,
        },
      ],
    });
  }

  /**
   * Sends a confirmation WhatsApp alert to the shop owner once they tap "Order is Ready",
   * confirming rider dispatch and reminding them to have the Store Pickup QR ready.
   */
  public async sendRiderDispatchedToVendor(params: {
    vendorPhone: string;
    shopName: string;
    orderNumber: string;
    orderId: string;
    riderName?: string;
  }): Promise<boolean> {
    const {
      vendorPhone,
      shopName,
      orderNumber,
      orderId,
      riderName,
    } = params;

    const baseUrl = process.env.PUBLIC_APP_URL || "https://swiftmart.space";
    const qrUrl = `${baseUrl}/vendor/settings`;
    const dashboardUrl = `${baseUrl}/vendor/orders`;

    const riderLine = riderName
      ? `🛵 *Rider Assigned:* ${riderName}`
      : `🛵 *Status:* Delivery partner summoned & en route`;

    const bodyText = [
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📦 *Order ID:* #${orderNumber}`,
      `🏪 *Shop:* ${shopName}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      riderLine,
      `A delivery partner is heading to your store counter now.`,
      ``,
      `📱 *COUNTER PICKUP:*`,
      `Please keep the packed parcel ready. The rider will scan your *Store Pickup QR poster* at the counter to verify items and collect the order.`,
    ].join("\n");

    return this.sendInteractiveButtonsMessage(vendorPhone, {
      header: `🛵 *DELIVERY RIDER SUMMONED!* ⚡`,
      body: bodyText,
      footer: `SwiftMart Counter Pickup`,
      buttons: [
        {
          type: "url",
          text: "🏪 Store Pickup QR",
          url: qrUrl,
        },
        {
          type: "url",
          text: "📊 Orders Dashboard",
          url: dashboardUrl,
        },
      ],
    });
  }

  /**
   * Sends an automated WhatsApp alert to the CUSTOMER when the order is marked ready
   * and a delivery rider is summoned to pick it up.
   */
  public async sendOrderReadyToCustomer(params: {
    customerPhone: string;
    customerName: string;
    shopName: string;
    orderNumber: string;
    orderId: string;
    riderName?: string;
  }): Promise<boolean> {
    const {
      customerPhone,
      customerName,
      shopName,
      orderNumber,
      orderId,
      riderName,
    } = params;

    const baseUrl = process.env.PUBLIC_APP_URL || "https://swiftmart.space";
    const trackUrl = `${baseUrl}/orders?track=${orderId}`;

    const riderLine = riderName
      ? `🛵 *Delivery Partner:* ${riderName} is picking up your order!`
      : `🛵 *Delivery Partner:* Summoned and heading to ${shopName} for pickup!`;

    const body = [
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Great news, *${customerName || "Customer"}*! 🎉`,
      `Your order from *${shopName}* is packed and ready!`,
      ``,
      `📦 *Order ID:* #${orderNumber}`,
      riderLine,
      `⏱️ *Estimated Delivery:* Within 15–25 Mins`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `You can track the live GPS location of your delivery below.`,
      ``,
      `_Thank you for choosing SwiftMart!_`,
    ].join("\n");

    return this.sendInteractiveButtonsMessage(customerPhone, {
      header: `🎉 *ORDER PACKED & READY!* 🛵`,
      body,
      footer: `SwiftMart Live Tracking`,
      buttons: [
        {
          type: "url",
          text: "📍 Track Live Delivery",
          url: trackUrl,
        },
      ],
    });
  }

  /**
   * Determine if an order is an E-Commerce / Mall order (vs Quick Commerce)
   */
  public isEcommerceOrder(order: {
    deliveryType?: string | null;
    items?: any;
    shopType?: string | null;
  }): boolean {
    const dt = (order.deliveryType || "").toLowerCase();
    if (
      dt.includes("ecom") ||
      dt.includes("mall") ||
      dt.includes("courier") ||
      dt.includes("post") ||
      dt.includes("pan_india") ||
      dt.includes("heavy") ||
      dt.includes("7day") ||
      dt.includes("standard_ecom")
    ) {
      return true;
    }

    const st = (order.shopType || "").toLowerCase();
    if (st.includes("mall") || st.includes("ecommerce") || st.includes("super_store")) {
      return true;
    }

    if (Array.isArray(order.items)) {
      const hasMallOrHeavy = order.items.some((it: any) =>
        it.isHeavy === true ||
        it.deliveryType === "heavy_1_3d" ||
        it.deliveryType === "ecommerce" ||
        (typeof it.deliveryDays === "number" && it.deliveryDays >= 3)
      );
      if (hasMallOrHeavy) return true;
    }

    return false;
  }

  /**
   * Sends an automated WhatsApp alert to the CUSTOMER when their order is accepted by the shop owner.
   * - Quick Commerce: Estimated delivery 30–45 mins
   * - E-Commerce: Estimated delivery in 5–7 days
   */
  public async sendOrderAcceptedToCustomer(params: {
    customerPhone: string;
    customerName: string;
    shopName: string;
    orderNumber: string;
    orderId: string;
    isEcommerce?: boolean;
    netAmount?: number;
    items?: Array<{ productName?: string; name?: string; qty?: number }>;
  }): Promise<boolean> {
    const {
      customerPhone,
      customerName,
      shopName,
      orderNumber,
      orderId,
      isEcommerce = false,
      netAmount,
      items,
    } = params;


    let itemsPreview = "";
    if (Array.isArray(items) && items.length > 0) {
      const names = items
        .slice(0, 3)
        .map(i => `${i.productName || i.name || "Item"} (×${i.qty || 1})`)
        .join(", ");
      const extra = items.length > 3 ? ` +${items.length - 3} more` : "";
      itemsPreview = `\n📋 *Items:* ${names}${extra}`;
    }

    const amountLine = netAmount != null ? `\n💰 *Total Amount:* ₹${netAmount}` : "";

    const baseUrl = process.env.PUBLIC_APP_URL || "https://swiftmart.space";
    const trackUrl = `${baseUrl}/orders?track=${orderId}`;
    const shopUrl = `${baseUrl}/shops`;

    const body = isEcommerce
      ? [
          `━━━━━━━━━━━━━━━━━━━━━━`,
          `Hello *${customerName || "Customer"}*, your order from *${shopName}* has been accepted!`,
          ``,
          `📦 *Order ID:* #${orderNumber}`,
          `🚚 *Delivery Estimate:* 5–7 Days (Standard Dispatch)`,
          `📋 *Status:* Confirmed & being prepared for shipment${itemsPreview}${amountLine}`,
          `━━━━━━━━━━━━━━━━━━━━━━`,
          `You will receive another update when your package is handed over to the courier partner.`,
          ``,
          `_Thank you for choosing SwiftMart!_`,
        ].join("\n")
      : [
          `━━━━━━━━━━━━━━━━━━━━━━`,
          `Hello *${customerName || "Customer"}*, your order from *${shopName}* has been accepted!`,
          ``,
          `📦 *Order ID:* #${orderNumber}`,
          `⏱️ *Delivery Estimate:* Within 30–45 Mins`,
          `👨‍🍳 *Status:* Order Accepted — Kitchen / Shop is now preparing your items!${itemsPreview}${amountLine}`,
          `━━━━━━━━━━━━━━━━━━━━━━`,
          `We will notify you once items are packed and the delivery partner is summoned.`,
          ``,
          `_Thank you for choosing SwiftMart!_`,
        ].join("\n");

    return this.sendInteractiveButtonsMessage(customerPhone, {
      header: isEcommerce ? `🔔 *ORDER ACCEPTED — SWIFTMART* 📦` : `🔔 *ORDER ACCEPTED — SWIFTMART* 🚀`,
      body,
      footer: `SwiftMart Live Tracking`,
      buttons: [
        {
          type: "url",
          text: "📍 Track Live Order",
          url: trackUrl,
        },
        {
          type: "url",
          text: "🛍️ Explore Stores",
          url: shopUrl,
        },
      ],
    });
  }

  /**
   * Sends an automated WhatsApp alert to the CUSTOMER when an E-Commerce order is shipped.
   */
  public async sendOrderShippedToCustomer(params: {
    customerPhone: string;
    customerName: string;
    shopName: string;
    orderNumber: string;
    orderId: string;
    courierName?: string;
    trackingNumber?: string;
  }): Promise<boolean> {
    const {
      customerPhone,
      customerName,
      shopName,
      orderNumber,
      orderId,
      courierName,
      trackingNumber,
    } = params;

    const baseUrl = process.env.PUBLIC_APP_URL || "https://swiftmart.space";
    const trackUrl = `${baseUrl}/orders?track=${orderId}`;

    const courierDetails = [
      courierName ? `🚛 *Courier Partner:* ${courierName}` : null,
      trackingNumber ? `🔍 *Tracking No:* ${trackingNumber}` : null,
    ].filter(Boolean).join("\n");

    const body = [
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Hello *${customerName || "Customer"}*, your order #${orderNumber} from *${shopName}* has been shipped!`,
      ``,
      `📦 *Order ID:* #${orderNumber}`,
      `📅 *Estimated Delivery:* Within 5–7 Days`,
      courierDetails ? `${courierDetails}` : null,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `_Thank you for shopping on SwiftMart!_`,
    ].filter(Boolean).join("\n");

    return this.sendInteractiveButtonsMessage(customerPhone, {
      header: `🚚 *ORDER SHIPPED! — SWIFTMART* 📦`,
      body,
      footer: `SwiftMart Shipment Tracking`,
      buttons: [
        {
          type: "url",
          text: "📦 Track Your Shipment",
          url: trackUrl,
        },
      ],
    });
  }

  /**
   * Sends an automated WhatsApp alert to the CUSTOMER when their order is delivered,
   * asking for a review and rating.
   */
  public async sendOrderDeliveredToCustomer(params: {
    customerPhone: string;
    customerName: string;
    shopName: string;
    orderNumber: string;
    orderId: string;
  }): Promise<boolean> {
    const {
      customerPhone,
      customerName,
      shopName,
      orderNumber,
      orderId,
    } = params;

    const baseUrl = process.env.PUBLIC_APP_URL || "https://swiftmart.space";
    const reviewUrl = `${baseUrl}/orders?review=${orderId}`;
    const shopUrl = `${baseUrl}/shops`;

    const body = [
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Hello *${customerName || "Customer"}*, your order #${orderNumber} from *${shopName}* has been successfully delivered!`,
      ``,
      `We hope you loved your items! 🥰`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `⭐ *HOW WAS YOUR EXPERIENCE?*`,
      `Please take a moment to share your review and rating for the shop & products. Your feedback helps our community!`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `_Thank you for supporting local businesses on SwiftMart!_`,
    ].join("\n");

    return this.sendInteractiveButtonsMessage(customerPhone, {
      header: `🎉 *ORDER DELIVERED! — SWIFTMART* ✨`,
      body,
      footer: `SwiftMart Customer Reviews`,
      buttons: [
        {
          type: "url",
          text: "⭐ Leave a Review",
          url: reviewUrl,
        },
        {
          type: "url",
          text: "🛍️ Order Again",
          url: shopUrl,
        },
      ],
    });
  }
}

export const whatsappService = new WhatsAppService();
