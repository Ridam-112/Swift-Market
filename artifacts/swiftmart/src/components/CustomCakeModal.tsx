import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Cake, Upload, Sparkles, CheckCircle2, Truck, Store, Calendar, Clock, Image as ImageIcon, AlertCircle } from "lucide-react";

interface CustomCakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: {
    id: string;
    shopName: string;
    address?: { street?: string; city?: string; pincode?: string };
  };
}

interface WeightOption {
  label: string;
  value: number;
  popular?: boolean;
}

const DEFAULT_WEIGHTS: WeightOption[] = [
  { label: "1 lb (Pound)", value: 1.0, popular: true },
  { label: "1.5 lbs", value: 1.5 },
  { label: "2 lbs (Pounds)", value: 2.0, popular: true },
  { label: "2.5 lbs", value: 2.5 },
  { label: "3 lbs", value: 3.0 },
  { label: "4 lbs", value: 4.0 },
  { label: "5 lbs", value: 5.0 },
  { label: "6+ lbs", value: 6.0 },
];

const DEFAULT_FLAVOURS = [
  "Chocolate Truffle", "Black Forest", "Red Velvet", "Butterscotch", "Vanilla",
  "Pineapple", "Strawberry", "Mango", "Blueberry", "Fruit & Nut", "Rasmalai", "Custom"
];

const DEFAULT_OCCASIONS = ["Birthday", "Anniversary", "Wedding", "Baby Shower", "Celebration", "Other"];

