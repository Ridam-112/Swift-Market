import { CommissionRule } from "../models/CommissionRule.js";

export async function resolveCommissionRate(opts: {
  productId?: string;
  vendorId?: string;
  categorySlug?: string;
  shopTypeSlug?: string;
}): Promise<number> {
  const rules = await CommissionRule.find({ isActive: true });

  const find = (level: string, targetId?: string) =>
    rules.find((r) => r.level === level && (!targetId || r.targetId === targetId));

  if (opts.productId) {
    const r = find("product", opts.productId);
    if (r) return r.rate;
  }
  if (opts.vendorId) {
    const r = find("vendor", opts.vendorId);
    if (r) return r.rate;
  }
  if (opts.categorySlug) {
    const r = find("category", opts.categorySlug);
    if (r) return r.rate;
  }
  if (opts.shopTypeSlug) {
    const r = find("shop_type", opts.shopTypeSlug);
    if (r) return r.rate;
  }
  const global = find("global");
  return global?.rate ?? 5;
}
