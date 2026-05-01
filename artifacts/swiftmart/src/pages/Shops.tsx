import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Star, Clock } from "lucide-react";
import { vendors } from "@/data/vendors";
import { SectionHeader } from "@/components/SectionHeader";
import { Badge } from "@/components/ui/badge";

export default function Shops() {
  const [filterOpen, setFilterOpen] = useState(false);

  const filteredVendors = filterOpen 
    ? vendors.filter(v => v.isOpen) 
    : vendors;

  return (
    <div className="pb-24 pt-4 px-4 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground">Shops Near You</h2>
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            filterOpen 
              ? "bg-primary text-white neu-card border-none" 
              : "bg-card neu-inset text-muted-foreground"
          }`}
        >
          Open Now
        </button>
      </div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
      >
        {filteredVendors.map((vendor) => (
          <motion.div
            key={vendor.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
            }}
          >
            <Link href={`/shop/${vendor.id}`} className="block">
              <div className="bg-card rounded-2xl p-4 neu-card flex gap-4 items-center group hover:scale-[1.02] transition-transform">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-background neu-inset flex-shrink-0">
                  <img 
                    src={vendor.image} 
                    alt={vendor.storeName} 
                    className="w-full h-full object-cover mix-blend-multiply"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-base truncate text-foreground">{vendor.storeName}</h3>
                    {vendor.isOpen ? (
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground mb-2 truncate">
                    {vendor.category}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <div className="flex items-center gap-1 text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-md">
                      <Star className="w-3 h-3 fill-current" />
                      {vendor.rating}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground bg-background neu-inset px-2 py-0.5 rounded-md">
                      <Clock className="w-3 h-3" />
                      {vendor.eta}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}