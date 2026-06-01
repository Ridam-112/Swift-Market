import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PackageOpen, Plus, Edit, Trash2, Loader2, AlertCircle } from "lucide-react";
import { formatINR } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ApiProduct {
  _id: string;
  name: string;
  category: string;
  price: number;
  unit?: string;
  image?: string;
  stock?: number;
  shopId?: string;
}

export default function VendorProducts() {
  const { user, isLoading: authLoading } = useAuth();
  const [shopId, setShopId] = useState<string | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'low_stock'>('all');

  const fetchProducts = useCallback(async (sid: string) => {
    try {
      const d = await api.get<{ success: boolean; products: ApiProduct[] }>(`/products?shopId=${sid}&limit=100`);
      setProducts(d.products);
    } catch {
      setError("Failed to load products. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    api.get<{ success: boolean; shops: { _id: string }[] }>(`/shops?ownerId=${user.id}`)
      .then(d => {
        const shop = d.shops[0];
        if (shop) {
          setShopId(shop._id);
          fetchProducts(shop._id);
        } else {
          setError("No shop found for your account.");
          setLoading(false);
        }
      })
      .catch(() => {
        setError("Could not load your shop.");
        setLoading(false);
      });
  }, [user, authLoading, fetchProducts]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts(prev => prev.filter(p => p._id !== id));
      toast.success("Product deleted successfully");
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const filtered = filter === 'low_stock'
    ? products.filter(p => (p.stock ?? 0) < 20)
    : products;

  if (loading) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-5xl mx-auto space-y-4">
        <div className="h-8 w-40 bg-muted rounded animate-pulse mb-6" />
        {[1, 2, 3].map(i => <div key={i} className="h-28 w-full bg-muted rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-5xl mx-auto">
        <SectionHeader title="My Products" />
        <div className="mt-6 flex flex-col items-center gap-3 p-8 bg-card rounded-2xl neu-inset text-center">
          <AlertCircle className="w-10 h-10 text-amber-500" />
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="My Products"
        action={
          <Link href="/vendor/add-product">
            <Button className="rounded-full neu-card shadow-none hidden sm:flex">
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
            <Button size="icon" className="rounded-full neu-card shadow-none sm:hidden">
              <Plus className="w-4 h-4" />
            </Button>
          </Link>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          className="rounded-full neu-card h-8"
          onClick={() => setFilter('all')}
        >
          All Products
        </Button>
        <Button
          variant={filter === 'low_stock' ? 'default' : 'outline'}
          className="rounded-full neu-card h-8"
          onClick={() => setFilter('low_stock')}
        >
          Low Stock
        </Button>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No products yet"
          description="Start adding products to your store to start selling."
          action={
            <Link href="/vendor/add-product">
              <Button className="mt-4 rounded-full neu-card shadow-none">
                Add First Product
              </Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No low-stock products"
          description="All your products are well-stocked."
        />
      ) : (
        <div className="grid gap-4">
          {filtered.map(product => (
            <div key={product._id} className="bg-card p-4 rounded-2xl neu-card flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="w-20 h-20 rounded-xl bg-background neu-inset p-2 flex-shrink-0">
                <img
                  src={product.image || "/assets/product-placeholder.png"}
                  alt={product.name}
                  className="w-full h-full object-contain"
                  onError={e => { (e.target as HTMLImageElement).src = "/assets/product-placeholder.png"; }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg truncate">{product.name}</h4>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
                  <span className="text-primary font-bold">{formatINR(product.price)}</span>
                  <span className="text-muted-foreground">{product.category}</span>
                  <span className={cn("font-medium", (product.stock ?? 0) < 20 ? "text-destructive" : "text-emerald-500")}>
                    Stock: {product.stock ?? 0}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 self-end sm:self-auto w-full sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none rounded-xl neu-inset shadow-none border-none hover:bg-background/80" disabled>
                  <Edit className="w-4 h-4 mr-2 sm:mr-0" /> <span className="sm:hidden">Edit</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 border-none shadow-none"
                  onClick={() => handleDelete(product._id)}
                >
                  <Trash2 className="w-4 h-4 mr-2 sm:mr-0" /> <span className="sm:hidden">Delete</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
