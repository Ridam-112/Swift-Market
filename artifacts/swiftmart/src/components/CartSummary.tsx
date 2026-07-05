import { formatINR } from "@/lib/currency";

export function CartSummary({
  subtotal,
  deliveryFee = 0,
  deliveryType = 'instant',
  shopCount = 1,
  couponDiscount = 0,
  couponCode,
}: {
  subtotal: number;
  deliveryFee?: number;
  deliveryType?: 'instant' | 'standard' | 'saver';
  shopCount?: number;
  couponDiscount?: number;
  couponCode?: string;
}) {
  const total = subtotal + deliveryFee - couponDiscount;
  const perShopFee = shopCount > 1 ? deliveryFee / shopCount : deliveryFee;
  const deliveryLabel =
    deliveryType === 'standard' ? 'Standard Delivery (2–4 hrs)'
    : deliveryType === 'saver'  ? 'Saver Delivery (Same day)'
    :                             'Instant Delivery (10–30 min)';

  return (
    <div className="bg-card p-4 rounded-2xl neu-card space-y-3 text-sm">
      <h3 className="font-bold text-base mb-2">Bill Details</h3>

      <div className="flex justify-between text-muted-foreground">
        <span>Item Total</span>
        <span className="font-medium text-foreground">{formatINR(subtotal)}</span>
      </div>

      {deliveryFee > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <div>
            <span>{deliveryLabel}</span>
            {shopCount > 1 && (
              <p className="text-[10px] mt-0.5 text-muted-foreground">
                ₹{perShopFee} × {shopCount} shops
              </p>
            )}
          </div>
          <span className="font-medium text-foreground">{formatINR(deliveryFee)}</span>
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