export function CustomCakeModal({ isOpen, onClose, shop }: CustomCakeModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [serverWeights, setServerWeights] = useState<WeightOption[]>(DEFAULT_WEIGHTS);
  const [serverFlavours, setServerFlavours] = useState<string[]>(DEFAULT_FLAVOURS);
  const [serverOccasions, setServerOccasions] = useState<string[]>(DEFAULT_OCCASIONS);

  const [flavour, setFlavour] = useState("Chocolate Truffle");
  const [customFlavour, setCustomFlavour] = useState("");
  const [weightLbs, setWeightLbs] = useState(1);
  const [tierCount, setTierCount] = useState(1);
  const [eggless, setEggless] = useState(false);
  const [occasion, setOccasion] = useState("Birthday");
  const [messageOnCake, setMessageOnCake] = useState("");
  const [description, setDescription] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [requiredTime, setRequiredTime] = useState("05:00 PM");
  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "self_pickup">("delivery");
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: "",
    city: shop.address?.city || "Balurghat",
    pincode: shop.address?.pincode || "733101",
  });
  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch server-driven cake configuration on modal open
  useEffect(() => {
    if (!isOpen) return;
    api.get<{
      success: boolean;
      weights?: WeightOption[];
      flavours?: string[];
      occasions?: string[];
    }>("/custom-cakes/config")
      .then(res => {
        if (res.weights && res.weights.length > 0) setServerWeights(res.weights);
        if (res.flavours && res.flavours.length > 0) setServerFlavours(res.flavours);
        if (res.occasions && res.occasions.length > 0) setServerOccasions(res.occasions);
      })
      .catch(() => {});
  }, [isOpen]);

  // Minimum date: tomorrow or today
  const todayStr = new Date().toISOString().split("T")[0];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image under 10MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const token = localStorage.getItem("sm_at");
      const uploadUrl = `${api.BASE}/upload/cake-image`;

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const res = await response.json();
      const url = res.url || res.imageUrl || res.fileUrl;
      if (response.ok && url) {
        setReferenceImageUrl(url);
        toast({ title: "Photo uploaded!", description: "Reference cake image attached successfully." });
      } else {
        throw new Error(res.message || "Upload failed");
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Could not upload image.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({ title: "Login required", description: "Please login to submit a custom cake request.", variant: "destructive" });
      return;
    }

    if (!requiredDate) {
      toast({ title: "Date required", description: "Please select when you need the cake.", variant: "destructive" });
      return;
    }

    if (fulfillmentType === "delivery" && !deliveryAddress.street.trim()) {
      toast({ title: "Address required", description: "Please enter your delivery street address.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const finalFlavour = flavour === "Custom" || flavour === "Custom / Other" ? (customFlavour.trim() || "Custom") : flavour;

      const payload = {
        shopId: shop.id,
        occasion,
        flavour: finalFlavour,
        weightLbs,
        tierCount,
        eggless,
        messageOnCake,
        description,
        referenceImageUrl: referenceImageUrl || undefined,
        requiredDate,
        requiredTime,
        fulfillmentType,
        deliveryAddress: fulfillmentType === "delivery" ? deliveryAddress : undefined,
        customerName: customerName.trim() || user.name,
        customerPhone: customerPhone.trim() || user.phone,
      };

      const res = await api.post<{ success: boolean; request: any; message?: string }>("/custom-cakes/request", payload);

      if (res.success) {
        toast({
          title: "🎂 Request Submitted!",
          description: `Your custom cake request was sent to ${shop.shopName}. You will receive a price quote shortly!`,
        });
        onClose();
        setLocation("/custom-cakes");
      }
    } catch (err: any) {
      toast({
        title: "Submission failed",
        description: err?.message || "Could not submit custom cake request.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const shopAddressText = [
    shop.address?.street,
    shop.address?.city,
    shop.address?.pincode,
  ].filter(Boolean).join(", ") || "Shop counter in Balurghat";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border-primary/20 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-pink-600 via-rose-500 to-amber-500 text-white p-6 rounded-t-3xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-pink-200 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Designer Cake Order
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              🎂 Customize Your Cake
            </DialogTitle>
            <DialogDescription className="text-white/80 text-xs mt-1">
              Direct with <strong className="text-white">{shop.shopName}</strong>. Request flavour, design, photo & date.
            </DialogDescription>
          </div>
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -translate-y-10 translate-x-10 pointer-events-none" />
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-sm">
          {/* 1. Flavour & Weight */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Cake className="w-3.5 h-3.5 text-pink-500" /> 1. Flavour & Weight (in Pounds)
            </Label>
            
            {/* Flavours */}
            <div>
              <span className="text-xs text-muted-foreground block mb-1.5 font-medium">Select Flavour:</span>
              <div className="flex flex-wrap gap-1.5">
                {serverFlavours.map(f => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => setFlavour(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      flavour === f
                        ? "bg-pink-500 text-white border-pink-500 shadow-sm"
                        : "bg-muted text-muted-foreground border-transparent hover:border-pink-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {(flavour === "Custom" || flavour === "Custom / Other" || flavour === "Custom Flavour") && (
              <Input
                value={customFlavour}
                onChange={e => setCustomFlavour(e.target.value)}
                placeholder="Enter custom flavour e.g. Tiramisu / Belgian Truffle"
                className="mt-2 text-xs"
              />
            )}

            {/* Weights in Pounds */}
            <div className="pt-2">
              <span className="text-xs text-muted-foreground block mb-1.5 font-medium">
                Cake Weight <span className="text-amber-500 font-bold">(Pounds / lbs)</span>:
              </span>
              <div className="flex flex-wrap gap-2">
                {serverWeights.map(w => (
                  <button
                    type="button"
                    key={w.value}
                    onClick={() => setWeightLbs(w.value)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                      weightLbs === w.value
                        ? "bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-400/30"
                        : "bg-muted text-muted-foreground border-transparent hover:border-amber-300"
                    }`}
                  >
                    <span>{w.label}</span>
                    {w.popular && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase font-black ${
                        weightLbs === w.value ? "bg-white text-amber-600" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}>
                        Popular
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tiers & Eggless */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-muted/50 p-3 rounded-2xl border border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">Eggless Cake</p>
                  <p className="text-[10px] text-muted-foreground">100% Pure Vegetarian</p>
                </div>
                <Switch checked={eggless} onCheckedChange={setEggless} />
              </div>

              <div className="bg-muted/50 p-3 rounded-2xl border border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">Cake Tiers</p>
                  <p className="text-[10px] text-muted-foreground">{tierCount === 1 ? "Single Tier" : `${tierCount} Tiers`}</p>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setTierCount(t)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold border ${
                        tierCount === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Message on Cake & Design Photo */}
          <div className="space-y-3 pt-2 border-t border-border">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> 2. Personal Message & Reference Design
            </Label>

            <div className="space-y-2">
              <Input
                value={messageOnCake}
                onChange={e => setMessageOnCake(e.target.value)}
                placeholder='Message on cake e.g. "Happy 25th Birthday Rahul!"'
                className="text-xs"
                maxLength={60}
              />

              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Specific design notes, color scheme, fondant details, or theme preferences..."
                className="text-xs resize-none h-18"
              />
            </div>

            {/* Reference Photo Upload */}
            <div className="bg-muted/40 p-3 rounded-2xl border border-dashed border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {referenceImageUrl ? (
                  <img src={referenceImageUrl} alt="Reference" className="w-14 h-14 object-cover rounded-xl border border-border shadow-sm" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-pink-100 dark:bg-pink-950/40 text-pink-600 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 opacity-80" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {referenceImageUrl ? "Reference photo attached" : "Have a reference photo?"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Upload from Instagram / Pinterest</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {referenceImageUrl && (
                  <button
                    type="button"
                    onClick={() => setReferenceImageUrl("")}
                    className="p-1.5 rounded-full hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-card hover:bg-muted border border-border text-xs font-bold transition-all shadow-sm">
                    <Upload className="w-3 h-3" /> {isUploading ? "Uploading..." : referenceImageUrl ? "Change" : "Upload"}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* 3. Date & Time */}
          <div className="space-y-3 pt-2 border-t border-border">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-500" /> 3. When do you need the cake?
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1 font-medium">Required Date</label>
                <Input
                  type="date"
                  min={todayStr}
                  value={requiredDate}
                  onChange={e => setRequiredDate(e.target.value)}
                  className="text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground block mb-1 font-medium">Required Time Slot</label>
                <select
                  value={requiredTime}
                  onChange={e => setRequiredTime(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-bold shadow-sm"
                >
                  <option value="10:00 AM - 01:00 PM">Morning (10:00 AM - 01:00 PM)</option>
                  <option value="01:00 PM - 05:00 PM">Afternoon (01:00 PM - 05:00 PM)</option>
                  <option value="05:00 PM - 08:00 PM">Evening (05:00 PM - 08:00 PM)</option>
                  <option value="08:00 PM - 10:00 PM">Night (08:00 PM - 10:00 PM)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. Fulfillment: Delivery vs Self Pickup */}
          <div className="space-y-3 pt-2 border-t border-border">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emerald-500" /> 4. How do you want to receive your cake?
            </Label>

            {/* Toggle choice */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFulfillmentType("delivery")}
                className={`p-3 rounded-2xl text-left border transition-all ${
                  fulfillmentType === "delivery"
                    ? "bg-emerald-500/10 border-emerald-500 text-foreground ring-1 ring-emerald-500"
                    : "bg-card border-border text-muted-foreground hover:border-emerald-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-extrabold text-foreground">Delivery</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Delivered to your doorstep</p>
                <span className="inline-block mt-2 text-[10px] font-bold text-emerald-600">Standard Delivery Fee ₹40</span>
              </button>

              <button
                type="button"
                onClick={() => setFulfillmentType("self_pickup")}
                className={`p-3 rounded-2xl text-left border transition-all ${
                  fulfillmentType === "self_pickup"
                    ? "bg-amber-500/10 border-amber-500 text-foreground ring-1 ring-amber-500"
                    : "bg-card border-border text-muted-foreground hover:border-amber-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-extrabold text-foreground">Self Pickup</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Collect from store counter</p>
                <span className="inline-block mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  Free (₹0 Fee)
                </span>
              </button>
            </div>

            {/* Address fields for Delivery vs Pickup */}
            {fulfillmentType === "delivery" ? (
              <div className="bg-muted/40 p-3 rounded-2xl border border-border space-y-2">
                <label className="text-[11px] font-bold text-foreground block">Delivery Address</label>
                <Input
                  value={deliveryAddress.street}
                  onChange={e => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
                  placeholder="House/Flat No., Street, Landmark"
                  className="text-xs"
                  required={fulfillmentType === "delivery"}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={deliveryAddress.city}
                    onChange={e => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                    placeholder="City"
                    className="text-xs"
                  />
                  <Input
                    value={deliveryAddress.pincode}
                    onChange={e => setDeliveryAddress({ ...deliveryAddress, pincode: e.target.value })}
                    placeholder="Pincode"
                    className="text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl">
                <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
                  <Store className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs font-bold">Store Counter Address</p>
                    <p className="text-[11px] opacity-90 mt-0.5">{shop.shopName} · {shopAddressText}</p>
                    <p className="text-[10px] opacity-75 mt-1">When the cake is ready, you will get a One-Time Pickup Code to collect your order at the counter.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1 font-medium">Your Name</label>
              <Input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Full Name"
                className="text-xs font-bold"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1 font-medium">Phone Number</label>
              <Input
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="text-xs font-bold"
                required
              />
            </div>
          </div>

          {/* Notice info */}
          <div className="bg-muted/40 p-3 rounded-2xl flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <p className="text-[11px] leading-relaxed">
              <strong>No payment required now!</strong> {shop.shopName} will review your request and send a price quote. You only pay the required advance after accepting the quote.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-full font-bold">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="flex-2 rounded-full font-extrabold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg shadow-pink-500/25"
            >
              {isSubmitting ? "Submitting Request..." : "Request Price Quote 🎂"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
