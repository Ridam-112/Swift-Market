import { formatINR } from "@/lib/currency";

export function CartSummary({
  subtotal,
  deliveryFee = 25,
  couponDiscount = 0,
  couponCode,
}: {
  subtotal: number;
  deliveryFee?: number;
  couponDiscount?: number;
  couponCode?: string;
}) {
  const total = subtotal + deliveryFee - couponDiscount;

  return (
    <div className="bg-card p-4 rounded-2xl neu-card space-y-3 text-sm">
      <h3 className="font-bold text-base mb-2">Bill Details</h3>

      <div className="flex justify-between text-muted-foreground">
        <span>Item Total</span>
        <span className="font-medium text-foreground">{formatINR(subtotal)}</span>
      </div>

      <div className="flex justify-between text-muted-foreground">
        <span>Delivery Fee (10 mins)</span>
        <span className="font-medium text-foreground">{formatINR(deliveryFee)}</span>
      </div>

      {couponDiscount > 0 && (
        <div className="flex justify-between text-green-600 dark:text-green-400">
          <span>Coupon {couponCode ? `(${couponCode})` : "Discount"}</span>
          <span className="font-medium">− {formatINR(couponDiscount)}</span>
        </div>
      )}

      <div className="pt-3 mt-3 border-t border-border flex justify-between font-bold text-lg">
        <span>To Pay</span>
        <span className="text-primary">{formatINR(Math.max(0, total))}</span>
      </div>
    </div>
  );
}
