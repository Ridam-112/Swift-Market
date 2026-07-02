import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { PackageOpen, Plus, Edit, Trash2, Loader2, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatINR } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ApiProduct {
  _id: string;
  name: string;
  category: string;
  price: number;
  discountedPrice?: number;
  unit?: string;
  image?: string;
  images?: string[];
  stock?: number;
  shopId?: string;
  status?: "pending" | "active" | "inactive" | "rejected" | "out_of_stock";
  rejectionReason?: string;
}

const STATUS_CONFIG = {
  pending:     { label: "Pending Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400", icon: Clock },
  active:      { label: "Active",         color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400", icon: CheckCircle },
  inactive:    { label: "Inactive",       color: "bg-muted text-muted-foreground", icon: XCircle },
  rejected:    { label: "Rejected",       color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400", icon: XCircle },
  out_of_stock:{ label: "Out of Stock",   color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400", icon: AlertCircle },
} as const;

type StatusFilter = "all" | "pending" | "active" | "rejected" | "low_stock";

import { SEO } from "@/components/SEO";

export default function VendorProducts() {
  const { user, isLoading: authLoading } = useAuth();
  const [shopId, setShopId] = useState<string | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchProducts = useCallback(async (sid: string) => {
    try {
      // status=all so vendor sees pending/active/rejected in one list
      const d = await api.get<{ success: boolean; products: ApiProduct[] }>(
        `/products?shopId=${sid}&status=all&limit=200`
      );
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
    try {
      await api.delete(`/products/${id}`);
      setProducts(prev => prev.filter(p => p._id !== id));
      setConfirmDeleteId(null);
      toast.success("Product deleted");
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const filtered = products.filter(p => {
    if (filter === "all") return true;
    if (filter === "low_stock") return (p.stock ?? 0) < 20 && p.status === "active";
    return p.status === filter;
  });

  const counts = {
    all: products.length,
    pending: products.filter(p => p.status === "pending").length,
    active: products.filter(p => p.status === "active").length,
    rejected: products.filter(p => p.status === "rejected").length,
    low_stock: products.filter(p => (p.stock ?? 0) < 20 && p.status === "active").length,
  };

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

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: "all",      label: `All (${counts.all})` },
    { key: "pending",  label: `Pending (${counts.pending})` },
    { key: "active",   label: `Active (${counts.active})` },
    { key: "rejected", label: `Rejected (${counts.rejected})` },
    { key: "low_stock",label: `Low Stock (${counts.low_stock})` },
  ];

  return (
    <div className="pb-24 pt-4 px-4 max-w-5xl mx-auto space-y-6">
      <SEO noIndex />
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

      {/* Pending notice */}
      {counts.pending > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <span className="font-semibold">{counts.pending} product{counts.pending > 1 ? "s" : ""} pending admin approval.</span>{" "}
            They will be visible to customers once approved.
          </p>
        </div>
      )}
      {counts.rejected > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-400">
            <span className="font-semibold">{counts.rejected} product{counts.rejected > 1 ? "s" : ""} rejected.</span>{" "}
            Please edit and resubmit or contact support.
          </p>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filterTabs.map(tab => (
          <Button
            key={tab.key}
            variant={filter === tab.key ? "default" : "outline"}
            className="rounded-full neu-card h-8 shrink-0 text-xs"
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No products yet"
          description="Start adding products to your store to start selling."
          action={
            <Link href="/vendor/add-product">
              <Button className="mt-4 rounded-full neu-card shadow-none">Add First Product</Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={`No ${filter === "low_stock" ? "low-stock" : filter} products`}
          description="Try a different filter tab."
        />
      ) : (
        <div className="grid gap-4">
          {filtered.map(product => {
            const thumb = product.image ?? product.images?.[0];
            const cfg = STATUS_CONFIG[product.status ?? "pending"];
            const Icon = cfg.icon;
            return (
              <div key={product._id} className="bg-card p-4 rounded-2xl neu-card flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="w-20 h-20 rounded-xl bg-background neu-inset p-2 flex-shrink-0">
                  <img
                    src={thumb || "/assets/product-placeholder.png"}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    onError={e => { (e.target as HTMLImageElement).src = "/assets/product-placeholder.png"; }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-bold text-lg truncate">{product.name}</h4>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", cfg.color)}>
                      <Icon className="w-3 h-3" />{cfg.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-primary font-bold">
                        {formatINR(product.discountedPrice != null && product.discountedPrice < product.price
                          ? product.discountedPrice
                          : product.price)}
                      </span>
                      {product.discountedPrice != null && product.discountedPrice < product.price && (
                        <span className="text-muted-foreground line-through text-xs">{formatINR(product.price)} MRP</span>
                      )}
                    </span>
                    <span className="text-muted-foreground capitalize">{product.category}</span>
                    <span className={cn("font-medium", (product.stock ?? 0) < 20 ? "text-destructive" : "text-emerald-500")}>
                      Stock: {product.stock ?? 0}
                    </span>
                  </div>
                  {product.status === "rejected" && product.rejectionReason && (
                    <div className="mt-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400">Rejected by SwiftMart</p>
                      <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">Reason: {product.rejectionReason}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 self-end sm:self-auto w-full sm:w-auto">
                  <Link href={`/vendor/edit-product/${product._id}`} className="flex-1 sm:flex-none">
                    <Button variant="outline" className="w-full rounded-xl neu-inset shadow-none border-none hover:bg-background/80">
                      <Edit className="w-4 h-4 mr-2 sm:mr-0" /> <span className="sm:hidden">Edit</span>
                    </Button>
                  </Link>
                  {confirmDeleteId === product._id ? (
                    <div className="flex gap-1 flex-1 sm:flex-none">
                      <Button
                        size="sm"
                        className="flex-1 rounded-xl bg-destructive text-white hover:bg-destructive/90 shadow-none border-none h-9 text-xs font-bold"
                        onClick={() => handleDelete(product._id)}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-xl shadow-none border-none neu-inset h-9 text-xs"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 border-none shadow-none"
                      onClick={() => setConfirmDeleteId(product._id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2 sm:mr-0" /> <span className="sm:hidden">Delete</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
