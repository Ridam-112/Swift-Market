import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Upload, X, Loader2, ChevronDown, Store } from "lucide-react";

interface ApiCategory {
  _id: string;
  name: string;
  slug: string;
  emoji?: string;
}

interface ShopTimings {
  open: string;
  close: string;
}

interface ApiShop {
  _id: string;
  shopName: string;
  description?: string;
  image?: string;
  banner?: string;
  address: { line1: string; city: string; pincode: string; state?: string };
  shopType: string;
  category?: string;
  timings?: ShopTimings;
  status: string;
}

async function uploadImage(file: File, endpoint: string): Promise<string | null> {
  const formData = new FormData();
  formData.append("image", file);
  const token = localStorage.getItem("sm_at");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json() as { success: boolean; imageUrl?: string; message?: string };
  if (data.success && data.imageUrl) return data.imageUrl;
  throw new Error(data.message ?? "Upload failed");
}

function ImageUploader({
  label,
  value,
  onChange,
  endpoint,
  aspect = "square",
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  endpoint: string;
  aspect?: "square" | "banner";
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const displaySrc = preview ?? value;
  const heightClass = aspect === "banner" ? "h-36" : "h-32 w-32";

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    try {
      const url = await uploadImage(file, endpoint);
      URL.revokeObjectURL(localUrl);
      setPreview(null);
      onChange(url);
    } catch (err) {
      URL.revokeObjectURL(localUrl);
      setPreview(null);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className={`relative ${aspect === "banner" ? "w-full" : "w-32"} ${heightClass} rounded-2xl neu-inset bg-background flex items-center justify-center overflow-hidden border-2 border-dashed border-border`}>
        {displaySrc ? (
          <>
            <img
              src={displaySrc}
              alt={label}
              className={aspect === "banner" ? "w-full h-full object-cover" : "w-full h-full object-cover"}
            />
            {uploading && (
              <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            {!uploading && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="absolute top-2 right-2 p-1.5 bg-background rounded-full neu-card text-destructive"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full text-muted-foreground hover:text-primary transition-colors">
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : (
              <>
                <Upload className="w-7 h-7 mb-1" />
                <span className="text-xs font-medium text-center px-2">
                  {aspect === "banner" ? "Upload Banner" : "Upload Logo"}
                </span>
                <span className="text-[10px] mt-0.5 opacity-60">JPG, PNG, WEBP · Max 5MB</span>
              </>
            )}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFile}
              disabled={uploading}
            />
          </label>
        )}
      </div>
    </div>
  );
}

export default function ShopProfile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [shopId, setShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<ApiCategory[]>([]);

  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [state, setState] = useState("");
  const [shopType, setShopType] = useState("");
  const [category, setCategory] = useState("");
  const [timingsOpen, setTimingsOpen] = useState("09:00");
  const [timingsClose, setTimingsClose] = useState("21:00");

  useEffect(() => {
    api.get<{ success: boolean; categories: ApiCategory[] }>("/categories")
      .then(d => setCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    api.get<{ success: boolean; shops: ApiShop[] }>(`/shops?ownerId=${user.id}`)
      .then(d => {
        const shop = d.shops[0];
        if (!shop) { setLoading(false); return; }
        setShopId(shop._id);
        setShopName(shop.shopName ?? "");
        setDescription(shop.description ?? "");
        setLogo(shop.image ?? null);
        setBanner(shop.banner ?? null);
        setAddressLine1(shop.address?.line1 ?? "");
        setCity(shop.address?.city ?? "");
        setPincode(shop.address?.pincode ?? "");
        setState(shop.address?.state ?? "");
        setShopType(shop.shopType ?? "");
        setCategory(shop.category ?? "");
        setTimingsOpen(shop.timings?.open ?? "09:00");
        setTimingsClose(shop.timings?.close ?? "21:00");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    if (!shopName.trim()) { toast.error("Shop name is required"); return; }
    if (!addressLine1.trim() || !city.trim() || !pincode.trim()) {
      toast.error("Address, city and pincode are required");
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/shops/my/profile`, {
        shopName: shopName.trim(),
        description: description.trim(),
        image: logo ?? undefined,
        banner: banner ?? undefined,
        address: {
          line1: addressLine1.trim(),
          city: city.trim(),
          pincode: pincode.trim(),
          state: state.trim() || undefined,
        },
        shopType,
        category,
        timings: { open: timingsOpen, close: timingsClose },
      });
      toast.success("Shop profile updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px] w-full rounded-3xl" />
      </div>
    );
  }

  if (!shopId) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-[60dvh] flex flex-col items-center justify-center text-center gap-6">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
          <Store className="w-10 h-10 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">No shop found</h2>
          <p className="text-muted-foreground text-sm">You don't have an active shop to edit.</p>
        </div>
        <Button className="rounded-2xl h-12 px-8 font-bold shadow-none neu-card" onClick={() => setLocation("/vendor")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto space-y-6">
      <SectionHeader title="Edit Shop Profile" />

      <form onSubmit={handleSave} className="space-y-6">
        <section className="bg-card p-6 rounded-3xl neu-card space-y-5">
          <h3 className="font-semibold text-base text-foreground">Visuals</h3>

          <ImageUploader
            label="Shop Logo"
            value={logo}
            onChange={setLogo}
            endpoint="/api/upload/shop-image"
          />

          <ImageUploader
            label="Shop Banner"
            value={banner}
            onChange={setBanner}
            endpoint="/api/upload/shop-image"
            aspect="banner"
          />
        </section>

        <section className="bg-card p-6 rounded-3xl neu-card space-y-5">
          <h3 className="font-semibold text-base text-foreground">Basic Info</h3>

          <div className="space-y-2">
            <Label htmlFor="shopName">Shop Name *</Label>
            <Input
              id="shopName"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              className="bg-background neu-inset border-none"
              placeholder="Your shop name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="bg-background neu-inset border-none min-h-[90px] resize-none"
              placeholder="Brief description about your shop…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <div className="relative">
              <select
                id="category"
                value={shopType}
                onChange={e => { setShopType(e.target.value); setCategory(e.target.value); }}
                className="w-full h-10 px-3 py-2 pr-9 rounded-md bg-background neu-inset border-none text-sm focus:outline-none appearance-none text-foreground"
              >
                <option value="" disabled>Select category</option>
                {categories.map(c => (
                  <option key={c._id} value={c.slug}>{c.emoji ?? ""} {c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </section>

        <section className="bg-card p-6 rounded-3xl neu-card space-y-5">
          <h3 className="font-semibold text-base text-foreground">Address</h3>

          <div className="space-y-2">
            <Label htmlFor="addressLine1">Street / Area *</Label>
            <Input
              id="addressLine1"
              value={addressLine1}
              onChange={e => setAddressLine1(e.target.value)}
              className="bg-background neu-inset border-none"
              placeholder="e.g. 12, Main Road, Near Park"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="bg-background neu-inset border-none"
                placeholder="City"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input
                id="pincode"
                value={pincode}
                onChange={e => setPincode(e.target.value)}
                className="bg-background neu-inset border-none"
                placeholder="6-digit pincode"
                maxLength={6}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="state"
              value={state}
              onChange={e => setState(e.target.value)}
              className="bg-background neu-inset border-none"
              placeholder="State"
            />
          </div>
        </section>

        <section className="bg-card p-6 rounded-3xl neu-card space-y-5">
          <h3 className="font-semibold text-base text-foreground">Shop Timings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timingsOpen">Opens At</Label>
              <Input
                id="timingsOpen"
                type="time"
                value={timingsOpen}
                onChange={e => setTimingsOpen(e.target.value)}
                className="bg-background neu-inset border-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timingsClose">Closes At</Label>
              <Input
                id="timingsClose"
                type="time"
                value={timingsClose}
                onChange={e => setTimingsClose(e.target.value)}
                className="bg-background neu-inset border-none"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">These are the hours your shop is expected to be operational.</p>
        </section>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl shadow-none"
            onClick={() => setLocation("/vendor")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-[2] rounded-xl shadow-none neu-card"
            disabled={saving}
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
