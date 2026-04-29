import { useState, useEffect } from "react";
import { vendorSales } from "@/data/vendorSales";
import { mockOrders } from "@/data/orders";
import { useProducts } from "@/hooks/useProducts";
import { StatCard } from "@/components/StatCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { IndianRupee, ShoppingBag, Package, AlertCircle } from "lucide-react";
import { formatINR } from "@/lib/currency";

export default function Dashboard() {
  const { products } = useProducts();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const todaySales = vendorSales[vendorSales.length - 1];
  const lowStockProducts = products.filter(p => p.stock < 20);

  if (loading) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
        <Skeleton className="h-[300px] w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-5xl mx-auto space-y-8">
      <SectionHeader title="Vendor Dashboard" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Today's Revenue" 
          value={formatINR(todaySales.revenue)} 
          icon={IndianRupee}
          trend="+12%"
          trendUp={true}
        />
        <StatCard 
          title="Today's Orders" 
          value={todaySales.orders} 
          icon={ShoppingBag}
          trend="+5%"
          trendUp={true}
        />
        <StatCard 
          title="Total Products" 
          value={products.length} 
          icon={Package}
        />
        <StatCard 
          title="Low Stock" 
          value={lowStockProducts.length} 
          icon={AlertCircle}
          trend="Needs attention"
          trendUp={false}
          className={lowStockProducts.length > 0 ? "border-destructive/50" : ""}
        />
      </div>

      <section className="bg-card p-6 rounded-3xl neu-card">
        <h3 className="font-bold text-lg mb-6">Revenue Overview (Last 7 Days)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={vendorSales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(value) => `₹${value / 1000}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '8px 8px 24px hsl(var(--neu-shadow-dark)/.18), -8px -8px 24px hsl(var(--neu-shadow-light)/.9)'
                }}
                formatter={(value: number) => [formatINR(value), 'Revenue']}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
