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
 * Preferred storefront format: `/stores/{merchant-slug}`
 * e.g., `/stores/rock-n-rolls`, `/stores/sudeshnas-cake-house`
 */
export function getShopUrl(shop?: {
  id?: string;
  _id?: string;
  storeName?: string;
  shopName?: string;
  name?: string;
  slug?: string;
} | null): string {
  if (!shop) return "/stores";
  const slug = (shop as any).slug || toShopSlug(shop.storeName || shop.shopName || shop.name || "");
  if (slug) {
    return `/stores/${slug}`;
  }
  const id = shop.id || shop._id;
  return id ? `/stores/${id}` : "/stores";
}
