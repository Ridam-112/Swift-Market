import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft, Package, ShoppingBag, TrendingUp, User,
  Plus, Edit2, Trash2, Loader2, Upload, X, ChevronDown, RefreshCw,
} from "lucide-react";
import { categories } from "@/data/categories";
import { formatINR } from "@/lib/currency";
import { api } from "@/lib/api";

interface ShopAddress { line1?: string; city?: string; pincode?: string; state?: string; }

interface ShopData {
  _id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  shopType?: string;
  category?: string;
  description?: string;
  image?: string;
  status: string;
  isOpen?: boolean;
  rating?: number;
  address?: ShopAddress;
  createdAt: string;
}

interface ProductData {
  _id: string;
  name: string;
  category: string;
  price: number;
  discountedPrice?: number;
  images?: string[];
  stock: number;
  unit?: string;
  description?: string;
  status: string;
  shopId: string;
}

interface OrderData {
  _id: string;
  customerName?: string;
  items: { name: string; qty: number; price: number }[];
  netAmount?: number;
  subtotal?: number;
  status: string;
  createdAt: string;
}

interface OwnerData {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  vendorStatus: string;
  status: string;
  createdAt: string;
}

interface DetailData {
  shop: ShopData;
  products: ProductData[];
  orders: OrderData[];
  owner: OwnerData | null;
  totalProducts: number;
  totalOrders: number;
  revenue: number;
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    approved: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400",
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400",
    banned: "bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-400",
    active: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400",
    inactive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    out_of_stock: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
    placed: "bg-blue-100 text-blue-800",
    accepted: "bg-cyan-100 text-cyan-800",
    preparing: "bg-amber-100 text-amber-800",
    ready: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return (
    <Badge className={`text-xs border-none capitalize ${cls[status] ?? "bg-muted text-muted-foreground"}`}>
      {status.replace("_", " ")}
    </Badge>
  );
}

