import React from "react";

export const SWIFTMART_GOOGLE_BUSINESS_URL = "https://share.google/7uxIQizF0XLUe9TgX";

/**
 * Registry of known & verified Google Business Profiles in Balurghat.
 * Matches by Shop ID, exact store name, or normalized lowercase key.
 */
export const VERIFIED_GOOGLE_BUSINESS_PROFILES: Record<string, {
  name: string;
  url: string;
  rating?: number;
  reviewCount?: number;
  locality?: string;
  highlights?: string[];
}> = {
  // Ghosh Enterprice
  "f253ea1f-ef1c-4e91-aa11-b8e649e32c8f": {
    name: "Ghosh Enterprice",
    url: "https://share.google/EJkonqvohIz6wZvil",
    rating: 4.8,
    locality: "Balurghat",
    highlights: ["Fresh Grocery", "Top Rated", "Fast Dispatch"]
  },
  // Shawarma Palace
  "ebc0194e-454d-4062-9eb8-895204d9d144": {
    name: "Shawarma Palace",
    url: "https://share.google/h0pF3oW0QPDckFClw",
    rating: 4.7,
    locality: "Balurghat",
    highlights: ["Authentic Shawarma", "Fast Food", "Popular Spot"]
  },
  // Sudeshna's Cake House
  "3effec69-bde3-4fac-8cad-c11ef5bd3576": {
    name: "Sudeshna's Cake House",
    url: "https://share.google/o88wucL1Ph8tMqJVM",
    rating: 4.9,
    locality: "Balurghat",
    highlights: ["Designer Cakes", "Fresh Bakery", "Customised Bakes"]
  },
  // Uphar Electronics Lab
  "11ce6b12-479f-4882-ab42-44357f38228d": {
    name: "Upahar Electronics Lab",
    url: "https://share.google/52X755dYHyvukMXcb",
    rating: 4.9,
    locality: "Balurghat",
    highlights: ["Certified Lab", "Appliance Repair", "Original Spare Parts"]
  },
  // SwiftMart Shop
  "1a828c48-5fb9-47f3-b87e-c3588d888fed": {
    name: "SwiftMart Shop",
    url: "https://share.google/7uxIQizF0XLUe9TgX",
    rating: 5.0,
    locality: "Balurghat",
    highlights: ["10-Min Delivery", "Official Store", "Best Discounts"]
  },
  // Maa Laxmi Online Centre
  "f43edc9d-aec1-497c-9aa8-0b1d87312621": {
    name: "Maa Laxmi Online Centre",
    url: "https://share.google/aYTLKn6tudhljhc9s",
    rating: 4.8,
    locality: "Balurghat",
    highlights: ["Digital Services", "Electronics", "Cyber Hub"]
  },
  // Online Center & Khatapatra
  "97f91296-d060-425a-a990-68f2ca3421a6": {
    name: "Online Center & Khatapatra",
    url: "https://share.google/5IQYP6cceuvNg7GlG",
    rating: 4.8,
    locality: "Balurghat",
    highlights: ["Books & Stationery", "Online Form Filling", "Printing"]
  },
  // Rock N Rolls
  "82561910-deac-4432-8b31-7974d8f26ae2": {
    name: "Rock N Rolls",
    url: "https://share.google/DKtbmndZm6OouLKZ0",
    rating: 4.7,
    locality: "Balurghat",
    highlights: ["Crispy Rolls", "Evening Snacks", "Balurghat Favourite"]
  },
  // Maa Anandamayee Dresses
  "49e80c07-0594-45bd-ac3b-dc1680de3f59": {
    name: "Maa Anandamayee Dresses",
    url: "https://share.google/B95d6YKnjlDSNSYbk",
    rating: 4.8,
    locality: "Balurghat",
    highlights: ["Fashion & Clothing", "Latest Collections", "Trusted Store"]
  },
  // Shikha bichatra
  "dfd4bed1-fad6-4be3-a85b-0c8259be69c9": {
    name: "Shikha Bichitra",
    url: "https://share.google/cJ4FmeU726oiX9I5N",
    rating: 4.8,
    locality: "Balurghat",
    highlights: ["Educational Books", "School Stationery", "Reliable Store"]
  },
  // Sandy's Fast Food
  "597432ef-f11e-4034-bcfa-2a0c2c06d326": {
    name: "Sandy's Fast Food",
    url: "https://share.google/E8Yucxt2kVgYaVegT",
    rating: 4.8,
    locality: "Balurghat",
    highlights: ["Quick Bites", "Delicious Fast Food", "Local Choice"]
  },
};

