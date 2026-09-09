import { db, masterProducts, products } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export interface LookupResult {
  status: "FOUND" | "NOT_FOUND" | "INVALID_BARCODE";
  source?: "SWIFTMART" | "EXTERNAL";
  requiresVerification?: boolean;
  barcode: string;
  product?: {
    id?: string;
    barcode: string;
    name: string;
    brand?: string;
    category: string;
    subcategory?: string;
    variant?: string;
    netQuantity?: string;
    unit?: string;
    mrp: number;
    description?: string;
    primaryImage?: string;
    images?: string[];
    source?: string;
    verificationStatus?: string;
    productType?: string;
  };
}

export class ProductLookupService {
  /**
   * Normalize barcode: removes spaces, newlines, non-alphanumeric chars.
   */
  static normalizeBarcode(raw: string): string {
    if (!raw) return "";
    return raw.trim().replace(/[\r\n\s\t-]/g, "");
  }

  /**
   * Validate if barcode is valid retail barcode (EAN-13, EAN-8, UPC-A, UPC-E, GTIN-14, Code-128, etc.)
   */
  static isValidBarcode(barcode: string): boolean {
    if (!barcode) return false;
    return /^[A-Za-z0-9]{4,30}$/.test(barcode);
  }

  /**
   * Main Barcode Lookup function
   */
  static async lookupByBarcode(rawBarcode: string): Promise<LookupResult> {
    const barcode = this.normalizeBarcode(rawBarcode);

    if (!this.isValidBarcode(barcode)) {
      return {
        status: "INVALID_BARCODE",
        barcode,
      };
    }

    // 1. Check SwiftMart MASTER PRODUCT CATALOG first (EXACT MATCH ONLY)
    try {
      const [master] = await db
        .select()
        .from(masterProducts)
        .where(eq(masterProducts.barcode, barcode))
        .limit(1);

      if (master && master.name && master.name.trim().length > 0) {
        return {
          status: "FOUND",
          source: "SWIFTMART",
          requiresVerification: false,
          barcode,
          product: {
            id: master.id,
            barcode: master.barcode!,
            name: master.name,
            brand: master.brand ?? undefined,
            category: master.category,
            subcategory: master.subcategory ?? undefined,
            variant: master.variant ?? undefined,
            netQuantity: master.netQuantity ?? undefined,
            unit: master.unit ?? undefined,
            mrp: Number(master.mrp ?? 0),
            description: master.description ?? undefined,
            primaryImage: master.primaryImage ?? undefined,
            images: Array.isArray(master.images) ? (master.images as string[]) : [],
            source: master.source,
            verificationStatus: master.verificationStatus,
            productType: master.productType,
          },
        };
      }
    } catch (err) {
      logger.warn({ err, barcode }, "[ProductLookupService] Error querying master_products");
    }

    // 2. Check existing store products table (EXACT MATCH ONLY)
    try {
      const [existing] = await db
        .select()
        .from(products)
        .where(or(eq(products.barcode, barcode), eq(products.sku, barcode)))
        .orderBy(desc(products.createdAt))
        .limit(1);

      if (existing && existing.name && existing.name.trim().length > 0 && !existing.name.toLowerCase().startsWith("product (")) {
        const primaryImage = Array.isArray(existing.images) && existing.images.length > 0 ? String(existing.images[0]) : undefined;
        return {
          status: "FOUND",
          source: "SWIFTMART",
          requiresVerification: false,
          barcode,
          product: {
            id: existing.id,
            barcode: barcode,
            name: existing.name,
            brand: existing.brand ?? undefined,
            category: existing.category ?? "Grocery",
            subcategory: existing.subcategory ?? undefined,
            unit: existing.unit ?? undefined,
            mrp: Number(existing.price ?? 0),
            description: existing.description ?? undefined,
            primaryImage,
            images: Array.isArray(existing.images) ? (existing.images as string[]) : [],
            source: "SWIFTMART",
            verificationStatus: "VERIFIED",
          },
        };
      }
    } catch (err) {
      logger.warn({ err, barcode }, "[ProductLookupService] Error querying products");
    }

    // 3. Search External Verified Database (Open Food Facts / Official DB) (EXACT MATCH ONLY)
    try {
      const externalMatch = await this.fetchFromExternalDatabase(barcode);
      if (externalMatch) {
        return {
          status: "FOUND",
          source: "EXTERNAL",
          requiresVerification: true,
          barcode,
          product: externalMatch,
        };
      }
    } catch (err) {
      logger.warn({ err, barcode }, "[ProductLookupService] External API lookup failed");
    }

    // 4. Return NOT_FOUND — NEVER generate fake product titles or use digits as name!
    return {
      status: "NOT_FOUND",
      barcode,
    };
  }

