import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/context/AuthContext";
import { ProductsProvider } from "@/context/ProductsContext";
import { ShopsProvider } from "@/context/ShopsContext";
import { CartProvider } from "@/context/CartContext";

import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { RoleGuard } from "@/components/RoleGuard";
import { AuthGuard } from "@/components/AuthGuard";
import { AdminGuard } from "@/components/AdminGuard";
import { PincodeSelector } from "@/components/PincodeSelector";
import { useAuth } from "@/hooks/useAuth";
import { isServicePincode } from "@/lib/serviceArea";
import { MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

import Home from "@/pages/Home";
import Category from "@/pages/Category";
import Product from "@/pages/Product";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import OrderSuccess from "@/pages/OrderSuccess";
import Orders from "@/pages/Orders";
import Profile from "@/pages/Profile";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/not-found";
import Notifications from "@/pages/Notifications";

import Privacy from "@/pages/legal/Privacy";
import Terms from "@/pages/legal/Terms";
import RefundCancellation from "@/pages/legal/RefundCancellation";
import ContactSupport from "@/pages/legal/ContactSupport";
import DeleteAccount from "@/pages/legal/DeleteAccount";

import VendorDashboard from "@/pages/vendor/Dashboard";
import VendorProducts from "@/pages/vendor/Products";
import AddProduct from "@/pages/vendor/AddProduct";
import EditProduct from "@/pages/vendor/EditProduct";
import VendorOrders from "@/pages/vendor/Orders";
import VendorShopProfile from "@/pages/vendor/ShopProfile";
import VendorRegister from "@/pages/VendorRegister";
import VendorStatus from "@/pages/VendorStatus";

import Admin from "@/pages/Admin";

const queryClient = new QueryClient();

import { CategoryBubble, type DisplayCategory } from "@/components/CategoryBubble";
import { SectionHeader } from "@/components/SectionHeader";
import { api } from "@/lib/api";

const DEFAULT_COLORS = [
  "hsl(35,90%,55%)", "hsl(140,60%,45%)", "hsl(200,70%,55%)", "hsl(20,90%,55%)",
  "hsl(210,80%,55%)", "hsl(45,90%,50%)", "hsl(0,65%,50%)", "hsl(330,70%,60%)",
  "hsl(280,60%,60%)", "hsl(170,60%,45%)", "hsl(260,55%,55%)", "hsl(200,80%,50%)",
  "hsl(350,80%,60%)", "hsl(160,60%,40%)", "hsl(230,60%,55%)", "hsl(250,55%,55%)",
];

function Categories() {
  const [apiCategories, setApiCategories] = useState<DisplayCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; categories: Array<{ _id: string; name: string; slug: string; emoji?: string; color?: string }> }>('/categories')
      .then(d => {
        setApiCategories((d.categories ?? []).map((c, i) => ({
          id: c.slug,
          name: c.name,
          emoji: c.emoji ?? "🛍️",
          color: c.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        })));
      })
      .catch(() => {})
      .finally(() => setCatLoading(false));
  }, []);

  return (
    <div className="pb-24 pt-4 px-4 max-w-7xl mx-auto space-y-6">
      <SectionHeader title="All Categories" />
      {catLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {[1,2,3,4,5,6,7,8,9].map(i => (
            <div key={i} className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : apiCategories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories available.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {apiCategories.map((category) => (
            <div key={category.id} className="flex justify-center">
              <CategoryBubble category={category} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import Shops from "@/pages/Shops";
import ShopDetail from "@/pages/ShopDetail";
import Search from "@/pages/Search";

function ServiceUnavailable() {
  const { updatePincode, logout } = useAuth();
  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center space-y-6"
      >
        <div className="w-20 h-20 bg-destructive/10 rounded-3xl flex items-center justify-center text-destructive mx-auto neu-inset">
          <MapPinOff className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Not Available Yet</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Sorry, SwiftMart is not available in your area yet. You can buy from another available area.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Currently serving: <strong>Balurghat (733101)</strong> &amp; <strong>Gangarampur (733103)</strong>
          </p>
        </div>
        <div className="space-y-3">
          <Button
            onClick={() => updatePincode("")}
            className="w-full h-12 rounded-2xl font-bold shadow-none neu-card"
          >
            Change Area
          </Button>
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full text-muted-foreground"
          >
            Sign Out
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function PincodeGuard({ children }: { children: React.ReactNode }) {
  const { user, role, isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user || isAdmin || role !== 'customer') return <>{children}</>;
  if (!user.pincode) return <PincodeSelector />;
  if (!isServicePincode(user.pincode)) return <ServiceUnavailable />;
  return <>{children}</>;
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <PincodeGuard>
        <Header />
        <main className="flex-1 w-full bg-background">{children}</main>
        <BottomNav />
      </PincodeGuard>
    </AuthGuard>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {children}
    </AuthGuard>
  );
}

function ThemedShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col font-sans selection:bg-primary selection:text-primary-foreground overflow-x-hidden w-full bg-background text-foreground rounded-tl-[0px] rounded-tr-[0px] rounded-br-[0px] rounded-bl-[0px] border-t-[0px] border-r-[0px] border-b-[0px] border-l-[0px]">
      {children}
    </div>
  );
}

function Router() {
  return (
    <ThemedShell>
      <Switch>
        <Route path="/auth" component={Auth} />

        {/* Public legal / support pages — no auth required */}
        <Route path="/privacy"             component={Privacy} />
        <Route path="/terms"               component={Terms} />
        <Route path="/refund-cancellation" component={RefundCancellation} />
        <Route path="/contact-support"     component={ContactSupport} />
        <Route path="/delete-account"      component={DeleteAccount} />

        <Route path="/">
          <ProtectedLayout><Home /></ProtectedLayout>
        </Route>
        <Route path="/categories">
          <ProtectedLayout><Categories /></ProtectedLayout>
        </Route>
        <Route path="/shops">
          <ProtectedLayout><Shops /></ProtectedLayout>
        </Route>
        <Route path="/shop/:vendorId">
          <ProtectedLayout><ShopDetail /></ProtectedLayout>
        </Route>
        <Route path="/search">
          <ProtectedLayout><Search /></ProtectedLayout>
        </Route>
        <Route path="/category/:slug">
          <ProtectedLayout><Category /></ProtectedLayout>
        </Route>
        <Route path="/product/:id">
          <ProtectedLayout><Product /></ProtectedLayout>
        </Route>

        <Route path="/cart">
          <ProtectedLayout><RoleGuard requiredRole="customer"><Cart /></RoleGuard></ProtectedLayout>
        </Route>
        <Route path="/checkout">
          <ProtectedLayout><RoleGuard requiredRole="customer"><Checkout /></RoleGuard></ProtectedLayout>
        </Route>
        <Route path="/order/success/:id">
          <ProtectedLayout><RoleGuard requiredRole="customer"><OrderSuccess /></RoleGuard></ProtectedLayout>
        </Route>
        <Route path="/orders">
          <ProtectedLayout><RoleGuard requiredRole="customer"><Orders /></RoleGuard></ProtectedLayout>
        </Route>

        <Route path="/profile">
          <ProtectedLayout><Profile /></ProtectedLayout>
        </Route>
        <Route path="/notifications">
          <ProtectedLayout><Notifications /></ProtectedLayout>
        </Route>

        <Route path="/vendor-register">
          <ProtectedLayout><VendorRegister /></ProtectedLayout>
        </Route>
        <Route path="/vendor-status">
          <ProtectedLayout><VendorStatus /></ProtectedLayout>
        </Route>

        <Route path="/vendor">
          <ProtectedLayout><RoleGuard requiredRole="vendor"><VendorDashboard /></RoleGuard></ProtectedLayout>
        </Route>
        <Route path="/vendor/products">
          <ProtectedLayout><RoleGuard requiredRole="vendor"><VendorProducts /></RoleGuard></ProtectedLayout>
        </Route>
        <Route path="/vendor/add-product">
          <ProtectedLayout><RoleGuard requiredRole="vendor"><AddProduct /></RoleGuard></ProtectedLayout>
        </Route>
        <Route path="/vendor/edit-product/:id">
          <ProtectedLayout><RoleGuard requiredRole="vendor"><EditProduct /></RoleGuard></ProtectedLayout>
        </Route>
        <Route path="/vendor/orders">
          <ProtectedLayout><RoleGuard requiredRole="vendor"><VendorOrders /></RoleGuard></ProtectedLayout>
        </Route>
        <Route path="/vendor/shop-profile">
          <ProtectedLayout><RoleGuard requiredRole="vendor"><VendorShopProfile /></RoleGuard></ProtectedLayout>
        </Route>

        <Route path="/admin">
          <AdminLayout><AdminGuard><Admin /></AdminGuard></AdminLayout>
        </Route>

        <Route>
          <ProtectedLayout><NotFound /></ProtectedLayout>
        </Route>
      </Switch>
    </ThemedShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ProductsProvider>
            <ShopsProvider>
            <CartProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </CartProvider>
            </ShopsProvider>
          </ProductsProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
