import { Router, type Response } from "express";
import { db, seasonalCampaign } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";

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
    gridBlocks: []
  }).returning();

  return created;
}

// GET /api/seasonal-campaign — Fetch active campaign config
router.get("/", async (_req, res): Promise<void> => {
  try {
    const campaign = await getOrCreateCampaign();
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load seasonal campaign", error: String(err) });
  }
});

// POST /api/seasonal-campaign — Update campaign config (Admin only)
router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isActive, tabName, theme, headerText, gridBlocks } = req.body as {
      isActive?: boolean;
      tabName?: string;
      theme?: any;
      headerText?: any;
      gridBlocks?: any[];
    };

    const update: Record<string, any> = {};
    if (isActive !== undefined) update.isActive = isActive;
    if (tabName !== undefined) update.tabName = tabName;
    if (theme !== undefined) update.theme = theme;
    if (headerText !== undefined) update.headerText = headerText;
    if (gridBlocks !== undefined) update.gridBlocks = gridBlocks;
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
