import { Router, type Request, type Response } from "express";
import { db, appLayouts, products as productsTable, type LayoutBlock } from "@workspace/db";
import { eq, inArray, and } from "drizzle-orm";
import { authenticate, requireRole } from "../../middlewares/auth.js";
import { logger } from "../../lib/logger.js";

const router = Router();

const DEFAULT_HOME_BLOCKS: LayoutBlock[] = [
  {
    id: "block_hero_1",
    type: "hero_banner",
    sortOrder: 1,
    isActive: true,
    data: {
      title: "Fastest 10-Minute Grocery Delivery",
      subtitle: "Fresh vegetables, dairy & daily essentials delivered to your doorstep",
      imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80",
      link: "/shops",
      buttonText: "Shop Now",
    },
  },
  {
    id: "block_categories_1",
    type: "category_grid",
    sortOrder: 2,
    isActive: true,
    data: {
      title: "Explore Categories",
      columns: 4,
    },
  },
  {
    id: "block_promo_1",
    type: "promotional_strip",
    sortOrder: 3,
    isActive: true,
    data: {
      title: "⚡ Monsoon Special Deals",
      subtitle: "Up to 40% OFF on fresh fruits and snacks",
      backgroundColor: "#E23744",
      link: "/categories",
      buttonText: "Claim Offer",
    },
  },
  {
    id: "block_products_1",
    type: "product_carousel",
    sortOrder: 4,
    isActive: true,
    data: {
      title: "Trending Fast-Fills",
      categorySlug: "dairy",
      limit: 10,
    },
  },
  {
    id: "block_daily_1",
    type: "daily_regulars",
    sortOrder: 5,
    isActive: true,
    data: {
      title: "Your Daily Regulars 🥛",
      badgeText: "1-TAP REORDER",
      items: [
        { id: "reorder_1", name: "Amul Taaza Toned Milk", price: 54, unit: "1 L", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500" },
        { id: "reorder_2", name: "Fresh Organic Eggs", price: 42, unit: "Pack of 6", image: "https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=500" },
      ],
    },
  },
  {
    id: "block_weather_1",
    type: "weather_cravings",
    sortOrder: 6,
    isActive: true,
    data: {
      weatherCondition: "rainy",
      title: "Rainy Day Cravings ☕",
      badgeText: "🌧️ Rain Special",
      items: [
        { id: "rain_1", name: "Tata Tea Gold Masala", price: 140, unit: "250g", image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500" },
        { id: "rain_2", name: "Hot Fresh Samosa 2pcs", price: 30, unit: "2 Pcs", image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500" },
      ],
    },
  },
  {
    id: "block_recipe_1",
    type: "shoppable_recipe",
    sortOrder: 7,
    isActive: true,
    data: {
      recipeId: "recipe_1",
      recipeName: "Creamy Butter Paneer Masala 🥘",
      description: "Rich, creamy North Indian curry made with fresh paneer, butter, tomatoes, and aromatic spices.",
      prepTime: "20 mins",
      difficulty: "Easy",
      servings: 3,
      imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800",
      ingredients: [
        { id: "ing_1", name: "Fresh Dairy Paneer 200g", price: 90, unit: "200g", image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500" },
        { id: "ing_2", name: "Amul Butter 100g", price: 58, unit: "100g", image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500" },
      ],
    },
  },
  {
    id: "block_spacer_1",
    type: "spacer",
    sortOrder: 8,
    isActive: true,
    data: {
      height: 24,
    },
  },
];

const DEFAULT_FESTIVE_BLOCKS: LayoutBlock[] = [
  {
    id: "block_festive_promo_1",
    type: "promotional_strip",
    sortOrder: 1,
    isActive: true,
    data: {
      title: "🇮🇳 Freedom & Festive Mahotsav",
      subtitle: "Flat 50% OFF on Sweets, Dry Fruits & Celebration Packs",
      backgroundColor: "#FF9933",
      link: "/categories",
      buttonText: "Explore Offers",
    },
  },
  {
    id: "block_festive_hero_1",
    type: "hero_banner",
    sortOrder: 2,
    isActive: true,
    data: {
      title: "Festive Season Celebration Deals",
      subtitle: "Exclusive hampers & gift boxes delivered in 10 minutes",
      imageUrl: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1200&q=80",
      link: "/shops",
      buttonText: "Shop Festive",
    },
  },
  {
    id: "block_festive_products_1",
    type: "product_carousel",
    sortOrder: 3,
    isActive: true,
    data: {
      title: "Festive Delights & Sweets",
      categorySlug: "sweets",
      limit: 10,
    },
  },
  {
    id: "block_festive_categories_1",
    type: "category_grid",
    sortOrder: 4,
    isActive: true,
    data: {
      title: "Festive Collections",
      columns: 4,
    },
  },
  {
    id: "block_festive_spacer_1",
    type: "spacer",
    sortOrder: 5,
    isActive: true,
    data: { height: 24 },
  },
];

const DEFAULT_SUPER_STORE_BLOCKS: LayoutBlock[] = [
  {
    id: "block_super_hero_1",
    type: "hero_banner",
    sortOrder: 1,
    isActive: true,
    data: {
      title: "SwiftMart Super Store — Mega Wholesale Savings",
      subtitle: "Bulk orders, electronics, home essentials & appliances at direct wholesale prices",
      imageUrl: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1200&q=80",
      link: "/shops",
      buttonText: "Browse Wholesale",
    },
  },
  {
    id: "block_super_promo_1",
    type: "promotional_strip",
    sortOrder: 2,
    isActive: true,
    data: {
      title: "🛒 Super Store Mega Savings Pass",
      subtitle: "Extra 15% Cashback on orders over ₹999",
      backgroundColor: "#2563EB",
      link: "/categories",
      buttonText: "Activate Pass",
    },
  },
  {
    id: "block_super_products_1",
    type: "product_carousel",
    sortOrder: 3,
    isActive: true,
    data: {
      title: "Super Store Top Sellers",
      categorySlug: "electronics",
      limit: 10,
    },
  },
  {
    id: "block_super_categories_1",
    type: "category_grid",
    sortOrder: 4,
    isActive: true,
    data: {
      title: "Super Store Departments",
      columns: 4,
    },
  },
  {
    id: "block_super_spacer_1",
    type: "spacer",
    sortOrder: 5,
    isActive: true,
    data: { height: 24 },
  },
];

const DEFAULT_CAFE_BLOCKS: LayoutBlock[] = [
  {
    id: "block_cafe_hero_1",
    type: "hero_banner",
    sortOrder: 1,
    isActive: true,
    data: {
      title: "SwiftMart Cafe & Cloud Kitchen",
      subtitle: "Hot pizza, burgers, momos & fresh brews delivered hot in 15 minutes",
      imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80",
      link: "/shops",
      buttonText: "Order Food",
    },
  },
  {
    id: "block_cafe_promo_1",
    type: "promotional_strip",
    sortOrder: 2,
    isActive: true,
    data: {
      title: "🍕 Hot & Fresh Cafe Deals",
      subtitle: "Buy 1 Get 1 Free on all Artisan Pizzas & Cold Coffee Shakes",
      backgroundColor: "#E23744",
      link: "/categories",
      buttonText: "Grab BOGO",
    },
  },
  {
    id: "block_cafe_products_1",
    type: "product_carousel",
    sortOrder: 3,
    isActive: true,
    data: {
      title: "Chef's Special Fast-Bites",
      categorySlug: "fast-food",
      limit: 10,
    },
  },
  {
    id: "block_cafe_categories_1",
    type: "category_grid",
    sortOrder: 4,
    isActive: true,
    data: {
      title: "Cafe Menu Categories",
      columns: 3,
    },
  },
  {
    id: "block_cafe_spacer_1",
    type: "spacer",
    sortOrder: 5,
    isActive: true,
    data: { height: 24 },
  },
];

// Helper to provide sensible default blocks for known pages
function getDefaultBlocksForPage(pageName: string): LayoutBlock[] {
  const p = pageName.toLowerCase();
  if (p === "home") return DEFAULT_HOME_BLOCKS;
  if (p === "festive") return DEFAULT_FESTIVE_BLOCKS;
  if (p === "super_store" || p === "superstore") return DEFAULT_SUPER_STORE_BLOCKS;
  if (p === "cafe") return DEFAULT_CAFE_BLOCKS;

  return [
    {
      id: `block_default_${p}`,
      type: "hero_banner",
      sortOrder: 1,
      isActive: true,
      data: {
        title: `Welcome to ${p.toUpperCase()} Page`,
        subtitle: "Configured via SwiftMart SDUI Engine",
        imageUrl: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&q=80",
        link: "/",
      },
    },
    {
      id: `block_spacer_${p}`,
      type: "spacer",
      sortOrder: 2,
      isActive: true,
      data: { height: 16 },
    },
  ];
}

async function resolveLayoutBlocks(blocks: LayoutBlock[]): Promise<LayoutBlock[]> {
  const explicitIds = new Set<string>();

  for (const block of blocks) {
    if (((block.type as string) === "product_carousel" || (block.type as string) === "product_slider") && block.data) {
      if (Array.isArray(block.data.productIds) && block.data.productIds.length > 0) {
        block.data.productIds.forEach((id: string) => {
          if (id && typeof id === "string") explicitIds.add(id.trim());
        });
      }
    }
  }

  const explicitMap = new Map<string, any>();
  if (explicitIds.size > 0) {
    try {
      const dbProds = await db
        .select()
        .from(productsTable)
        .where(inArray(productsTable.id, Array.from(explicitIds)));

      for (const p of dbProds) {
        const isAvailable = (p.stock ?? 0) > 0 && p.status === "active";
        const imgList = Array.isArray(p.images) ? p.images : [];
        const imageUrl = imgList.length > 0 ? imgList[0] : "";
        explicitMap.set(p.id, {
          id: p.id,
          name: p.name,
          price: p.price,
          discountedPrice: p.discountedPrice,
          imageUrl: imageUrl,
          image: imageUrl,
          images: imgList,
          unit: p.unit,
          category: p.category,
          shopId: p.shopId,
          fomoTag: (p as any).fomoTag,
          stockStatus: isAvailable ? "in_stock" : "out_of_stock",
        });
      }
    } catch (e) {
      logger.warn({ e }, "Failed to fetch explicit products for layout");
    }
  }

  return await Promise.all(
    blocks.map(async (block) => {
      if (((block.type as string) === "product_carousel" || (block.type as string) === "product_slider") && block.data) {
        // Case 1: Curated explicit product IDs selected by admin
        if (Array.isArray(block.data.productIds) && block.data.productIds.length > 0) {
          const resolved = block.data.productIds
            .map((id: string) => explicitMap.get(id))
            .filter((p: any) => p !== undefined);

          return {
            ...block,
            data: {
              ...block.data,
              products: resolved,
            },
          };
        }

        // Case 2: Products exclusively from a specific Shop / Dokan
        if (block.data.shopId) {
          try {
            const shopProds = await db
              .select()
              .from(productsTable)
              .where(and(eq(productsTable.shopId, block.data.shopId), eq(productsTable.status, "active")))
              .limit(Number(block.data.limit) || 12);

            const resolved = shopProds.map((p) => {
              const isAvailable = (p.stock ?? 0) > 0;
              const imgList = Array.isArray(p.images) ? p.images : [];
              const imageUrl = imgList.length > 0 ? imgList[0] : "";
              return {
                id: p.id,
                name: p.name,
                price: p.price,
                discountedPrice: p.discountedPrice,
                imageUrl: imageUrl,
                image: imageUrl,
                images: imgList,
                unit: p.unit,
                category: p.category,
                shopId: p.shopId,
                fomoTag: (p as any).fomoTag,
                stockStatus: isAvailable ? "in_stock" : "out_of_stock",
              };
            });

            return {
              ...block,
              data: {
                ...block.data,
                products: resolved,
              },
            };
          } catch (e) {
            return block;
          }
        }

        // Case 3: Products from a specific category
        if (block.data.categorySlug && block.data.categorySlug !== "all") {
          try {
            const catProds = await db
              .select()
              .from(productsTable)
              .where(and(eq(productsTable.category, block.data.categorySlug), eq(productsTable.status, "active")))
              .limit(Number(block.data.limit) || 12);

            const resolved = catProds.map((p) => {
              const isAvailable = (p.stock ?? 0) > 0;
              const imgList = Array.isArray(p.images) ? p.images : [];
              const imageUrl = imgList.length > 0 ? imgList[0] : "";
              return {
                id: p.id,
                name: p.name,
                price: p.price,
                discountedPrice: p.discountedPrice,
                imageUrl: imageUrl,
                image: imageUrl,
                images: imgList,
                unit: p.unit,
                category: p.category,
                shopId: p.shopId,
                fomoTag: (p as any).fomoTag,
                stockStatus: isAvailable ? "in_stock" : "out_of_stock",
              };
            });

            return {
              ...block,
              data: {
                ...block.data,
                products: resolved,
              },
            };
          } catch (e) {
            return block;
          }
        }
      }

      return block;
    })
  );
}

// ─── GET /api/v1/layout/:pageName ─────────────────────────────────────
// Public SDUI layout API endpoint — returns sorted active layout blocks
router.get("/:pageName", async (req: Request, res: Response): Promise<void> => {
    const rawParam = req.params["pageName"];
    const pageName = String(Array.isArray(rawParam) ? rawParam[0] : (rawParam || "home")).toLowerCase();

  try {
    const [layout] = await db
      .select()
      .from(appLayouts)
      .where(eq(appLayouts.pageName, pageName))
      .limit(1);

    // No record in DB at all → return hardcoded defaults so there's
    // something to show on first load before the admin configures anything.
    if (!layout) {
      const defaultBlocks = getDefaultBlocksForPage(pageName);
      const resolvedDefaults = await resolveLayoutBlocks(defaultBlocks);
      res.json({
        success: true,
        pageName,
        isDefault: true,
        blocks: resolvedDefaults,
        allBlocks: resolvedDefaults,
      });
      return;
    }

    // A record exists — always honour what the admin saved, even if it's
    // an empty array (admin intentionally cleared all blocks).
    const allBlocks = Array.isArray(layout.blocks) ? layout.blocks : [];

    // Sort blocks by sortOrder and filter active ones for public consumers
    const activeSortedBlocks = allBlocks
      .filter((b) => b.isActive !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const resolvedActiveBlocks = await resolveLayoutBlocks(activeSortedBlocks);
    const resolvedAllBlocks = await resolveLayoutBlocks(
      allBlocks.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    );

    res.json({
      success: true,
      pageName,
      isDefault: false,
      blocks: resolvedActiveBlocks,
      allBlocks: resolvedAllBlocks,
      updatedAt: layout.updatedAt,
    });
  } catch (err) {
    logger.error({ err, pageName }, "Failed to fetch layout — returning fallback");
    const fallbackBlocks = getDefaultBlocksForPage(pageName);
    res.json({
      success: true,
      pageName,
      isDefault: true,
      blocks: fallbackBlocks,
    });
  }
});

// ─── PUT /api/v1/layout/:pageName ────────────────────────────────────
// Admin endpoint to save/upsert SDUI page layout blocks
router.put(
  "/:pageName",
  authenticate,
  requireRole("admin", "super_admin"),
  async (req: Request, res: Response): Promise<void> => {
      const rawParam = req.params["pageName"];
    const pageName = String(Array.isArray(rawParam) ? rawParam[0] : (rawParam || "home")).toLowerCase();
    const { blocks } = req.body || {};

    if (!Array.isArray(blocks)) {
      res.status(400).json({ success: false, message: "blocks must be an array of layout blocks" });
      return;
    }

    try {
      const sanitizedBlocks: LayoutBlock[] = blocks.map((b, idx) => ({
        id: String(b.id || `block_${Date.now()}_${idx}`),
        type: b.type || "spacer",
        sortOrder: typeof b.sortOrder === "number" ? b.sortOrder : idx + 1,
        isActive: b.isActive !== false,
        data: typeof b.data === "object" && b.data !== null ? b.data : {},
      }));

      const recordValues = {
        id: crypto.randomUUID(),
        pageName,
        blocks: sanitizedBlocks,
        updatedAt: new Date(),
      };

      await db
        .insert(appLayouts)
        .values(recordValues)
        .onConflictDoUpdate({
          target: appLayouts.pageName,
          set: {
            blocks: sanitizedBlocks,
            updatedAt: new Date(),
          },
        });

      logger.info({ pageName, blockCount: sanitizedBlocks.length }, "Page layout updated successfully");

      res.json({
        success: true,
        message: `Layout for page '${pageName}' updated successfully`,
        pageName,
        blocks: sanitizedBlocks,
      });
    } catch (err) {
      logger.error({ err, pageName }, "Failed to save page layout");
      res.status(500).json({ success: false, message: "Failed to save page layout", error: String(err) });
    }
  }
);

export default router;
