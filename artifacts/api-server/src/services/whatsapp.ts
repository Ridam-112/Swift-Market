import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";

export function generateWhatsAppActionToken(orderId: string, action: string): string {
  const secret = process.env.JWT_SECRET || "swiftmart-wa-action-token-secret";
  return crypto.createHmac("sha256", secret).update(`${orderId}:${action}`).digest("hex").slice(0, 32);
}

export function verifyWhatsAppActionToken(orderId: string, action: string, token?: string): boolean {
  if (!token || typeof token !== "string") return false;
  const expected = generateWhatsAppActionToken(orderId, action);
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}
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
        connected_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS whatsapp_session_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    isGatewayTableEnsured = true;
  } catch (err) {
    logger.warn({ err }, "[WhatsApp] Non-fatal: Could not ensure whatsapp tables");
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
  private qrListeners: Array<(status: ReturnType<WhatsAppService["getStatus"]>) => void> = [];
  private syncTimeout: NodeJS.Timeout | null = null;

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

  private scheduleDbSync(): void {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(() => {
      void this.persistSessionToDb();
    }, 1500);
  }

  /**
   * Restores all stored session files from PostgreSQL into local SESSION_DIR.
   * Returns true if creds.json exists and was restored.
   */
  public async restoreSessionFromDb(): Promise<boolean> {
    try {
      await ensureGatewayTable();
      const res = await db.execute(sql`SELECT key, value FROM whatsapp_session_store;`);
      const rows = (res as any)?.rows as Array<{ key: string; value: string }> | undefined;
      if (!rows || rows.length === 0) {
        return false;
      }

      this.ensureSessionDir();
      let hasCreds = false;
      for (const row of rows) {
        if (!row.key || !row.value) continue;
        const filePath = path.join(SESSION_DIR, row.key);
        try {
          fs.writeFileSync(filePath, row.value, "utf8");
          if (row.key === "creds.json") {
            hasCreds = true;
          }
        } catch {}
      }
      logger.info({ fileCount: rows.length, hasCreds }, "[WhatsApp] Restored 30-day session files from PostgreSQL database");
      return hasCreds;
    } catch (err) {
      logger.warn({ err }, "[WhatsApp] Failed to restore session from DB");
      return false;
    }
  }

  /**
   * Persists all session JSON files from SESSION_DIR into PostgreSQL whatsapp_session_store.
   */
  public async persistSessionToDb(): Promise<void> {
    try {
      await ensureGatewayTable();
      if (!fs.existsSync(SESSION_DIR)) return;
      const files = fs.readdirSync(SESSION_DIR);
      if (!files.includes("creds.json")) return;

      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const filePath = path.join(SESSION_DIR, file);
        try {
          const content = fs.readFileSync(filePath, "utf8");
          await db.execute(sql`
            INSERT INTO whatsapp_session_store (key, value, updated_at)
            VALUES (${file}, ${content}, NOW())
            ON CONFLICT (key) DO UPDATE
            SET value = EXCLUDED.value,
                updated_at = NOW();
          `);
        } catch {}
      }
      logger.info({ fileCount: files.length }, "[WhatsApp] Synced active session to PostgreSQL database");
    } catch (err) {
      logger.warn({ err }, "[WhatsApp] Failed to persist session to DB");
    }
  }

  private async syncGatewayStateToDb(): Promise<void> {
    try {
      await ensureGatewayTable();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day validity
      await db.execute(sql`
        INSERT INTO whatsapp_gateway_state (id, status, qr, phone, connected_at, expires_at, updated_at)
        VALUES (
          'current',
          ${this.state.status},
          ${this.state.qrCodeDataUrl},
          ${this.state.connectedPhone},
          ${this.state.lastConnectedAt ? this.state.lastConnectedAt.toISOString() : null},
          ${this.state.status === "connected" ? expiresAt.toISOString() : null},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET status = EXCLUDED.status,
            qr = EXCLUDED.qr,
            phone = EXCLUDED.phone,
            connected_at = COALESCE(EXCLUDED.connected_at, whatsapp_gateway_state.connected_at),
            expires_at = COALESCE(EXCLUDED.expires_at, whatsapp_gateway_state.expires_at),
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
      expiresAt: this.state.status === "connected" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      sessionDurationDays: 30,
    };
  }

  public async getStatusAsync(): Promise<ReturnType<WhatsAppService["getStatus"]>> {
    // If memory has an active QR or is connected, return immediately
    if (this.state.status === "connected" || this.state.qrCodeDataUrl) {
      return this.getStatus();
    }

    try {
      await ensureGatewayTable();
      const credRows = await db.execute(sql`
        SELECT 1 FROM whatsapp_session_store WHERE key = 'creds.json' LIMIT 1;
      `).then(r => (r as any)?.rows || []);

      const hasDbSession = credRows.length > 0;

      const res = await db.execute(sql`
        SELECT status, qr, phone, connected_at, expires_at, updated_at
        FROM whatsapp_gateway_state
        WHERE id = 'current'
        LIMIT 1;
      `);
      const row = (res as any)?.rows?.[0];

      if (hasDbSession) {
        // Persistent credentials exist in PostgreSQL — trigger auto-restore in background if socket not running
        if (!this.sock && !this.isInitializing) {
          logger.info("[WhatsApp] Persistent 30-day session found in DB. Auto-restoring connection...");
          void this.init();
        }

        return {
          status: (row?.status === "connected" ? "connected" : "connecting") as WhatsAppServiceState["status"],
          qr: null, // Never flash QR code when session is saved!
          phone: row?.phone || this.state.connectedPhone,
          lastConnectedAt: row?.connected_at ? new Date(row.connected_at) : this.state.lastConnectedAt,
          disconnectReason: null,
          expiresAt: row?.expires_at ? new Date(row.expires_at).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          sessionDurationDays: 30,
        };
      }

      if (row) {
        const updatedAt = new Date(row.updated_at).getTime();
        const isFresh = Date.now() - updatedAt < 120000; // QR valid for 2 min
        if (row.qr && isFresh) {
          return {
            status: "qr_ready",
            qr: row.qr,
            phone: row.phone,
            lastConnectedAt: null,
            disconnectReason: null,
            expiresAt: null,
            sessionDurationDays: 30,
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
      // 1. Restore persistent session files from PostgreSQL if creds.json is not on disk
      const credsPath = path.join(SESSION_DIR, "creds.json");
      if (!fs.existsSync(credsPath)) {
        await this.restoreSessionFromDb();
      }

      const { state: authState, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

      // Auto-sync keys to PostgreSQL on every key update
      const originalKeysSet = authState.keys.set;
      authState.keys.set = async (data: any) => {
        await originalKeysSet(data);
        this.scheduleDbSync();
      };

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
        printQRInTerminal: false,
        // Critical: Do NOT sync full history to keep memory & bandwidth close to zero
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        browser: ["SwiftMart Central", "Chrome", "120.0.0"],
      });

      this.sock.ev.on("creds.update", async () => {
        await saveCreds();
        this.scheduleDbSync();
      });

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

          if (shouldReconnect) {
            this.reconnectAttempts++;
            // Reconnect indefinitely with exponential backoff (capped at 30 seconds)
            const delay = Math.min(2000 * Math.pow(1.4, Math.min(this.reconnectAttempts, 8)), 30000);
            logger.info(`[WhatsApp] Reconnecting in ${Math.round(delay / 1000)}s (Attempt ${this.reconnectAttempts})...`);
            setTimeout(() => {
              this.isInitializing = false;
              this.init().catch(() => {});
            }, delay);
          } else {
            logger.warn("[WhatsApp] Session explicitly logged out by user. Purging session storage.");
            void this.clearSession();
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

          logger.info(`[WhatsApp] 🚀 CONNECTED SUCCESSFULLY to WhatsApp as +${phone}! 30-day session saved.`);
          void this.syncGatewayStateToDb();
          this.notifyListeners();
          void this.persistSessionToDb();
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
   * Log out and wipe stored session from disk and PostgreSQL database.
   */
  public async logout(): Promise<void> {
    try {
      if (this.sock) {
        await this.sock.logout().catch(() => {});
        this.sock = null;
      }
    } finally {
      await this.clearSession();
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

  private async clearSession(): Promise<void> {
    try {
      if (fs.existsSync(SESSION_DIR)) {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        fs.mkdirSync(SESSION_DIR, { recursive: true });
      }
      await ensureGatewayTable();
      await db.execute(sql`TRUNCATE TABLE whatsapp_session_store;`);
      await db.execute(sql`
        UPDATE whatsapp_gateway_state
        SET status = 'disconnected', qr = NULL, phone = NULL, connected_at = NULL, expires_at = NULL, updated_at = NOW()
        WHERE id = 'current';
      `);
      logger.info("[WhatsApp] Cleared session files and purged database store");
    } catch (err) {
      logger.error({ err }, "[WhatsApp] Failed to clear session directory");
    }
  }

  /**
   * Ensures the Baileys socket is connected.
   * If not connected but session credentials exist on disk or DB indicates connected,
   * attempts to initialize and waits up to timeoutMs.
   */
  public async ensureConnected(timeoutMs = 8000): Promise<boolean> {
    if (this.state.status === "connected" && this.sock) {
      return true;
    }

    const credsPath = path.join(SESSION_DIR, "creds.json");
    let hasCreds = fs.existsSync(credsPath);
    if (!hasCreds) {
      hasCreds = await this.restoreSessionFromDb();
    }

    if (!hasCreds) {
      const dbStatus = await this.getStatusAsync();
      if (dbStatus.status !== "connected") {
        return false;
      }
    }

    if (!this.sock && !this.isInitializing) {
      logger.info("[WhatsApp] Socket disconnected. Auto-restoring connection using stored 30-day session...");
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
   * Send a rich WhatsApp message with 1-tap action links.
   * Formats headers, body, action links and footer cleanly to ensure 100% reliable
   * delivery across all WhatsApp devices (iOS, Android, Desktop, Web).
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

    let messageText = "";
    if (params.header) {
      messageText += `${params.header}\n\n`;
    }
    messageText += params.body;

    if (params.buttons && params.buttons.length > 0) {
      messageText += "\n\n━━━━━━━━━━━━━━━━━━━━━━\n⚡ *SELECT ACTION:*";
      for (const btn of params.buttons) {
        if (btn.type === "url" && btn.url) {
          messageText += `\n👉 *${btn.text}:*\n${btn.url}\n`;
        } else if (btn.text) {
          messageText += `\n👉 *${btn.text}*`;
        }
      }
    }

    if (params.footer) {
      messageText += `\n\n_${params.footer}_`;
    }

    return this.sendMessage(phone, messageText.trim());
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
    const acceptToken = generateWhatsAppActionToken(orderId, "accept");
    const rejectToken = generateWhatsAppActionToken(orderId, "reject");
    const acceptUrl = `${baseUrl}/api/v1/whatsapp/order-action?orderId=${orderId}&action=accept&token=${acceptToken}`;
    const rejectUrl = `${baseUrl}/api/v1/whatsapp/order-action?orderId=${orderId}&action=reject&token=${rejectToken}`;
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
    const readyToken = generateWhatsAppActionToken(orderId, "ready_call_rider");
    const readyCallRiderUrl = `${baseUrl}/api/v1/whatsapp/order-action?orderId=${orderId}&action=ready_call_rider&token=${readyToken}`;
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

  /**
   * Returns the phone number currently connected to WhatsApp gateway.
   */
  public getConnectedPhone(): string | null {
    return this.state.connectedPhone || null;
  }

  /**
   * Sends an automated WhatsApp order confirmation alert to the CUSTOMER when an order is placed.
   */
  public async sendOrderPlacedToCustomer(params: {
    customerPhone: string;
    customerName?: string;
    shopName: string;
    orderNumber: string;
    orderId: string;
    netAmount: number;
    paymentMethod: string;
    items?: Array<{
      productName?: string;
      name?: string;
      qty?: number;
      price?: number;
      totalPrice?: number;
      selectedWeight?: string;
    }>;
  }): Promise<boolean> {
    const {
      customerPhone,
      customerName,
      shopName,
      orderNumber,
      orderId,
      netAmount,
      paymentMethod,
      items,
    } = params;

    let itemsPreview = "";
    if (Array.isArray(items) && items.length > 0) {
      const names = items
        .slice(0, 5)
        .map((i) => {
          const w = i.selectedWeight ? ` (${i.selectedWeight})` : "";
          const cost = i.totalPrice ? ` = ₹${i.totalPrice}` : (i.price ? ` = ₹${i.price * (i.qty || 1)}` : "");
          return `• *${i.productName || i.name || "Item"}${w}* × ${i.qty || 1}${cost}`;
        })
        .join("\n");
      const extra = items.length > 5 ? `\n• _+${items.length - 5} more items_` : "";
      itemsPreview = `\n━━━━━━━━━━━━━━━━━━━━━━\n📋 *ITEMS ORDERED:*\n${names}${extra}`;
    }

    const baseUrl = process.env.PUBLIC_APP_URL || "https://swiftmart.space";
    const trackUrl = `${baseUrl}/orders?track=${orderId}`;

    const body = [
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Thank you for your order, *${customerName || "Customer"}*! 🎉`,
      `Your order with *${shopName}* has been placed successfully.`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📦 *Order ID:* #${orderNumber}`,
      `💰 *Total Amount:* ₹${netAmount} (${(paymentMethod || "COD").toUpperCase()})`,
      itemsPreview,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `The store is reviewing your order. We'll send you an update as soon as preparation starts!`,
    ].filter(Boolean).join("\n");

    return this.sendInteractiveButtonsMessage(customerPhone, {
      header: `🛍️ *ORDER PLACED CONFIRMATION — SWIFTMART*`,
      body,
      footer: `SwiftMart Hyperlocal Delivery`,
      buttons: [
        {
          type: "url",
          text: "📍 Track Live Order",
          url: trackUrl,
        },
      ],
    });
  }

  /**
   * Sends an automated WhatsApp alert to the platform ADMIN when any new order is placed across any shop.
   */
  public async sendAdminNewOrderAlert(params: {
    adminPhone?: string | null;
    shopName: string;
    orderNumber: string;
    orderId: string;
    customerName: string;
    customerPhone: string;
    netAmount: number;
    paymentMethod: string;
    items?: Array<{
      productName?: string;
      name?: string;
      qty?: number;
      price?: number;
    }>;
  }): Promise<boolean> {
    const adminPhone = params.adminPhone || process.env.ADMIN_PHONE || this.state.connectedPhone;
    if (!adminPhone) {
      logger.info("[WhatsApp] No admin phone configured for admin order alert");
      return false;
    }

    const {
      shopName,
      orderNumber,
      orderId,
      customerName,
      customerPhone,
      netAmount,
      paymentMethod,
      items,
    } = params;

    let itemsPreview = "";
    if (Array.isArray(items) && items.length > 0) {
      const names = items
        .slice(0, 5)
        .map((i) => `• *${i.productName || i.name || "Item"}* (×${i.qty || 1})`)
        .join("\n");
      const extra = items.length > 5 ? `\n• _+${items.length - 5} more_` : "";
      itemsPreview = `\n━━━━━━━━━━━━━━━━━━━━━━\n📋 *ITEMS:*\n${names}${extra}`;
    }

    const baseUrl = process.env.PUBLIC_APP_URL || "https://swiftmart.space";
    const adminOrdersUrl = `${baseUrl}/admin?tab=orders`;

    const body = [
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📦 *Order ID:* #${orderNumber}`,
      `🏪 *Shop:* ${shopName}`,
      `👤 *Customer:* ${customerName} (${customerPhone})`,
      `💰 *Bill:* ₹${netAmount} (${(paymentMethod || "COD").toUpperCase()})`,
      itemsPreview,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Assign rider or monitor dispatch status in Central Control.`,
    ].filter(Boolean).join("\n");

    return this.sendInteractiveButtonsMessage(adminPhone, {
      header: `🚨 *NEW DISPATCH ALERT — CENTRAL CONTROL*`,
      body,
      footer: `SwiftMart Central Control`,
      buttons: [
        {
          type: "url",
          text: "📊 Open Admin Orders",
          url: adminOrdersUrl,
        },
      ],
    });
  }
}

export const whatsappService = new WhatsAppService();
