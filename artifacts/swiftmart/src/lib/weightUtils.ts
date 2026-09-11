export type UnitInfo =
  | { type: "weight"; baseGrams: number }
  | { type: "piece" };

const KG_RE = /(\d+(?:\.\d+)?)\s*kg\b/i;
const G_RE  = /(\d+(?:\.\d+)?)\s*g\b/i;

export function parseUnit(unit: string | null | undefined): UnitInfo {
  if (!unit) return { type: "piece" };
  const kg = KG_RE.exec(unit);
  if (kg) return { type: "weight", baseGrams: parseFloat(kg[1]) * 1000 };
  const g = G_RE.exec(unit);
  if (g)  return { type: "weight", baseGrams: parseFloat(g[1]) };
  return { type: "piece" };
}

/**
 * Checks if a product should offer loose weight selection (e.g. 100g, 250g, 500g, 1kg).
 * 
 * Rules:
 * 1. If explicitly enabled in seller app/database (`allowWeightSelection`, `isLoose`, or `weightPresets` configured) -> TRUE.
 * 2. If it belongs to fresh Vegetables or Fruits categories AND has a weight unit -> TRUE.
 * 3. All other packaged groceries (e.g. Atta 10kg, Rice 5kg, Oil 1L, Dal, packaged food) -> FALSE (Sold as whole discrete packaged items).
 */
export function isProductWeightBased(product: {
  category?: string | null;
  subcategory?: string | null;
  unit?: string | null;
  weightPresets?: number[] | null;
  allowWeightSelection?: boolean | null;
  isLoose?: boolean | null;
} | null | undefined): boolean {
  if (!product) return false;

  // 1. Explicitly enabled in seller app or product settings
  if (product.allowWeightSelection === true || product.isLoose === true) {
    return true;
  }
  if (Array.isArray(product.weightPresets) && product.weightPresets.length > 0) {
    return true;
  }

  // 2. Only Vegetables & Fruits category items with a weight unit
  const cat = (product.category || "").toLowerCase().trim();
  const subcat = (product.subcategory || "").toLowerCase().trim();

  // Exclude non-fresh categories (grocery, dry fruits, packaged goods, snacks, dairy, etc.)
  if (
    cat === "grocery" ||
    cat === "packaged-food" ||
    cat === "snacks" ||
    cat === "bakery" ||
    cat === "beverages" ||
    cat === "dairy" ||
    subcat.includes("dry-fruit") ||
    subcat.includes("dryfruit") ||
    subcat.includes("canned") ||
    subcat.includes("juice") ||
    subcat.includes("jam") ||
    subcat.includes("pickle") ||
    subcat.includes("snack") ||
    subcat.includes("biscuit") ||
    subcat.includes("masala") ||
    subcat.includes("spice") ||
    subcat.includes("atta") ||
    subcat.includes("rice") ||
    subcat.includes("dal")
  ) {
    return false;
  }

  const isVegOrFruit =
    cat === "vegetables" ||
    cat === "fruits" ||
    cat === "fruits-vegetables" ||
    cat === "fruits & vegetables" ||
    cat === "fresh-vegetables" ||
    cat === "fresh-fruits" ||
    cat === "sabji" ||
    cat === "shobji" ||
    cat === "vegetable" ||
    cat === "fruit" ||
    subcat === "vegetables" ||
    subcat === "fruits" ||
    subcat === "fresh-vegetables" ||
    subcat === "fresh-fruits" ||
    subcat.includes("fresh-veg") ||
    subcat.includes("fresh-fruit") ||
    subcat.includes("greens") ||
    subcat.includes("gourds") ||
    subcat.includes("herbs") ||
    subcat.includes("shobji") ||
    subcat.includes("sabji");

  if (!isVegOrFruit) {
    return false; // Grocery, Atta, Rice, Dal, Packaged foods are NEVER loose weight based
  }

  const unitInfo = parseUnit(product.unit);
  return unitInfo.type === "weight";
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return Number.isInteger(kg) ? `${kg} kg` : `${kg} kg`;
  }
  return `${grams}g`;
}

const ALL_PRESETS = [100, 250, 500, 1000, 2000, 5000];

export function weightPresets(maxGrams?: number, customPresets?: number[] | null): number[] {
  if (Array.isArray(customPresets) && customPresets.length > 0) {
    const cap = maxGrams ?? Infinity;
    const filtered = customPresets.filter(g => g <= cap);
    return filtered.length > 0 ? filtered : customPresets.slice(0, 1);
  }
  const cap = maxGrams ?? Infinity;
  const filtered = ALL_PRESETS.filter(g => g <= cap);
  return filtered.length > 0 ? filtered : ALL_PRESETS.slice(0, 1);
}

export function priceForWeight(
  basePrice: number,
  baseGrams: number,
  selectedGrams: number
): number {
  if (baseGrams <= 0) return basePrice;
  return basePrice * (selectedGrams / baseGrams);
}
