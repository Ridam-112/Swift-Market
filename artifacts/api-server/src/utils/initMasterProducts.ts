import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export async function initMasterProducts(): Promise<void> {
  try {
    // 1. Create master_products table if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS master_products (
        id text PRIMARY KEY,
        barcode text UNIQUE,
        gtin text,
        name text NOT NULL,
        brand text,
        category text NOT NULL,
        subcategory text,
        variant text,
        net_quantity text,
        unit text,
        mrp double precision DEFAULT 0,
        description text,
        primary_image text,
        images jsonb NOT NULL DEFAULT '[]'::jsonb,
        manufacturer text,
        country_of_origin text DEFAULT 'India',
        source text NOT NULL DEFAULT 'MANUAL',
        verification_status text NOT NULL DEFAULT 'VERIFIED',
        product_type text NOT NULL DEFAULT 'PACKAGED',
        created_by text,
        verified_by text,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    // 2. Create product_wrong_reports table if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_wrong_reports (
        id text PRIMARY KEY,
        barcode text NOT NULL,
        reported_by text,
        shop_id text,
        actual_name text,
        photo_url text,
        note text,
        status text NOT NULL DEFAULT 'pending',
        resolved_by text,
        resolved_at timestamp,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);

    // 3. Add columns to products table if missing
    await db.execute(sql`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS master_product_id text,
      ADD COLUMN IF NOT EXISTS barcode text,
      ADD COLUMN IF NOT EXISTS brand text,
      ADD COLUMN IF NOT EXISTS source text DEFAULT 'MANUAL',
      ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'VERIFIED';
    `);

    // 4. Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS master_products_barcode_idx ON master_products (barcode);
      CREATE INDEX IF NOT EXISTS master_products_name_idx ON master_products (name);
      CREATE INDEX IF NOT EXISTS products_barcode_idx ON products (barcode);
      CREATE INDEX IF NOT EXISTS products_master_prod_idx ON products (master_product_id);
    `);

    // 5. Backfill existing products with distinct SKU/Barcode into master_products if not already present
    await db.execute(sql`
      INSERT INTO master_products (
        id, barcode, name, category, subcategory, unit, mrp, description,
        primary_image, images, source, verification_status, created_at, updated_at
      )
      SELECT
        gen_random_uuid()::text,
        p.sku,
        p.name,
        COALESCE(p.category, 'Grocery'),
        p.subcategory,
        p.unit,
        p.price,
        p.description,
        CASE WHEN jsonb_array_length(p.images) > 0 THEN p.images->>0 ELSE NULL END,
        p.images,
        'MANUAL',
        'VERIFIED',
        p.created_at,
        p.updated_at
      FROM products p
      WHERE p.sku IS NOT NULL
        AND p.sku != ''
        AND p.name NOT ILIKE 'Product (%'
        AND NOT EXISTS (
          SELECT 1 FROM master_products mp WHERE mp.barcode = p.sku
        )
      ON CONFLICT (barcode) DO NOTHING;
    `);

    logger.info("[init] Master Products catalog and indexes verified successfully");
  } catch (err) {
    logger.warn({ err }, "[init] Master Products initialization warning (non-fatal)");
  }
}
