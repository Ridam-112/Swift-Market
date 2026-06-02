import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { X, Loader2, Upload, ChevronDown } from "lucide-react";
import { categories } from "@/data/categories";
import { api } from "@/lib/api";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateShopModal({ onClose, onCreated }: Props) {
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [shopType, setShopType] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      toast.error("Image upload failed");
      setImage(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) { toast.error("Please wait for image to finish uploading"); return; }
    if (!shopName.trim() || !ownerName.trim() || !phone.trim() || !city.trim() || !pincode.trim() || !shopType) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/shops/admin-create", {
        shopName: shopName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        ownerEmail: ownerEmail.trim() || undefined,
        address: { line1: addressLine.trim(), city: city.trim(), pincode: pincode.trim() },
        shopType,
        category: shopType,
        description: description.trim() || undefined,
        image: image || undefined,
      });
      toast.success("Shop created and approved");
      onCreated();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create shop");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-2xl rounded-3xl neu-card overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-xl font-bold text-foreground">Create New Shop</h2>
          <button onClick={onClose} className="p-2 rounded-xl neu-inset bg-background text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label>Shop Logo / Image</Label>
            <div className="relative h-28 rounded-2xl neu-inset bg-background flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
              {image ? (
                <>
                  <img src={image} alt="Preview" className="h-full object-contain p-2" />
                  {uploading && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                      <Loader2 className="w-7 h-7 animate-spin text-primary" />
                    </div>
                  )}
                  {!uploading && (
                    <button type="button" onClick={() => setImage(null)}
                      className="absolute top-2 right-2 p-1.5 bg-background rounded-full neu-card text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </>
              ) : (
                <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full text-muted-foreground hover:text-primary transition-colors">
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Click to upload image</span>
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">Shop Information</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Shop Name *</Label>
              <Input value={shopName} onChange={e => setShopName(e.target.value)}
                className="bg-background neu-inset border-none" placeholder="e.g. Fresh Mart" required />
            </div>
            <div className="space-y-2">
              <Label>Shop Category *</Label>
              <div className="relative">
                <select value={shopType} onChange={e => setShopType(e.target.value)}
                  className="w-full h-10 px-3 py-2 pr-9 rounded-md bg-background neu-inset border-none text-sm focus:outline-none appearance-none text-foreground" required>
                  <option value="" disabled>Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)}
              className="bg-background neu-inset border-none resize-none h-20" placeholder="Brief shop description..." />
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">Owner Information</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Owner Name *</Label>
              <Input value={ownerName} onChange={e => setOwnerName(e.target.value)}
                className="bg-background neu-inset border-none" placeholder="Full name" required />
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)}
                className="bg-background neu-inset border-none" placeholder="10-digit mobile number" maxLength={10} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Owner Email <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <Input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)}
              className="bg-background neu-inset border-none" placeholder="owner@email.com" />
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">Shop Address</p>

          <div className="space-y-2">
            <Label>Address / Area / Locality</Label>
            <Input value={addressLine} onChange={e => setAddressLine(e.target.value)}
              className="bg-background neu-inset border-none" placeholder="Street, Area, Locality" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City *</Label>
              <Input value={city} onChange={e => setCity(e.target.value)}
                className="bg-background neu-inset border-none" placeholder="City" required />
            </div>
            <div className="space-y-2">
              <Label>Pincode *</Label>
              <Input value={pincode} onChange={e => setPincode(e.target.value)}
                className="bg-background neu-inset border-none" placeholder="6-digit pincode" maxLength={6} required />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl shadow-none">
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || submitting} className="flex-[2] rounded-xl shadow-none neu-card">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : "Create Shop"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