  /**
   * Query Open Food Facts API strictly by exact barcode
   */
  private static async fetchFromExternalDatabase(barcode: string) {
    const urls = [
      `https://in.openfoodfacts.org/api/v0/product/${barcode}.json`,
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
    ];

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(url, {
          headers: {
            "User-Agent": "SwiftMart-API/1.0 (contact: swiftmart144@gmail.com)",
            "Accept": "application/json",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) continue;

        const data = (await res.json()) as Record<string, unknown>;
        if (data["status"] === 1 && data["product"] && typeof data["product"] === "object") {
          const p = data["product"] as Record<string, unknown>;

          const rawName = String(p["product_name_en"] || p["product_name"] || p["generic_name_en"] || p["generic_name"] || "").trim();
          const brand = p["brands"] ? String(p["brands"]).trim() : undefined;

          let fullName = rawName;
          if (!fullName && brand) {
            fullName = brand;
          } else if (brand && fullName && !fullName.toLowerCase().includes(brand.toLowerCase())) {
            fullName = `${brand} ${fullName}`;
          }

          if (!fullName || fullName.length < 2) {
            continue;
          }

          const quantity = p["quantity"] ? String(p["quantity"]).trim() : undefined;
          const imageUrl = String(p["image_front_url"] || p["image_url"] || p["image_front_small_url"] || "");
          const description = p["generic_name_en"] || p["ingredients_text_en"] || p["ingredients_text"] ? String(p["generic_name_en"] || p["ingredients_text_en"] || p["ingredients_text"]) : undefined;

          // Map category
          let category = "Grocery";
          const categoriesStr = `${String(p["categories"] || "")} ${String(p["categories_tags"] || "")}`.toLowerCase();
          if (categoriesStr.includes("beverage") || categoriesStr.includes("drink") || categoriesStr.includes("tea") || categoriesStr.includes("coffee") || categoriesStr.includes("juice")) {
            category = "Cold Drinks & Juices";
          } else if (categoriesStr.includes("snack") || categoriesStr.includes("biscuit") || categoriesStr.includes("cookie") || categoriesStr.includes("chip") || categoriesStr.includes("namkeen")) {
            category = "Biscuits & Cookies";
          } else if (categoriesStr.includes("dairy") || categoriesStr.includes("milk") || categoriesStr.includes("cheese") || categoriesStr.includes("butter") || categoriesStr.includes("curd") || categoriesStr.includes("paneer")) {
            category = "Dairy, Bread & Eggs";
          } else if (categoriesStr.includes("spice") || categoriesStr.includes("masala") || categoriesStr.includes("oil") || categoriesStr.includes("ghee")) {
            category = "Spices & Dry Fruits";
          } else if (categoriesStr.includes("noodle") || categoriesStr.includes("pasta") || categoriesStr.includes("sauce") || categoriesStr.includes("jam") || categoriesStr.includes("ketchup")) {
            category = "Breakfast & Sauces";
          } else if (categoriesStr.includes("sweet") || categoriesStr.includes("chocolate") || categoriesStr.includes("ice cream")) {
            category = "Sweets & Chocolates";
          } else if (categoriesStr.includes("personal") || categoriesStr.includes("soap") || categoriesStr.includes("shampoo") || categoriesStr.includes("beauty")) {
            category = "Personal Care";
          } else if (categoriesStr.includes("clean") || categoriesStr.includes("detergent") || categoriesStr.includes("household")) {
            category = "Cleaning & Household";
          }

          return {
            barcode,
            name: fullName,
            brand,
            category,
            unit: quantity || "1 unit",
            netQuantity: quantity,
            mrp: 0,
            description,
            primaryImage: imageUrl || undefined,
            images: imageUrl ? [imageUrl] : [],
            source: "EXTERNAL",
            verificationStatus: "PENDING_REVIEW",
          };
        }
      } catch (_e) {
        // Try next endpoint
      }
    }

    return null;
  }
}
