import { db, categories } from "@workspace/db";
import { count } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const DEFAULT_CATEGORIES = [
  "Grocery", "Vegetables", "Fruits", "Snacks", "Drinks",
  "Electronics", "Fashion", "Medicine", "Bakery", "Others",
];

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function seedCategories(): Promise<void> {
  const [{ cnt }] = await db.select({ cnt: count() }).from(categories);
  if (Number(cnt) === 0) {
    await db.insert(categories).values(
      DEFAULT_CATEGORIES.map((name) => ({ name, slug: toSlug(name), isActive: true }))
    );
    logger.info(`Seeded ${DEFAULT_CATEGORIES.length} categories`);
  }
}
