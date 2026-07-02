import { useState } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/SEO";
import { Search, PackageSearch } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { ProductGrid } from "@/components/ProductGrid";
import { Input } from "@/components/ui/input";
import { categories } from "@/data/categories";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function SearchPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialQuery = searchParams.get("q") || "";
  
  const { products } = useProducts();
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(query.toLowerCase()) || 
                          p.description.toLowerCase().includes(query.toLowerCase()) ||
                          p.category.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = activeCategory === "all" || p.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  const searchTitle = query ? `"${query}" — Search` : "Search Products";
  const searchDesc = query
    ? `Search results for "${query}" on SwiftMart — grocery, food, vegetables, fruits, medicines and daily essentials in Balurghat.`
    : "Search grocery, food, vegetables, fruits, medicines and daily essentials on SwiftMart Balurghat.";

  return (
    <div className="pb-24 pt-4 px-4 max-w-7xl mx-auto space-y-6 min-h-[100dvh]">
      <SEO
        title={searchTitle}
        description={searchDesc}
        canonical="/search"
        noIndex={!!query}
      />
      <div className="sticky top-[72px] z-40 bg-background/80 backdrop-blur-xl pb-4 -mx-4 px-4">
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            autoFocus
            className="w-full pl-10 bg-card neu-inset border-none h-12 rounded-full text-lg focus-visible:ring-2 focus-visible:ring-primary" 
            placeholder="Search for anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-4 max-w-3xl mx-auto px-1">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              activeCategory === "all" ? "bg-primary text-white neu-card shadow-none" : "bg-card neu-inset text-muted-foreground"
            )}
          >
            All Products
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                activeCategory === cat.id ? "bg-primary text-white neu-card shadow-none" : "bg-card neu-inset text-muted-foreground"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        <h2 className="text-lg font-bold mb-4 text-foreground">
          {query ? `${filteredProducts.length} results for '${query}'` : 'Suggested Products'}
        </h2>
        
        {filteredProducts.length > 0 ? (
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
            <ProductGrid products={filteredProducts} />
          </motion.div>
        ) : (
          <EmptyState 
            icon={PackageSearch}
            title="No products found"
            description={`We couldn't find anything matching "${query}". Try a different search term or category.`}
          />
        )}
      </div>
    </div>
  );
}