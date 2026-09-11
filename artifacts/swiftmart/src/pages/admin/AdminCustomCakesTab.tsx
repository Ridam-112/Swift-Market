import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Cake, Clock, Calendar, Truck, Store, CheckCircle2,
  AlertCircle, RefreshCw, Eye, Send, QrCode, User, Phone, MapPin, X, ArrowRight,
  Search, Check, Ban, Flame, Sparkles, Filter
} from "lucide-react";
import { formatINR } from "@/lib/currency";

export interface CustomCakeItem {
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
  deliveryAddress?: { street?: string; line1?: string; line2?: string; city?: string; pincode?: string };
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
  orderId?: string;
  createdAt: string;
}

interface StatsSummary {
  total: number;
  requested: number;
  quoteSent: number;
  confirmed: number;
  preparing: number;
  ready: number;
  completed: number;
  cancelled: number;
}

export function AdminCustomCakesTab() {
  const { toast } = useToast();

  const [requests, setRequests] = useState<CustomCakeItem[]>([]);
  const [stats, setStats] = useState<StatsSummary>({
    total: 0,
    requested: 0,
    quoteSent: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected item for details/actions
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

  // Image preview state
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter !== "all") params.set("status", activeFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await api.get<{ success: boolean; requests: CustomCakeItem[]; stats?: StatsSummary }>(
        `/custom-cakes/admin/all?${params.toString()}`
      );
      if (res.success) {
        setRequests(res.requests || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err: any) {
      toast({ title: "Failed to load custom cakes", description: err?.message || "Error fetching cake requests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery, toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleOpenQuote = (req: CustomCakeItem) => {
    setSelectedReq(req);
    setCakePrice(req.cakePrice ? String(req.cakePrice) : "");
    setAdvanceRequired(req.advanceRequired ? String(req.advanceRequired) : "");
    setPrepTimeHours(req.preparationTimeHours ? String(req.preparationTimeHours) : "4");
    setQuoteNotes(req.quoteNotes || "");
    setIsQuoteOpen(true);
  };

  const handleSendQuote = async () => {
    if (!selectedReq) return;
    const priceNum = parseFloat(cakePrice);
    const advanceNum = parseFloat(advanceRequired || "0");
    const prepNum = parseFloat(prepTimeHours || "4");

    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ title: "Invalid price", description: "Please enter a valid cake price.", variant: "destructive" });
      return;
    }

    if (isNaN(advanceNum) || advanceNum < 0 || advanceNum > priceNum) {
      toast({ title: "Invalid advance amount", description: "Advance cannot exceed total cake price.", variant: "destructive" });
      return;
    }

    setIsSubmittingQuote(true);
    try {
      const res = await api.post<{ success: boolean; message: string; request: CustomCakeItem }>(
        `/custom-cakes/${selectedReq._id || selectedReq.id}/quote`,
        {
          cakePrice: priceNum,
          advanceRequired: advanceNum,
          preparationTimeHours: prepNum,
          quoteNotes,
        }
      );
      if (res.success) {
        toast({ title: "Quote Sent!", description: "Price quote has been communicated to the customer." });
        setIsQuoteOpen(false);
        fetchRequests();
      }
    } catch (err: any) {
      toast({ title: "Failed to send quote", description: err?.message, variant: "destructive" });
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const handleUpdateStatus = async (reqId: string, newStatus: string, reason?: string) => {
    try {
      const res = await api.patch<{ success: boolean; message: string; request: CustomCakeItem }>(
        `/custom-cakes/${reqId}/status`,
        { status: newStatus, cancelReason: reason }
      );
      if (res.success) {
        toast({ title: "Status Updated", description: `Order status set to '${newStatus}'` });
        fetchRequests();
      }
    } catch (err: any) {
      toast({ title: "Status update failed", description: err?.message, variant: "destructive" });
    }
  };

  const handleVerifyPickupPin = async () => {
    if (!selectedReq || !inputPickupPin.trim()) {
      toast({ title: "Please enter the 6-digit code", variant: "destructive" });
      return;
    }

    setIsVerifyingPin(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>(
        `/custom-cakes/${selectedReq._id || selectedReq.id}/verify-pickup`,
        { pickupCode: inputPickupPin.trim() }
      );
      if (res.success) {
        toast({ title: "Pickup Verified!", description: "Cake handed over to customer. Order complete!" });
        setIsVerifyOpen(false);
        setInputPickupPin("");
        fetchRequests();
      }
    } catch (err: any) {
      toast({ title: "Verification failed", description: err?.message || "Invalid pickup PIN", variant: "destructive" });
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const getStatusBadge = (status: CustomCakeItem["status"]) => {
    switch (status) {
      case "requested":
        return <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold">New Request</Badge>;
      case "quote_sent":
        return <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold">Quote Sent</Badge>;
      case "confirmed":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold">Confirmed / Paid</Badge>;
      case "preparing":
        return <Badge className="bg-orange-500/10 text-orange-600 border border-orange-500/20 font-bold">👨‍🍳 Baking / Preparing</Badge>;
      case "ready":
        return <Badge className="bg-purple-500/10 text-purple-600 border border-purple-500/20 font-bold">🎂 Ready for Pickup</Badge>;
      case "customer_picked_up":
      case "delivered":
        return <Badge className="bg-emerald-600 text-white font-bold">✅ Completed</Badge>;
      case "rejected":
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-3xl">🎂</span> Custom Cakes & Bakery Orders
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Admin oversight for customized cake requests across all bakery shops in SwiftMart
          </p>
        </div>
        <Button onClick={fetchRequests} variant="outline" size="sm" className="gap-2 shrink-0">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div
          onClick={() => setActiveFilter("all")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === "all" ? "bg-primary/10 border-primary shadow-sm" : "bg-card border-border hover:border-primary/40"
          }`}
        >
          <div className="text-xs text-muted-foreground font-semibold">Total Requests</div>
          <div className="text-xl font-extrabold text-foreground mt-1">{stats.total}</div>
        </div>
        <div
          onClick={() => setActiveFilter("requested")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === "requested" ? "bg-amber-500/10 border-amber-500 shadow-sm" : "bg-card border-border hover:border-amber-500/40"
          }`}
        >
          <div className="text-xs text-amber-600 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> New Pending
          </div>
          <div className="text-xl font-extrabold text-amber-600 mt-1">{stats.requested}</div>
        </div>
        <div
          onClick={() => setActiveFilter("quote_sent")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === "quote_sent" ? "bg-blue-500/10 border-blue-500 shadow-sm" : "bg-card border-border hover:border-blue-500/40"
          }`}
        >
          <div className="text-xs text-blue-600 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Quoted
          </div>
          <div className="text-xl font-extrabold text-blue-600 mt-1">{stats.quoteSent}</div>
        </div>
        <div
          onClick={() => setActiveFilter("confirmed")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === "confirmed" ? "bg-emerald-500/10 border-emerald-500 shadow-sm" : "bg-card border-border hover:border-emerald-500/40"
          }`}
        >
          <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Confirmed
          </div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">{stats.confirmed}</div>
        </div>
        <div
          onClick={() => setActiveFilter("preparing")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === "preparing" ? "bg-orange-500/10 border-orange-500 shadow-sm" : "bg-card border-border hover:border-orange-500/40"
          }`}
        >
          <div className="text-xs text-orange-600 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> In Oven
          </div>
          <div className="text-xl font-extrabold text-orange-600 mt-1">{stats.preparing}</div>
        </div>
        <div
          onClick={() => setActiveFilter("ready")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === "ready" ? "bg-purple-500/10 border-purple-500 shadow-sm" : "bg-card border-border hover:border-purple-500/40"
          }`}
        >
          <div className="text-xs text-purple-600 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Ready
          </div>
          <div className="text-xl font-extrabold text-purple-600 mt-1">{stats.ready}</div>
        </div>
        <div
          onClick={() => setActiveFilter("delivered")}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === "delivered" ? "bg-emerald-600/10 border-emerald-600 shadow-sm" : "bg-card border-border hover:border-emerald-600/40"
          }`}
        >
          <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-700" /> Completed
          </div>
          <div className="text-xl font-extrabold text-emerald-700 mt-1">{stats.completed}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer, phone, bakery, flavour, occasion..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        {searchQuery && (
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="text-xs">
            Clear Search
          </Button>
        )}
      </div>

      {/* Request List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 px-4 bg-card rounded-3xl border border-dashed border-border space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto text-3xl">
            🎂
          </div>
          <h3 className="text-lg font-bold">No custom cake requests found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {searchQuery || activeFilter !== "all"
              ? "Try adjusting your search query or status filter."
              : "Customers can submit custom cake requests from any bakery shop page on SwiftMart."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const reqId = req._id || req.id || "";
            const isPickup = req.fulfillmentType === "self_pickup";

            return (
              <div
                key={reqId}
                className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 transition-all shadow-sm space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-xl shrink-0">
                      🎂
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base">{req.flavour} Cake</span>
                        <Badge variant="outline" className="text-xs font-semibold">
                          {req.weightFormatted || `${req.weightLbs ?? 1} lbs`}
                        </Badge>
                        {req.eggless && (
                          <Badge className="bg-green-600/10 text-green-700 border border-green-600/30 text-[10px] font-bold">
                            🟢 Eggless
                          </Badge>
                        )}
                        {req.tierCount > 1 && (
                          <Badge variant="secondary" className="text-[10px] font-bold">
                            {req.tierCount} Tiers
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-foreground">Bakery: {req.shopName}</span>
                        <span>•</span>
                        <span>Occasion: {req.occasion}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(req.status)}
                    <span className="text-xs font-mono text-muted-foreground">
                      #{reqId.slice(-6).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Body Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Customer Info */}
                  <div className="bg-muted/40 p-3.5 rounded-xl space-y-1.5">
                    <div className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                      <User className="w-3.5 h-3.5 text-primary" /> Customer Info
                    </div>
                    <div className="font-medium">{req.customerName}</div>
                    <div className="text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <a href={`tel:${req.customerPhone}`} className="hover:text-primary font-mono underline">
                        {req.customerPhone}
                      </a>
                    </div>
                  </div>

                  {/* Date & Delivery Choice */}
                  <div className="bg-muted/40 p-3.5 rounded-xl space-y-1.5">
                    <div className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-primary" /> Delivery & Schedule
                    </div>
                    <div className="flex items-center gap-1 font-medium">
                      <span>📅 {req.requiredDate}</span>
                      <span>•</span>
                      <span>⏰ {req.requiredTime}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      {isPickup ? (
                        <span className="text-amber-600 font-semibold flex items-center gap-1">
                          <Store className="w-3 h-3" /> Self Pickup at Store
                        </span>
                      ) : (
                        <span className="text-blue-600 font-semibold flex items-center gap-1">
                          <Truck className="w-3 h-3" /> Home Delivery
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price & Payment Summary */}
                  <div className="bg-muted/40 p-3.5 rounded-xl space-y-1.5">
                    <div className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Pricing & Advance
                    </div>
                    {req.cakePrice ? (
                      <div className="space-y-0.5">
                        <div className="font-bold text-sm text-foreground">
                          Total: {formatINR(req.totalAmount || req.cakePrice)}
                        </div>
                        <div className="text-muted-foreground">
                          Advance Paid: <span className="font-bold text-emerald-600">{formatINR(req.advancePaid || 0)}</span> | Balance: {formatINR(req.remainingAmount || 0)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-amber-600 font-semibold">Pending Price Quote from Baker / Admin</div>
                    )}
                  </div>
                </div>

                {/* Optional Message or Image */}
                {(req.messageOnCake || req.description || req.referenceImageUrl) && (
                  <div className="bg-muted/20 p-3 rounded-xl flex items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      {req.messageOnCake && (
                        <p>
                          <span className="font-bold text-foreground">Message on Cake:</span> "{req.messageOnCake}"
                        </p>
                      )}
                      {req.description && (
                        <p className="text-muted-foreground">
                          <span className="font-bold text-foreground">Custom Instructions:</span> {req.description}
                        </p>
                      )}
                    </div>
                    {req.referenceImageUrl && (
                      <button
                        onClick={() => setPreviewImage(req.referenceImageUrl!)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Photo
                      </button>
                    )}
                  </div>
                )}

                {/* Pickup PIN & QR (if confirmed and self pickup) */}
                {isPickup && req.pickupCode && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-amber-600" />
                      <div>
                        <span className="font-bold text-amber-800 dark:text-amber-300">Customer Pickup PIN:</span>
                        <span className="ml-2 font-mono font-extrabold text-base text-amber-700 dark:text-amber-200">
                          {req.pickupCode}
                        </span>
                      </div>
                    </div>
                    {req.status === "ready" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedReq(req);
                          setInputPickupPin("");
                          setIsVerifyOpen(true);
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8"
                      >
                        Verify & Complete Pickup
                      </Button>
                    )}
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Placed: {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Send / Edit Quote */}
                    {(req.status === "requested" || req.status === "quote_sent") && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenQuote(req)}
                        className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs h-8 gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {req.status === "quote_sent" ? "Update Quote" : "Send Price Quote"}
                      </Button>
                    )}

                    {/* Mark Preparing */}
                    {req.status === "confirmed" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(reqId, "preparing")}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-8 gap-1"
                      >
                        👨‍🍳 Start Baking
                      </Button>
                    )}

                    {/* Mark Ready */}
                    {req.status === "preparing" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(reqId, "ready")}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 gap-1"
                      >
                        🎂 Mark Cake Ready
                      </Button>
                    )}

                    {/* Cancel / Reject */}
                    {req.status !== "delivered" && req.status !== "customer_picked_up" && req.status !== "cancelled" && req.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const reason = prompt("Enter reason for rejection/cancellation:");
                          if (reason !== null) {
                            handleUpdateStatus(reqId, "cancelled", reason);
                          }
                        }}
                        className="text-red-500 hover:bg-red-50 hover:text-red-600 text-xs h-8"
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" /> Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quote Dialog */}
      <Dialog open={isQuoteOpen} onOpenChange={setIsQuoteOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>🎂</span> Price Quote for Custom Cake
            </DialogTitle>
            <DialogDescription>
              Provide cake price, advance requirement, and baking prep time for {selectedReq?.customerName} ({selectedReq?.flavour}, {selectedReq?.weightFormatted || `${selectedReq?.weightLbs} lbs`}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Cake Price (₹) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                placeholder="e.g. 1100"
                value={cakePrice}
                onChange={(e) => setCakePrice(e.target.value)}
                className="rounded-xl font-bold text-base"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Advance Required (₹) <span className="text-muted-foreground font-normal">(Paid online by customer to confirm)</span>
              </label>
              <Input
                type="number"
                placeholder="e.g. 500"
                value={advanceRequired}
                onChange={(e) => setAdvanceRequired(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Remaining balance will be paid upon pickup or delivery.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Preparation Time (Hours)
              </label>
              <Input
                type="number"
                placeholder="4"
                value={prepTimeHours}
                onChange={(e) => setPrepTimeHours(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Notes for Customer <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <Textarea
                placeholder="e.g. Fresh red velvet with cream cheese frosting will be prepared."
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                rows={2}
                className="rounded-xl resize-none text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsQuoteOpen(false)} disabled={isSubmittingQuote}>
              Cancel
            </Button>
            <Button
              onClick={handleSendQuote}
              disabled={isSubmittingQuote || !cakePrice}
              className="bg-primary hover:bg-primary/90 font-bold"
            >
              {isSubmittingQuote ? "Sending Quote..." : "Submit Quote"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Self Pickup PIN Verification Dialog */}
      <Dialog open={isVerifyOpen} onOpenChange={setIsVerifyOpen}>
        <DialogContent className="max-w-sm rounded-2xl text-center space-y-4">
          <DialogHeader>
            <DialogTitle className="text-center flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-2xl">
                🔑
              </div>
              Verify Customer Pickup Code
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              Ask customer for their 6-digit pickup code shown on their app screen.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Input
              type="text"
              placeholder="Enter 6-digit code"
              value={inputPickupPin}
              onChange={(e) => setInputPickupPin(e.target.value)}
              className="text-center text-2xl font-mono font-bold tracking-widest h-14 rounded-2xl"
              maxLength={6}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setIsVerifyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleVerifyPickupPin}
              disabled={isVerifyingPin || inputPickupPin.length < 4}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isVerifyingPin ? "Verifying..." : "Verify Pickup"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-lg rounded-2xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Reference Cake Photo</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="rounded-xl overflow-hidden max-h-[70vh] flex items-center justify-center bg-black/5">
              <img src={previewImage} alt="Reference Cake" className="object-contain max-h-[65vh] w-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
