import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Layers,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  LayoutGrid,
  Image as ImageIcon,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Upload,
  ShoppingBag,
  Grid2X2,
  Tag,
  SlidersHorizontal,
  Repeat,
  CloudRain,
  Utensils,
  Clock,
  Flame,
  Search,
  Check,
  Store,
  X,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

export type BlockType =
  | "hero_banner"
  | "category_grid"
  | "product_carousel"
  | "promotional_strip"
  | "spacer"
  | "daily_regulars"
  | "weather_cravings"
  | "shoppable_recipe"
  | "super_store_showcase";

export interface LayoutBlock {
  id: string;
  type: BlockType;
  sortOrder: number;
  isActive: boolean;
  data: Record<string, any>;
}

const PAGE_OPTIONS = [
  { label: "Main Home Tab (home)", value: "home" },
  { label: "Festive Campaign Tab (festive)", value: "festive" },
  { label: "Super Store Tab (super_store)", value: "super_store" },
  { label: "Cafe & Food Tab (cafe)", value: "cafe" },
];

const BLOCK_TYPES_META: Array<{ type: BlockType; label: string; description: string; icon: any }> = [
  {
    type: "hero_banner",
    label: "Hero Banner",
    description: "Large promotional banner with image, title & action button",
    icon: ImageIcon,
  },
  {
    type: "category_grid",
    label: "Category Grid",
    description: "Grid layout displaying product categories",
    icon: Grid2X2,
  },
  {
    type: "product_carousel",
    label: "Product Carousel",
    description: "Horizontal scrolling product list filtered by category",
    icon: ShoppingBag,
  },
  {
    type: "promotional_strip",
    label: "Promotional Strip",
    description: "Highlighted announcement bar with custom background color",
    icon: Tag,
  },
  {
    type: "daily_regulars",
    label: "Daily Regulars",
    description: "1-Tap Re-order essentials list (Milk, Eggs, Bread)",
    icon: Repeat,
  },
  {
    type: "weather_cravings",
    label: "Weather Cravings",
    description: "Monsoon & seasonal snack cravings block (Tea, Samosas)",
    icon: CloudRain,
  },
  {
    type: "shoppable_recipe",
    label: "Shoppable Recipe",
    description: "Recipe card allowing 1-tap purchase of all ingredients",
    icon: Utensils,
  },
  {
    type: "super_store_showcase",
    label: "Super Store Showcase",
    description: "Dark neon cyber-purple 3×2 grid with category cards & Deal Store badge",
    icon: Store,
  },
  {
    type: "spacer",
    label: "Spacer",
    description: "Vertical empty space for layout padding",
    icon: SlidersHorizontal,
  },
];

interface LayoutBuilderTabProps {
  initialPage?: string;
  fixedPage?: string;
  title?: string;
  subtitle?: string;
}

