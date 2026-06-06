import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useProducts } from "@/hooks/useProducts";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Upload, X, Loader2, ChevronDown, AlertCircle, Clock } from "lucide-react";
import { api } from "@/lib/api";

interface ApiProduct {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  subcategory?: string;
  unit?: string;
  stock: number;
  images?: string[];
  image?: string;
}

interface ApiCategory {
  _id: string;
  name: string;
  slug: string;
  emoji?: string;
  subcategories?: string[];
  isActive: boolean;
}

export default function EditProduct() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const [, setLocation] = useLocation();
  const { refetch } = useProducts();

  const [loadingProduct, setLoadingProduct] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [stock, setStock] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);

  useEffect(() => {
    api.get<{ success: boolean; categories: ApiCategory[] }>("/categories")
      .then(d => setApiCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!productId) {
      setFetchError("No product ID provided.");
      setLoadingProduct(false);
      return;
    }
    setLoadingProduct(true);
    api.get<{ success: boolean; product: ApiProduct }>(`/products/${productId}`)
      .then(d => {
        const p = d.product;
        setName(p.name);
        setDescription(p.description ?? "");
        setCategory(p.category);
        setSubcategory(p.subcategory ?? "");
        setPrice(String(p.price));
        setUnit(p.unit ?? "");
        setStock(String(p.stock ?? 0));
        setImage(p.images?.[0] ?? p.image ?? null);
      })
      .catch(() => setFetchError("Could not load product. It may have been deleted."))
      .finally(() => setLoadingProduct(false));
  }, [productId]);

  const selectedCat = apiCategories.find(c => c.slug === category);

  // Bug #15 fix: revoke blob URL when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (image?.startsWith("blob:")) URL.revokeObjectURL(image);
    };
  }, [image]);

  // Bug #15 fix: warn user before leaving while upload is in progress
  useEffect(() => {
    if (!uploading) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [uploading]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setImage(preview);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const token = localStorage.getItem("sm_at");
      const res = await fetch("/api/upload/product-image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json() as { success: boolean; imageUrl?: string; message?: string };
      if (data.success && data.imageUrl) {
        URL.revokeObjectURL(preview);
        setImage(data.imageUrl);
      } else {
        toast.error(data.message ?? "Upload failed");
        URL.revokeObjectURL(preview);
        setImage(null);
      }
    } catch {
      toast.error("Image upload failed. Please try again.");
      URL.revokeObjectURL(preview);
      setImage(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) { toast.error("Please wait for the image upload to finish"); return; }
    if (!name.trim() || !category || !price || !unit || !stock) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!productId) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim(),
        category,
        price: Number(price),
        unit: unit.trim(),
        stock: Number(stock),
      };
      if (subcategory) payload["subcategory"] = subcategory;
      if (image) payload["images"] = [image];

      await api.patch(`/products/${productId}`, payload);

      refetch();
      toast.success("Product updated successfully");
      setLocation("/vendor/products");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save product";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="bg-card p-6 rounded-3xl neu-card space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto space-y-6">
        <SectionHeader title="Edit Product" />
        <div className="mt-6 flex flex-col items-center gap-3 p-8 bg-card rounded-2xl neu-inset text-center">
          <AlertCircle className="w-10 h-10 text-amber-500" />
          <p className="text-muted-foreground text-sm">{fetchError}</p>
          <Button variant="outline" onClick={() => setLocation("/vendor/products")} className="rounded-xl mt-2">
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto space-y-6">
      <SectionHeader title="Edit Product" />

      <div className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Saving changes will reset this product to <span className="font-semibold">Pending Review</span>. It won't be visible to customers until an admin approves it again.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card p-6 rounded-3xl neu-card space-y-6">
        <div className="space-y-2">
          <Label>Product Image</Label>
          <div className="relative h-40 rounded-2xl neu-inset bg-background flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
            {image ? (
              <>
                <img src={image} alt="Preview" className="h-full object-contain p-2" />
                {uploading && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                )}
                {!uploading && (
                  <>
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="absolute top-2 right-2 p-1.5 bg-background rounded-full neu-card text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <label className="absolute bottom-2 right-2 px-2 py-1 bg-background rounded-lg neu-card text-xs font-medium text-muted-foreground cursor-pointer hover:text-primary transition-colors">
                      Replace
                      <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleImageChange} />
                    </label>
                  </>
                )}
              </>
            ) : (
              <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full text-muted-foreground hover:text-primary transition-colors">
                <Upload className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Click to upload image</span>
                <span className="text-xs mt-1 opacity-60">JPG, PNG, WEBP · Max 5MB</span>
                <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Product Name*</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-background neu-inset border-none"
              placeholder="e.g. Fresh Tomatoes"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category*</Label>
              <div className="relative">
                <select
                  id="edit-category"
                  value={category}
                  onChange={e => { setCategory(e.target.value); setSubcategory(""); }}
                  className="w-full h-10 px-3 py-2 pr-9 rounded-md bg-background neu-inset border-none text-sm focus:outline-none appearance-none text-foreground"
                  required
                >
                  <option value="" disabled>Select category</option>
                  {apiCategories.map(c => (
                    <option key={c._id} value={c.slug}>{c.emoji ?? ""} {c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-price">Price (₹)*</Label>
              <Input
                id="edit-price"
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="bg-background neu-inset border-none"
                placeholder="0"
                required
              />
            </div>
          </div>

          {selectedCat && selectedCat.subcategories && selectedCat.subcategories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="edit-subcategory">
                Subcategory <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <div className="relative">
                <select
                  id="edit-subcategory"
                  value={subcategory}
                  onChange={e => setSubcategory(e.target.value)}
                  className="w-full h-10 px-3 py-2 pr-9 rounded-md bg-background neu-inset border-none text-sm focus:outline-none appearance-none text-foreground"
                >
                  <option value="">None / General</option>
                  {selectedCat.subcategories.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-unit">Unit*</Label>
              <Input
                id="edit-unit"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="bg-background neu-inset border-none"
                placeholder="e.g. 1 kg, 500 ml"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-stock">Stock Quantity*</Label>
              <Input
                id="edit-stock"
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={e => setStock(e.target.value)}
                className="bg-background neu-inset border-none"
                placeholder="0"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="bg-background neu-inset border-none min-h-[100px] resize-none"
              placeholder="Product details..."
            />
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl shadow-none"
            onClick={() => setLocation("/vendor/products")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-[2] rounded-xl shadow-none neu-card"
            disabled={saving || uploading}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
            ) : uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
