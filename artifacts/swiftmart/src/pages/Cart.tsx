import { useCart } from "@/hooks/useCart";
import { CartItemRow } from "@/components/CartItemRow";
import { CartSummary } from "@/components/CartSummary";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import { SectionHeader } from "@/components/SectionHeader";

export default function Cart() {
  const { items, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] items-center justify-center">
        <EmptyState 
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Looks like you haven't added anything to your cart yet."
          action={
            <Link href="/">
              <Button className="mt-4 rounded-full px-8 neu-card shadow-none">
                Start Shopping
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-3xl mx-auto space-y-6">
      <SectionHeader title="Your Cart" />
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          {items.map(item => (
            <CartItemRow key={item.product.id} item={item} />
          ))}
        </div>
        
        <div className="w-full md:w-80 flex-shrink-0 space-y-6">
          <CartSummary subtotal={subtotal} />
          
          <Link href="/checkout">
            <Button className="w-full rounded-full h-12 text-base font-bold shadow-none neu-card">
              Proceed to Checkout
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