function ProductForm({
  shopId,
  product,
  onClose,
  onSaved,
}: {
  shopId: string;
  product: ProductData | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [discountedPrice, setDiscountedPrice] = useState(String(product?.discountedPrice ?? ""));
  const [stock, setStock] = useState(String(product?.stock ?? ""));
  const [unit, setUnit] = useState(product?.unit ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [status, setStatus] = useState(product?.status ?? "active");
  const [image, setImage] = useState<string | null>(product?.images?.[0] ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    if (!name || !category || !price || !unit || !stock) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        category,
        price: Number(price),
        discountedPrice: discountedPrice ? Number(discountedPrice) : undefined,
        stock: Number(stock),
        unit: unit.trim(),
        description: description.trim() || undefined,
        status,
        images: image ? [image] : [],
        shopId,
      };
      if (isEdit) {
        await api.patch(`/products/${product!._id}`, body);
        toast.success("Product updated");
      } else {
        await api.post("/products/admin", body);
        toast.success("Product added");
      }
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-background rounded-2xl neu-inset p-5 space-y-4 border border-border/50">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-foreground">{isEdit ? "Edit Product" : "Add New Product"}</p>
        <button onClick={onClose} className="p-1.5 rounded-lg neu-inset text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Product Image</Label>
          <div className="relative h-28 rounded-xl neu-inset bg-card flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
            {image ? (
              <>
                <img src={image} alt="Preview" className="h-full object-contain p-2" />
                {uploading && (
                  <div className="absolute inset-0 bg-card/70 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
                {!uploading && (
                  <button type="button" onClick={() => setImage(null)}
                    className="absolute top-2 right-2 p-1 bg-card rounded-full neu-card text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            ) : (
              <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full text-muted-foreground hover:text-primary transition-colors">
                <Upload className="w-5 h-5 mb-1" />
                <span className="text-xs">Upload image</span>
                <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Product Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)}
              className="bg-card neu-inset border-none h-9 text-sm" placeholder="Product name" required />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Category *</Label>
            <div className="relative">
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full h-9 px-3 pr-8 rounded-md bg-card neu-inset border-none text-sm focus:outline-none appearance-none text-foreground" required>
                <option value="" disabled>Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Unit *</Label>
            <Input value={unit} onChange={e => setUnit(e.target.value)}
              className="bg-card neu-inset border-none h-9 text-sm" placeholder="e.g. 1 kg" required />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Price (₹) *</Label>
            <Input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)}
              className="bg-card neu-inset border-none h-9 text-sm" placeholder="0" required />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Discounted Price <span className="opacity-60">(opt)</span></Label>
            <Input type="number" min="0" value={discountedPrice} onChange={e => setDiscountedPrice(e.target.value)}
              className="bg-card neu-inset border-none h-9 text-sm" placeholder="0" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Stock *</Label>
            <Input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)}
              className="bg-card neu-inset border-none h-9 text-sm" placeholder="0" required />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <div className="relative">
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full h-9 px-3 pr-8 rounded-md bg-card neu-inset border-none text-sm focus:outline-none appearance-none text-foreground">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)}
              className="bg-card neu-inset border-none resize-none h-16 text-sm" placeholder="Product details..." />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1 rounded-lg shadow-none">
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={uploading || saving} className="flex-[2] rounded-lg shadow-none neu-card">
            {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : isEdit ? "Update Product" : "Add Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface Props {
  shopId: string;
  onClose: () => void;
}

export function ShopDetailsPanel({ shopId, onClose }: Props) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"products" | "orders" | "analytics">("products");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get<{ success: boolean } & DetailData>(`/shops/${shopId}/details`)
      .then(d => setData(d))
      .catch(() => toast.error("Failed to load shop details"))
      .finally(() => setLoading(false));
  }, [shopId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Delete "${productName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/products/${productId}`);
      toast.success("Product deleted");
      fetchData();
    } catch { toast.error("Failed to delete product"); }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-muted rounded-2xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-muted rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <button onClick={onClose} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back to Shops
        </button>
        <div className="text-center p-12 text-muted-foreground">Failed to load shop details</div>
      </div>
    );
  }

  const { shop, products, orders, owner } = data;
  const addressStr = [shop.address?.line1, shop.address?.city, shop.address?.pincode].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 rounded-xl neu-inset bg-background text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-foreground">{shop.shopName}</h2>
            <StatusBadge status={shop.status} />
            {shop.isOpen !== undefined && (
              <Badge className={`text-xs border-none ${shop.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {shop.isOpen ? "Open" : "Closed"}
              </Badge>
            )}
          </div>
          {addressStr && <p className="text-sm text-muted-foreground">{addressStr}</p>}
        </div>
        <button onClick={fetchData} className="p-2 rounded-xl neu-inset bg-background text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Owner + Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {owner && (
          <div className="bg-card p-4 rounded-2xl neu-card space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Owner</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{owner.name}</p>
                <p className="text-sm text-muted-foreground">{owner.phone}</p>
                {owner.email && <p className="text-xs text-muted-foreground truncate">{owner.email}</p>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs capitalize">{owner.role}</Badge>
              <StatusBadge status={owner.vendorStatus} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card p-4 rounded-2xl neu-card text-center">
            <Package className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold text-foreground">{data.totalProducts}</p>
            <p className="text-xs text-muted-foreground">Products</p>
          </div>
          <div className="bg-card p-4 rounded-2xl neu-card text-center">
            <ShoppingBag className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-xl font-bold text-foreground">{data.totalOrders}</p>
            <p className="text-xs text-muted-foreground">Orders</p>
          </div>
          <div className="bg-card p-4 rounded-2xl neu-card text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold text-foreground">{formatINR(data.revenue)}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-background neu-inset rounded-xl max-w-fit">
        {(["products", "orders", "analytics"] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === t
                ? "bg-primary text-primary-foreground neu-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{products.length} product{products.length !== 1 ? "s" : ""}</p>
            <Button
              size="sm"
              onClick={() => { setEditingProduct(null); setShowAddProduct(true); }}
              className="rounded-xl shadow-none neu-card gap-1.5 text-sm"
            >
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          </div>

          {(showAddProduct || editingProduct) && (
            <ProductForm
              shopId={shopId}
              product={editingProduct}
              onClose={() => { setShowAddProduct(false); setEditingProduct(null); }}
              onSaved={() => { setShowAddProduct(false); setEditingProduct(null); fetchData(); }}
            />
          )}

          {products.length === 0 && !showAddProduct ? (
            <div className="text-center p-12 bg-card rounded-3xl neu-inset text-muted-foreground border border-dashed border-border/50">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No products yet — click "Add Product" to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => (
                <div key={p._id} className="bg-card rounded-2xl neu-card overflow-hidden">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 bg-muted flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="p-3 space-y-2">
                    <p className="font-semibold text-sm text-foreground leading-tight">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.category}{p.unit ? ` · ${p.unit}` : ""}</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="font-bold text-primary">{formatINR(p.discountedPrice ?? p.price)}</p>
                        {p.discountedPrice && (
                          <p className="text-xs text-muted-foreground line-through">{formatINR(p.price)}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Stock: {p.stock}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setShowAddProduct(false); setEditingProduct(p); }}
                          className="p-1.5 rounded-lg neu-inset bg-background text-muted-foreground hover:text-primary transition-colors"
                          title="Edit product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p._id, p.name)}
                          className="p-1.5 rounded-lg neu-inset bg-background text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="text-center p-12 bg-card rounded-3xl neu-inset text-muted-foreground border border-dashed border-border/50">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No orders yet</p>
            </div>
          ) : (
            orders.map(o => (
              <div key={o._id} className="bg-card p-4 rounded-2xl neu-card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground">#{o._id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{o.customerName ?? "Customer"} · {o.items.length} item{o.items.length !== 1 ? "s" : ""}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-foreground">{formatINR(o.netAmount ?? o.subtotal ?? 0)}</p>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card p-5 rounded-2xl neu-card space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">Shop Info</p>
            <div className="space-y-2.5">
              {[
                { label: "Status", value: <StatusBadge status={shop.status} /> },
                { label: "Category", value: <span className="text-foreground text-sm">{shop.shopType ?? shop.category ?? "—"}</span> },
                { label: "Rating", value: <span className="text-foreground text-sm">⭐ {shop.rating?.toFixed(1) ?? "0.0"}</span> },
                { label: "Registered", value: <span className="text-foreground text-sm">{new Date(shop.createdAt).toLocaleDateString("en-IN")}</span> },
                { label: "Open", value: <span className="text-foreground text-sm">{shop.isOpen ? "Yes" : "No"}</span> },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  {value}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card p-5 rounded-2xl neu-card space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">Performance</p>
            <div className="space-y-2.5">
              {[
                { label: "Total Revenue", value: <span className="font-bold text-green-600 text-sm">{formatINR(data.revenue)}</span> },
                { label: "Total Orders", value: <span className="text-foreground text-sm">{data.totalOrders}</span> },
                { label: "Total Products", value: <span className="text-foreground text-sm">{data.totalProducts}</span> },
                {
                  label: "Avg Order Value",
                  value: <span className="text-foreground text-sm">{data.totalOrders > 0 ? formatINR(data.revenue / data.totalOrders) : "—"}</span>,
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  {value}
                </div>
              ))}
            </div>
          </div>

          {orders.length > 0 && (
            <div className="bg-card p-5 rounded-2xl neu-card md:col-span-2 space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">Orders by Status</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(
                  orders.reduce((acc, o) => {
                    acc[o.status] = (acc[o.status] ?? 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([s, count]) => (
                  <div key={s} className="flex items-center gap-2 bg-background neu-inset px-3 py-1.5 rounded-xl">
                    <StatusBadge status={s} />
                    <span className="text-sm font-bold text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
