import { Router, type Response } from "express";
import { db, cafePageConfig, products, shops, pool } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");

// Helper to ensure at least one config row exists
async function getOrCreateCafeConfig() {
  try {
    // Gracefully migrate and create Neon database table if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cafe_page_config (
        id TEXT PRIMARY KEY DEFAULT 'default_cafe_page',
        is_active BOOLEAN NOT NULL DEFAULT false,
        theme JSONB NOT NULL DEFAULT '{"backgroundColor":"#FFF8F0","textColor":"#8A252C","accentColor":"#F3A738"}',
        layout_blocks JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.error("[DB Migration] Failed to initialize cafe_page_config table:", err);
  }

  const [existing] = await db.select().from(cafePageConfig).where(eq(cafePageConfig.id, "default_cafe_page")).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(cafePageConfig).values({
    id: "default_cafe_page",
    isActive: false,
    theme: {
      backgroundColor: "#FFF8F0",
      textColor: "#8A252C",
      accentColor: "#F3A738"
    },
    layoutBlocks: []
  }).returning();

  return created;
}

// GET /api/cafe-config — Fetch Cafe Page configuration with populated products and shops
router.get("/", async (_req, res): Promise<void> => {
  try {
    let config = await getOrCreateCafeConfig();
    
    // Detect missing or invalid layoutBlocks array
    const rawBlocks = (config as any).layoutBlocks;
    const hasLegacyData = !Array.isArray(rawBlocks);

    if (hasLegacyData) {
      const [updated] = await db.update(cafePageConfig)
        .set({
          layoutBlocks: [],
          updatedAt: new Date()
        })
        .where(eq(cafePageConfig.id, "default_cafe_page"))
        .returning();
      
      config = updated;
    }

    const blocks = (config.layoutBlocks as any[]) || [];

    // Extract productIds and shopIds to query in batch
    const allProductIds = new Set<string>();
    const allShopIds = new Set<string>();

    for (const block of blocks) {
      if (block.type === "product_slider" && block.data && Array.isArray(block.data.productIds)) {
        for (const id of block.data.productIds) {
          if (id) allProductIds.add(id);
        }
      }
      if (block.type === "shop_slider" && block.data && Array.isArray(block.data.shopIds)) {
        for (const id of block.data.shopIds) {
          if (id) allShopIds.add(id);
        }
      }
    }

    const productMap = new Map<string, any>();
    if (allProductIds.size > 0) {
      const dbProducts = await db.select()
        .from(products)
        .where(inArray(products.id, Array.from(allProductIds)));
      
      const mapped = miArr(dbProducts);
      for (const p of mapped) {
        const isAvailable = (p.stock ?? 0) > 0 && p.status === "active";
        const imgList = Array.isArray(p.images) ? p.images : [];
        const imageUrl = imgList.length > 0 ? imgList[0] : "";
        
        productMap.set(p.id, {
          id: p.id,
          name: p.name,
          price: p.price,
          discountedPrice: p.discountedPrice,
          imageUrl: imageUrl,
          stockStatus: isAvailable ? "in_stock" : "out_of_stock"
        });
      }
    }

    const shopMap = new Map<string, any>();
    if (allShopIds.size > 0) {
      const dbShops = await db.select()
        .from(shops)
        .where(inArray(shops.id, Array.from(allShopIds)));
      
      const mappedShops = miArr(dbShops);
      for (const s of mappedShops) {
        shopMap.set(s.id, {
          id: s.id,
          name: s.shopName,
          imageUrl: s.image || "",
          rating: s.rating ?? 0,
          isOpen: s.isOpen ?? false,
          status: s.status
        });
      }
    }

    const resolvedBlocks = blocks.map(block => {
      if (block.type === "product_slider" && block.data) {
        const ids = Array.isArray(block.data.productIds) ? block.data.productIds : [];
        const resolved = ids
          .map((id: string) => productMap.get(id))
          .filter((p: any) => p !== undefined);
        
        return {
          ...block,
          data: {
            ...block.data,
            products: resolved
          }
        };
      }
      if (block.type === "shop_slider" && block.data) {
        const ids = Array.isArray(block.data.shopIds) ? block.data.shopIds : [];
        const resolved = ids
          .map((id: string) => shopMap.get(id))
          .filter((s: any) => s !== undefined);
        
        return {
          ...block,
          data: {
            ...block.data,
            shops: resolved
          }
        };
      }
      return block;
    });

    res.json({
      success: true,
      campaign: {
        ...config,
        layoutBlocks: resolvedBlocks
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load cafe configuration", error: String(err) });
  }
});

// POST /api/cafe-config — Save layout blocks and details for Cafe Page
router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isActive, theme, layoutBlocks } = req.body as {
      isActive?: boolean;
      theme?: any;
      layoutBlocks?: any[];
    };

    const update: Record<string, any> = {};
    if (isActive !== undefined) update.isActive = isActive;
    if (theme !== undefined) update.theme = theme;
    if (layoutBlocks !== undefined) update.layoutBlocks = layoutBlocks;
    update.updatedAt = new Date();

    // Ensure config exists
    await getOrCreateCafeConfig();

    const [updated] = await db.update(cafePageConfig)
      .set(update)
      .where(eq(cafePageConfig.id, "default_cafe_page"))
      .returning();

    res.json({ success: true, campaign: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save cafe page layouts", error: String(err) });
  }
});

export default router;