/**
 * Normalizes store name or string for fuzzy key lookup
 */
function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Build normalized name lookup map
const NAME_LOOKUP: Record<string, string> = {
  [normalizeKey("Ghosh Enterprice")]: "https://share.google/EJkonqvohIz6wZvil",
  [normalizeKey("Ghosh Enterprise")]: "https://share.google/EJkonqvohIz6wZvil",
  [normalizeKey("Shawarma Palace")]: "https://share.google/h0pF3oW0QPDckFClw",
  [normalizeKey("Sudeshna's Cake House")]: "https://share.google/o88wucL1Ph8tMqJVM",
  [normalizeKey("Sudeshnas Cake House")]: "https://share.google/o88wucL1Ph8tMqJVM",
  [normalizeKey("UPHAR ELECTRONICS LAB")]: "https://share.google/52X755dYHyvukMXcb",
  [normalizeKey("Upahar Electronics Lab")]: "https://share.google/52X755dYHyvukMXcb",
  [normalizeKey("Uphar Electronics Lab")]: "https://share.google/52X755dYHyvukMXcb",
  [normalizeKey("SwiftMart Shop")]: "https://share.google/7uxIQizF0XLUe9TgX",
  [normalizeKey("SwiftMart")]: "https://share.google/7uxIQizF0XLUe9TgX",
  [normalizeKey("Maa Laxmi Online Centre")]: "https://share.google/aYTLKn6tudhljhc9s",
  [normalizeKey("Ma Laxmi Online Centre")]: "https://share.google/aYTLKn6tudhljhc9s",
  [normalizeKey("Online Center & Khatapatra")]: "https://share.google/5IQYP6cceuvNg7GlG",
  [normalizeKey("Online Centre and Khata Patra")]: "https://share.google/5IQYP6cceuvNg7GlG",
  [normalizeKey("Rock N Rolls")]: "https://share.google/DKtbmndZm6OouLKZ0",
  [normalizeKey("Rock N Roll")]: "https://share.google/DKtbmndZm6OouLKZ0",
  [normalizeKey("Maa Anandamayee Dresses")]: "https://share.google/B95d6YKnjlDSNSYbk",
  [normalizeKey("Ma Anandamayee Dresses")]: "https://share.google/B95d6YKnjlDSNSYbk",
  [normalizeKey("Shikha bichatra")]: "https://share.google/cJ4FmeU726oiX9I5N",
  [normalizeKey("Sikha Bichitra")]: "https://share.google/cJ4FmeU726oiX9I5N",
  [normalizeKey("Sandy's Fast Food")]: "https://share.google/E8Yucxt2kVgYaVegT",
  [normalizeKey("Sandys Fast Food")]: "https://share.google/E8Yucxt2kVgYaVegT",
};

/**
 * Returns Google Business Profile URL for a shop
 */
export function getShopGoogleBusinessUrl(shop?: {
  id?: string;
  _id?: string;
  storeName?: string;
  shopName?: string;
  name?: string;
  googleBusinessUrl?: string;
  google_business_url?: string;
}): string | undefined {
  if (!shop) return undefined;

  // 1. Explicit DB field
  if (shop.googleBusinessUrl && shop.googleBusinessUrl.trim()) {
    return shop.googleBusinessUrl.trim();
  }
  if (shop.google_business_url && shop.google_business_url.trim()) {
    return shop.google_business_url.trim();
  }

  // 2. Lookup by ID
  const shopId = shop.id || shop._id;
  if (shopId && VERIFIED_GOOGLE_BUSINESS_PROFILES[shopId]) {
    return VERIFIED_GOOGLE_BUSINESS_PROFILES[shopId].url;
  }

  // 3. Lookup by name
  const name = shop.storeName || shop.shopName || shop.name || "";
  if (name) {
    const key = normalizeKey(name);
    if (NAME_LOOKUP[key]) return NAME_LOOKUP[key];
  }

  return undefined;
}

/**
 * Official Google 4-Color 'G' Logo
 */
export function GoogleGLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}
