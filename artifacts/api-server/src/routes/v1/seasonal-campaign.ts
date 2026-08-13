import { Router, type Response } from "express";
import { db, seasonalCampaign, products, pool } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");

// Helper to ensure at least one config row exists
async function getOrCreateCampaign() {
  try {
    // Gracefully migrate Neon database column if missing
    await pool.query("ALTER TABLE seasonal_campaign ADD COLUMN IF NOT EXISTS layout_blocks JSONB NOT NULL DEFAULT '[]';");
  } catch (err) {
    console.error("[DB Migration] Failed to alter seasonal_campaign:", err);
  }

  const [existing] = await db.select().from(seasonalCampaign).where(eq(seasonalCampaign.id, "default_campaign")).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(seasonalCampaign).values({
    id: "default_campaign",
    isActive: false,
    tabName: "Festive Store",
    theme: {
      backgroundColor: "#FFF8F0",
      textColor: "#8A252C",
      accentColor: "#F3A738"
    },
    layoutBlocks: []
  }).returning();

  return created;
}

// GET /api/seasonal-campaign — Fetch campaign configuration with populated product blocks
router.get("/", async (_req, res): Promise<void> => {
  try {
    let campaign = await getOrCreateCampaign();
    
    // Detect missing or invalid layoutBlocks array
    const rawBlocks = (campaign as any).layoutBlocks;
    const hasLegacyData = !Array.isArray(rawBlocks);

    if (hasLegacyData) {
      const [updated] = await db.update(seasonalCampaign)
        .set({
          layoutBlocks: [],
          updatedAt: new Date()
        })
        .where(eq(seasonalCampaign.id, "default_campaign"))
        .returning();
      
      campaign = updated;
    }

    const blocks = (campaign.layoutBlocks as any[]) || [];

    const allProductIds = new Set<string>();
    for (const block of blocks) {
      if (block.type === "product_slider" && block.data && Array.isArray(block.data.productIds)) {
        for (const id of block.data.productIds) {
          if (id) allProductIds.add(id);
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
      return block;
    });

    res.json({
      success: true,
      campaign: {
        ...campaign,
        layoutBlocks: resolvedBlocks
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load seasonal campaign", error: String(err) });
  }
});

// POST /api/seasonal-campaign — Save layout blocks and campaign details
router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isActive, tabName, theme, layoutBlocks } = req.body as {
      isActive?: boolean;
      tabName?: string;
      theme?: any;
      layoutBlocks?: any[];
    };

    const update: Record<string, any> = {};
    if (isActive !== undefined) update.isActive = isActive;
    if (tabName !== undefined) update.tabName = tabName;
    if (theme !== undefined) update.theme = theme;
    if (layoutBlocks !== undefined) update.layoutBlocks = layoutBlocks;
    update.updatedAt = new Date();

    // Ensure config exists
    await getOrCreateCampaign();

    const [updated] = await db.update(seasonalCampaign)
      .set(update)
      .where(eq(seasonalCampaign.id, "default_campaign"))
      .returning();

    res.json({ success: true, campaign: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save seasonal campaign layouts", error: String(err) });
  }
});

export default router;
