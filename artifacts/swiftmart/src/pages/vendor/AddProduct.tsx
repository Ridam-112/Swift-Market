import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, X, Loader2, ChevronDown, Plus, Palette, Ruler } from "lucide-react";
import { api } from "@/lib/api";
import { compressIfNeeded } from "@/lib/imageCompression";

interface ApiCategory {
  _id: string;
  name: string;
  slug: string;
  emoji?: string;
  subcategories?: string[];
  isActive: boolean;
}

const MAX_IMAGES = 4;
const PRESET_COLORS = ["Red", "Blue", "Green", "Yellow", "Black", "White", "Pink", "Purple", "Orange", "Navy", "Gray", "Brown"];
const PRESET_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"];

const COLOR_HEX: Record<string, string> = {
  Red: "#ef4444", Blue: "#3b82f6", Green: "#22c55e", Yellow: "#eab308",
  Black: "#1a1a1a", White: "#f3f4f6", Pink: "#ec4899", Purple: "#a855f7",
  Orange: "#f97316", Navy: "#1e3a5f", Gray: "#6b7280", Grey: "#6b7280",
  Brown: "#92400e", Maroon: "#800000",
};

async function uploadImageFile(file: File): Promise<string> {
  const compressed = await compressIfNeeded(file);
  const formData = new FormData();
  formData.append("image", compressed);
  const token = localStorage.getItem("sm_at");
  const res = await fetch("/api/upload/product-image", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json() as { success: boolean; imageUrl?: string; message?: string };
  if (data.success && data.imageUrl) return data.imageUrl;
  throw new Error(data.message ?? "Upload failed");
}

import { SEO } from "@/components/SEO";

export default function AddProduct() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [shopId, setShopId] = useState<string>("");
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);

  useEffect(() => {
    if (!user) return;
    api.get<{ success: boolean; shops: { _id: string }[] }>(`/shops?ownerId=${user.id}`)
      .then(d => { if (d.shops[0]) setShopId(d.shops[0]._id); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    api.get<{ success: boolean; categories: ApiCategory[] }>("/categories")
      .then(d => setApiCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [price, setPrice] = useState("");
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [images, setImages] = useState<string[]>([]);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);

  const [colorsEnabled, setColorsEnabled] = useState(false);
  const [colors, setColors] = useState<string[]>([]);
  const [slotColors, setSlotColors] = useState<Record<number, string>>({});
  const [newColor, setNewColor] = useState("");

  const [sizesEnabled, setSizesEnabled] = useState(false);
  const [sizes, setSizes] = useState<string[]>([]);
  const [newSize, setNewSize] = useState("");

  const selectedCat = apiCategories.find(c => c.slug === category);

  const colorImages: Record<string, string> = Object.fromEntries(
    Object.entries(slotColors)
      .filter(([slot, color]) => color && images[Number(slot)])
      .map(([slot, color]) => [color, images[Number(slot)]])
  );

  const handleImageUpload = async (file: File, slot: number) => {
    const blobUrl = URL.createObjectURL(file);
    setImages(prev => {
      const next = [...prev];
      while (next.length <= slot) next.push("");
      next[slot] = blobUrl;
      return next;
    });
    setUploadingSlot(slot);
    try {
      const url = await uploadImageFile(file);
      URL.revokeObjectURL(blobUrl);
      setImages(prev => {
        const next = [...prev];
        next[slot] = url;
        return next;
      });
    } catch (err) {
      URL.revokeObjectURL(blobUrl);
      setImages(prev => {
        const next = [...prev];
        next[slot] = "";
        return next;
      });
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingSlot(null);
    }
  };

  const removeImage = (slot: number) => {
    setImages(prev => {
      const next = [...prev];
      next[slot] = "";
      return next;
    });
    setSlotColors(prev => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  };

  const addColor = (color: string) => {
    const trimmed = color.trim();
    if (!trimmed || colors.includes(trimmed)) return;
    setColors(prev => [...prev, trimmed]);
    setNewColor("");
  };

  const removeColor = (color: string) => {
    setColors(prev => prev.filter(c => c !== color));
    setSlotColors(prev => {
      const next = { ...prev };
      Object.entries(next).forEach(([k, v]) => { if (v === color) delete next[Number(k)]; });
      return next;
    });
  };

  const toggleSize = (size: string) => {
    setSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  };

  const addCustomSize = () => {
    const trimmed = newSize.trim();
    if (!trimmed || sizes.includes(trimmed)) return;
    setSizes(prev => [...prev, trimmed]);
    setNewSize("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingSlot !== null) { toast.error("Please wait for image upload to finish"); return; }
    const validImages = images.filter(Boolean);
    if (!name || !category || !price || !unit || !stock || validImages.length === 0) {
      toast.error("Please fill all required fields and upload at least one image");
      return;
    }
    if (discountedPrice && Number(discountedPrice) > 0 && Number(discountedPrice) >= Number(price)) {
      toast.error("Sale price must be less than MRP");
      return;
    }
    if (!shopId) { toast.error("Could not find your shop. Please refresh and try again."); return; }

    setSaving(true);
    try {
      await api.post("/products", {
        name: name.trim(),
        category,
        subcategory: subcategory || undefined,
        price: Number(price),
        ...(discountedPrice ? { discountedPrice: Number(discountedPrice) } : {}),
        unit: unit.trim(),
        stock: Number(stock),
        description: description.trim(),
        images: validImages,
        shopId,
        ...(colorsEnabled && colors.length > 0 ? { colors } : {}),
        ...(colorsEnabled && Object.keys(colorImages).length > 0 ? { colorImages } : {}),
        ...(sizesEnabled && sizes.length > 0 ? { sizes } : {}),
      });
      toast.success("Product submitted for review. It will go live once approved.");
      setLocation("/vendor/products");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const filledSlots = images.filter(Boolean).length;
  const canAddMore = filledSlots < MAX_IMAGES && uploadingSlot === null;

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto space-y-6">
      <SEO noIndex />
      <SectionHeader title="Add New Product" />

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Photos ── */}
        <div className="bg-card p-5 rounded-3xl neu-card space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Photos* <span className="text-xs font-normal text-muted-foreground">(up to 4)</span></Label>
            <span className="text-xs text-muted-foreground">{filledSlots}/{MAX_IMAGES}</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map(slot => {
              const img = images[slot];
              const isUploading = uploadingSlot === slot;
              const isEmpty = !img;
              const isFirst = slot === 0;
              const linkedColor = colorsEnabled ? slotColors[slot] : undefined;

              return (
                <div key={slot} className="space-y-1">
                  <div className={`relative aspect-square rounded-xl overflow-hidden border-2 border-dashed transition-colors
                    ${isEmpty ? "border-border bg-background" : "border-transparent"}`}>
                    {img ? (
                      <>
                        <img src={img} alt={`Photo ${slot + 1}`} className="w-full h-full object-cover" />
                        {isUploading && (
                          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          </div>
                        )}
                        {!isUploading && (
                          <button
                            type="button"
                            onClick={() => removeImage(slot)}
                            className="absolute top-1 right-1 p-1 bg-background/90 rounded-full text-destructive shadow"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                        {isFirst && (
                          <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground text-[9px] text-center py-0.5 font-semibold">
                            MAIN
                          </div>
                        )}
                      </>
                    ) : (
                      <label className={`flex flex-col items-center justify-center w-full h-full cursor-pointer text-muted-foreground hover:text-primary transition-colors
                        ${!canAddMore && !img ? "opacity-30 cursor-not-allowed pointer-events-none" : ""}`}>
                        <Upload className="w-5 h-5 mb-1" />
                        <span className="text-[10px]">Add</span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp"
                          className="hidden"
                          disabled={!canAddMore}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, slot);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Color tag per photo (when color variants are on) */}
                  {colorsEnabled && img && !isUploading && (
                    <div className="relative">
                      <select
                        value={linkedColor ?? ""}
                        onChange={e => setSlotColors(prev => ({ ...prev, [slot]: e.target.value }))}
                        className="w-full h-6 px-1 text-[10px] rounded-md bg-background neu-inset border-none focus:outline-none appearance-none text-foreground"
                      >
                        <option value="">No color</option>
                        {colors.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-muted-foreground pointer-events-none" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">JPG, PNG, WEBP · Max 5MB each · First photo is the main display image</p>
        </div>

        {/* ── Basic Info ── */}
        <div className="bg-card p-5 rounded-3xl neu-card space-y-4">
          <Label className="text-base font-semibold">Product Details</Label>

          <div className="space-y-2">
            <Label htmlFor="name">Product Name*</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)}
              className="bg-background neu-inset border-none" placeholder="e.g. Cotton T-Shirt" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category*</Label>
              <div className="relative">
                <select id="category" value={category}
                  onChange={e => { setCategory(e.target.value); setSubcategory(""); }}
                  className="w-full h-10 px-3 py-2 pr-9 rounded-md bg-background neu-inset border-none text-sm focus:outline-none appearance-none text-foreground" required>
                  <option value="" disabled>Select</option>
                  {apiCategories.map(c => (
                    <option key={c._id} value={c.slug}>{c.emoji ?? ""} {c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">MRP / Real Price (₹)*</Label>
              <Input id="price" type="number" min="0" step="1" value={price} onChange={e => setPrice(e.target.value)}
                className="bg-background neu-inset border-none" placeholder="0" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discountedPrice">
                Sale Price (₹)
                <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="discountedPrice"
                type="number"
                min="0"
                step="1"
                value={discountedPrice}
                onChange={e => setDiscountedPrice(e.target.value)}
                className="bg-background neu-inset border-none"
                placeholder="Leave blank if no discount"
              />
            </div>
            {discountedPrice && Number(discountedPrice) > 0 && Number(price) > 0 && Number(discountedPrice) < Number(price) && (
              <div className="space-y-2">
                <Label className="invisible">Discount</Label>
                <div className="h-10 flex items-center px-3 rounded-md bg-green-500/10 text-green-600 text-sm font-semibold">
                  {Math.round((1 - Number(discountedPrice) / Number(price)) * 100)}% off
                </div>
              </div>
            )}
          </div>

          {selectedCat && (selectedCat.subcategories?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <div className="relative">
                <select id="subcategory" value={subcategory} onChange={e => setSubcategory(e.target.value)}
                  className="w-full h-10 px-3 py-2 pr-9 rounded-md bg-background neu-inset border-none text-sm focus:outline-none appearance-none text-foreground">
                  <option value="">None / General</option>
                  {selectedCat.subcategories!.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit*</Label>
              <Input id="unit" value={unit} onChange={e => setUnit(e.target.value)}
                className="bg-background neu-inset border-none" placeholder="e.g. 1 kg, 1 piece" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock*</Label>
              <Input id="stock" type="number" min="0" step="1" value={stock} onChange={e => setStock(e.target.value)}
                className="bg-background neu-inset border-none" placeholder="0" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)}
              className="bg-background neu-inset border-none min-h-[90px] resize-none" placeholder="Product details..." />
          </div>
        </div>

        {/* ── Color Variants ── */}
        <div className="bg-card p-5 rounded-3xl neu-card space-y-4">
          <button
            type="button"
            onClick={() => setColorsEnabled(v => !v)}
            className="w-full flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${colorsEnabled ? "bg-primary text-primary-foreground" : "bg-background neu-inset text-muted-foreground"}`}>
                <Palette className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Color Variants</p>
                <p className="text-xs text-muted-foreground">Does this product come in different colors?</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors relative ${colorsEnabled ? "bg-primary" : "bg-muted"}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${colorsEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </div>
          </button>

          {colorsEnabled && (
            <div className="space-y-3 pt-1 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Tap to add preset colors</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => {
                    const active = colors.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => active ? removeColor(c) : addColor(c)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                          ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/50"}`}
                      >
                        <span className="w-3 h-3 rounded-full border border-border/50 flex-shrink-0"
                          style={{ backgroundColor: COLOR_HEX[c] ?? "#888" }} />
                        {c}
                        {active && <X className="w-3 h-3 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addColor(newColor); } }}
                  className="bg-background neu-inset border-none text-sm"
                  placeholder="Custom color name…"
                />
                <Button type="button" size="sm" variant="outline" onClick={() => addColor(newColor)} className="rounded-xl shadow-none shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {colors.length > 0 && images.filter(Boolean).length > 1 && (
                <p className="text-xs text-primary font-medium">
                  Tip: tag each photo above with a color so customers see the right image when they pick a color.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Size Variants ── */}
        <div className="bg-card p-5 rounded-3xl neu-card space-y-4">
          <button
            type="button"
            onClick={() => setSizesEnabled(v => !v)}
            className="w-full flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${sizesEnabled ? "bg-primary text-primary-foreground" : "bg-background neu-inset text-muted-foreground"}`}>
                <Ruler className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Size Variants</p>
                <p className="text-xs text-muted-foreground">Does this product come in different sizes?</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors relative ${sizesEnabled ? "bg-primary" : "bg-muted"}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${sizesEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </div>
          </button>

          {sizesEnabled && (
            <div className="space-y-3 pt-1 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Tap to select sizes</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_SIZES.map(s => {
                    const active = sizes.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSize(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border
                          ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/50"}`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  value={newSize}
                  onChange={e => setNewSize(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomSize(); } }}
                  className="bg-background neu-inset border-none text-sm"
                  placeholder="Custom size (e.g. 32, 10.5)…"
                />
                <Button type="button" size="sm" variant="outline" onClick={addCustomSize} className="rounded-xl shadow-none shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {sizes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sizes.map(s => (
                    <span key={s} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/30">
                      {s}
                      <button type="button" onClick={() => setSizes(prev => prev.filter(x => x !== s))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1 rounded-xl shadow-none" onClick={() => setLocation("/vendor/products")} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" className="flex-[2] rounded-xl shadow-none neu-card" disabled={uploadingSlot !== null || saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> :
             uploadingSlot !== null ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</> :
             "Save Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
