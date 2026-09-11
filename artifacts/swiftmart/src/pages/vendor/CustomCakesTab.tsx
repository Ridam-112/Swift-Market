import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Cake, Sparkles, Clock, Calendar, Truck, Store, CheckCircle2,
  AlertCircle, RefreshCw, Eye, Send, QrCode, User, Phone, MapPin, X, ArrowRight
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
  weightLbs?: number;
  weightKg?: number;
  weightFormatted?: string;
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
  createdAt: string;
}

interface CustomCakesTabProps {
  shopId: string;
  isOwner?: boolean;
}

export function CustomCakesTab({ shopId, isOwner = true }: CustomCakesTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [requests, setRequests] = useState<CustomCakeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Selected item for details/action
  const [selectedReq, setSelectedReq] = useState<CustomCakeItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Quote form state
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [cakePrice, setCakePrice] = useState("");
  const [advanceRequired, setAdvanceRequired] = useState("");
  const [prepTimeHours, setPrepTimeHours] = useState("4");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  // Self Pickup verification state
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [inputPickupPin, setInputPickupPin] = useState("");
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; requests: CustomCakeItem[] }>(
        `/custom-cakes/shop-requests?shopId=${shopId}`
      );
      if (res.success) {
        setRequests(res.requests || []);
      }
    } catch (err: any) {
      toast({ title: "Failed to load custom cakes", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shopId) fetchRequests();
  }, [shopId]);

  const handleOpenQuote = (req: CustomCakeItem) => {
    setSelectedReq(req);
    // Suggest default values
    setCakePrice(req.cakePrice ? String(req.cakePrice) : "");
    setAdvanceRequired(req.advanceRequired ? String(req.advanceRequired) : "");
    setPrepTimeHours(req.preparationTimeHours ? String(req.preparationTimeHours) : "4");
    setQuoteNotes(req.quoteNotes || "");
    setIsQuoteOpen(true);
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    const reqId = selectedReq.id || selectedReq._id;
    const priceNum = Number(cakePrice);
    const advanceNum = Number(advanceRequired);

    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ title: "Invalid price", description: "Please enter a valid cake price.", variant: "destructive" });
      return;
    }

    if (isNaN(advanceNum) || advanceNum < 0 || advanceNum > priceNum) {
      toast({ title: "Invalid advance", description: "Advance must be between ₹0 and total price.", variant: "destructive" });
      return;
    }

    setIsSubmittingQuote(true);
    try {
      const res = await api.post<{ success: boolean; request: CustomCakeItem; message?: string }>(
        `/custom-cakes/${reqId}/quote`,
        {
          cakePrice: priceNum,
          advanceRequired: advanceNum,
          preparationTimeHours: Number(prepTimeHours) || 4,
          quoteNotes,
        }
      );

      if (res.success) {
        toast({ title: "Quote sent!", description: "Customer received the price quote." });
        setIsQuoteOpen(false);
        fetchRequests();
      }
    } catch (err: any) {
      toast({ title: "Failed to send quote", description: err?.message, variant: "destructive" });
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const handleUpdateStatus = async (reqId: string, newStatus: string) => {
    try {
      const res = await api.patch<{ success: boolean; message?: string }>(`/custom-cakes/${reqId}/status`, {
        status: newStatus,
      });
      if (res.success) {
        toast({ title: "Status updated", description: `Order marked as '${newStatus}'.` });
        fetchRequests();
        if (selectedReq) {
          setSelectedReq({ ...selectedReq, status: newStatus as any });
        }
      }
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.message, variant: "destructive" });
    }
  };

  const handleVerifyPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    const reqId = selectedReq.id || selectedReq._id;
    if (!inputPickupPin.trim() || inputPickupPin.length !== 6) {
      toast({ title: "Invalid PIN", description: "Please enter the 6-digit pickup code shown on customer's phone.", variant: "destructive" });
      return;
    }

    setIsVerifyingPin(true);
    try {
      const res = await api.post<{ success: boolean; message?: string }>(
        `/custom-cakes/${reqId}/verify-pickup`,
        { pickupCode: inputPickupPin.trim() }
      );

      if (res.success) {
        toast({ title: "🎉 Pickup Verified!", description: "Customer pickup confirmed and order completed!" });
        setIsVerifyOpen(false);
        setInputPickupPin("");
        fetchRequests();
        if (selectedReq) {
          setSelectedReq({ ...selectedReq, status: "customer_picked_up" });
        }
      }
    } catch (err: any) {
      toast({ title: "Verification failed", description: err?.message || "Invalid pickup PIN.", variant: "destructive" });
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Filter items
  const filtered = requests.filter(r => {
    if (activeFilter === "all") return true;
    if (activeFilter === "requested") return r.status === "requested";
    if (activeFilter === "quote_sent") return r.status === "quote_sent";
    if (activeFilter === "confirmed") return r.status === "confirmed";
    if (activeFilter === "preparing") return r.status === "preparing";
    if (activeFilter === "ready") return r.status === "ready";
    if (activeFilter === "completed") return r.status === "delivered" || r.status === "customer_picked_up";
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "requested":
        return <Badge className="bg-amber-500 text-white hover:bg-amber-600 font-bold">New Request</Badge>;
      case "quote_sent":
        return <Badge className="bg-blue-500 text-white hover:bg-blue-600 font-bold">Quote Sent</Badge>;
      case "confirmed":
        return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 font-bold">Advance Paid</Badge>;
      case "preparing":
        return <Badge className="bg-purple-500 text-white hover:bg-purple-600 font-bold">In The Oven / Baking</Badge>;
      case "ready":
        return <Badge className="bg-teal-500 text-white hover:bg-teal-600 font-bold">Ready for Pickup/Delivery</Badge>;
      case "customer_picked_up":
      case "delivered":
        return <Badge className="bg-slate-700 text-white hover:bg-slate-800 font-bold">Completed</Badge>;
      case "rejected":
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 rounded-3xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-pink-500/10">
        <div>
          <div className="flex items-center gap-2 text-pink-100 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Bakery Customization Management
          </div>
          <h2 className="text-2xl font-black tracking-tight">🎂 Custom Cakes & Quotes</h2>
          <p className="text-white/80 text-xs mt-1">
            Receive designer cake requests, provide price quotes, track advance payments, and verify counter pickups.
          </p>
        </div>
        <Button
          onClick={fetchRequests}
          variant="outline"
          size="sm"
          className="bg-white/20 hover:bg-white/30 text-white border-white/30 rounded-full font-bold shadow-none"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {[
          { id: "all", label: "All Orders", count: requests.length },
          { id: "requested", label: "New Requests", count: requests.filter(r => r.status === "requested").length },
          { id: "quote_sent", label: "Quote Sent", count: requests.filter(r => r.status === "quote_sent").length },
          { id: "confirmed", label: "Advance Paid", count: requests.filter(r => r.status === "confirmed").length },
          { id: "preparing", label: "Preparing", count: requests.filter(r => r.status === "preparing").length },
          { id: "ready", label: "Ready", count: requests.filter(r => r.status === "ready").length },
          { id: "completed", label: "Completed", count: requests.filter(r => r.status === "delivered" || r.status === "customer_picked_up").length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
              activeFilter === tab.id
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeFilter === tab.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-44 bg-muted/40 rounded-3xl animate-pulse border border-border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-3xl p-12 text-center border border-dashed border-border">
          <Cake className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-base font-bold text-foreground">No custom cake requests found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {activeFilter === "all" ? "Customers will request custom cakes from your shop page." : `No requests in '${activeFilter}' status.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(req => {
            const reqId = req.id || req._id;
            return (
              <div
                key={reqId}
                className="bg-card rounded-3xl p-5 border border-border/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header info */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎂</span>
                      <div>
                        <h4 className="font-extrabold text-sm text-foreground">
                          {req.flavour} Cake ({req.weightFormatted || `${req.weightLbs || (req.weightKg ? Math.round(req.weightKg * 2.20462 * 10) / 10 : 1)} lbs`})
                        </h4>
                        <p className="text-[11px] text-muted-foreground">Occasion: {req.occasion} {req.tierCount > 1 ? `· ${req.tierCount} Tiers` : ""}</p>
                      </div>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>

                  {/* Date, Time & Fulfillment */}
                  <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-2xl bg-muted/40 border border-border/50 text-xs">
                    <div className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">{req.requiredDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{req.requiredTime}</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-between pt-1 border-t border-border/30">
                      <div className="flex items-center gap-1.5">
                        {req.fulfillmentType === "self_pickup" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                            <Store className="w-3 h-3" /> Self Pickup
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                            <Truck className="w-3 h-3" /> Delivery
                          </span>
                        )}
                        {req.eggless && (
                          <span className="text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-950/50 px-2 py-0.5 rounded-full">
                            🌱 Eggless
                          </span>
                        )}
                      </div>

                      {req.cakePrice ? (
                        <span className="text-xs font-black text-foreground">
                          ₹{req.cakePrice} <span className="text-[10px] text-muted-foreground font-normal">(Adv: ₹{req.advanceRequired})</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span className="font-semibold text-foreground">{req.customerName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      <a href={`tel:${req.customerPhone}`} className="text-primary hover:underline font-mono">{req.customerPhone}</a>
                    </div>
                  </div>

                  {req.messageOnCake && (
                    <p className="mt-2 text-xs italic text-muted-foreground bg-muted/20 p-2 rounded-xl">
                      "{req.messageOnCake}"
                    </p>
                  )}
                </div>

                {/* Bottom Actions based on status */}
                <div className="pt-3 border-t border-border flex flex-wrap gap-2 items-center justify-between">
                  <Button
                    onClick={() => { setSelectedReq(req); setIsDetailOpen(true); }}
                    variant="ghost"
                    size="sm"
                    className="text-xs font-bold rounded-full"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> View Specs
                  </Button>

                  <div className="flex gap-2">
                    {req.status === "requested" && (
                      <Button
                        onClick={() => handleOpenQuote(req)}
                        size="sm"
                        className="rounded-full font-bold bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm text-xs"
                      >
                        <Send className="w-3 h-3 mr-1" /> Send Quote
                      </Button>
                    )}

                    {req.status === "confirmed" && (
                      <Button
                        onClick={() => handleUpdateStatus(reqId, "preparing")}
                        size="sm"
                        className="rounded-full font-bold bg-purple-600 hover:bg-purple-700 text-white text-xs"
                      >
                        👨‍🍳 Start Baking
                      </Button>
                    )}

                    {req.status === "preparing" && (
                      <Button
                        onClick={() => handleUpdateStatus(reqId, "ready")}
                        size="sm"
                        className="rounded-full font-bold bg-teal-600 hover:bg-teal-700 text-white text-xs"
                      >
                        🎂 Mark as Ready
                      </Button>
                    )}

                    {req.status === "ready" && req.fulfillmentType === "self_pickup" && (
                      <Button
                        onClick={() => { setSelectedReq(req); setInputPickupPin(""); setIsVerifyOpen(true); }}
                        size="sm"
                        className="rounded-full font-extrabold bg-amber-500 hover:bg-amber-600 text-white text-xs shadow-md shadow-amber-500/20"
                      >
                        <QrCode className="w-3 h-3 mr-1" /> Verify Customer Pickup
                      </Button>
                    )}

                    {req.status === "ready" && req.fulfillmentType === "delivery" && (
                      <span className="text-[11px] font-bold text-teal-600 bg-teal-100 dark:bg-teal-950/50 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Truck className="w-3 h-3" /> Ready for Rider QR Pickup
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Detail Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          {selectedReq && (
            <div>
              <DialogHeader>
                <DialogTitle className="text-xl font-black flex items-center gap-2">
                  🎂 {selectedReq.flavour} Cake ({selectedReq.weightFormatted || `${selectedReq.weightLbs || (selectedReq.weightKg ? Math.round(selectedReq.weightKg * 2.20462 * 10) / 10 : 1)} lbs`})
                </DialogTitle>
                <DialogDescription>
                  Custom cake request submitted by {selectedReq.customerName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-4 text-xs">
                {selectedReq.referenceImageUrl && (
                  <div>
                    <span className="text-muted-foreground font-bold block mb-1">Reference Design Photo:</span>
                    <img
                      src={selectedReq.referenceImageUrl}
                      alt="Reference Design"
                      className="w-full max-h-60 object-cover rounded-2xl border border-border shadow-sm"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-2xl border border-border">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Occasion</span>
                    <span className="font-bold text-foreground text-sm">{selectedReq.occasion}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Flavour</span>
                    <span className="font-bold text-foreground text-sm">{selectedReq.flavour}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Weight</span>
                    <span className="font-bold text-foreground text-sm">{selectedReq.weightFormatted || `${selectedReq.weightLbs || (selectedReq.weightKg ? Math.round(selectedReq.weightKg * 2.20462 * 10) / 10 : 1)} lbs`}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Tiers & Type</span>
                    <span className="font-bold text-foreground text-sm">{selectedReq.tierCount} Tiers · {selectedReq.eggless ? "Eggless" : "With Egg"}</span>
                  </div>
                </div>

                {selectedReq.messageOnCake && (
                  <div>
                    <span className="text-muted-foreground font-bold block mb-1">Message on Cake:</span>
                    <p className="bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900/40 p-2.5 rounded-xl font-bold text-pink-700 dark:text-pink-300">
                      "{selectedReq.messageOnCake}"
                    </p>
                  </div>
                )}

                {selectedReq.description && (
                  <div>
                    <span className="text-muted-foreground font-bold block mb-1">Special Instructions:</span>
                    <p className="bg-muted/40 p-2.5 rounded-xl text-foreground">
                      {selectedReq.description}
                    </p>
                  </div>
                )}

                <div className="border-t border-border pt-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Required Delivery/Pickup Time:</span>
                    <span className="font-bold">{selectedReq.requiredDate} · {selectedReq.requiredTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fulfillment Choice:</span>
                    <span className="font-bold">{selectedReq.fulfillmentType === "self_pickup" ? "🏬 Store Self Pickup" : "🚚 Doorstep Delivery"}</span>
                  </div>
                  {selectedReq.deliveryAddress?.street && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery Address:</span>
                      <span className="font-bold text-right">{selectedReq.deliveryAddress.street}, {selectedReq.deliveryAddress.city}</span>
                    </div>
                  )}
                  {selectedReq.cakePrice ? (
                    <div className="flex justify-between pt-2 border-t border-border text-sm font-black">
                      <span>Quoted Price:</span>
                      <span className="text-primary">₹{selectedReq.cakePrice} (Advance: ₹{selectedReq.advanceRequired})</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Send Quote Dialog ────────────────────────────────────────────────── */}
      <Dialog open={isQuoteOpen} onOpenChange={setIsQuoteOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              🎂 Send Price Quote
            </DialogTitle>
            <DialogDescription>
              Enter the cake price and required advance payment for this custom request.
            </DialogDescription>
          </DialogHeader>

          {selectedReq && (
            <form onSubmit={handleSubmitQuote} className="space-y-4 my-2 text-xs">
              <div className="bg-muted/40 p-3 rounded-2xl border border-border">
                <p className="font-bold text-foreground">{selectedReq.flavour} Cake ({selectedReq.weightKg} kg)</p>
                <p className="text-[10px] text-muted-foreground">Need for: {selectedReq.requiredDate} ({selectedReq.requiredTime})</p>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Total Cake Price (₹) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 1110"
                  value={cakePrice}
                  onChange={e => {
                    setCakePrice(e.target.value);
                    // auto suggest 40-50% advance
                    if (!advanceRequired && e.target.value) {
                      setAdvanceRequired(String(Math.round(Number(e.target.value) * 0.4)));
                    }
                  }}
                  className="text-sm font-bold"
                  required
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">Your cake making and design amount.</span>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Advance Payment Required (₹) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={advanceRequired}
                  onChange={e => setAdvanceRequired(e.target.value)}
                  className="text-sm font-bold text-emerald-600"
                  required
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Customer will pay this advance online to confirm the order before you start baking.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Preparation Time (Hours)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 5"
                  value={prepTimeHours}
                  onChange={e => setPrepTimeHours(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Notes / Message for Customer (Optional)
                </label>
                <Textarea
                  placeholder="e.g. Fondant toppers included. Will be packed in a tall box with cake board."
                  value={quoteNotes}
                  onChange={e => setQuoteNotes(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsQuoteOpen(false)} className="flex-1 rounded-full font-bold">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingQuote}
                  className="flex-1 rounded-full font-bold bg-pink-500 hover:bg-pink-600 text-white"
                >
                  {isSubmittingQuote ? "Sending..." : "Submit Quote ✉️"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Verify Pickup Dialog (Self Pickup PIN) ──────────────────────────── */}
      <Dialog open={isVerifyOpen} onOpenChange={setIsVerifyOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              🏬 Verify Customer Pickup
            </DialogTitle>
            <DialogDescription>
              Ask the customer for their 6-digit One-Time Pickup Code from the SwiftMart App / Website.
            </DialogDescription>
          </DialogHeader>

          {selectedReq && (
            <form onSubmit={handleVerifyPickup} className="space-y-4 my-2 text-xs">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl text-center">
                <p className="text-xs font-extrabold text-foreground">
                  {selectedReq.customerName}
                </p>
                <p className="text-[11px] text-muted-foreground">{selectedReq.flavour} Cake ({selectedReq.weightKg} kg)</p>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1 text-center">
                  Enter 6-Digit Pickup Code
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 582914"
                  value={inputPickupPin}
                  onChange={e => setInputPickupPin(e.target.value.replace(/\D/g, ""))}
                  className="text-center font-mono font-black text-2xl tracking-widest h-14 rounded-2xl"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsVerifyOpen(false)} className="flex-1 rounded-full font-bold">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isVerifyingPin || inputPickupPin.length !== 6}
                  className="flex-1 rounded-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isVerifyingPin ? "Verifying..." : "Confirm Pickup & Complete ✅"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
