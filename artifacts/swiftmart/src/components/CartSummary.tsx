import { formatINR } from "@/lib/currency";

export function CartSummary({
  subtotal,
  deliveryFee = 0,
  deliveryType = 'instant',
  shopCount = 1,
  packagingFee = 0,
  gstAmount = 0,
  couponDiscount = 0,
  couponCode,
  distanceKm,
  baseDeliveryFee,
  petrolCharge,
  isFood = false,
  deliveryTimingLabel,
}: {
  subtotal: number;
  deliveryFee?: number;
  deliveryType?: 'instant' | 'standard' | 'saver';
  shopCount?: number;
  packagingFee?: number;
  gstAmount?: number;
  couponDiscount?: number;
  couponCode?: string;
  distanceKm?: number | null;
  baseDeliveryFee?: number;
  petrolCharge?: number;
  isFood?: boolean;
  deliveryTimingLabel?: string;
}) {
  const total = subtotal + deliveryFee + packagingFee + gstAmount - couponDiscount;
  const perShopFee = shopCount > 1 ? deliveryFee / shopCount : deliveryFee;
  
  const deliveryLabel = deliveryTimingLabel
    ? (isFood ? `Express Food Delivery (${deliveryTimingLabel})` : `${deliveryType.charAt(0).toUpperCase() + deliveryType.slice(1)} Delivery (${deliveryTimingLabel})`)
    : deliveryType === 'standard' ? 'Standard Delivery (2–3 hrs)'
    : deliveryType === 'saver'  ? 'Saver Delivery (Within 12 hrs)'
    : isFood ? 'Express Food Delivery (30–40 min)' : 'Instant Delivery (30 min–1 hr)';

  return (
    <div className="bg-card p-4 rounded-2xl neu-card space-y-3 text-sm">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <h3 className="font-bold text-base">Bill Details</h3>
        {distanceKm != null && distanceKm > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-xs">
            <span>📍 Distance:</span>
            <span>{distanceKm} km</span>
          </div>
        )}
      </div>

      <div className="flex justify-between text-muted-foreground">
        <span>Item Total</span>
        <span className="font-medium text-foreground">{formatINR(subtotal)}</span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-muted-foreground">
          <div>
            <span>{deliveryLabel}</span>
            {shopCount > 1 && deliveryFee > 0 && (
              <p className="text-[10px] mt-0.5 text-muted-foreground">
                ₹{perShopFee} × {shopCount} shops
              </p>
            )}
          </div>
          {deliveryFee > 0 ? (
            <span className="font-medium text-foreground">{formatINR(deliveryFee)}</span>
          ) : (
            <span className="font-bold text-green-600 dark:text-green-400">FREE</span>
          )}
        </div>

        {/* Breakdown of base delivery and petrol charge */}
        {deliveryFee > 0 && baseDeliveryFee != null && petrolCharge != null && (
          <div className="pl-2 border-l-2 border-primary/30 text-[11px] text-muted-foreground space-y-0.5 py-0.5">
            <div className="flex justify-between">
              <span>• Base Delivery ({distanceKm ?? 1} km @ ₹20/km):</span>
              <span>{formatINR(baseDeliveryFee)}</span>
            </div>
            <div className="flex justify-between">
              <span>• Rider Petrol Charge ({distanceKm ?? 1} km @ ₹5/km):</span>
              <span>{formatINR(petrolCharge)}</span>
            </div>
          </div>
        )}
      </div>

      {packagingFee > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <div>
            <span>Packaging Fee</span>
            {shopCount > 1 && packagingFee > 0 && (
              <p className="text-[10px] mt-0.5 text-muted-foreground">per shop</p>
            )}
          </div>
          <span className="font-medium text-foreground">{formatINR(packagingFee)}</span>
        </div>
      )}

      {gstAmount > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>GST</span>
          <span className="font-medium text-foreground">{formatINR(gstAmount)}</span>
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
