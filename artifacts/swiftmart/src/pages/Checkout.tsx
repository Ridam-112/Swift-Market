import { useState } from "react";
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
import { Plus, Wallet, CreditCard, Banknote, Loader2, AlertCircle, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { isServicePincode } from "@/lib/serviceArea";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
}

interface RazorpayInstance {
  open(): void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOrderResponse {
  success: boolean;
  keyId: string;
  order: {
    id: string;
    amount: number;
    currency: string;
  };
}

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
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'COD'>('UPI');
  const [placing, setPlacing] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  if (items.length === 0) {
    setLocation("/cart");
    return null;
  }

  const deliveryFee = deliverySlot === 'instant' ? 25 : 0;
  const address = user?.addresses.find(a => a.id === selectedAddress);
  const addressPincodeInvalid = address && !isServicePincode(address.pincode);
  const orderTotalForCoupon = subtotal + deliveryFee;
  const couponDiscount = couponApplied?.discount ?? 0;
  const totalAmount = subtotal + deliveryFee - couponDiscount;

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const data = await api.post<CouponValidateResponse>("/coupons/validate", {
        code,
        orderTotal: orderTotalForCoupon,
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

  const createOrderRecord = async (shopId: string, shopName: string) => {
    const paymentMethodApi = paymentMethod === 'Card' ? 'card' : paymentMethod;
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
      })),
      subtotal,
      deliveryCharge: deliveryFee,
      couponDiscount,
      ...(couponApplied ? { couponCode: couponApplied.code } : {}),
      paymentMethod: paymentMethodApi,
      address: {
        label: address!.label,
        line1: address!.line1,
        city: address!.city,
        pincode: address!.pincode,
      },
    });
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress || !address) {
      toast.error("Please add your delivery address before placing order.", {
        description: "Tap 'Add New' to add your delivery address.",
        duration: 4000,
      });
      setShowAddressForm(true);
      return;
    }

    if (addressPincodeInvalid) {
      toast.error("This address is outside our service area.", {
        description: "SwiftMart delivers only to 733101 and 733103.",
        duration: 4000,
      });
      return;
    }

    if (!user) {
      toast.error("Please sign in to place an order");
      return;
    }

    const shopId = items[0]?.product.vendorId;
    if (!shopId) {
      toast.error("Could not determine shop for this order");
      return;
    }

    const shop = shops.find(s => s.id === shopId);
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
      if (paymentMethod === 'COD') {
        // COD: create order directly
        const data = await createOrderRecord(shopId, shopName);
        toast.success("Order placed successfully!");
        clearCart();
        setLocation(`/order/success/${data.order._id}`);
      } else {
        // Online payment: create Razorpay order first, then open popup
        const rzpOrderData = await api.post<RazorpayOrderResponse>("/payments/create-order", {
          amount: totalAmount,
          receipt: `order_${Date.now()}`,
        });

        if (!window.Razorpay) {
          toast.error("Payment gateway failed to load. Please refresh and try again.");
          setPlacing(false);
          return;
        }

        const rzp = new window.Razorpay({
          key: rzpOrderData.keyId,
          amount: rzpOrderData.order.amount,
          currency: rzpOrderData.order.currency,
          name: "SwiftMart",
          description: `Order from ${shopName}`,
          order_id: rzpOrderData.order.id,
          prefill: {
            name: user.name,
            contact: user.phone,
          },
          theme: { color: "#16a34a" },
          handler: async (response: RazorpayResponse) => {
            try {
              // Create order record in our DB
              const orderData = await createOrderRecord(shopId, shopName);
              // Verify payment signature with backend
              await api.post("/payments/verify", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: orderData.order._id,
              });
              toast.success("Payment successful! Order placed.");
              clearCart();
              setLocation(`/order/success/${orderData.order._id}`);
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Payment verification failed";
              toast.error(msg);
            } finally {
              setPlacing(false);
            }
          },
          modal: {
            ondismiss: () => {
              toast.info("Payment cancelled");
              setPlacing(false);
            },
          },
        });

        rzp.open();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to place order";
      toast.error(msg.includes("buffering") ? "Database connecting — please retry" : msg);
      setPlacing(false);
    }
  };

  const paymentOptions = [
    { id: 'UPI', label: 'UPI', icon: Wallet },
    { id: 'Card', label: 'Credit/Debit Card', icon: CreditCard },
    { id: 'COD', label: 'Cash on Delivery', icon: Banknote }
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
              <p>This address pincode is outside our service area. Please add an address with pincode 733101 or 733103.</p>
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
              <div className="font-bold">Instant 10 min</div>
              <div className="text-xs text-muted-foreground mt-1">Extra ₹25</div>
            </div>
            <div
              onClick={() => { setDeliverySlot('schedule'); handleRemoveCoupon(); }}
              className={cn(
                "p-4 rounded-2xl cursor-pointer text-center border-2 transition-all",
                deliverySlot === 'schedule' ? "neu-card border-primary/50 bg-primary/5" : "bg-card border-transparent neu-inset"
              )}
            >
              <div className="font-bold">Schedule later</div>
              <div className="text-xs text-muted-foreground mt-1">Free delivery</div>
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
                  {option.id !== 'COD' && (
                    <p className="text-xs text-muted-foreground mt-0.5">Powered by Razorpay</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="pt-4 border-t border-border">
          <CartSummary
            subtotal={subtotal}
            deliveryFee={deliveryFee}
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
                {paymentMethod === 'COD' ? 'Placing Order…' : 'Opening Payment…'}
              </>
            ) : (
              paymentMethod === 'COD' ? 'Place Order' : `Pay ₹${totalAmount}`
            )}
          </Button>
        </section>
      </div>
    </div>
  );
}
