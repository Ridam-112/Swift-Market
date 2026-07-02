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

export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return Number.isInteger(kg) ? `${kg} kg` : `${kg} kg`;
  }
  return `${grams}g`;
}

const ALL_PRESETS = [100, 250, 500, 1000, 2000, 5000];

export function weightPresets(maxGrams?: number): number[] {
  const cap = maxGrams ?? Infinity;
  const filtered = ALL_PRESETS.filter(g => g <= cap);
  return filtered.length > 0 ? filtered : ALL_PRESETS.slice(0, 1);
}

export function priceForWeight(
  basePrice: number,
  baseGrams: number,
  selectedGrams: number
): number {
  return basePrice * (selectedGrams / baseGrams);
}
