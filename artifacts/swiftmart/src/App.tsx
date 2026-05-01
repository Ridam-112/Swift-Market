import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Context Providers
import { AuthProvider } from "@/context/AuthContext";
import { ProductsProvider } from "@/context/ProductsContext";
import { CartProvider } from "@/context/CartContext";

// Layout Components
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { RoleGuard } from "@/components/RoleGuard";
import { AuthGuard } from "@/components/AuthGuard";

// Pages
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

// Vendor Pages
import VendorDashboard from "@/pages/vendor/Dashboard";
import VendorProducts from "@/pages/vendor/Products";
import AddProduct from "@/pages/vendor/AddProduct";
import VendorOrders from "@/pages/vendor/Orders";

const queryClient = new QueryClient();

// Add Categories page inline since it's simple
import { categories } from "@/data/categories";
import { CategoryBubble } from "@/components/CategoryBubble";
import { SectionHeader } from "@/components/SectionHeader";

function Categories() {
  return (
    <div className="pb-24 pt-4 px-4 max-w-7xl mx-auto space-y-6">
      <SectionHeader title="All Categories" />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {categories.map((category) => (
          <div key={category.id} className="flex justify-center">
            <CategoryBubble category={category} />
          </div>
        ))}
      </div>
    </div>
  );
}

import Shops from "@/pages/Shops";
import ShopDetail from "@/pages/ShopDetail";
import Search from "@/pages/Search";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Header />
      <main className="flex-1 w-full">{children}</main>
      <BottomNav />
    </AuthGuard>
  );
}

function Router() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans selection:bg-primary selection:text-primary-foreground">
      <Switch>
        {/* Unprotected Auth Route */}
        <Route path="/auth" component={Auth} />

        {/* All other routes protected by AuthGuard */}
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
        
        {/* Shared Authenticated Routes */}
        <Route path="/profile">
          <ProtectedLayout><Profile /></ProtectedLayout>
        </Route>

        {/* Vendor Routes */}
        <Route path="/vendor">
          <ProtectedLayout><RoleGuard requiredRole="vendor"><VendorDashboard /></RoleGuard></ProtectedLayout>
        </Route>
        <Route path="/vendor/products">
          <ProtectedLayout><RoleGuard requiredRole="vendor"><VendorProducts /></RoleGuard></ProtectedLayout>
        </Route>
        <Route path="/vendor/add-product">
          <ProtectedLayout><RoleGuard requiredRole="vendor"><AddProduct /></RoleGuard></ProtectedLayout>
        </Route>
        <Route path="/vendor/orders">
          <ProtectedLayout><RoleGuard requiredRole="vendor"><VendorOrders /></RoleGuard></ProtectedLayout>
        </Route>

        <Route>
          <ProtectedLayout><NotFound /></ProtectedLayout>
        </Route>
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ProductsProvider>
            <CartProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </CartProvider>
          </ProductsProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
