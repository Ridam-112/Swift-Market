import { Category } from "../models/Category.js";
import { logger } from "../lib/logger.js";

const DEFAULT_CATEGORIES = [
  "Grocery", "Vegetables", "Fruits", "Snacks", "Drinks",
  "Electronics", "Fashion", "Medicine", "Bakery", "Others",
];

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function seedCategories(): Promise<void> {
  const count = await Category.countDocuments();
  if (count === 0) {
    await Category.insertMany(DEFAULT_CATEGORIES.map((name) => ({ name, slug: toSlug(name), isActive: true })));
    logger.info(`Seeded ${DEFAULT_CATEGORIES.length} categories`);
  }
}
