import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { 
  MessageSquare, RefreshCw, CheckCircle2, XCircle, AlertCircle, 
  Send, Smartphone, ShieldCheck, Zap, LogOut, ExternalLink, HelpCircle
} from "lucide-react";

interface WhatsAppStatus {
  status: "connected" | "connecting" | "disconnected" | "qr_ready";
  phone: string | null;
  qr: string | null;
}

export function WhatsAppTab() {
  const [statusData, setStatusData] = useState<WhatsAppStatus>({
    status: "disconnected",
    phone: null,
    qr: null,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("👋 Hello from SwiftMart! WhatsApp Order Automation is online and working.");
  const [sendingTest, setSendingTest] = useState(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: WhatsAppStatus }>("/v1/whatsapp/status");
      if (res.success && res.data) {
        setStatusData(res.data);
      }
    } catch {
      // Quiet fail on periodic poll
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  // Poll status while connecting or qr_ready
  useEffect(() => {
    fetchStatus();

    const interval = setInterval(() => {
      fetchStatus(true);
    }, 4000);
    pollTimerRef.current = interval;

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchStatus]);

  const handleConnect = async () => {
    setActionLoading(true);
    try {
      const res = await api.post<{ success: boolean; message: string; data: WhatsAppStatus }>("/v1/whatsapp/connect", {});
      if (res.success) {
        toast.success(res.message || "Generating QR code...");
        if (res.data) setStatusData(res.data);
      } else {
        toast.error(res.message || "Failed to start WhatsApp connection");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to connect WhatsApp");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect WhatsApp and remove the session?")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post<{ success: boolean; message: string; data: WhatsAppStatus }>("/v1/whatsapp/disconnect", {});
      if (res.success) {
        toast.success(res.message || "WhatsApp disconnected");
        if (res.data) setStatusData(res.data);
      } else {
        toast.error(res.message || "Failed to disconnect");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect WhatsApp");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      toast.error("Please enter a recipient phone number");
      return;
    }
    setSendingTest(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>("/v1/whatsapp/test", {
        phone: testPhone.trim(),
        message: testMessage.trim(),
      });
      if (res.success) {
        toast.success(res.message || `Test message sent to ${testPhone}!`);
      } else {
        toast.error(res.message || "Failed to send message");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSendingTest(false);
    }
  };

  const isConnected = statusData.status === "connected";
  const isQrReady = statusData.status === "qr_ready" && !!statusData.qr;
  const isConnecting = statusData.status === "connecting";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card neu-card p-6 rounded-2xl border border-border">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">WhatsApp Order Automation</h1>
              <p className="text-sm text-muted-foreground">
                Automatic vendor WhatsApp alerts with 1-tap accept/reject buttons
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={`px-3 py-1.5 rounded-full text-xs font-semibold gap-1.5 ${
              isConnected
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                : isQrReady
                ? "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400 animate-pulse"
                : isConnecting
                ? "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400"
                : "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400"
            }`}
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected ({statusData.phone ? `+${statusData.phone}` : "Active"})
              </>
            ) : isQrReady ? (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                QR Code Ready — Scan Now
              </>
            ) : isConnecting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5" />
                Disconnected
              </>
            )}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStatus()}
            disabled={loading || actionLoading}
            className="rounded-xl border-border"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Grid: Connection Card & Test Message Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: WhatsApp Device Pairing */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-card neu-card p-6 rounded-2xl border border-border">
            <h2 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-500" />
              WhatsApp Device Link
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Connect your WhatsApp number via QR code scanning. No monthly API charges and zero database footprint.
            </p>

            {isConnected ? (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">WhatsApp Gateway is Active!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Linked Phone: <span className="font-mono font-bold text-foreground">+{statusData.phone}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
                    Whenever a customer places an order, the vendor will instantly receive the order list and 1-tap accept/reject links on their WhatsApp.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={actionLoading}
                    className="text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-600 rounded-xl"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Disconnect WhatsApp
                  </Button>
                </div>
              </div>
            ) : isQrReady ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-muted/30 p-6 rounded-2xl border border-border">
                  <div className="shrink-0 bg-white p-3 rounded-2xl shadow-md border border-slate-200">
                    <img
                      src={statusData.qr!}
                      alt="WhatsApp Web QR Code"
                      className="w-52 h-52 object-contain"
                    />
                  </div>
                  <div className="space-y-3 text-left">
                    <h3 className="font-bold text-foreground text-base">কিভাবে স্ক্যান করবেন (How to Link):</h3>
                    <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
                      <li>আপনার ফোনে <strong className="text-foreground">WhatsApp</strong> ওপেন করুন।</li>
                      <li>উপরে ডানদিকের <strong className="text-foreground">৩টি ডট ⋮</strong> বা <strong className="text-foreground">Settings</strong>-এ ট্যাপ করুন।</li>
                      <li><strong className="text-foreground">Linked Devices (যুক্ত ডিভাইস)</strong> সিলেক্ট করুন।</li>
                      <li><strong className="text-foreground">Link a Device</strong>-এ ট্যাপ করে এই QR কোডটি স্ক্যান করুন।</li>
                    </ol>
                    <p className="text-[11px] text-amber-500 font-medium pt-1">
                      ⏳ QR কোডটি প্রতি ২০ সেকেন্ডে রিফ্রেশ হয়। স্ক্যান করার সাথে সাথে অটোমেটিক কানেক্ট হয়ে যাবে।
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleConnect}
                    disabled={actionLoading}
                    className="rounded-xl flex-1 border-border"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${actionLoading ? "animate-spin" : ""}`} />
                    Refresh QR Code
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-muted/20 border border-dashed border-border rounded-2xl p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto">
                  <MessageSquare className="w-8 h-8 opacity-60" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">WhatsApp is currently disconnected</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Click the button below to generate a QR code and link your WhatsApp number.
                  </p>
                </div>
                <Button
                  onClick={handleConnect}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${actionLoading ? "animate-spin" : ""}`} />
                  Connect WhatsApp (Show QR)
                </Button>
              </div>
            )}
          </div>

          {/* Architecture & DB Load Guarantee */}
          <div className="bg-card neu-card p-6 rounded-2xl border border-border space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Zero-DB Footprint & Safe Architecture
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-muted/40 p-3.5 rounded-xl border border-border/50 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> 0 Database Hits
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  WhatsApp cryptographic keys are securely stored on local disk (<code className="text-primary font-mono">data/whatsapp_session</code>), not in Neon/Supabase PostgreSQL.
                </p>
              </div>
              <div className="bg-muted/40 p-3.5 rounded-xl border border-border/50 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 100% Free & Unlimited
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  No Meta Cloud API fees or per-conversation charges. Direct Baileys socket integration with low memory overhead.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Send Test Message & Order Automation Preview */}
        <div className="lg:col-span-5 space-y-6">
          {/* Test Message Form */}
          <div className="bg-card neu-card p-6 rounded-2xl border border-border">
            <h2 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Send Test Message
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Verify that messages are delivering smoothly to WhatsApp numbers.
            </p>

            <form onSubmit={handleSendTest} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Phone Number (with Country Code)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 919876543210 or 9876543210"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="rounded-xl font-mono text-sm bg-background border-border"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Indian numbers default to +91 prefix automatically.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Message Content
                </label>
                <textarea
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full rounded-xl p-3 text-xs bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none font-sans"
                />
              </div>

              <Button
                type="submit"
                disabled={sendingTest || !isConnected}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl"
              >
                {sendingTest ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending Test Message...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Test Message
                  </>
                )}
              </Button>
              {!isConnected && (
                <p className="text-center text-[11px] text-amber-500 font-medium">
                  ⚠️ Connect WhatsApp above before sending test messages.
                </p>
              )}
            </form>
          </div>

          {/* Preview of Seller WhatsApp Message */}
          <div className="bg-card neu-card p-6 rounded-2xl border border-border space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-500" />
              What the Seller Sees on New Order
            </h3>
            
            <div className="bg-[#0b141a] text-white p-4 rounded-2xl font-sans text-xs space-y-2 border border-emerald-900/40 shadow-inner">
              <div className="text-emerald-400 font-bold flex items-center gap-1.5 text-[13px]">
                🚨 NEW ORDER RECEIVED! — SwiftMart
              </div>
              <div className="text-slate-300 space-y-0.5 text-[11px]">
                <p><strong>Order ID:</strong> #SM-8A9F12</p>
                <p><strong>Shop:</strong> Bengal Grocery Store</p>
                <p><strong>Customer:</strong> Rahul Roy (9876543210)</p>
                <p><strong>Address:</strong> Beltala Park, Balurghat, PIN 733103</p>
              </div>
              <div className="border-t border-slate-700/60 pt-1.5 text-slate-200 text-[11px]">
                <p className="font-semibold text-emerald-300">📦 Order Items:</p>
                <p>• Amul Taaza Milk 500ml x 2 = ₹54</p>
                <p>• Aashirvaad Atta 5kg x 1 = ₹240</p>
                <p>• Fortune Mustard Oil 1L x 1 = ₹145</p>
              </div>
              <div className="border-t border-slate-700/60 pt-1.5 flex justify-between text-slate-200 text-[11px]">
                <span><strong>Total:</strong> ₹439</span>
                <span className="text-emerald-400"><strong>Pay Mode:</strong> COD</span>
              </div>
              <div className="border-t border-slate-700/60 pt-2 flex gap-2">
                <div className="bg-emerald-600 text-white font-bold py-1.5 px-3 rounded-lg text-center flex-1 text-[11px]">
                  ✅ 1-Tap Accept
                </div>
                <div className="bg-rose-600 text-white font-bold py-1.5 px-3 rounded-lg text-center flex-1 text-[11px]">
                  ❌ 1-Tap Reject
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              When the seller taps <strong>Accept</strong>, SwiftMart automatically confirms the order and notifies the nearest delivery partner!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
