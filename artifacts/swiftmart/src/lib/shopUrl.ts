/**
 * Utilities for generating and resolving shop vanity URLs.
 * Formats shop pages as root-level vanity slugs: swiftmart.space/(shop-name)
 * e.g., swiftmart.space/kalpataru-sweets
 */

/**
 * Normalizes a shop name into a clean, URL-friendly slug.
 * Supports English alphanumeric and Unicode characters (e.g. Bengali script).
 */
export function toShopSlug(name?: string | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // Keep unicode letters, numbers, spaces, and hyphens
    .replace(/[\s_]+/gu, "-")          // Replace whitespace and underscores with hyphen
    .replace(/-+/g, "-")               // Deduplicate hyphens
    .replace(/^-+|-+$/g, "");          // Trim leading and trailing hyphens
}

/**
 * Returns the URL path for a shop.
 * Prefers the root-level vanity slug format `/:shopSlug` (e.g. `/kalpataru-sweets`),
 * falling back to `/shop/:id` if no valid shop name is present.
 */
export function getShopUrl(shop?: {
  id?: string;
  _id?: string;
  storeName?: string;
  shopName?: string;
  name?: string;
} | null): string {
  if (!shop) return "/shops";
  const name = shop.storeName || shop.shopName || shop.name || "";
  const slug = toShopSlug(name);
  if (slug) {
    return `/${slug}`;
  }
  const id = shop.id || shop._id;
  return id ? `/shop/${id}` : "/shops";
}
