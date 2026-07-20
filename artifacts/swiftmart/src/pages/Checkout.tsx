import { useState, useEffect, useRef } from "react";
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
import { Plus, Wallet, Banknote, Loader2, AlertCircle, Tag, X, Zap, Clock, Store, MapPin, Bike, Package } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { isServicePincode } from "@/lib/serviceArea";
import {
  getCustomerCoords,
  computeSingleShopEta,
  type DeliveryEta,
  type LatLng,
} from "@/lib/deliveryEta";

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


import { SEO } from "@/components/SEO";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, subtotal, clearCart } = useCart();
  const { user, addAddress, selectedDeliveryAddress, setSelectedDeliveryAddress } = useAuth();
  const { shops } = useShops();

  const [selectedAddress, setSelectedAddress] = useState<string | null>(
    selectedDeliveryAddress?.id || user?.addresses[0]?.id || null
  );
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [deliverySlot, setDeliverySlot] = useState<'instant' | 'standard' | 'saver'>('instant');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'COD'>('UPI');
  const [placing, setPlacing] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  const [orderPlaced, setOrderPlaced] = useState(false);

  // Delivery ETA
  const [deliveryEta, setDeliveryEta] = useState<DeliveryEta | null>(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const customerCoordsRef = useRef<LatLng | null>(null);

  useEffect(() => {
    if (items.length === 0 && !orderPlaced) {
      setLocation("/cart");
    }
  }, [items.length, orderPlaced, setLocation]);

  const address = user?.addresses.find(a => a.id === selectedAddress);
  const addressPincodeInvalid = address && !isServicePincode(address.pincode);

  // Unique shops in cart
  const uniqueShopIds = [...new Set(items.map(i => i.product.vendorId))];
  const isMultiShop = uniqueShopIds.length > 1;

  const shopId = items[0]?.product.vendorId;
  const shop = shops.find(s => s.id === shopId);
  const shopPincode = shop?.pincode ?? "";
  const isSamePincode = !!address && !!shopPincode && address.pincode === shopPincode;

  // Compute delivery ETA whenever cart or address changes
  useEffect(() => {
    if (items.length === 0) { setDeliveryEta(null); return; }

    if (isMultiShop) {
      setDeliveryEta({ kind: "multi-shop", shopCount: uniqueShopIds.length, minMin: 30, maxMin: 45 });
      return;
    }

    // Single shop — use GPS for precise estimate
    setEtaLoading(true);
    const shopForEta = shops.find(s => s.id === shopId);
    const shopPincodeForEta = shopForEta?.pincode ?? "";
    const shopEtaStr = shopForEta?.eta ?? "";

    const run = async () => {
      // Reuse cached coords to avoid re-prompting GPS every render
      let coords = customerCoordsRef.current;
      if (!coords) {
        coords = await getCustomerCoords();
        customerCoordsRef.current = coords;
      }
      const eta = computeSingleShopEta(coords, shopPincodeForEta, shopEtaStr);
      setDeliveryEta(eta);
      setEtaLoading(false);
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiShop, shopId, items.length, shops.length]);

  const slotFee = deliverySlot === 'instant' ? 25 : deliverySlot === 'standard' ? 20 : 15;
  // Each shop's order carries the full delivery fee — not split
  const totalDeliveryFee = slotFee * uniqueShopIds.length;
  // Flat ₹6 packaging fee, charged per shop order (mirrors delivery fee behavior)
  const PACKAGING_FEE_PER_SHOP = 6;
  const totalPackagingFee = PACKAGING_FEE_PER_SHOP * uniqueShopIds.length;
  const orderTotalForCoupon = subtotal + totalDeliveryFee;
  const couponDiscount = couponApplied?.discount ?? 0;
  const totalAmount = subtotal + totalDeliveryFee + totalPackagingFee - couponDiscount;

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

  // Creates one order for a single shop's subset of items
  const createOrderForShop = async (
    sid: string,
    shopItems: typeof items,
    shopSubtotal: number,
    shopDeliveryCharge: number,
    shopCouponDiscount: number,
    shopCouponCode?: string,
  ) => {
    const shopObj = shops.find(s => s.id === sid);
    return api.post<ApiOrderResponse>("/orders", {
      shopId: sid,
      shopName: shopObj?.storeName ?? "Unknown Shop",
      customerName: user!.name,
      customerPhone: user!.phone,
      items: shopItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        qty: item.qty,
        price: item.product.discountedPrice ?? item.product.price,
        category: item.product.category,
        ...(item.selectedColor ? { selectedColor: item.selectedColor } : {}),
        ...(item.selectedSize ? { selectedSize: item.selectedSize } : {}),
      })),
      subtotal: shopSubtotal,
      deliveryCharge: shopDeliveryCharge,
      deliveryType: deliverySlot === 'instant' ? 'instant' : 'scheduled',
      couponDiscount: shopCouponDiscount,
      ...(shopCouponCode ? { couponCode: shopCouponCode } : {}),
      paymentMethod,
      address: {
        label: address!.label,
        line1: address!.line1,
        city: address!.city,
        pincode: address!.pincode,
      },
    });
  };

  const MINIMUM_ORDER_AMOUNT = 99;

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

    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // Check every shop in the cart is open
    for (const sid of uniqueShopIds) {
      const shopObj = shops.find(s => s.id === sid);
      if (shopObj && !shopObj.isOpen) {
        toast.error(`${shopObj.storeName} is currently closed.`, {
          description: "This shop has paused orders. Please remove their items or try again later.",
          duration: 5000,
        });
        return;
      }
    }

    setPlacing(true);

    try {
      // Group cart items by shop
      const shopGroups = new Map<string, typeof items>();

      for (const item of items) {
        const sid = item.product.vendorId;
        if (!shopGroups.has(sid)) shopGroups.set(sid, []);
        shopGroups.get(sid)!.push(item);
      }

      // Coupon applied only to the first shop to avoid double usage-count
      let couponAppliedToFirst = false;
      const createdOrderIds: string[] = [];

      for (const [sid, shopItems] of shopGroups) {
        const shopSub = +shopItems
          .reduce((s, i) => s + (i.product.discountedPrice ?? i.product.price) * i.qty, 0)
          .toFixed(2);
        // Every shop's order gets the full delivery fee — never split
        const shopCouponDiscount = !couponAppliedToFirst ? (couponApplied?.discount ?? 0) : 0;
        const shopCouponCode     = !couponAppliedToFirst ? couponApplied?.code : undefined;
        couponAppliedToFirst = true;

        const data = await createOrderForShop(sid, shopItems, shopSub, slotFee, shopCouponDiscount, shopCouponCode);
        createdOrderIds.push(data.order._id);
      }

      setOrderPlaced(true);
      clearCart();

      if (createdOrderIds.length === 1) {
        setLocation(`/order/success/${createdOrderIds[0]}`);
      } else {
        toast.success(`${createdOrderIds.length} orders placed — one per shop!`);
        setLocation(`/orders?multiShop=${createdOrderIds.length}`);
      }
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
      <SEO noIndex />
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

          {/* Same pincode — quick delivery badge */}
          {address && shopPincode && isSamePincode && (
            <div className="mt-3 flex items-center gap-2 bg-primary/10 text-primary rounded-xl p-3 text-sm font-semibold">
              <Zap className="w-4 h-4 fill-current" />
              Quick Delivery available — this shop is in your area!
            </div>
          )}
        </section>

        {/* ── Delivery ETA Banner ── */}
        {(etaLoading || deliveryEta) && (
          <section>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Delivery Estimate
            </h3>

            {etaLoading && (
              <div className="flex items-center gap-3 bg-card rounded-2xl neu-card p-4 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                Calculating delivery time from your location…
              </div>
            )}

            {!etaLoading && deliveryEta?.kind === "multi-shop" && (
              <div className="rounded-2xl overflow-hidden border-2 border-orange-400 dark:border-orange-500 shadow-md">
                {/* Header strip */}
                <div className="bg-orange-500 px-4 py-2.5 flex items-center gap-2">
                  <Store className="w-4 h-4 text-white shrink-0" />
                  <p className="font-bold text-white text-sm">
                    Items from {deliveryEta.shopCount} different shops
                  </p>
                </div>
                {/* Body */}
                <div className="bg-orange-50 dark:bg-orange-950/30 px-4 py-3 space-y-3">
                  <p className="text-sm text-orange-900 dark:text-orange-200 leading-relaxed">
                    Since your cart has items from <span className="font-bold">{deliveryEta.shopCount} shops</span>, we will place {deliveryEta.shopCount} separate orders and coordinate delivery from each shop.
                  </p>
                  {/* Delivery time highlight */}
                  <div className="flex items-center gap-3 bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700 rounded-xl px-4 py-3">
                    <Bike className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-orange-800 dark:text-orange-300 uppercase tracking-wide">Estimated Delivery Time</p>
                      <p className="text-xl font-extrabold text-orange-700 dark:text-orange-300 leading-tight">1 hour 30 minutes</p>
                    </div>
                  </div>
                  <p className="text-xs text-orange-700 dark:text-orange-400 leading-relaxed">
                    ⚡ Want faster? You can get items from a single shop delivered in ~30 minutes.
                  </p>
                </div>
              </div>
            )}

            {!etaLoading && deliveryEta?.kind === "single-shop" && (
              <div className="rounded-2xl bg-card neu-card overflow-hidden">
                {/* ETA header */}
                <div className="flex items-center justify-between p-4 bg-primary/5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Bike className="w-5 h-5 text-primary" />
                    <span className="font-bold text-sm">Estimated delivery</span>
                  </div>
                  <span className="font-extrabold text-primary text-lg">
                    {deliveryEta.rangeMin}–{deliveryEta.rangeMax} min
                  </span>
                </div>

                {/* Breakdown */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <Bike className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-muted-foreground flex-1">Rider reaches shop</span>
                    <span className="font-semibold">~{deliveryEta.breakdown.riderPickupMin} min</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                      <Package className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <span className="text-muted-foreground flex-1">Shop packs your order</span>
                    <span className="font-semibold">~{deliveryEta.breakdown.shopPrepMin} min</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-muted-foreground flex-1">
                      Ride to you
                      {deliveryEta.breakdown.distanceKm != null && (
                        <span className="text-xs ml-1">
                          ({deliveryEta.breakdown.distanceKm.toFixed(1)} km
                          {deliveryEta.breakdown.customerCoordsUsed ? " · GPS" : " · est."})
                        </span>
                      )}
                    </span>
                    <span className="font-semibold">~{deliveryEta.breakdown.transitMin} min</span>
                  </div>

                  {!deliveryEta.breakdown.customerCoordsUsed && (
                    <button
                      onClick={async () => {
                        setEtaLoading(true);
                        const coords = await getCustomerCoords();
                        customerCoordsRef.current = coords;
                        const shopForEta = shops.find(s => s.id === shopId);
                        const eta = computeSingleShopEta(coords, shopForEta?.pincode ?? "", shopForEta?.eta ?? "");
                        setDeliveryEta(eta);
                        setEtaLoading(false);
                      }}
                      className="flex items-center gap-2 text-xs text-primary font-semibold hover:underline"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Use my GPS location for a more accurate estimate
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        <section>
          <h3 className="font-bold text-lg mb-1">Delivery Slot</h3>
          <p className="text-xs text-muted-foreground mb-4">Choose how fast you need it</p>
          <div className="grid grid-cols-3 gap-3">

            {/* Instant */}
            <div
              onClick={() => { setDeliverySlot('instant'); handleRemoveCoupon(); }}
              className={cn(
                "aspect-square p-3 rounded-2xl cursor-pointer border-2 transition-all flex flex-col items-center justify-between text-center",
                deliverySlot === 'instant' ? "neu-card border-orange-400/60 bg-orange-500/5" : "bg-card border-transparent neu-inset"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0",
                deliverySlot === 'instant' ? "bg-orange-500 text-white" : "bg-background text-orange-500 neu-inset"
              )}>⚡</div>
              <div className="font-bold text-xs leading-tight">Instant</div>
              <div className="text-[10px] text-muted-foreground leading-tight">10–30 min</div>
              <div className={cn("font-extrabold text-sm", deliverySlot === 'instant' ? "text-orange-500" : "text-foreground")}>₹25</div>
            </div>

            {/* Standard */}
            <div
              onClick={() => { setDeliverySlot('standard'); handleRemoveCoupon(); }}
              className={cn(
                "aspect-square p-3 rounded-2xl cursor-pointer border-2 transition-all flex flex-col items-center justify-between text-center",
                deliverySlot === 'standard' ? "neu-card border-blue-400/60 bg-blue-500/5" : "bg-card border-transparent neu-inset"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0",
                deliverySlot === 'standard' ? "bg-blue-500 text-white" : "bg-background text-blue-500 neu-inset"
              )}>🕐</div>
              <div className="font-bold text-xs leading-tight">Standard</div>
              <div className="text-[10px] text-muted-foreground leading-tight">2–4 hours</div>
              <div className={cn("font-extrabold text-sm", deliverySlot === 'standard' ? "text-blue-500" : "text-foreground")}>₹20</div>
            </div>

            {/* Saver */}
            <div
              onClick={() => { setDeliverySlot('saver'); handleRemoveCoupon(); }}
              className={cn(
                "aspect-square p-3 rounded-2xl cursor-pointer border-2 transition-all flex flex-col items-center justify-between text-center",
                deliverySlot === 'saver' ? "neu-card border-green-400/60 bg-green-500/5" : "bg-card border-transparent neu-inset"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0",
                deliverySlot === 'saver' ? "bg-green-500 text-white" : "bg-background text-green-500 neu-inset"
              )}>🌿</div>
              <div className="font-bold text-xs leading-tight">Saver</div>
              <div className="text-[10px] text-muted-foreground leading-tight">Same day</div>
              <div className={cn("font-extrabold text-sm", deliverySlot === 'saver' ? "text-green-500" : "text-foreground")}>₹15</div>
            </div>

          </div>
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
            deliveryFee={totalDeliveryFee}
            deliveryType={deliverySlot}
            shopCount={uniqueShopIds.length}
            packagingFee={totalPackagingFee}
            couponDiscount={couponApplied?.discount ?? 0}
            couponCode={couponApplied?.code}
          />

          <Button
            className="w-full mt-6 rounded-full h-14 text-lg font-bold shadow-none neu-card"
            onClick={handlePlaceOrder}
            disabled={placing || !!addressPincodeInvalid}
          >
            {placing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Placing Order…
              </>
            ) : (
              isMultiShop
                ? `Place ${uniqueShopIds.length} Orders`
                : 'Place Order'
            )}
          </Button>

          {/* Payment trust row */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <span>🔒</span> Secure payments via
            </p>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {[
                { label: "Razorpay", bg: "#072654", color: "#fff" },
                { label: "UPI", bg: "#5f259f", color: "#fff" },
                { label: "GPay", bg: "#1a73e8", color: "#fff" },
                { label: "PhonePe", bg: "#5f259f", color: "#fff" },
                { label: "COD", bg: "#166534", color: "#fff" },
              ].map(({ label, bg, color }) => (
                <span
                  key={label}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-md"
                  style={{ background: bg, color }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

