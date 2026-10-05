import { useRoute } from "wouter";
import { useShops } from "@/hooks/useShops";
import { toShopSlug } from "@/lib/shopUrl";
import ShopDetail from "@/pages/ShopDetail";
import Shops from "@/pages/Shops";

/**
 * StoresDispatcher
 * Resolves `/stores/:slug` dynamically:
 * - If `:slug` matches a merchant slug or ID, renders dedicated merchant Storefront (`ShopDetail`).
 * - If `:slug` matches a city with active stores (e.g., `balurghat`), renders dynamic Location directory (`Shops`).
 * Scalable for all current and future cities & merchants with 0 hardcoding.
 */
export default function StoresDispatcher() {
  const [, params] = useRoute("/stores/:slug");
  const identifier = (params?.slug || "").trim().toLowerCase();
  const { allShops, shops, isLoading } = useShops();

  const candidateList = (allShops && allShops.length > 0) ? allShops : shops;

  if (!isLoading && candidateList.length > 0) {
    const isShop = candidateList.some(s => {
      const sSlug = s.slug ? s.slug.toLowerCase() : toShopSlug(s.storeName);
      return sSlug === identifier || (s.id && s.id.toLowerCase() === identifier);
    });

    if (!isShop) {
      const cityShop = candidateList.find(s => toShopSlug(s.city) === identifier);
      if (cityShop && cityShop.city) {
        return <Shops initialCity={cityShop.city} />;
      }
    }
  }

  return <ShopDetail />;
}
