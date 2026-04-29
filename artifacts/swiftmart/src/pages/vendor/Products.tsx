import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PackageOpen, Plus, Edit, Trash2 } from "lucide-react";
import { formatINR } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function VendorProducts() {
  const { products, deleteProduct } = useProducts();
  const [filter, setFilter] = useState<'all' | 'low_stock'>('all');

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      deleteProduct(id);
      toast.success("Product deleted successfully");
    }
  };

  let filteredProducts = products;
  if (filter === 'low_stock') {
    filteredProducts = products.filter(p => p.stock < 20);
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
      ) : (
        <div className="grid gap-4">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-card p-4 rounded-2xl neu-card flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="w-20 h-20 rounded-xl bg-background neu-inset p-2 flex-shrink-0">
                <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg truncate">{product.name}</h4>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
                  <span className="text-primary font-bold">{formatINR(product.price)}</span>
                  <span className="text-muted-foreground">{product.category}</span>
                  <span className={cn("font-medium", product.stock < 20 ? "text-destructive" : "text-emerald-500")}>
                    Stock: {product.stock}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 self-end sm:self-auto w-full sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none rounded-xl neu-inset shadow-none border-none hover:bg-background/80">
                  <Edit className="w-4 h-4 mr-2 sm:mr-0" /> <span className="sm:hidden">Edit</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 sm:flex-none rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 border-none shadow-none"
                  onClick={() => handleDelete(product.id)}
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
