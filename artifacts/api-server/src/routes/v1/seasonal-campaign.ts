import { Router, type Response } from "express";
import { db, seasonalCampaign, products } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");

// Helper to ensure at least one config row exists
async function getOrCreateCampaign() {
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
    headerText: {
      topText: "Celebrate",
      mainTitle: "Festive Season",
      subText: "Joy, lights and happiness!"
    },
    gridBlocks: [],
    customProductSections: []
  }).returning();

  return created;
}

// GET /api/seasonal-campaign — Fetch active campaign config with populated products
router.get("/", async (_req, res): Promise<void> => {
  try {
    const campaign = await getOrCreateCampaign();
    
    // Resolve products details in the custom grids
    const sections = (campaign.customProductSections as any[]) || [];
    
    const allProductIds = new Set<string>();
    for (const sec of sections) {
      if (Array.isArray(sec.productIds)) {
        for (const id of sec.productIds) {
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
        const isAvailable = (p.stock ?? 0) > 0 && p.status === "approved";
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
    
    const populatedSections = sections.map(sec => {
      const ids = Array.isArray(sec.productIds) ? sec.productIds : [];
      const resolved = ids
        .map((id: string) => productMap.get(id))
        .filter((p: any) => p !== undefined);
      
      return {
        ...sec,
        products: resolved
      };
    });
    
    res.json({
      success: true,
      campaign: {
        ...campaign,
        customProductSections: populatedSections
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load seasonal campaign", error: String(err) });
  }
});

// POST /api/seasonal-campaign — Update campaign config (Admin only)
router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isActive, tabName, theme, headerText, gridBlocks, customProductSections } = req.body as {
      isActive?: boolean;
      tabName?: string;
      theme?: any;
      headerText?: any;
      gridBlocks?: any[];
      customProductSections?: any[];
    };

    const update: Record<string, any> = {};
    if (isActive !== undefined) update.isActive = isActive;
    if (tabName !== undefined) update.tabName = tabName;
    if (theme !== undefined) update.theme = theme;
    if (headerText !== undefined) update.headerText = headerText;
    if (gridBlocks !== undefined) update.gridBlocks = gridBlocks;
    if (customProductSections !== undefined) update.customProductSections = customProductSections;
    update.updatedAt = new Date();

    // Ensure record exists
    await getOrCreateCampaign();

    const [updated] = await db.update(seasonalCampaign)
      .set(update)
      .where(eq(seasonalCampaign.id, "default_campaign"))
      .returning();

    res.json({ success: true, campaign: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update seasonal campaign", error: String(err) });
  }
});

export default router;