export function LayoutBuilderTab({
  initialPage = "home",
  fixedPage,
  title,
  subtitle,
}: LayoutBuilderTabProps = {}) {
  const [selectedPage, setSelectedPage] = useState(fixedPage || initialPage || "home");

  useEffect(() => {
    if (fixedPage) {
      setSelectedPage(fixedPage);
    }
  }, [fixedPage]);
  const [blocks, setBlocks] = useState<LayoutBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);

  // Real Database Data State
  const [realCategories, setRealCategories] = useState<any[]>([]);
  const [realProducts, setRealProducts] = useState<any[]>([]);
  const [realShops, setRealShops] = useState<any[]>([]);

  // Helper to reliably extract shop display name
  const getShopDisplayName = (shop?: any): string => {
    if (!shop) return "";
    return shop.shopName || shop.name || shop.storeName || shop.ownerName || "Unnamed Shop";
  };

  // Product Carousel Curation Search & Filter State (keyed by blockId)
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});
  const [productFilterShop, setProductFilterShop] = useState<Record<string, string>>({});
  const [productFilterCategory, setProductFilterCategory] = useState<Record<string, string>>({});

  const fetchLayout = async (page: string) => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; blocks: LayoutBlock[]; allBlocks?: LayoutBlock[] }>(
        `/layout/${page}`
      );
      if (res.success) {
        const rawBlocks = res.allBlocks || res.blocks || [];
        const sorted = [...rawBlocks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setBlocks(sorted);
        if (sorted.length > 0 && !expandedBlockId) {
          setExpandedBlockId(sorted[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load layout:", err);
      toast.error("Failed to load layout blocks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayout(selectedPage);
  }, [selectedPage]);

  // Sync real database categories, products & shops
  useEffect(() => {
    api.get<{ success: boolean; categories: any[] }>("/categories")
      .then((r) => {
        if (r?.success && Array.isArray(r.categories)) {
          setRealCategories(r.categories);
        }
      })
      .catch(() => {});

    api.get<{ success: boolean; products: any[] }>("/products?limit=250&status=all")
      .then((r) => {
        if (r?.success && Array.isArray(r.products)) {
          setRealProducts(r.products);
        }
      })
      .catch(() => {});

    api.get<{ success: boolean; shops: any[] }>("/shops?status=approved&limit=200")
      .then((r) => {
        if (r?.success && Array.isArray(r.shops)) {
          setRealShops(r.shops);
        }
      })
      .catch(() => {});
  }, []);

  // When a block with shopId is selected/active, ensure that shop's products are preloaded
  useEffect(() => {
    const currentBlock = blocks.find((b) => b.id === expandedBlockId);
    const sId = currentBlock?.data?.shopId;
    if (sId && currentBlock?.data?.sourceType === "shop") {
      api.get<{ success: boolean; products: any[] }>(`/products?shopId=${sId}&status=all&limit=100`)
        .then((res) => {
          if (res?.success && Array.isArray(res.products)) {
            setRealProducts((prev) => {
              const existingIds = new Set(prev.map((p) => String(p.id || p._id)));
              const newProds = res.products.filter((p) => !existingIds.has(String(p.id || p._id)));
              return [...prev, ...newProds];
            });
          }
        })
        .catch(() => {});
    }
  }, [expandedBlockId, blocks]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const sanitized = blocks.map((b, idx) => ({ ...b, sortOrder: idx + 1 }));
      const res = await api.put<{ success: boolean; message?: string; blocks?: LayoutBlock[] }>(`/admin/layout/${selectedPage}`, {
        blocks: sanitized,
      });
      if (res.success) {
        toast.success(res.message || `Layout for '${selectedPage}' saved (${sanitized.length} blocks)!`);
        // Use the server-returned blocks if available, otherwise keep local state.
        // Do NOT re-fetch from GET — the GET endpoint would return defaults for empty saves.
        if (res.blocks && Array.isArray(res.blocks)) {
          const sorted = [...res.blocks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          setBlocks(sorted);
        }
      } else {
        toast.error("Failed to save layout");
      }
    } catch (err: any) {
      console.error("Failed to save layout:", err);
      toast.error(err?.message || "Failed to save layout");
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = (type: BlockType) => {
    const defaultCatSlug = realCategories.length > 0 ? realCategories[0].slug : "dairy";
    const newBlock: LayoutBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      sortOrder: blocks.length + 1,
      isActive: true,
      data: getDefaultDataForType(type, defaultCatSlug),
    };
    const updated = [...blocks, newBlock];
    setBlocks(updated);
    setExpandedBlockId(newBlock.id);
    toast.info(`Added new ${type.replace("_", " ")} block`);
  };

  const getDefaultDataForType = (type: BlockType, defaultCatSlug: string): Record<string, any> => {
    switch (type) {
      case "hero_banner":
        return {
          title: "New Promotional Banner",
          subtitle: "Special offer for limited time",
          imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80",
          link: "/shops",
          buttonText: "Explore Now",
        };
      case "category_grid":
        return {
          title: "Browse Categories",
          columns: 4,
          categoryFilter: "all",
        };
      case "product_carousel":
        return {
          title: "Trending Products",
          sourceType: "category", // "category" | "shop" | "custom"
          categorySlug: defaultCatSlug,
          shopId: "",
          shopName: "",
          productIds: [],
          limit: 10,
        };
      case "promotional_strip":
        return {
          title: "⚡ Special Announcement",
          subtitle: "Get free delivery on orders over ₹199",
          backgroundColor: "#E23744",
          link: "/categories",
          buttonText: "Order Now",
        };
      case "daily_regulars":
        return {
          title: "Your Daily Regulars 🥛",
          badgeText: "1-TAP REORDER",
          items: [
            { id: "reorder_1", name: "Amul Taaza Toned Milk", price: 54, unit: "1 L", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500" },
            { id: "reorder_2", name: "Fresh Organic Eggs", price: 42, unit: "Pack of 6", image: "https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=500" },
          ],
        };
      case "weather_cravings":
        return {
          weatherCondition: "rainy",
          title: "Rainy Day Cravings ☕",
          badgeText: "🌧️ Rain Special",
          items: [
            { id: "rain_1", name: "Tata Tea Gold Masala", price: 140, unit: "250g", image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500" },
            { id: "rain_2", name: "Hot Fresh Samosa 2pcs", price: 30, unit: "2 Pcs", image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500" },
          ],
        };
      case "shoppable_recipe":
        return {
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
        };
      case "super_store_showcase":
        return {
          title: "Super Store",
          subtitle: "Beyond groceries",
          items: [
            { name: "Home", color: "0xFFD97706", icon: "🏺", image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=150", slug: "home-kitchen" },
            { name: "Beauty", color: "0xFFE11D48", icon: "💄", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=150", slug: "beauty-personal-care" },
            { name: "Electronics", color: "0xFF0284C7", icon: "🎧", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150", slug: "electronics" },
            { name: "Fashion", color: "0xFFEA580C", icon: "👗", image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=150", slug: "fashion" },
            { name: "Stationery", color: "0xFF475569", icon: "✏️", image: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=150", slug: "books-stationery" },
            { name: "Deal Store", color: "0xFF16A34A", icon: "🏷️", isDeal: true, slug: "deals" },
          ],
        };
      case "spacer":
        return { height: 24 };
      default:
        return {};
    }
  };

  const handleMoveBlock = (index: number, direction: "up" | "down") => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === blocks.length - 1)) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const nextBlocks = [...blocks];
    const temp = nextBlocks[index];
    nextBlocks[index] = nextBlocks[targetIndex];
    nextBlocks[targetIndex] = temp;
    setBlocks(nextBlocks.map((b, i) => ({ ...b, sortOrder: i + 1 })));
  };

  const handleDeleteBlock = (id: string) => {
    const nextBlocks = blocks.filter((b) => b.id !== id);
    setBlocks(nextBlocks.map((b, i) => ({ ...b, sortOrder: i + 1 })));
    if (expandedBlockId === id) {
      setExpandedBlockId(nextBlocks.length > 0 ? nextBlocks[0].id : null);
    }
    toast.success("Block removed");
  };

  const handleToggleActive = (id: string) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b)));
  };

  const handleUpdateBlockData = (id: string, key: string, value: any) => {
    setBlocks(
      blocks.map((b) => (b.id === id ? { ...b, data: { ...b.data, [key]: value } } : b))
    );
  };

  const handleImageFileUpload = async (id: string, key: string, file: File) => {
    setUploadingBlockId(id);
    try {
      // Step 1: Get ImageKit auth params from our server
      const tokens = api.getTokens();
      const access = tokens.access || localStorage.getItem("sm_at");
      const baseUrl = api.BASE || "/api";

      const authRes = await fetch(`${baseUrl}/upload/imagekit-auth`, {
        headers: {
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
        },
      });
      if (!authRes.ok) {
        const errData = await authRes.json().catch(() => ({}));
        throw new Error((errData as any)?.message || "Failed to get upload auth");
      }
      const authData = await authRes.json() as {
        token: string;
        expire: number;
        signature: string;
        publicKey: string;
        urlEndpoint: string;
      };

      // Step 2: Upload directly to ImageKit from browser (no Vercel size limit)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name || "banner-media");
      formData.append("folder", "/swiftmart/banners");
      formData.append("publicKey", authData.publicKey);
      formData.append("signature", authData.signature);
      formData.append("expire", String(authData.expire));
      formData.append("token", authData.token);

      const uploadRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json() as { url?: string; error?: { message?: string } };

      if (uploadRes.ok && uploadData.url) {
        handleUpdateBlockData(id, key, uploadData.url);
        toast.success("✅ Media uploaded successfully!");
      } else {
        throw new Error(uploadData.error?.message || "ImageKit upload failed");
      }
    } catch (err) {
      console.error("Media upload failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload media file");
    } finally {
      setUploadingBlockId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-extrabold text-white">
              {title || "SDUI Layout Engine — Page Builder"}
            </h2>
          </div>
          <p className="text-sm text-slate-400 font-medium mt-1">
            {subtitle || "Build, order and arrange dynamic UI blocks synced directly with real database categories & products."}
          </p>
        </div>

        {/* Page Selector & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {!fixedPage ? (
            <select
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              className="h-10 px-3.5 rounded-xl border border-slate-800 bg-slate-950 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-xs"
            >
              {PAGE_OPTIONS.map((p) => (
                <option key={p.value} value={p.value} className="text-white bg-slate-900 font-semibold">
                  {p.label}
                </option>
              ))}
            </select>
          ) : (
            <Badge variant="outline" className="px-3.5 py-2 bg-slate-950 text-emerald-400 border-emerald-500/40 text-xs font-mono font-extrabold uppercase">
              Target Tab: {fixedPage}
            </Badge>
          )}

          <Button
            type="button"
            onClick={() => fetchLayout(selectedPage)}
            disabled={saving}
            className="border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white font-bold shadow-xs flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-300" /> Reset
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-white hover:opacity-95 font-bold shadow-md flex items-center gap-2 transition-all"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Layout
          </Button>
        </div>
      </div>

      {/* Add New Block Banner */}
      <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3 backdrop-blur-md">
        <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Add New SDUI Block
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
          {BLOCK_TYPES_META.map((meta) => {
            const Icon = meta.icon;
            return (
              <button
                key={meta.type}
                type="button"
                onClick={() => handleAddBlock(meta.type)}
                className="flex flex-col items-start p-3 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-primary/50 hover:bg-slate-800 transition-all text-left group shadow-xs"
              >
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 group-hover:bg-primary/20 text-slate-300 group-hover:text-primary mb-2 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white group-hover:text-primary">
                  {meta.label}
                </span>
                <span className="text-[11px] font-medium text-slate-400 line-clamp-2 mt-0.5">
                  {meta.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Block Sequence & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Block Sequence & Editor */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-slate-300" />
              Page Blocks ({blocks.length})
            </h3>
            <span className="text-xs text-slate-400 font-bold">Use arrows to reorder</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[250px] bg-slate-900/90 rounded-2xl border border-slate-800">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mb-2" />
              <p className="text-sm text-slate-300 font-bold">Loading layout blocks...</p>
            </div>
          ) : blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[250px] bg-slate-900/90 rounded-2xl border border-dashed border-slate-800 p-6 text-center">
              <LayoutGrid className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-sm font-extrabold text-white">No blocks configured for '{selectedPage}'</p>
              <p className="text-xs text-slate-400 font-medium mt-1 max-w-xs">
                Click any of the block buttons above to start building the page layout.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {blocks.map((block, index) => {
                const isExpanded = expandedBlockId === block.id;
                const meta = BLOCK_TYPES_META.find((m) => m.type === block.type);
                const BlockIcon = meta?.icon || Layers;

                return (
                  <div
                    key={block.id}
                    className={`bg-slate-900/90 rounded-2xl border transition-all ${
                      isExpanded ? "border-primary shadow-lg" : "border-slate-800 hover:border-slate-700 shadow-xs"
                    } ${!block.isActive ? "opacity-50 bg-slate-950" : ""}`}
                  >
                    {/* Block Header / Action Bar */}
                    <div className="p-4 flex items-center justify-between gap-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-white font-mono text-xs font-extrabold flex items-center justify-center shrink-0 border border-slate-700">
                          {index + 1}
                        </span>

                        <div className="p-2 rounded-lg bg-slate-950 text-slate-200 shrink-0 border border-slate-800">
                          <BlockIcon className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-white truncate">
                              {block.data?.title || block.data?.recipeName || meta?.label || block.type}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-300 border-slate-700"
                            >
                              {block.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 font-medium truncate">
                            {block.data?.subtitle || block.data?.badgeText || (block.data?.categorySlug ? `Category: ${block.data.categorySlug}` : `Sort order: ${index + 1}`)}
                          </p>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveBlock(index, "up")}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30"
                          title="Move Up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveBlock(index, "down")}
                          disabled={index === blocks.length - 1}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30"
                          title="Move Down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(block.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            block.isActive ? "text-emerald-400 hover:bg-emerald-950/40" : "text-slate-500 hover:bg-slate-800"
                          }`}
                          title={block.isActive ? "Deactivate Block" : "Activate Block"}
                        >
                          {block.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteBlock(block.id)}
                          className="p-1.5 rounded-lg hover:bg-red-950/50 text-slate-400 hover:text-red-400 transition-colors"
                          title="Remove Block"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Block Editor Panel (Expanded) */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-950/60 space-y-4 rounded-b-2xl border-t border-slate-800">
                        {/* HERO BANNER EDIT FIELDS */}
                        {block.type === "hero_banner" && (
                          <div className="space-y-4 text-sm">
                            {/* Media Type Selector */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-200 block">Media Type</label>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { id: "image", label: "Image 🖼️" },
                                  { id: "video", label: "Video 🎥" },
                                  { id: "gif", label: "GIF ✨" },
                                  { id: "lottie", label: "Lottie 💫" },
                                ].map((m) => {
                                  const isSel = (block.data?.mediaType || "image") === m.id;
                                  return (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onClick={() => handleUpdateBlockData(block.id, "mediaType", m.id)}
                                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                                        isSel
                                          ? "bg-primary text-white border-primary shadow-xs"
                                          : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850 hover:border-slate-700"
                                      }`}
                                    >
                                      {m.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Banner Title</label>
                                <Input
                                  value={block.data?.title || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "title", e.target.value)}
                                  placeholder="e.g. 10-Minute Super Fast Delivery"
                                  className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Subtitle</label>
                                <Input
                                  value={block.data?.subtitle || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "subtitle", e.target.value)}
                                  placeholder="e.g. Fresh veggies & hot snacks delivered"
                                  className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                                />
                              </div>
                            </div>

                            {/* Video or Image URL & Upload */}
                            {(block.data?.mediaType === "video") ? (
                              <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                    🎥 MP4 / WebM Video Stream URL
                                  </label>
                                  <span className="text-[10px] text-slate-400">Plays natively on Flutter & Web</span>
                                </div>
                                <div className="flex gap-2">
                                  <Input
                                    value={block.data?.videoUrl || ""}
                                    onChange={(e) => handleUpdateBlockData(block.id, "videoUrl", e.target.value)}
                                    placeholder="https://.../video.mp4"
                                    className="bg-slate-950 border-slate-800 text-white font-mono text-xs placeholder:text-slate-500 focus:border-primary flex-1"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={uploadingBlockId === block.id}
                                    className="bg-slate-800 border-slate-700 text-white font-bold text-xs shrink-0"
                                    onClick={() => {
                                      const inp = document.getElementById(`upload-video-${block.id}`) as HTMLInputElement;
                                      inp?.click();
                                    }}
                                  >
                                    {uploadingBlockId === block.id ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1 text-slate-300" />
                                    ) : (
                                      <Upload className="w-3.5 h-3.5 mr-1 text-slate-300" />
                                    )}
                                    Upload Video
                                  </Button>
                                  <input
                                    id={`upload-video-${block.id}`}
                                    type="file"
                                    accept="video/mp4,video/webm,video/quicktime,image/gif,.gif,.mp4,.webm,.mov,.json,.lottie"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        handleImageFileUpload(block.id, "videoUrl", e.target.files[0]);
                                      }
                                      e.target.value = "";
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-200 block">
                                  {block.data?.mediaType === "gif" ? "GIF Animation URL" : block.data?.mediaType === "lottie" ? "Lottie JSON URL" : "Image URL"}
                                </label>
                                <div className="flex gap-2">
                                  <Input
                                    value={block.data?.imageUrl || ""}
                                    onChange={(e) => handleUpdateBlockData(block.id, "imageUrl", e.target.value)}
                                    placeholder="https://images.unsplash.com/..."
                                    className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary flex-1"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={uploadingBlockId === block.id}
                                    className="bg-slate-800 border-slate-700 text-white font-bold text-xs shrink-0"
                                    onClick={() => {
                                      const inp = document.getElementById(`upload-image-${block.id}`) as HTMLInputElement;
                                      inp?.click();
                                    }}
                                  >
                                    {uploadingBlockId === block.id ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1 text-slate-300" />
                                    ) : (
                                      <Upload className="w-3.5 h-3.5 mr-1 text-slate-300" />
                                    )}
                                    Upload {block.data?.mediaType === "gif" ? "GIF" : block.data?.mediaType === "lottie" ? "Lottie" : "Image"}
                                  </Button>
                                  <input
                                    id={`upload-image-${block.id}`}
                                    type="file"
                                    accept="image/*,image/gif,.gif,.png,.jpg,.jpeg,.webp,.svg,.json,.lottie,video/mp4,video/webm,.mp4,.webm"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        handleImageFileUpload(block.id, "imageUrl", e.target.files[0]);
                                      }
                                      e.target.value = "";
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Banner Height, Aspect Ratio & Autoplay Options */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                              <div>
                                <label className="text-[11px] font-bold text-slate-300 block mb-1">Banner Height</label>
                                <select
                                  value={block.data?.height || 180}
                                  onChange={(e) => handleUpdateBlockData(block.id, "height", Number(e.target.value))}
                                  className="w-full h-8 px-2 rounded-lg border border-slate-800 bg-slate-950 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value={140}>Compact (140px)</option>
                                  <option value={160}>Medium (160px)</option>
                                  <option value={180}>Standard (180px)</option>
                                  <option value={200}>Large (200px)</option>
                                  <option value={220}>Tall (220px)</option>
                                  <option value={260}>Hero Plus (260px)</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-slate-300 block mb-1">Aspect Ratio</label>
                                <select
                                  value={block.data?.aspectRatio || "16:9"}
                                  onChange={(e) => handleUpdateBlockData(block.id, "aspectRatio", e.target.value)}
                                  className="w-full h-8 px-2 rounded-lg border border-slate-800 bg-slate-950 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value="16:9">16:9 Standard</option>
                                  <option value="21:9">21:9 Ultrawide</option>
                                  <option value="4:3">4:3 Box</option>
                                  <option value="custom">Custom Auto</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-slate-300 block mb-1">AutoPlay</label>
                                <select
                                  value={block.data?.autoPlay !== false ? "true" : "false"}
                                  onChange={(e) => handleUpdateBlockData(block.id, "autoPlay", e.target.value === "true")}
                                  className="w-full h-8 px-2 rounded-lg border border-slate-800 bg-slate-950 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value="true">Enabled (Loop)</option>
                                  <option value="false">Disabled</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-slate-300 block mb-1">Interval</label>
                                <select
                                  value={block.data?.interval || 4}
                                  onChange={(e) => handleUpdateBlockData(block.id, "interval", Number(e.target.value))}
                                  className="w-full h-8 px-2 rounded-lg border border-slate-800 bg-slate-950 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value={3}>3 Seconds</option>
                                  <option value={4}>4 Seconds</option>
                                  <option value={5}>5 Seconds</option>
                                  <option value={7}>7 Seconds</option>
                                </select>
                              </div>
                            </div>

                            {/* Action Link, Preset Selector & CTA Button */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="md:col-span-1">
                                <label className="text-xs font-bold text-slate-200 block mb-1">Target Page Preset</label>
                                <select
                                  value={
                                    ["/shops", "/categories", "/festive", "/cafe", "/super_store", "/search"].includes(block.data?.link)
                                      ? block.data?.link
                                      : "custom"
                                  }
                                  onChange={(e) => {
                                    if (e.target.value !== "custom") {
                                      handleUpdateBlockData(block.id, "link", e.target.value);
                                    }
                                  }}
                                  className="w-full h-9 px-2 rounded-lg border border-slate-800 bg-slate-950 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value="/shops">🏬 All Shops (/shops)</option>
                                  <option value="/categories">📦 Categories (/categories)</option>
                                  <option value="/festive">🎉 Festive Store (/festive)</option>
                                  <option value="/cafe">🍕 Cafe & Food (/cafe)</option>
                                  <option value="/super_store">🛒 Super Store (/super_store)</option>
                                  <option value="/search">🔍 Search (/search)</option>
                                  <option value="custom">✏️ Custom URL / Slug</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Action Link (Deeplink)</label>
                                <Input
                                  value={block.data?.link || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "link", e.target.value)}
                                  placeholder="e.g. /shops or /category/dairy"
                                  className="bg-slate-950 border-slate-800 text-white font-mono text-xs placeholder:text-slate-500 focus:border-primary h-9"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Button Text</label>
                                <Input
                                  value={block.data?.buttonText || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "buttonText", e.target.value)}
                                  placeholder="e.g. Order Now / Shop Now"
                                  className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary h-9"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* CATEGORY GRID EDIT FIELDS */}
                        {block.type === "category_grid" && (
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Section Title</label>
                                <Input
                                  value={block.data?.title || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "title", e.target.value)}
                                  placeholder="e.g. Top Categories"
                                  className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Columns</label>
                                <select
                                  value={block.data?.columns || 4}
                                  onChange={(e) => handleUpdateBlockData(block.id, "columns", parseInt(e.target.value, 10))}
                                  className="w-full h-10 px-3 rounded-lg border border-slate-800 bg-slate-950 text-white font-bold text-sm"
                                >
                                  <option value={3}>3 Columns</option>
                                  <option value={4}>4 Columns</option>
                                  <option value={6}>6 Columns</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* PRODUCT CAROUSEL EDIT FIELDS */}
                        {block.type === "product_carousel" && (() => {
                          const currentSource = block.data?.sourceType || "category";
                          const currentProductIds: string[] = Array.isArray(block.data?.productIds) ? block.data.productIds : [];
                          const currentShopId = block.data?.shopId || "";
                          const currentCategory = block.data?.categorySlug || "";

                          const query = (productSearch[block.id] || "").toLowerCase().trim();
                          const filterShop = productFilterShop[block.id] || "";
                          const filterCat = productFilterCategory[block.id] || "";

                          // Filter products available to pick
                          const availableProducts = realProducts.filter((p) => {
                            const nameMatches = !query || String(p.name || "").toLowerCase().includes(query);
                            const shopMatches = !filterShop || String(p.shopId || "") === filterShop;
                            const catMatches = !filterCat || String(p.category || "").toLowerCase() === filterCat.toLowerCase();
                            return nameMatches && shopMatches && catMatches;
                          });

                          const selectedProductsList = currentProductIds
                            .map((id) => realProducts.find((p) => String(p.id || p._id) === String(id)))
                            .filter(Boolean);

                          const handleToggleProduct = (prodId: string) => {
                            const idStr = String(prodId);
                            const nextIds = currentProductIds.includes(idStr)
                              ? currentProductIds.filter((id) => id !== idStr)
                              : [...currentProductIds, idStr];
                            handleUpdateBlockData(block.id, "productIds", nextIds);
                          };

                          const handleMoveProductOrder = (index: number, dir: "left" | "right") => {
                            const target = dir === "left" ? index - 1 : index + 1;
                            if (target < 0 || target >= currentProductIds.length) return;
                            const next = [...currentProductIds];
                            const temp = next[index];
                            next[index] = next[target];
                            next[target] = temp;
                            handleUpdateBlockData(block.id, "productIds", next);
                          };

                          return (
                            <div className="space-y-4 text-sm">
                              {/* Source Mode Toggle */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-200 block">Product Source Mode</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {[
                                    { id: "category", label: "📦 By Category", desc: "Filter by product category" },
                                    { id: "shop", label: "🏢 By Specific Shop (Dokan)", desc: "Exclusively from a seller shop" },
                                    { id: "custom", label: "⭐ Curated Product Picker", desc: "Hand-pick exact products" },
                                  ].map((m) => {
                                    const isSel = currentSource === m.id;
                                    return (
                                      <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => handleUpdateBlockData(block.id, "sourceType", m.id)}
                                        className={`p-2.5 rounded-xl text-left border transition-all ${
                                          isSel
                                            ? "bg-primary text-white border-primary shadow-xs font-bold"
                                            : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850 hover:border-slate-700"
                                        }`}
                                      >
                                        <div className="text-xs font-bold">{m.label}</div>
                                        <div className="text-[10px] opacity-80 truncate mt-0.5">{m.desc}</div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Title & Limit */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="md:col-span-2">
                                  <label className="text-xs font-bold text-slate-200 block mb-1">Section Title</label>
                                  <Input
                                    value={block.data?.title || ""}
                                    onChange={(e) => handleUpdateBlockData(block.id, "title", e.target.value)}
                                    placeholder="e.g. Trending Products / Best Deals"
                                    className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-slate-200 block mb-1">Product Limit</label>
                                  <select
                                    value={block.data?.limit || 10}
                                    onChange={(e) => handleUpdateBlockData(block.id, "limit", parseInt(e.target.value, 10))}
                                    className="w-full h-10 px-3 rounded-lg border border-slate-800 bg-slate-950 text-white font-bold text-xs"
                                  >
                                    <option value={4}>4 Products</option>
                                    <option value={6}>6 Products</option>
                                    <option value={8}>8 Products</option>
                                    <option value={10}>10 Products</option>
                                    <option value={15}>15 Products</option>
                                    <option value={20}>20 Products</option>
                                  </select>
                                </div>
                              </div>

                              {/* Mode A: By Category */}
                              {currentSource === "category" && (
                                <div className="space-y-1.5 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                                  <label className="text-xs font-bold text-slate-200 block">Select Category</label>
                                  <select
                                    value={currentCategory}
                                    onChange={(e) => handleUpdateBlockData(block.id, "categorySlug", e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-slate-800 bg-slate-950 text-white font-bold text-sm"
                                  >
                                    <option value="">All Categories</option>
                                    {realCategories.map((cat) => (
                                      <option key={cat.id || cat.slug} value={cat.slug}>
                                        {cat.emoji || "🛍️"} {cat.name} ({cat.slug})
                                      </option>
                                    ))}
                                  </select>
                                  <p className="text-[11px] text-slate-400 mt-1">
                                    Shows trending in-stock products matching the selected category.
                                  </p>
                                </div>
                              )}

                              {/* Mode B: By Specific Shop (Dokan) */}
                              {currentSource === "shop" && (
                                <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-amber-500/30">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                      <Store className="w-4 h-4" /> Select Vendor Shop (Dokan)
                                    </label>
                                    <span className="text-[10px] text-slate-400">{realShops.length} Approved Shops</span>
                                  </div>
                                  <select
                                     value={currentShopId}
                                     onChange={(e) => {
                                       const sId = e.target.value;
                                       const shopObj = realShops.find((s) => String(s.id || s._id) === String(sId));
                                       const sName = getShopDisplayName(shopObj);
                                       handleUpdateBlockData(block.id, "shopId", sId);
                                       handleUpdateBlockData(block.id, "shopName", sId ? sName : "");
                                       if (sId) {
                                         // Dynamically fetch products of this shop so live preview & product list update instantly
                                         api.get<{ success: boolean; products: any[] }>(`/products?shopId=${sId}&status=all&limit=100`)
                                           .then((res) => {
                                             if (res?.success && Array.isArray(res.products)) {
                                               setRealProducts((prev) => {
                                                 const existingIds = new Set(prev.map((p) => String(p.id || p._id)));
                                                 const newProds = res.products.filter((p) => !existingIds.has(String(p.id || p._id)));
                                                 return [...prev, ...newProds];
                                               });
                                             }
                                           })
                                           .catch(() => {});
                                       }
                                     }}
                                     className="w-full h-10 px-3 rounded-lg border border-slate-800 bg-slate-950 text-white font-bold text-sm"
                                   >
                                     <option value="">-- Choose a Seller Shop --</option>
                                     {realShops.map((shop) => {
                                       const sId = String(shop.id || shop._id || "");
                                       const sName = getShopDisplayName(shop);
                                       const city = shop.address?.city ? `(${shop.address.city.toString().trim()})` : "";
                                       return (
                                         <option key={sId} value={sId}>
                                           🏪 {sName} {city}
                                         </option>
                                       );
                                     })}
                                   </select>
                                  {currentShopId ? (
                                    <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold mt-1 bg-emerald-950/30 px-2.5 py-1.5 rounded-lg border border-emerald-800/40">
                                      <Check className="w-3.5 h-3.5" />
                                      Showing products exclusively from "{block.data?.shopName || getShopDisplayName(realShops.find((s) => String(s.id || s._id) === String(currentShopId))) || "selected shop"}"
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-amber-300/80 mt-1">
                                      Please select a shop above to show only products from that shop.
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Mode C: Curated Product Picker (Search & Select) */}
                              {currentSource === "custom" && (
                                <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                                  {/* Selected Products Shelf */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                        ⭐ Curated Products Selected ({currentProductIds.length})
                                      </span>
                                      {currentProductIds.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateBlockData(block.id, "productIds", [])}
                                          className="text-[11px] text-red-400 hover:text-red-300 font-bold transition-colors"
                                        >
                                          Clear All
                                        </button>
                                      )}
                                    </div>

                                    {currentProductIds.length === 0 ? (
                                      <div className="p-3 bg-slate-950/80 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-400">
                                        No products picked yet. Search or filter products below and click <strong>[+ Add]</strong>!
                                      </div>
                                    ) : (
                                      <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
                                        {selectedProductsList.map((prod: any, idx: number) => {
                                          const img = Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : prod.image;
                                          const shopObj = realShops.find((s) => (s.id || s._id) === prod.shopId);
                                          return (
                                            <div
                                              key={prod.id || prod._id}
                                              className="min-w-[130px] max-w-[130px] bg-slate-950 p-2 rounded-xl border border-primary/40 flex flex-col justify-between shrink-0 shadow-md relative group"
                                            >
                                              <div className="space-y-1">
                                                <div className="relative">
                                                  {img ? (
                                                    <img src={img} alt={prod.name} className="w-full h-14 object-cover rounded-lg bg-slate-900" />
                                                  ) : (
                                                    <div className="w-full h-14 bg-slate-800 rounded-lg flex items-center justify-center text-sm">📦</div>
                                                  )}
                                                  <button
                                                    type="button"
                                                    onClick={() => handleToggleProduct(prod.id || prod._id)}
                                                    className="absolute top-1 right-1 w-5 h-5 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow transition-all"
                                                    title="Remove"
                                                  >
                                                    <X className="w-3 h-3" />
                                                  </button>
                                                </div>
                                                <div className="text-[10px] font-bold text-white line-clamp-1" title={prod.name}>
                                                  {prod.name}
                                                </div>
                                                <div className="text-[10px] font-bold text-emerald-400">
                                                  ₹{prod.discountedPrice || prod.price || 0}
                                                </div>
                                                {shopObj && (
                                                  <div className="text-[8px] text-slate-400 truncate bg-slate-900 px-1 py-0.5 rounded">
                                                    🏪 {getShopDisplayName(shopObj)}
                                                  </div>
                                                )}
                                              </div>

                                              {/* Reorder buttons */}
                                              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/80">
                                                <button
                                                  type="button"
                                                  disabled={idx === 0}
                                                  onClick={() => handleMoveProductOrder(idx, "left")}
                                                  className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                                                >
                                                  <ArrowLeft className="w-3 h-3" />
                                                </button>
                                                <span className="text-[9px] font-mono text-slate-500 font-bold">{idx + 1}</span>
                                                <button
                                                  type="button"
                                                  disabled={idx === currentProductIds.length - 1}
                                                  onClick={() => handleMoveProductOrder(idx, "right")}
                                                  className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                                                >
                                                  <ArrowRight className="w-3 h-3" />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>

                                  {/* Product Finder (Search + Shop & Category Filters) */}
                                  <div className="pt-2 border-t border-slate-800 space-y-2.5">
                                    <div className="text-xs font-bold text-slate-200">🔍 Search & Add Products from Database</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <div className="relative">
                                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                                        <Input
                                          value={productSearch[block.id] || ""}
                                          onChange={(e) => setProductSearch({ ...productSearch, [block.id]: e.target.value })}
                                          placeholder="Search name / brand..."
                                          className="bg-slate-950 border-slate-800 text-white font-bold pl-8 text-xs h-9 placeholder:text-slate-500 focus:border-primary"
                                        />
                                      </div>
                                      <select
                                        value={productFilterShop[block.id] || ""}
                                        onChange={(e) => setProductFilterShop({ ...productFilterShop, [block.id]: e.target.value })}
                                        className="h-9 px-2 rounded-lg border border-slate-800 bg-slate-950 text-white font-bold text-xs"
                                      >
                                        <option value="">All Shops ({realShops.length})</option>
                                        {realShops.map((s) => (
                                          <option key={s.id || s._id} value={s.id || s._id}>
                                            🏪 {getShopDisplayName(s)}
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        value={productFilterCategory[block.id] || ""}
                                        onChange={(e) => setProductFilterCategory({ ...productFilterCategory, [block.id]: e.target.value })}
                                        className="h-9 px-2 rounded-lg border border-slate-800 bg-slate-950 text-white font-bold text-xs"
                                      >
                                        <option value="">All Categories ({realCategories.length})</option>
                                        {realCategories.map((c) => (
                                          <option key={c.id || c.slug} value={c.slug}>
                                            {c.emoji || "🛍️"} {c.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Available products list to pick */}
                                    <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                                      {availableProducts.length === 0 ? (
                                        <div className="text-center py-6 text-xs text-slate-500">
                                          No products match your search/filters.
                                        </div>
                                      ) : (
                                        availableProducts.slice(0, 40).map((prod) => {
                                          const prodId = String(prod.id || prod._id);
                                          const isSelected = currentProductIds.includes(prodId);
                                          const img = Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : prod.image;
                                          const shopObj = realShops.find((s) => (s.id || s._id) === prod.shopId);

                                          return (
                                            <div
                                              key={prodId}
                                              className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                                                isSelected
                                                  ? "bg-primary/10 border-primary/40"
                                                  : "bg-slate-900 border-slate-800 hover:bg-slate-850"
                                              }`}
                                            >
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                {img ? (
                                                  <img src={img} alt={prod.name} className="w-9 h-9 object-cover rounded bg-slate-950 shrink-0" />
                                                ) : (
                                                  <div className="w-9 h-9 bg-slate-800 rounded flex items-center justify-center text-xs shrink-0">📦</div>
                                                )}
                                                <div className="min-w-0">
                                                  <div className="text-xs font-bold text-white truncate" title={prod.name}>
                                                    {prod.name}
                                                  </div>
                                                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                    <span className="text-emerald-400 font-bold">₹{prod.discountedPrice || prod.price || 0}</span>
                                                    {shopObj && <span className="truncate">· 🏪 {getShopDisplayName(shopObj)}</span>}
                                                    {prod.category && <span className="truncate">· 📦 {prod.category}</span>}
                                                  </div>
                                                </div>
                                              </div>

                                              <button
                                                type="button"
                                                onClick={() => handleToggleProduct(prodId)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all ${
                                                  isSelected
                                                    ? "bg-emerald-600 text-white hover:bg-red-600"
                                                    : "bg-primary text-white hover:opacity-90"
                                                }`}
                                              >
                                                {isSelected ? "✓ Added (Remove)" : "+ Add"}
                                              </button>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        {/* PROMOTIONAL STRIP EDIT FIELDS */}
                        {block.type === "promotional_strip" && (
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Title</label>
                                <Input
                                  value={block.data?.title || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "title", e.target.value)}
                                  placeholder="e.g. ⚡ Flash Discount"
                                  className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Subtitle</label>
                                <Input
                                  value={block.data?.subtitle || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "subtitle", e.target.value)}
                                  placeholder="e.g. Flat ₹50 off"
                                  className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Background Color</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={block.data?.backgroundColor || "#E23744"}
                                    onChange={(e) => handleUpdateBlockData(block.id, "backgroundColor", e.target.value)}
                                    className="w-10 h-10 rounded-lg border border-slate-800 p-1 cursor-pointer bg-slate-950"
                                  />
                                  <Input
                                    value={block.data?.backgroundColor || "#E23744"}
                                    onChange={(e) => handleUpdateBlockData(block.id, "backgroundColor", e.target.value)}
                                    placeholder="#E23744"
                                    className="font-mono text-xs font-bold uppercase bg-slate-950 border-slate-800 text-white"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Action Link</label>
                                <Input
                                  value={block.data?.link || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "link", e.target.value)}
                                  placeholder="e.g. /categories"
                                  className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Button Text</label>
                                <Input
                                  value={block.data?.buttonText || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "buttonText", e.target.value)}
                                  placeholder="e.g. Claim Now"
                                  className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* DAILY REGULARS EDIT FIELDS */}
                        {block.type === "daily_regulars" && (
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Block Title</label>
                                <Input
                                  value={block.data?.title || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "title", e.target.value)}
                                  placeholder="Your Daily Regulars 🥛"
                                  className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Badge Text</label>
                                <Input
                                  value={block.data?.badgeText || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "badgeText", e.target.value)}
                                  placeholder="1-TAP REORDER"
                                  className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* WEATHER CRAVINGS EDIT FIELDS */}
                        {block.type === "weather_cravings" && (
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Weather Condition</label>
                                <select
                                  value={block.data?.weatherCondition || "rainy"}
                                  onChange={(e) => handleUpdateBlockData(block.id, "weatherCondition", e.target.value)}
                                  className="w-full h-10 px-3 rounded-lg border border-slate-800 bg-slate-950 text-white font-bold text-sm"
                                >
                                  <option value="rainy">🌧️ Rainy Day (Tea, Samosas)</option>
                                  <option value="clear">☀️ Clear & Sunny (Ice Cream, Shakes)</option>
                                  <option value="cold">❄️ Cold Weather (Hot Soups, Coffee)</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Block Title</label>
                                <Input
                                  value={block.data?.title || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "title", e.target.value)}
                                  placeholder="Rainy Day Cravings ☕"
                                  className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Badge Text</label>
                                <Input
                                  value={block.data?.badgeText || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "badgeText", e.target.value)}
                                  placeholder="🌧️ Rain Special"
                                  className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* SHOPPABLE RECIPE EDIT FIELDS */}
                        {block.type === "shoppable_recipe" && (
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Recipe Name</label>
                                <Input
                                  value={block.data?.recipeName || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "recipeName", e.target.value)}
                                  placeholder="Creamy Butter Paneer Masala 🥘"
                                  className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Recipe Cover Image</label>
                                <div className="flex gap-2">
                                  <Input
                                    value={block.data?.imageUrl || ""}
                                    onChange={(e) => handleUpdateBlockData(block.id, "imageUrl", e.target.value)}
                                    placeholder="https://..."
                                    className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={uploadingBlockId === block.id}
                                    className="bg-slate-800 border-slate-700 text-white font-bold shrink-0"
                                    onClick={() => {
                                      const inp = document.getElementById(`upload-recipe-${block.id}`) as HTMLInputElement;
                                      inp?.click();
                                    }}
                                  >
                                    {uploadingBlockId === block.id ? (
                                      <RefreshCw className="w-4 h-4 animate-spin mr-1 text-slate-300" />
                                    ) : (
                                      <Upload className="w-4 h-4 mr-1 text-slate-300" />
                                    )}
                                    Upload
                                  </Button>
                                  <input
                                    id={`upload-recipe-${block.id}`}
                                    type="file"
                                    accept="image/*,.gif,.png,.jpg,.jpeg,.webp,.svg"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        handleImageFileUpload(block.id, "imageUrl", e.target.files[0]);
                                      }
                                      e.target.value = "";
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-200 block mb-1">Description</label>
                              <Input
                                value={block.data?.description || ""}
                                onChange={(e) => handleUpdateBlockData(block.id, "description", e.target.value)}
                                placeholder="Rich, creamy North Indian curry with fresh paneer & tomatoes..."
                                className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Prep Time</label>
                                <Input
                                  value={block.data?.prepTime || "20 mins"}
                                  onChange={(e) => handleUpdateBlockData(block.id, "prepTime", e.target.value)}
                                  placeholder="20 mins"
                                  className="bg-slate-950 border-slate-800 text-white font-bold"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Difficulty</label>
                                <select
                                  value={block.data?.difficulty || "Easy"}
                                  onChange={(e) => handleUpdateBlockData(block.id, "difficulty", e.target.value)}
                                  className="w-full h-10 px-3 rounded-lg border border-slate-800 bg-slate-950 text-white font-bold text-sm"
                                >
                                  <option value="Easy">Easy</option>
                                  <option value="Medium">Medium</option>
                                  <option value="Hard">Hard</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Servings</label>
                                <Input
                                  type="number"
                                  value={block.data?.servings || 3}
                                  onChange={(e) => handleUpdateBlockData(block.id, "servings", parseInt(e.target.value, 10))}
                                  className="bg-slate-950 border-slate-800 text-white font-bold"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* SPACER EDIT FIELDS */}
                        {block.type === "spacer" && (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-slate-200">Spacer Height</label>
                              <span className="font-mono text-xs font-extrabold text-white bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
                                {block.data?.height || 24}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min="8"
                              max="64"
                              step="4"
                              value={block.data?.height || 24}
                              onChange={(e) => handleUpdateBlockData(block.id, "height", parseInt(e.target.value, 10))}
                              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                          </div>
                        )}

                        {/* SUPER STORE SHOWCASE EDIT FIELDS */}
                        {block.type === "super_store_showcase" && (
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Title</label>
                                <Input
                                  value={block.data?.title || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "title", e.target.value)}
                                  placeholder="Super Store"
                                  className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-200 block mb-1">Subtitle</label>
                                <Input
                                  value={block.data?.subtitle || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "subtitle", e.target.value)}
                                  placeholder="Beyond groceries"
                                  className="bg-slate-950 border-slate-800 text-white font-bold placeholder:text-slate-500 focus:border-primary"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                🧩 Category Cards (3×2 Grid)
                              </label>
                              {(block.data?.items || []).map((item: any, idx: number) => (
                                <div key={idx} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white">{item.icon || "📦"} Card #{idx + 1}</span>
                                    <div className="flex gap-1">
                                      {item.isDeal && <Badge variant="outline" className="text-emerald-400 border-emerald-600 text-[10px]">DEAL</Badge>}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const items = [...(block.data?.items || [])];
                                          items.splice(idx, 1);
                                          handleUpdateBlockData(block.id, "items", items);
                                        }}
                                        className="p-1 hover:bg-red-900/50 rounded text-red-400"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <Input
                                      value={item.name || ""}
                                      onChange={(e) => {
                                        const items = [...(block.data?.items || [])];
                                        items[idx] = { ...items[idx], name: e.target.value };
                                        handleUpdateBlockData(block.id, "items", items);
                                      }}
                                      placeholder="Name"
                                      className="bg-slate-950 border-slate-800 text-white text-xs font-bold"
                                    />
                                    <Input
                                      value={item.icon || ""}
                                      onChange={(e) => {
                                        const items = [...(block.data?.items || [])];
                                        items[idx] = { ...items[idx], icon: e.target.value };
                                        handleUpdateBlockData(block.id, "items", items);
                                      }}
                                      placeholder="Emoji 🎧"
                                      className="bg-slate-950 border-slate-800 text-white text-xs font-bold"
                                    />
                                    <Input
                                      value={item.slug || ""}
                                      onChange={(e) => {
                                        const items = [...(block.data?.items || [])];
                                        items[idx] = { ...items[idx], slug: e.target.value };
                                        handleUpdateBlockData(block.id, "items", items);
                                      }}
                                      placeholder="slug"
                                      className="bg-slate-950 border-slate-800 text-white text-xs font-mono"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input
                                      value={item.image || ""}
                                      onChange={(e) => {
                                        const items = [...(block.data?.items || [])];
                                        items[idx] = { ...items[idx], image: e.target.value };
                                        handleUpdateBlockData(block.id, "items", items);
                                      }}
                                      placeholder="Image URL"
                                      className="bg-slate-950 border-slate-800 text-white text-xs font-bold"
                                    />
                                    <div className="flex gap-2">
                                      <Input
                                        value={item.color || ""}
                                        onChange={(e) => {
                                          const items = [...(block.data?.items || [])];
                                          items[idx] = { ...items[idx], color: e.target.value };
                                          handleUpdateBlockData(block.id, "items", items);
                                        }}
                                        placeholder="0xFFD97706"
                                        className="bg-slate-950 border-slate-800 text-white text-xs font-mono flex-1"
                                      />
                                      <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={item.isDeal || false}
                                          onChange={(e) => {
                                            const items = [...(block.data?.items || [])];
                                            items[idx] = { ...items[idx], isDeal: e.target.checked };
                                            handleUpdateBlockData(block.id, "items", items);
                                          }}
                                          className="accent-emerald-500"
                                        />
                                        Deal
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full bg-slate-900 border-slate-700 text-white font-bold text-xs"
                                onClick={() => {
                                  const items = [...(block.data?.items || []), { name: "New Category", color: "0xFF6366F1", icon: "📦", image: "", slug: "new-category" }];
                                  handleUpdateBlockData(block.id, "items", items);
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" /> Add Category Card
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Mobile/Web Render Preview (Synced with DB) */}
        <div className="lg:col-span-5 bg-slate-900/90 text-white p-5 rounded-2xl border border-slate-800 flex flex-col space-y-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">Live SDUI Preview (DB Synced)</h3>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold font-mono text-slate-300 border-slate-700">
              Page: {selectedPage}
            </Badge>
          </div>

          {/* Phone Frame Simulator */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-3 space-y-3 overflow-y-auto max-h-[650px] shadow-2xl">
            {blocks.filter((b) => b.isActive).length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No active blocks to preview.
              </div>
            ) : (
              blocks
                .filter((b) => b.isActive)
                .map((block) => {
                  if (block.type === "hero_banner") {
                    const isVideo = block.data?.mediaType === "video" && block.data?.videoUrl;
                    const heightVal = block.data?.height ? `${block.data.height}px` : "160px";

                    return (
                      <div
                        key={block.id}
                        className="relative rounded-2xl overflow-hidden bg-slate-900 flex flex-col justify-end p-4 border border-slate-700/50 shadow-md group"
                        style={{
                          height: heightVal,
                          backgroundImage: !isVideo
                            ? `linear-gradient(to top, rgba(0,0,0,0.88), rgba(0,0,0,0.1)), url(${
                                block.data?.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80"
                              })`
                            : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      >
                        {isVideo && (
                          <>
                            <video
                              src={block.data.videoUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                          </>
                        )}

                        <div className="relative z-10 space-y-1">
                          {block.data?.mediaType === "video" && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500 text-black uppercase tracking-wider mb-1">
                              🎥 Video Banner
                            </span>
                          )}
                          <h4 className="font-extrabold text-white text-sm line-clamp-1 drop-shadow">
                            {block.data?.title || "Hero Banner Title"}
                          </h4>
                          <p className="text-[11px] text-slate-200 line-clamp-1 drop-shadow opacity-90">
                            {block.data?.subtitle || "Hero banner subtitle..."}
                          </p>
                          <div className="pt-1 flex items-center justify-between">
                            <span className="bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
                              {block.data?.buttonText || "Shop Now"}
                            </span>
                            {block.data?.link && (
                              <span className="text-[9px] font-mono text-slate-300 bg-black/50 px-1.5 py-0.5 rounded">
                                {block.data.link}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (block.type === "category_grid") {
                    const cols = block.data?.columns || 4;
                    const itemsToRender = realCategories.length > 0
                      ? realCategories.slice(0, cols * 2)
                      : [
                          { name: "Dairy", emoji: "🥛" },
                          { name: "Fruits", emoji: "🍎" },
                          { name: "Snacks", emoji: "🍿" },
                          { name: "Veggies", emoji: "🥦" },
                        ];

                    return (
                      <div key={block.id} className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="text-xs font-bold text-white">
                            {block.data?.title || "Categories"}
                          </div>
                          <span className="text-[9px] text-emerald-400 font-bold font-mono">
                            {realCategories.length} DB Cats
                          </span>
                        </div>
                        <div
                          className="grid gap-2"
                          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                        >
                          {itemsToRender.map((cat, i) => (
                            <div
                              key={cat.id || i}
                              className="bg-slate-800/80 p-2 rounded-xl text-center text-[10px] font-medium text-slate-300 border border-slate-700/40 truncate"
                            >
                              <div className="w-6 h-6 bg-primary/20 rounded-full mx-auto mb-1 flex items-center justify-center text-primary text-xs">
                                {cat.emoji || "🛍️"}
                              </div>
                              <span className="truncate block font-bold">{cat.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (block.type === "product_carousel") {
                    const sourceType = block.data?.sourceType || "category";
                    const pIds: string[] = Array.isArray(block.data?.productIds) ? block.data.productIds : [];
                    const shopId = block.data?.shopId;
                    const catSlug = block.data?.categorySlug;

                    let itemsToRender: any[] = [];
                    let modeBadge = "DB Items";

                    if (sourceType === "custom" && pIds.length > 0) {
                      itemsToRender = pIds
                        .map((id) => realProducts.find((p) => String(p.id || p._id) === String(id)))
                        .filter(Boolean);
                      modeBadge = `⭐ ${itemsToRender.length} Curated`;
                    } else if (sourceType === "shop" && shopId) {
                      itemsToRender = realProducts.filter((p) => String(p.shopId || "") === String(shopId));
                      const activeShopObj = realShops.find((s) => String(s.id || s._id) === String(shopId));
                      modeBadge = `🏪 ${block.data?.shopName || getShopDisplayName(activeShopObj) || "Shop"}`;
                    } else if (catSlug && realProducts.length > 0) {
                      itemsToRender = realProducts.filter((p) => String(p.category || "").toLowerCase() === String(catSlug).toLowerCase());
                      modeBadge = `📦 ${catSlug}`;
                    } else {
                      itemsToRender = realProducts.slice(0, 6);
                    }

                    if (itemsToRender.length > (block.data?.limit || 10)) {
                      itemsToRender = itemsToRender.slice(0, block.data?.limit || 10);
                    }

                    return (
                      <div key={block.id} className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white line-clamp-1">
                            {block.data?.title || "Trending Products"}
                          </span>
                          <span className="text-[9px] text-emerald-400 font-bold font-mono shrink-0">
                            {modeBadge}
                          </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {itemsToRender.length === 0 ? (
                            <div className="text-[10px] text-slate-500 p-2">
                              {sourceType === "shop" ? "No products found for this shop" : "No products found"}
                            </div>
                          ) : (
                            itemsToRender.map((prod) => {
                              const img = Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : prod.image;
                              const shopObj = realShops.find((s) => (s.id || s._id) === prod.shopId);
                              return (
                                <div
                                  key={prod.id || prod._id}
                                  className="min-w-[110px] max-w-[110px] bg-slate-800 p-2 rounded-xl border border-slate-700/50 space-y-1 shrink-0 relative"
                                >
                                  {prod.fomoTag && (
                                    <span className="absolute top-1 left-1 bg-red-600 text-white text-[8px] font-extrabold px-1 rounded z-10 shadow">
                                      {prod.fomoTag}
                                    </span>
                                  )}
                                  {img ? (
                                    <img
                                      src={img}
                                      alt={prod.name}
                                      className="w-full h-12 object-cover rounded-lg bg-slate-900"
                                    />
                                  ) : (
                                    <div className="w-full h-12 bg-slate-700/50 rounded-lg flex items-center justify-center text-xs">
                                      📦
                                    </div>
                                  )}
                                  <div className="text-[10px] font-bold text-white truncate" title={prod.name}>
                                    {prod.name}
                                  </div>
                                  <div className="text-[10px] text-emerald-400 font-bold">
                                    ₹{prod.discountedPrice || prod.price || 49}
                                  </div>
                                  {shopObj && (
                                    <div className="text-[8px] text-slate-400 truncate">
                                      🏪 {getShopDisplayName(shopObj)}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (block.type === "promotional_strip") {
                    return (
                      <div
                        key={block.id}
                        className="p-3 rounded-2xl text-white flex items-center justify-between shadow-lg"
                        style={{ backgroundColor: block.data?.backgroundColor || "#E23744" }}
                      >
                        <div>
                          <div className="text-xs font-bold">
                            {block.data?.title || "Promo Title"}
                          </div>
                          <div className="text-[10px] opacity-90">
                            {block.data?.subtitle || "Promo subtitle..."}
                          </div>
                        </div>
                        <span className="bg-white/20 px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap">
                          {block.data?.buttonText || "View"}
                        </span>
                      </div>
                    );
                  }

                  if (block.type === "daily_regulars") {
                    const items = block.data?.items || [];
                    return (
                      <div key={block.id} className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white">
                            {block.data?.title || "Your Daily Regulars 🥛"}
                          </span>
                          <span className="text-[9px] bg-primary/20 text-primary font-extrabold px-2 py-0.5 rounded-full border border-primary/30">
                            {block.data?.badgeText || "1-TAP REORDER"}
                          </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {items.map((item: any, idx: number) => (
                            <div key={item.id || idx} className="min-w-[120px] bg-slate-800 p-2 rounded-xl border border-slate-700/50 space-y-1.5 shrink-0">
                              <img src={item.image || "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500"} alt={item.name} className="w-full h-12 object-cover rounded-lg bg-slate-900" />
                              <div className="text-[10px] font-bold text-white truncate">{item.name}</div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-emerald-400 font-bold">₹{item.price}</span>
                                <span className="bg-primary text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">Reorder</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (block.type === "weather_cravings") {
                    const items = block.data?.items || [];
                    return (
                      <div key={block.id} className="bg-slate-900 p-3 rounded-2xl border border-amber-500/30 space-y-2 relative overflow-hidden">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white flex items-center gap-1">
                            <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                            {block.data?.title || "Rainy Day Cravings ☕"}
                          </span>
                          <span className="text-[9px] bg-sky-500/20 text-sky-300 font-extrabold px-2 py-0.5 rounded-full border border-sky-500/30">
                            {block.data?.badgeText || "🌧️ Rain Special"}
                          </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {items.map((item: any, idx: number) => (
                            <div key={item.id || idx} className="min-w-[120px] bg-slate-800 p-2 rounded-xl border border-slate-700/50 space-y-1 shrink-0">
                              <img src={item.image || "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500"} alt={item.name} className="w-full h-12 object-cover rounded-lg bg-slate-900" />
                              <div className="text-[10px] font-bold text-white truncate">{item.name}</div>
                              <div className="text-[10px] text-amber-400 font-bold">₹{item.price}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (block.type === "shoppable_recipe") {
                    const recipe = block.data || {};
                    const ingredients = recipe.ingredients || [];
                    return (
                      <div key={block.id} className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2">
                        <div className="relative h-24 rounded-xl overflow-hidden bg-slate-800 flex items-end p-2 border border-slate-700/50" style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.85), transparent), url(${recipe.imageUrl || "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800"})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                          <div>
                            <span className="text-[9px] bg-amber-500/80 text-black font-extrabold px-1.5 py-0.5 rounded">SHOPPABLE RECIPE</span>
                            <div className="text-xs font-bold text-white mt-1 line-clamp-1">{recipe.recipeName || "Butter Paneer Masala"}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-1">
                          <span>⏱️ {recipe.prepTime || "20 mins"}</span>
                          <span>📊 {recipe.difficulty || "Easy"}</span>
                          <span>👥 {recipe.servings || 3} Servings</span>
                        </div>
                        <button className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg shadow flex items-center justify-center gap-1">
                          <ShoppingBag className="w-3 h-3" />
                          <span>Buy All {ingredients.length || 2} Ingredients in 1-Tap</span>
                        </button>
                      </div>
                    );
                  }

                  if (block.type === "spacer") {
                    return (
                      <div
                        key={block.id}
                        className="w-full border-t border-dashed border-slate-800 flex items-center justify-center text-[10px] font-mono text-slate-600"
                        style={{ height: `${block.data?.height || 24}px` }}
                      >
                        Spacer ({block.data?.height || 24}px)
                      </div>
                    );
                  }

                  if (block.type === "super_store_showcase") {
                    const items = block.data?.items || [];
                    return (
                      <div key={block.id} className="mx-3 my-2 p-3 rounded-2xl bg-gradient-to-br from-[#1a1035] to-[#2d1b69] border border-purple-800/50 shadow-lg shadow-purple-900/30">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-[11px] font-extrabold text-white">{block.data?.title || "Super Store"}</p>
                            <p className="text-[8px] text-purple-300">{block.data?.subtitle || "Beyond groceries"}</p>
                          </div>
                          <span className="text-[8px] text-purple-400 font-bold">See All →</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {items.slice(0, 6).map((cat: any, i: number) => {
                            let bgColor = '#6366F1';
                            try {
                              if (cat.color?.startsWith('0x')) bgColor = '#' + cat.color.slice(4);
                              else if (cat.color?.startsWith('#')) bgColor = cat.color;
                            } catch {}
                            return cat.isDeal ? (
                              <div key={i} className="rounded-lg p-1.5 flex flex-col items-center justify-center text-center" style={{ backgroundColor: bgColor + '22', border: `1px solid ${bgColor}44` }}>
                                <span className="text-sm">{cat.icon || '🏷️'}</span>
                                <span className="text-[7px] font-extrabold text-emerald-300 mt-0.5">{cat.name}</span>
                                <span className="text-[6px] text-emerald-400/70">UP TO 80% OFF</span>
                              </div>
                            ) : (
                              <div key={i} className="rounded-lg overflow-hidden relative" style={{ height: 48 }}>
                                {cat.image && <img src={cat.image} alt={cat.name} className="absolute inset-0 w-full h-full object-cover opacity-60" />}
                                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: bgColor + '88' }}>
                                  <span className="text-xs">{cat.icon}</span>
                                  <span className="text-[7px] font-extrabold text-white drop-shadow">{cat.name}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
