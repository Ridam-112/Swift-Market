import { CloudRain } from "lucide-react";
import { formatINR } from "@/lib/currency";

export function CartSummary({
  subtotal,
  deliveryFee = 0,
  crossAreaCharge = 0,
  rainSurcharge = 0,
  rainModeActive = false,
  couponDiscount = 0,
  couponCode,
}: {
  subtotal: number;
  deliveryFee?: number;
  crossAreaCharge?: number;
  rainSurcharge?: number;
  rainModeActive?: boolean;
  couponDiscount?: number;
  couponCode?: string;
}) {
  const total = subtotal + deliveryFee + crossAreaCharge + rainSurcharge - couponDiscount;

  return (
    <div className="bg-card p-4 rounded-2xl neu-card space-y-3 text-sm">
      <h3 className="font-bold text-base mb-2">Bill Details</h3>

      <div className="flex justify-between text-muted-foreground">
        <span>Item Total</span>
        <span className="font-medium text-foreground">{formatINR(subtotal)}</span>
      </div>

      {deliveryFee > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>Instant Delivery (10 min)</span>
          <span className="font-medium text-foreground">{formatINR(deliveryFee)}</span>
        </div>
      )}

      {crossAreaCharge > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>Cross-area Delivery</span>
          <span className="font-medium text-foreground">{formatINR(crossAreaCharge)}</span>
        </div>
      )}

      {rainModeActive && rainSurcharge > 0 && (
        <div className="flex justify-between text-blue-600 dark:text-blue-400">
          <span className="flex items-center gap-1">
            <CloudRain className="w-3.5 h-3.5" /> Rain Surcharge
          </span>
          <span className="font-medium">{formatINR(rainSurcharge)}</span>
        </div>
      )}

      {crossAreaCharge === 0 && deliveryFee === 0 && (
        <div className="flex justify-between text-green-600 dark:text-green-400">
          <span>Delivery Fee</span>
          <span className="font-medium">Free</span>
        </div>
      )}

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
