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
import { Plus, Wallet, CreditCard, Banknote, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { isServicePincode } from "@/lib/serviceArea";

interface ApiOrderResponse {
  success: boolean;
  order: { _id: string };
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

  if (items.length === 0) {
    setLocation("/cart");
    return null;
  }

  const deliveryFee = deliverySlot === 'instant' ? 25 : 0;
  const address = user?.addresses.find(a => a.id === selectedAddress);
  const addressPincodeInvalid = address && !isServicePincode(address.pincode);

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

    const paymentMethodApi = paymentMethod === 'Card' ? 'card' : paymentMethod;

    setPlacing(true);
    try {
      const data = await api.post<ApiOrderResponse>("/orders", {
        shopId,
        shopName,
        customerName: user.name,
        customerPhone: user.phone,
        items: items.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          qty: item.qty,
          price: item.product.price,
          category: item.product.category,
        })),
        subtotal,
        deliveryCharge: deliveryFee,
        couponDiscount: 0,
        paymentMethod: paymentMethodApi,
        address: {
          label: address.label,
          line1: address.line1,
          city: address.city,
          pincode: address.pincode,
        },
      });

      toast.success("Order placed successfully!");
      clearCart();
      setLocation(`/order/success/${data.order._id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to place order";
      toast.error(msg.includes("buffering") ? "Database connecting — please retry" : msg);
    } finally {
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
              onClick={() => setDeliverySlot('instant')}
              className={cn(
                "p-4 rounded-2xl cursor-pointer text-center border-2 transition-all",
                deliverySlot === 'instant' ? "neu-card border-primary/50 bg-primary/5" : "bg-card border-transparent neu-inset"
              )}
            >
              <div className="font-bold">Instant 10 min</div>
              <div className="text-xs text-muted-foreground mt-1">Extra ₹25</div>
            </div>
            <div
              onClick={() => setDeliverySlot('schedule')}
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
                <span className="font-bold">{option.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="pt-4 border-t border-border">
          <CartSummary subtotal={subtotal} deliveryFee={deliveryFee} />

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
              "Place Order"
            )}
          </Button>
        </section>
      </div>
    </div>
  );
}
