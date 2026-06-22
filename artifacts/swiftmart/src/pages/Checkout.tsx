import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useShops } from "@/hooks/useShops";
import { AddressCard } from "@/components/AddressCard";
import { AddressForm } from "@/components/AddressForm";
import { CartSummary } from "@/components/CartSummary";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Wallet, Banknote, Loader2, AlertCircle, Tag, X, CloudRain, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { isServicePincode } from "@/lib/serviceArea";

interface ApiOrderResponse {
  success: boolean;
  order: { _id: string };
}

interface CouponValidateResponse {
  success: boolean;
  discount: number;
  coupon: { code: string };
  message?: string;
}

interface DeliveryChargeResponse {
  success: boolean;
  crossAreaCharge: number;
  rainSurcharge: number;
  rainModeActive: boolean;
  total: number;
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, subtotal, clearCart } = useCart();
  const { user, addAddress, selectedDeliveryAddress, setSelectedDeliveryAddress } = useAuth();
  const { shops } = useShops();

  const [selectedAddress, setSelectedAddress] = useState<string | null>(
    selectedDeliveryAddress?.id || user?.addresses[0]?.id || null
  );
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [deliverySlot, setDeliverySlot] = useState<'instant' | 'schedule'>('instant');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'COD'>('UPI');
  const [placing, setPlacing] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  const [crossAreaCharge, setCrossAreaCharge] = useState(0);
  const [rainSurcharge, setRainSurcharge] = useState(0);
  const [rainModeActive, setRainModeActive] = useState(false);
  const [chargesLoading, setChargesLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  useEffect(() => {
    if (items.length === 0 && !orderPlaced) {
      setLocation("/cart");
    }
  }, [items.length, orderPlaced, setLocation]);

  const address = user?.addresses.find(a => a.id === selectedAddress);
  const addressPincodeInvalid = address && !isServicePincode(address.pincode);

  const shopId = items[0]?.product.vendorId;
  const shop = shops.find(s => s.id === shopId);
  const shopPincode = shop?.pincode ?? "";
  const isSamePincode = !!address && !!shopPincode && address.pincode === shopPincode;

  // Fetch cross-area charge whenever address or shop changes
  useEffect(() => {
    if (!address?.pincode || !shopPincode) return;
    if (address.pincode === shopPincode) {
      setCrossAreaCharge(0);
      setRainSurcharge(0);
      setRainModeActive(false);
      return;
    }
    setChargesLoading(true);
    api.get<DeliveryChargeResponse>(
      `/delivery/charges/calculate?shopPincode=${shopPincode}&userPincode=${address.pincode}`
    ).then(data => {
      setCrossAreaCharge(data.crossAreaCharge);
      setRainSurcharge(data.rainSurcharge);
      setRainModeActive(data.rainModeActive);
    }).catch(() => {
      // silently fall back to 0
    }).finally(() => setChargesLoading(false));
  }, [address?.pincode, shopPincode]);

  const slotFee = deliverySlot === 'instant' ? 25 : 10;
  const totalDeliveryFee = slotFee + crossAreaCharge + rainSurcharge;
  const orderTotalForCoupon = subtotal + totalDeliveryFee;
  const couponDiscount = couponApplied?.discount ?? 0;
  const totalAmount = subtotal + totalDeliveryFee - couponDiscount;

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const data = await api.post<CouponValidateResponse>("/coupons/validate", {
        code,
        orderTotal: orderTotalForCoupon,
        shopId: items[0]?.product.vendorId,
        categories: [...new Set(items.map(i => i.product.category))],
      });
      setCouponApplied({ code: data.coupon.code, discount: data.discount });
      setCouponInput("");
      toast.success(`Coupon applied! You save ₹${data.discount}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid coupon";
      setCouponError(msg);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(null);
    setCouponError("");
    setCouponInput("");
  };

  const createOrderRecord = async (shopName: string, razorpayOrderId?: string) => {
    const paymentMethodApi = paymentMethod;
    return api.post<ApiOrderResponse>("/orders", {
      shopId,
      shopName,
      customerName: user!.name,
      customerPhone: user!.phone,
      items: items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        qty: item.qty,
        price: item.product.price,
        category: item.product.category,
        ...(item.selectedColor ? { selectedColor: item.selectedColor } : {}),
        ...(item.selectedSize ? { selectedSize: item.selectedSize } : {}),
      })),
      subtotal,
      deliveryCharge: totalDeliveryFee,
      deliveryType: deliverySlot === 'instant' ? 'instant' : 'scheduled',
      couponDiscount,
      ...(couponApplied ? { couponCode: couponApplied.code } : {}),
      ...(razorpayOrderId ? { razorpayOrderId } : {}),
      paymentMethod: paymentMethodApi,
      address: {
        label: address!.label,
        line1: address!.line1,
        city: address!.city,
        pincode: address!.pincode,
      },
    });
  };

  const MINIMUM_ORDER_AMOUNT = 80;

  const handlePlaceOrder = async () => {
    if (subtotal < MINIMUM_ORDER_AMOUNT) {
      toast.error(`Minimum order amount is ₹${MINIMUM_ORDER_AMOUNT}`, {
        description: `Your cart total is ₹${subtotal}. Add ₹${+(MINIMUM_ORDER_AMOUNT - subtotal).toFixed(2)} more to place an order.`,
        duration: 4000,
      });
      return;
    }

    if (!selectedAddress || !address) {
      toast.error("Please add your delivery address before placing order.", {
        description: "Tap 'Add New' to add your delivery address.",
        duration: 4000,
      });
      setShowAddressForm(true);
      return;
    }

    if (addressPincodeInvalid) {
      toast.error("This address is outside our delivery area.", {
        description: "SwiftMart currently delivers within Balurghat (pincodes 733101 & 733103).",
        duration: 4000,
      });
      return;
    }

    if (!user) {
      toast.error("Please sign in to place an order");
      return;
    }

    if (!shopId) {
      toast.error("Could not determine shop for this order");
      return;
    }

    const shopName = shop?.storeName ?? "Unknown Shop";

    if (shop && !shop.isOpen) {
      toast.error(`${shopName} is currently closed.`, {
        description: "This shop has paused orders. Please try again later or choose another shop.",
        duration: 5000,
      });
      return;
    }

    setPlacing(true);

    try {
      const data = await createOrderRecord(shopName);
      setOrderPlaced(true);
      clearCart();
      setLocation(`/order/success/${data.order._id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to place order";
      toast.error(msg.includes("buffering") ? "Database connecting — please retry" : msg);
      setPlacing(false);
    }
  };

  const paymentOptions = [
    { id: 'COD', label: 'Cash on Delivery', icon: Banknote },
    { id: 'UPI', label: 'Pay on Delivery (UPI)', icon: Wallet },
  ] as const;

  return (
    <div className="pb-24 pt-4 px-4 max-w-3xl mx-auto space-y-8">
      <SectionHeader title="Checkout" />

      <div className="space-y-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Delivery Address</h3>
            {!showAddressForm && (
              <Button variant="ghost" size="sm" onClick={() => setShowAddressForm(true)} className="text-primary hover:bg-primary/10 rounded-xl">
                <Plus className="w-4 h-4 mr-1" /> Add New
              </Button>
            )}
          </div>

          {showAddressForm ? (
            <AddressForm
              onSubmit={(addr) => {
                addAddress(addr);
                setSelectedAddress(addr.id);
                setSelectedDeliveryAddress(addr);
                setShowAddressForm(false);
                toast.success("Address added successfully");
              }}
              onCancel={() => setShowAddressForm(false)}
            />
          ) : (
            <div className="grid gap-3">
              {user?.addresses.map(addr => (
                <AddressCard
                  key={addr.id}
                  address={addr}
                  selected={selectedAddress === addr.id}
                  onClick={() => {
                    setSelectedAddress(addr.id);
                    setSelectedDeliveryAddress(addr);
                  }}
                />
              ))}
              {(!user?.addresses || user.addresses.length === 0) && (
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="text-center p-6 bg-card rounded-2xl neu-inset text-muted-foreground hover:text-primary transition-colors w-full"
                >
                  <Plus className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Tap to add your delivery address</span>
                </button>
              )}
            </div>
          )}

          {addressPincodeInvalid && (
            <div className="mt-3 flex items-start gap-2 bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>SwiftMart currently delivers within Balurghat only (pincodes 733101 & 733103). Please use one of these pincodes.</p>
            </div>
          )}

          {/* Cross-area delivery info banner */}
          {address && shopPincode && !isSamePincode && !addressPincodeInvalid && (
            <div className="mt-3 rounded-xl p-3 text-sm space-y-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Cross-area delivery applies
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                This shop is in pincode <strong>{shopPincode}</strong> but your address is in <strong>{address.pincode}</strong>.
                {chargesLoading
                  ? " Calculating delivery charge…"
                  : crossAreaCharge > 0
                    ? ` A cross-area charge of ₹${crossAreaCharge}${rainModeActive && rainSurcharge > 0 ? ` + ₹${rainSurcharge} rain surcharge` : ""} has been added.`
                    : " No extra charge configured for this route yet."}
              </p>
              {rainModeActive && rainSurcharge > 0 && (
                <div className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">
                  <CloudRain className="w-3.5 h-3.5" /> Rain mode active — surcharge included
                </div>
              )}
            </div>
          )}

          {/* Same pincode — quick delivery badge */}
          {address && shopPincode && isSamePincode && (
            <div className="mt-3 flex items-center gap-2 bg-primary/10 text-primary rounded-xl p-3 text-sm font-semibold">
              <Zap className="w-4 h-4 fill-current" />
              Quick Delivery available — this shop is in your area!
            </div>
          )}
        </section>

        <section>
          <h3 className="font-bold text-lg mb-4">Delivery Slot</h3>
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => { setDeliverySlot('instant'); handleRemoveCoupon(); }}
              className={cn(
                "p-4 rounded-2xl cursor-pointer text-center border-2 transition-all",
                deliverySlot === 'instant' ? "neu-card border-primary/50 bg-primary/5" : "bg-card border-transparent neu-inset"
              )}
            >
              <div className="font-bold">Instant 10–30 min</div>
              <div className="text-xs text-muted-foreground mt-1">₹25 delivery fee</div>
            </div>
            <div
              onClick={() => { setDeliverySlot('schedule'); handleRemoveCoupon(); }}
              className={cn(
                "p-4 rounded-2xl cursor-pointer text-center border-2 transition-all",
                deliverySlot === 'schedule' ? "neu-card border-primary/50 bg-primary/5" : "bg-card border-transparent neu-inset"
              )}
            >
              <div className="font-bold">Scheduled Delivery</div>
              <div className="text-xs text-muted-foreground mt-1">₹10 · Delivered in 2–4 hrs</div>
            </div>
          </div>
          {deliverySlot === 'schedule' && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5 px-1">
              <span className="text-green-600">✓</span>
              Scheduled delivery may take 2–4 hours. Orders are batched for efficiency.
            </p>
          )}
        </section>

        <section>
          <h3 className="font-bold text-lg mb-4">Coupon</h3>
          {couponApplied ? (
            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Tag className="w-4 h-4 shrink-0" />
                <span className="font-bold text-sm">{couponApplied.code}</span>
                <span className="text-sm">— saving ₹{couponApplied.discount}</span>
              </div>
              <button onClick={handleRemoveCoupon} className="text-muted-foreground hover:text-destructive transition-colors ml-3">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={couponInput}
                  onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleApplyCoupon()}
                  placeholder="Enter coupon code"
                  className="rounded-xl font-mono uppercase tracking-widest"
                  disabled={couponLoading}
                />
                <Button
                  onClick={handleApplyCoupon}
                  disabled={!couponInput.trim() || couponLoading}
                  className="rounded-xl shrink-0 neu-card shadow-none"
                >
                  {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
              {couponError && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {couponError}
                </p>
              )}
            </div>
          )}
        </section>

        <section>
          <h3 className="font-bold text-lg mb-4">Payment Method</h3>
          <div className="space-y-3">
            {paymentOptions.map(option => (
              <div
                key={option.id}
                onClick={() => setPaymentMethod(option.id)}
                className={cn(
                  "p-4 rounded-2xl cursor-pointer flex items-center gap-3 border-2 transition-all",
                  paymentMethod === option.id ? "neu-card border-primary/50 bg-primary/5" : "bg-card border-transparent neu-inset"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  paymentMethod === option.id ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                )}>
                  <option.icon className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold">{option.label}</span>
                  {option.id === 'UPI' && (
                    <p className="text-xs text-muted-foreground mt-0.5">Rider shows QR code at your door</p>
                  )}
                  {option.id === 'COD' && (
                    <p className="text-xs text-muted-foreground mt-0.5">Pay cash when order arrives</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="pt-4 border-t border-border">
          <CartSummary
            subtotal={subtotal}
            deliveryFee={slotFee}
            deliveryType={deliverySlot === 'instant' ? 'instant' : 'scheduled'}
            crossAreaCharge={crossAreaCharge}
            rainSurcharge={rainSurcharge}
            rainModeActive={rainModeActive}
            couponDiscount={couponApplied?.discount ?? 0}
            couponCode={couponApplied?.code}
          />

          <Button
            className="w-full mt-6 rounded-full h-14 text-lg font-bold shadow-none neu-card"
            onClick={handlePlaceOrder}
            disabled={placing || !!addressPincodeInvalid || chargesLoading}
          >
            {placing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Placing Order…
              </>
            ) : chargesLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Calculating charges…
              </>
            ) : (
              'Place Order'
            )}
          </Button>
        </section>
      </div>
    </div>
  );
}

