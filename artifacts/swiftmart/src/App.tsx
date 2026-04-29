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

function Router() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans selection:bg-primary selection:text-primary-foreground">
      <Header />
      <main className="flex-1 w-full">
        <Switch>
          {/* Public / Customer Routes */}
          <Route path="/" component={Home} />
          <Route path="/auth" component={Auth} />
          <Route path="/categories" component={Categories} />
          <Route path="/category/:slug" component={Category} />
          <Route path="/product/:id" component={Product} />
          
          <Route path="/cart">
            <RoleGuard requiredRole="customer"><Cart /></RoleGuard>
          </Route>
          <Route path="/checkout">
            <RoleGuard requiredRole="customer"><Checkout /></RoleGuard>
          </Route>
          <Route path="/order/success/:id">
            <RoleGuard requiredRole="customer"><OrderSuccess /></RoleGuard>
          </Route>
          <Route path="/orders">
            <RoleGuard requiredRole="customer"><Orders /></RoleGuard>
          </Route>
          
          {/* Shared Authenticated Routes */}
          <Route path="/profile" component={Profile} />

          {/* Vendor Routes */}
          <Route path="/vendor">
            <RoleGuard requiredRole="vendor"><VendorDashboard /></RoleGuard>
          </Route>
          <Route path="/vendor/products">
            <RoleGuard requiredRole="vendor"><VendorProducts /></RoleGuard>
          </Route>
          <Route path="/vendor/add-product">
            <RoleGuard requiredRole="vendor"><AddProduct /></RoleGuard>
          </Route>
          <Route path="/vendor/orders">
            <RoleGuard requiredRole="vendor"><VendorOrders /></RoleGuard>
          </Route>

          <Route component={NotFound} />
        </Switch>
      </main>
      <BottomNav />
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
