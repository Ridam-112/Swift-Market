import { useRoute } from "wouter";
import { Link } from "wouter";
import { vendors } from "@/data/vendors";
import { useProducts } from "@/hooks/useProducts";
import { ProductGrid } from "@/components/ProductGrid";
import { EmptyState } from "@/components/EmptyState";
import { ArrowLeft, Star, Clock, MapPin, PackageOpen, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function ShopDetail() {
  const [, params] = useRoute("/shop/:vendorId");
  const vendorId = params?.vendorId;
  const vendor = vendors.find(v => v.id === vendorId);
  const { products } = useProducts();
  
  if (!vendor) {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] items-center justify-center">
        <EmptyState 
          icon={Store}
          title="Shop not found"
          description="The shop you are looking for doesn't exist or is currently unavailable."
          action={
            <Link href="/shops">
              <Button className="mt-4 rounded-full px-8 neu-card shadow-none">
                Back to Shops
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const vendorProducts = products.filter(p => p.vendorId === vendor.id);

  return (
    <div className="pb-24 min-h-[100dvh]">
      <div className="relative h-48 md:h-64 w-full bg-muted">
        <img 
          src={vendor.image} 
          alt={vendor.storeName} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        
        <Link href="/shops" className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
              {vendor.category}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${vendor.isOpen ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
              {vendor.isOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 leading-tight">{vendor.storeName}</h1>
          <p className="text-sm text-white/80 line-clamp-1">by {vendor.ownerName}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-8">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 bg-card neu-card px-4 py-2 rounded-xl">
            <Star className="w-5 h-5 text-yellow-500 fill-current" />
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-none text-foreground">{vendor.rating}</span>
              <span className="text-[10px] text-muted-foreground">{vendor.totalOrders}+ orders</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-card neu-card px-4 py-2 rounded-xl">
            <Clock className="w-5 h-5 text-primary" />
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-none text-foreground">{vendor.eta}</span>
              <span className="text-[10px] text-muted-foreground">Delivery time</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-card neu-card px-4 py-2 rounded-xl">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-none text-foreground truncate max-w-[120px]">{vendor.city}</span>
              <span className="text-[10px] text-muted-foreground">Location</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Our Products</h2>
          {vendorProducts.length > 0 ? (
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05 }
                }
              }}
            >
              <ProductGrid products={vendorProducts} />
            </motion.div>
          ) : (
            <EmptyState 
              icon={PackageOpen}
              title="No products listed"
              description="This vendor hasn't listed any products yet. Check back later!"
            />
          )}
        </div>
      </div>
    </div>
  );
}