import { Router, type Request, type Response } from "express";
import { db, appThemeConfig } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireRole } from "../../middlewares/auth.js";
import { logger } from "../../lib/logger.js";

const router = Router();

const DEFAULT_THEME = {
  id: "global_theme",
  primaryColor: "#E23744",
  secondaryColor: "#000000",
  borderRadius: 12,
  fontFamily: "Outfit",
  customTokens: {},
};

// ─── GET /api/v1/theme-config ──────────────────────────────────────────
// Public, ultra-fast endpoint for fetching remote design system tokens
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [themeRecord] = await db
      .select()
      .from(appThemeConfig)
      .where(eq(appThemeConfig.id, "global_theme"))
      .limit(1);

    if (!themeRecord) {
      res.json({
        success: true,
        theme: DEFAULT_THEME,
      });
      return;
    }

    res.json({
      success: true,
      theme: {
        primaryColor: themeRecord.primaryColor || DEFAULT_THEME.primaryColor,
        secondaryColor: themeRecord.secondaryColor || DEFAULT_THEME.secondaryColor,
        borderRadius: typeof themeRecord.borderRadius === "number" ? themeRecord.borderRadius : DEFAULT_THEME.borderRadius,
        fontFamily: themeRecord.fontFamily || DEFAULT_THEME.fontFamily,
        customTokens: themeRecord.customTokens || DEFAULT_THEME.customTokens,
        updatedAt: themeRecord.updatedAt,
      },
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch theme config — returning default");
    res.json({
      success: true,
      theme: DEFAULT_THEME,
    });
  }
});

// ─── PUT /api/v1/theme-config ─────────────────────────────────────────
// Admin endpoint to update remote design tokens
router.put(
  "/",
  authenticate,
  requireRole("admin", "super_admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { primaryColor, secondaryColor, borderRadius, fontFamily, customTokens } = req.body || {};

      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (primaryColor && !hexColorRegex.test(primaryColor)) {
        res.status(400).json({ success: false, message: "Invalid primaryColor hex format (e.g., #E23744)" });
        return;
      }
      if (secondaryColor && !hexColorRegex.test(secondaryColor)) {
        res.status(400).json({ success: false, message: "Invalid secondaryColor hex format (e.g., #000000)" });
        return;
      }
      if (borderRadius !== undefined && (typeof borderRadius !== "number" || borderRadius < 0 || borderRadius > 50)) {
        res.status(400).json({ success: false, message: "borderRadius must be a number between 0 and 50" });
        return;
      }

      const updatedValues = {
        id: "global_theme",
        primaryColor: primaryColor || DEFAULT_THEME.primaryColor,
        secondaryColor: secondaryColor || DEFAULT_THEME.secondaryColor,
        borderRadius: typeof borderRadius === "number" ? borderRadius : DEFAULT_THEME.borderRadius,
        fontFamily: fontFamily?.trim() || DEFAULT_THEME.fontFamily,
        customTokens: typeof customTokens === "object" && customTokens !== null ? customTokens : DEFAULT_THEME.customTokens,
        updatedAt: new Date(),
      };

      await db
        .insert(appThemeConfig)
        .values(updatedValues)
        .onConflictDoUpdate({
          target: appThemeConfig.id,
          set: updatedValues,
        });

      logger.info({ updatedValues }, "App theme config updated successfully");

      res.json({
        success: true,
        message: "Theme configuration updated successfully",
        theme: updatedValues,
      });
    } catch (err) {
      logger.error({ err }, "Failed to update theme config");
      res.status(500).json({ success: false, message: "Failed to update theme config", error: String(err) });
    }
  }
);

export default router;
