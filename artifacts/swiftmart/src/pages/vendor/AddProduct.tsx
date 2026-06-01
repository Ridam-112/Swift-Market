import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { categories } from "@/data/categories";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, X, Loader2, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";

export default function AddProduct() {
  const [, setLocation] = useLocation();
  const { addProduct } = useProducts();
  const { user } = useAuth();
  const [shopId, setShopId] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    api.get<{ success: boolean; shops: { _id: string }[] }>(`/shops?ownerId=${user.id}`)
      .then(d => { if (d.shops[0]) setShopId(d.shops[0]._id); })
      .catch(() => {});
  }, [user]);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const selectedCat = categories.find(c => c.id === category);

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
        setImage(null);
      }
    } catch {
      toast.error("Image upload failed. Please try again.");
      setImage(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) { toast.error("Please wait for image upload to finish"); return; }
    if (!name || !category || !price || !unit || !stock || !image) {
      toast.error("Please fill all required fields and upload an image");
      return;
    }

    const newProduct = {
      id: `p_${Date.now()}`,
      name,
      category,
      subcategory: subcategory || undefined,
      price: Number(price),
      unit,
      stock: Number(stock),
      description,
      image,
      rating: 0,
      vendorId: shopId,
    };

    addProduct(newProduct);
    toast.success("Product added successfully");
    setLocation("/vendor/products");
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto space-y-6">
      <SectionHeader title="Add New Product" />

      <form onSubmit={handleSubmit} className="bg-card p-6 rounded-3xl neu-card space-y-6">
        <div className="space-y-2">
          <Label>Product Image*</Label>
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
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    className="absolute top-2 right-2 p-1.5 bg-background rounded-full neu-card text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
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
            <Label htmlFor="name">Product Name*</Label>
            <Input
              id="name" value={name} onChange={e => setName(e.target.value)}
              className="bg-background neu-inset border-none" placeholder="e.g. Fresh Tomatoes" required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category*</Label>
              <div className="relative">
                <select
                  id="category"
                  value={category}
                  onChange={e => { setCategory(e.target.value); setSubcategory(""); }}
                  className="w-full h-10 px-3 py-2 pr-9 rounded-md bg-background neu-inset border-none text-sm focus:outline-none appearance-none text-foreground"
                  required
                >
                  <option value="" disabled>Select category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (₹)*</Label>
              <Input
                id="price" type="number" min="0" step="1" value={price} onChange={e => setPrice(e.target.value)}
                className="bg-background neu-inset border-none" placeholder="0.00" required
              />
            </div>
          </div>

          {selectedCat && selectedCat.subcategories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <div className="relative">
                <select
                  id="subcategory"
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
              {subcategory && (
                <p className="text-xs text-muted-foreground">
                  {selectedCat.emoji} {selectedCat.name} › {subcategory}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit*</Label>
              <Input
                id="unit" value={unit} onChange={e => setUnit(e.target.value)}
                className="bg-background neu-inset border-none" placeholder="e.g. 1 kg, 500 ml" required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock Quantity*</Label>
              <Input
                id="stock" type="number" min="0" step="1" value={stock} onChange={e => setStock(e.target.value)}
                className="bg-background neu-inset border-none" placeholder="0" required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description" value={description} onChange={e => setDescription(e.target.value)}
              className="bg-background neu-inset border-none min-h-[100px] resize-none" placeholder="Product details..."
            />
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <Button type="button" variant="outline" className="flex-1 rounded-xl shadow-none" onClick={() => setLocation("/vendor/products")}>
            Cancel
          </Button>
          <Button type="submit" className="flex-[2] rounded-xl shadow-none neu-card" disabled={uploading}>
            {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</> : "Save Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
