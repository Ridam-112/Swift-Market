import { useState } from "react";
import { useLocation } from "wouter";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { AddressCard } from "@/components/AddressCard";
import { AddressForm } from "@/components/AddressForm";
import { CartSummary } from "@/components/CartSummary";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, subtotal, clearCart } = useCart();
  const { user, addAddress } = useAuth();
  
  const [selectedAddress, setSelectedAddress] = useState<string | null>(user?.addresses[0]?.id || null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [deliverySlot, setDeliverySlot] = useState<'instant' | 'schedule'>('instant');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'COD'>('UPI');

  if (items.length === 0) {
    setLocation("/cart");
    return null;
  }

  const handlePlaceOrder = () => {
    if (!selectedAddress) {
      toast.error("Please select a delivery address");
      return;
    }
    
    // In a real app, this would call an API
    const orderId = `ORD-${Math.floor(Math.random() * 10000)}`;
    
    toast.success("Order placed successfully!");
    clearCart();
    setLocation(`/order/success/${orderId}`);
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
                  onClick={() => setSelectedAddress(addr.id)}
                />
              ))}
              {(!user?.addresses || user.addresses.length === 0) && (
                <div className="text-center p-4 bg-card rounded-2xl neu-inset text-muted-foreground">
                  No addresses saved. Please add one.
                </div>
              )}
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
          <CartSummary subtotal={subtotal} deliveryFee={deliverySlot === 'instant' ? 25 : 0} />
          
          <Button 
            className="w-full mt-6 rounded-full h-14 text-lg font-bold shadow-none neu-card"
            onClick={handlePlaceOrder}
          >
            Place Order
          </Button>
        </section>
      </div>
    </div>
  );
}
