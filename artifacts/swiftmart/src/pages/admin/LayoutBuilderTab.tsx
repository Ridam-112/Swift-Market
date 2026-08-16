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
} from "lucide-react";

export type BlockType =
  | "hero_banner"
  | "category_grid"
  | "product_carousel"
  | "promotional_strip"
  | "spacer";

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
    type: "spacer",
    label: "Spacer",
    description: "Vertical empty space for layout padding",
    icon: SlidersHorizontal,
  },
];

export function LayoutBuilderTab() {
  const [selectedPage, setSelectedPage] = useState("home");
  const [blocks, setBlocks] = useState<LayoutBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const sanitized = blocks.map((b, idx) => ({ ...b, sortOrder: idx + 1 }));
      const res = await api.put<{ success: boolean; message?: string }>(`/admin/layout/${selectedPage}`, {
        blocks: sanitized,
      });
      if (res.success) {
        toast.success(res.message || `Layout for '${selectedPage}' saved successfully!`);
        fetchLayout(selectedPage);
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
    const newBlock: LayoutBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      sortOrder: blocks.length + 1,
      isActive: true,
      data: getDefaultDataForType(type),
    };
    const updated = [...blocks, newBlock];
    setBlocks(updated);
    setExpandedBlockId(newBlock.id);
    toast.info(`Added new ${type.replace("_", " ")} block`);
  };

  const getDefaultDataForType = (type: BlockType): Record<string, any> => {
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
        };
      case "product_carousel":
        return {
          title: "Popular Items",
          categorySlug: "dairy",
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

  const handleImageFileUpload = async (id: string, file: File) => {
    setUploadingBlockId(id);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Access auth token
      const access = localStorage.getItem("sm_at");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        handleUpdateBlockData(id, "imageUrl", data.url);
        toast.success("Image uploaded successfully!");
      } else {
        toast.error(data.message || "Failed to upload image");
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      toast.error("Failed to upload image");
    } finally {
      setUploadingBlockId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-gray-900">SDUI Layout Engine — Page Builder</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Build, order and arrange dynamic UI blocks served live to mobile & web clients.
          </p>
        </div>

        {/* Page Selector & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {PAGE_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <Button variant="outline" onClick={() => fetchLayout(selectedPage)} disabled={saving}>
            <RefreshCw className="w-4 h-4 mr-2" /> Reset
          </Button>

          <Button onClick={handleSave} disabled={saving} className="bg-primary text-white hover:opacity-95">
            {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Layout
          </Button>
        </div>
      </div>

      {/* Add New Block Banner */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Add New SDUI Block
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {BLOCK_TYPES_META.map((meta) => {
            const Icon = meta.icon;
            return (
              <button
                key={meta.type}
                onClick={() => handleAddBlock(meta.type)}
                className="flex flex-col items-start p-3 rounded-xl border border-gray-100 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-primary/10 text-gray-700 group-hover:text-primary mb-2 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-gray-900 group-hover:text-primary">
                  {meta.label}
                </span>
                <span className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">
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
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-gray-700" />
              Page Blocks ({blocks.length})
            </h3>
            <span className="text-xs text-gray-400 font-medium">Drag or use arrows to reorder</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[250px] bg-white rounded-2xl border border-gray-100">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mb-2" />
              <p className="text-sm text-gray-500 font-medium">Loading layout blocks...</p>
            </div>
          ) : blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[250px] bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
              <LayoutGrid className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm font-bold text-gray-700">No blocks configured for '{selectedPage}'</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
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
                    className={`bg-white rounded-2xl border transition-all ${
                      isExpanded ? "border-primary shadow-md" : "border-gray-100 hover:border-gray-200 shadow-sm"
                    } ${!block.isActive ? "opacity-60 bg-gray-50/80" : ""}`}
                  >
                    {/* Block Header / Action Bar */}
                    <div className="p-4 flex items-center justify-between gap-3 border-b border-gray-100">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-600 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>

                        <div className="p-2 rounded-lg bg-gray-50 text-gray-700 shrink-0">
                          <BlockIcon className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900 truncate">
                              {block.data?.title || meta?.label || block.type}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase tracking-wider font-mono text-gray-500"
                            >
                              {block.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {block.data?.subtitle || block.data?.categorySlug || `Sort order: ${index + 1}`}
                          </p>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Up / Down Reorder */}
                        <button
                          onClick={() => handleMoveBlock(index, "up")}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-30"
                          title="Move Up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveBlock(index, "down")}
                          disabled={index === blocks.length - 1}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-30"
                          title="Move Down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>

                        {/* Toggle Active */}
                        <button
                          onClick={() => handleToggleActive(block.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            block.isActive ? "text-emerald-600 hover:bg-emerald-50" : "text-gray-400 hover:bg-gray-100"
                          }`}
                          title={block.isActive ? "Deactivate Block" : "Activate Block"}
                        >
                          {block.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        {/* Expand / Collapse */}
                        <button
                          onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteBlock(block.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove Block"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Block Editor Panel (Expanded) */}
                    {isExpanded && (
                      <div className="p-4 bg-gray-50/50 space-y-4 rounded-b-2xl border-t border-gray-100">
                        {/* HERO BANNER EDIT FIELDS */}
                        {block.type === "hero_banner" && (
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">Banner Title</label>
                                <Input
                                  value={block.data?.title || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "title", e.target.value)}
                                  placeholder="e.g. 10-Minute Grocery Delivery"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">Subtitle</label>
                                <Input
                                  value={block.data?.subtitle || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "subtitle", e.target.value)}
                                  placeholder="e.g. Fresh veggies & fruits"
                                />
                              </div>
                            </div>

                            {/* Image URL & File Upload */}
                            <div>
                              <label className="text-xs font-semibold text-gray-700 block mb-1">Image URL</label>
                              <div className="flex gap-2">
                                <Input
                                  value={block.data?.imageUrl || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "imageUrl", e.target.value)}
                                  placeholder="https://..."
                                />
                                <label className="cursor-pointer shrink-0">
                                  <Button variant="outline" type="button" disabled={uploadingBlockId === block.id} className="pointer-events-none">
                                    {uploadingBlockId === block.id ? (
                                      <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                                    ) : (
                                      <Upload className="w-4 h-4 mr-1" />
                                    )}
                                    Upload
                                  </Button>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        handleImageFileUpload(block.id, e.target.files[0]);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">Action Link</label>
                                <Input
                                  value={block.data?.link || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "link", e.target.value)}
                                  placeholder="e.g. /shops or /category/dairy"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">Button Text</label>
                                <Input
                                  value={block.data?.buttonText || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "buttonText", e.target.value)}
                                  placeholder="e.g. Shop Now"
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
                                <label className="text-xs font-semibold text-gray-700 block mb-1">Section Title</label>
                                <Input
                                  value={block.data?.title || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "title", e.target.value)}
                                  placeholder="e.g. Top Categories"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">Columns</label>
                                <select
                                  value={block.data?.columns || 4}
                                  onChange={(e) => handleUpdateBlockData(block.id, "columns", parseInt(e.target.value, 10))}
                                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm"
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
                        {block.type === "product_carousel" && (
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">Section Title</label>
                                <Input
                                  value={block.data?.title || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "title", e.target.value)}
                                  placeholder="e.g. Trending Products"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">Category Slug</label>
                                <Input
                                  value={block.data?.categorySlug || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "categorySlug", e.target.value)}
                                  placeholder="e.g. dairy or snacks"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">Product Limit</label>
                                <Input
                                  type="number"
                                  min={2}
                                  max={20}
                                  value={block.data?.limit || 10}
                                  onChange={(e) => handleUpdateBlockData(block.id, "limit", parseInt(e.target.value, 10))}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* PROMOTIONAL STRIP EDIT FIELDS */}
                        {block.type === "promotional_strip" && (
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">Title</label>
                                <Input
                                  value={block.data?.title || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "title", e.target.value)}
                                  placeholder="e.g. ⚡ Flash Discount"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">Subtitle</label>
                                <Input
                                  value={block.data?.subtitle || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "subtitle", e.target.value)}
                                  placeholder="e.g. Flat ₹50 off"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">Background Color</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={block.data?.backgroundColor || "#E23744"}
                                    onChange={(e) => handleUpdateBlockData(block.id, "backgroundColor", e.target.value)}
                                    className="w-10 h-10 rounded-lg border border-gray-200 p-1 cursor-pointer"
                                  />
                                  <Input
                                    value={block.data?.backgroundColor || "#E23744"}
                                    onChange={(e) => handleUpdateBlockData(block.id, "backgroundColor", e.target.value)}
                                    placeholder="#E23744"
                                    className="font-mono text-xs uppercase"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">Action Link</label>
                                <Input
                                  value={block.data?.link || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "link", e.target.value)}
                                  placeholder="e.g. /categories"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">Button Text</label>
                                <Input
                                  value={block.data?.buttonText || ""}
                                  onChange={(e) => handleUpdateBlockData(block.id, "buttonText", e.target.value)}
                                  placeholder="e.g. Claim Now"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* SPACER EDIT FIELDS */}
                        {block.type === "spacer" && (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-semibold text-gray-700">Spacer Height</label>
                              <span className="font-mono text-xs font-bold text-gray-900 bg-gray-200 px-2 py-0.5 rounded">
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
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
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

        {/* Right Column: Live Mobile/Web Render Preview */}
        <div className="lg:col-span-5 bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">Live SDUI Render Preview</h3>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono text-slate-300 border-slate-700">
              Page: {selectedPage}
            </Badge>
          </div>

          {/* Phone Frame Simulator */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 space-y-3 overflow-y-auto max-h-[650px] shadow-2xl">
            {blocks.filter((b) => b.isActive).length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No active blocks to preview.
              </div>
            ) : (
              blocks
                .filter((b) => b.isActive)
                .map((block) => {
                  if (block.type === "hero_banner") {
                    return (
                      <div
                        key={block.id}
                        className="relative rounded-2xl overflow-hidden bg-slate-800 min-h-[140px] flex flex-col justify-end p-4 border border-slate-700/50"
                        style={{
                          backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.85), transparent), url(${
                            block.data?.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80"
                          })`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      >
                        <h4 className="font-bold text-white text-sm line-clamp-1">
                          {block.data?.title || "Hero Banner Title"}
                        </h4>
                        <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                          {block.data?.subtitle || "Hero banner subtitle..."}
                        </p>
                        <div className="mt-2 flex">
                          <span className="bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                            {block.data?.buttonText || "Shop Now"}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  if (block.type === "category_grid") {
                    const cols = block.data?.columns || 4;
                    return (
                      <div key={block.id} className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-2">
                        <div className="text-xs font-bold text-white">
                          {block.data?.title || "Categories"}
                        </div>
                        <div
                          className="grid gap-2"
                          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                        >
                          {["Milk", "Fruits", "Snacks", "Veggies", "Bakery", "Drinks"].slice(0, cols * 2).map((cat, i) => (
                            <div
                              key={i}
                              className="bg-slate-800/80 p-2 rounded-xl text-center text-[10px] font-medium text-slate-300 border border-slate-700/40"
                            >
                              <div className="w-5 h-5 bg-primary/20 rounded-full mx-auto mb-1 flex items-center justify-center text-primary text-[10px]">
                                🛍️
                              </div>
                              {cat}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (block.type === "product_carousel") {
                    return (
                      <div key={block.id} className="bg-slate-850 p-3 rounded-2xl border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white">
                            {block.data?.title || "Trending Products"}
                          </span>
                          <span className="text-[10px] text-primary font-bold">See all</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {[1, 2, 3].map((item) => (
                            <div
                              key={item}
                              className="min-w-[100px] bg-slate-800 p-2 rounded-xl border border-slate-700/50 space-y-1"
                            >
                              <div className="w-full h-12 bg-slate-700/50 rounded-lg flex items-center justify-center text-xs">
                                📦
                              </div>
                              <div className="text-[10px] font-bold text-white truncate">Item {item}</div>
                              <div className="text-[10px] text-emerald-400 font-bold">₹49</div>
                            </div>
                          ))}
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

                  return null;
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
