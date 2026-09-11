import { useState, useEffect } from "react";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import {
  Cake, Sparkles, Clock, Calendar, Truck, Store, CheckCircle2,
  AlertCircle, RefreshCw, ArrowLeft, CreditCard, Copy, Check, QrCode as QrIcon, MapPin, Phone
} from "lucide-react";

interface CustomCakeItem {
  _id: string;
  id?: string;
  shopId: string;
  shopName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  occasion: string;
  flavour: string;
  weightKg: number;
  tierCount: number;
  eggless: boolean;
  messageOnCake?: string;
  description?: string;
  referenceImageUrl?: string;
  requiredDate: string;
  requiredTime: string;
  fulfillmentType: "delivery" | "self_pickup";
  deliveryAddress?: { street?: string; city?: string; pincode?: string };
  status: "requested" | "quote_sent" | "rejected" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "customer_picked_up" | "cancelled";
  cakePrice?: number;
  advanceRequired?: number;
  advancePaid?: number;
  preparationTimeHours?: number;
  deliveryFee?: number;
  totalAmount?: number;
  remainingAmount?: number;
  quoteNotes?: string;
  pickupCode?: string;
  pickupQrCode?: string;
  createdAt: string;
}

export default function CustomCakeTracker() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [requests, setRequests] = useState<CustomCakeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; requests: CustomCakeItem[] }>("/custom-cakes/my-requests");
      if (res.success) {
        setRequests(res.requests || []);
      }
    } catch (err: any) {
      toast({ title: "Failed to load requests", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchMyRequests();
  }, [user]);

  const handlePayAdvance = async (req: CustomCakeItem) => {
    const reqId = req.id || req._id;
    setPayingId(reqId);
    try {
      const res = await api.post<{ success: boolean; request: CustomCakeItem; message?: string }>(
        `/custom-cakes/${reqId}/accept-and-pay`,
        { paymentMethod: "ONLINE" }
      );

      if (res.success) {
        toast({
          title: "🎉 Advance Paid Successfully!",
          description: `₹${req.advanceRequired} paid. ${req.shopName} has confirmed your order!`,
        });
        fetchMyRequests();
      }
    } catch (err: any) {
      toast({
        title: "Payment failed",
        description: err?.message || "Could not process advance payment.",
        variant: "destructive",
      });
    } finally {
      setPayingId(null);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: "Code Copied!", description: `Pickup code ${code} copied to clipboard.` });
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const getStepIndex = (status: string) => {
    switch (status) {
      case "requested": return 0;
      case "quote_sent": return 1;
      case "confirmed": return 2;
      case "preparing": return 3;
      case "ready": return 4;
      case "out_for_delivery": return 4;
      case "delivered":
      case "customer_picked_up": return 5;
      default: return 0;
    }
  };

  const steps = [
    { label: "Request Sent", emoji: "✉️" },
    { label: "Quote Ready", emoji: "💰" },
    { label: "Confirmed", emoji: "🎉" },
    { label: "Baking", emoji: "👨‍🍳" },
    { label: "Ready", emoji: "🎂" },
    { label: "Completed", emoji: "✅" },
  ];

  return (
    <div className="min-h-[100dvh] pb-24 max-w-4xl mx-auto px-4 pt-6 space-y-6">
      <SEO
        title="My Custom Cakes — SwiftMart"
        description="Track your personalized designer cake orders, review quotes, and verify counter pickups."
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 bg-muted hover:bg-muted/80 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold flex items-center gap-2">
              🎂 My Custom Cakes
            </h1>
            <p className="text-xs text-muted-foreground">Track quotes, advance payments & pickup codes</p>
          </div>
        </div>

        <Button
          onClick={fetchMyRequests}
          variant="outline"
          size="sm"
          className="rounded-full font-bold shadow-none"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-60 bg-muted/40 rounded-3xl animate-pulse border border-border" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-card rounded-3xl p-12 text-center border border-dashed border-border space-y-3">
          <Cake className="w-16 h-16 text-muted-foreground/30 mx-auto" />
          <h3 className="text-base font-bold">No Custom Cake Requests Yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Want a personalized designer cake for birthdays or celebrations? Visit any bakery store (e.g. Sudeshna's Cake House) and click "Customize Your Cake"!
          </p>
          <Link href="/shops">
            <Button className="rounded-full font-bold mt-2">
              Browse Bakeries & Cake Shops
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map(req => {
            const reqId = req.id || req._id;
            const currentStep = getStepIndex(req.status);
            const isSelfPickup = req.fulfillmentType === "self_pickup";

            return (
              <div
                key={reqId}
                className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-5 transition-all"
              >
                {/* Header info */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎂</span>
                      <h3 className="text-lg font-black text-foreground">
                        {req.flavour} Cake ({req.weightKg} kg)
                      </h3>
                      {req.eggless && (
                        <span className="text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-950/50 px-2 py-0.5 rounded-full">
                          🌱 Eggless
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Baker: <strong className="text-foreground">{req.shopName}</strong> · Occasion: {req.occasion}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelfPickup ? (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200 border-amber-300 font-bold">
                        <Store className="w-3 h-3 mr-1" /> Self Pickup
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 border-emerald-300 font-bold">
                        <Truck className="w-3 h-3 mr-1" /> Delivery
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Stepper */}
                <div className="py-2 border-y border-border/60">
                  <div className="flex items-center justify-between relative">
                    {steps.map((step, idx) => {
                      const isCompleted = idx <= currentStep;
                      const isCurrent = idx === currentStep;

                      return (
                        <div key={step.label} className="flex flex-col items-center flex-1 text-center relative z-10">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isCurrent
                                ? "bg-primary text-white ring-4 ring-primary/20 scale-110"
                                : isCompleted
                                ? "bg-emerald-500 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isCompleted && !isCurrent ? "✓" : step.emoji}
                          </div>
                          <span className={`text-[10px] mt-1 font-bold truncate max-w-[60px] ${
                            isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Case 1: Quote Received & Advance Pending ────────────────── */}
                {req.status === "quote_sent" && (
                  <div className="bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-amber-500/10 border border-pink-500/20 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" /> Price Quote Received
                    </div>

                    {/* Invoice breakdown */}
                    <div className="bg-card p-4 rounded-xl border border-border space-y-2 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Cake Price ({req.weightKg} kg {req.flavour}):</span>
                        <span className="font-bold text-foreground">₹{req.cakePrice}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{isSelfPickup ? "Store Self Pickup:" : "Delivery Fee:"}</span>
                        <span className="font-bold text-foreground">
                          {isSelfPickup ? "Free (₹0)" : `₹${req.deliveryFee || 40}`}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border font-extrabold text-sm">
                        <span>Total Payable:</span>
                        <span className="text-foreground">₹{req.totalAmount}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                        <span>Advance to Pay Now:</span>
                        <span>₹{req.advanceRequired}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>Remaining Balance (on delivery/pickup):</span>
                        <span className="font-semibold text-foreground">₹{req.remainingAmount}</span>
                      </div>
                    </div>

                    {req.quoteNotes && (
                      <p className="text-xs text-muted-foreground italic bg-card/60 p-2.5 rounded-xl border border-border/50">
                        "{req.quoteNotes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-4 pt-1">
                      <div className="text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                        Prep time: <strong>{req.preparationTimeHours || 4} hours</strong>
                      </div>

                      <Button
                        onClick={() => handlePayAdvance(req)}
                        disabled={payingId === reqId}
                        className="rounded-full font-black bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg shadow-pink-500/20 px-6"
                      >
                        <CreditCard className="w-4 h-4 mr-1.5" />
                        {payingId === reqId ? "Processing..." : `Pay Advance ₹${req.advanceRequired} 🎂`}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Case 2: Self Pickup Ready -> Show Pickup PIN & QR ──────── */}
                {req.status === "ready" && isSelfPickup && (
                  <div className="bg-gradient-to-br from-amber-500/15 to-emerald-500/10 border-2 border-amber-500/40 p-6 rounded-3xl text-center space-y-4 shadow-lg shadow-amber-500/10">
                    <div className="inline-flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4" /> Ready for Counter Pickup
                    </div>

                    <div>
                      <h4 className="text-base font-extrabold text-foreground">
                        Your cake is ready at {req.shopName}!
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Show this 6-digit Pickup Code to the shopkeeper at the counter.
                      </p>
                    </div>

                    {/* 6-Digit Pickup Code Box */}
                    <div className="bg-card p-4 rounded-2xl border-2 border-primary/40 inline-block shadow-inner">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block mb-1">
                        One-Time Pickup Code
                      </span>
                      <div className="flex items-center justify-center gap-3">
                        <span className="font-mono font-black text-3xl md:text-4xl tracking-widest text-primary">
                          {req.pickupCode || "582914"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(req.pickupCode || "582914")}
                          className="rounded-full h-9 w-9 p-0"
                        >
                          {copiedCode === (req.pickupCode || "582914") ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Remaining Balance Note */}
                    <div className="text-xs text-muted-foreground">
                      Balance to pay at counter: <strong className="text-foreground font-black text-sm">₹{req.remainingAmount || 0}</strong>
                    </div>
                  </div>
                )}

                {/* ── Case 3: Delivery Ready / Out for Delivery ───────────────── */}
                {req.status === "ready" && !isSelfPickup && (
                  <div className="bg-teal-500/10 border border-teal-500/30 p-4 rounded-2xl flex items-start gap-3">
                    <Truck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-foreground">Cake is packed & ready for rider pickup!</p>
                      <p className="text-muted-foreground mt-0.5">
                        A SwiftMart delivery partner will scan the shop counter QR and deliver your cake directly to your doorstep.
                      </p>
                    </div>
                  </div>
                )}

                {/* Specs footer */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs bg-muted/30 p-3 rounded-2xl border border-border/50 text-muted-foreground">
                  <div>
                    <span className="block text-[10px]">Required Date</span>
                    <strong className="text-foreground">{req.requiredDate}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px]">Time Slot</span>
                    <strong className="text-foreground">{req.requiredTime}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px]">Advance Paid</span>
                    <strong className="text-emerald-600 font-bold">₹{req.advancePaid || 0}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px]">Balance Left</span>
                    <strong className="text-foreground">₹{req.remainingAmount || 0}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
