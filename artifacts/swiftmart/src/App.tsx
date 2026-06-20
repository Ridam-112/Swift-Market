import { useState, useEffect, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";

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
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useAuth } from "@/hooks/useAuth";
import { setupPushMessageListener, playNotificationSound } from "@/lib/pushNotifications";

import { MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// ── Critical customer path — eagerly bundled for fast first load ──────────────
import Home         from "@/pages/Home";
import Category     from "@/pages/Category";
import Product      from "@/pages/Product";
import Cart         from "@/pages/Cart";
import Checkout     from "@/pages/Checkout";
import OrderSuccess from "@/pages/OrderSuccess";
import Orders       from "@/pages/Orders";
import Auth         from "@/pages/Auth";

// ── Lazy-loaded — split into separate chunks to shrink the initial bundle ──────
const Profile        = lazy(() => import("@/pages/Profile"));
const NotFound       = lazy(() => import("@/pages/not-found"));
const Notifications  = lazy(() => import("@/pages/Notifications"));
const Shops          = lazy(() => import("@/pages/Shops"));
const ShopDetail     = lazy(() => import("@/pages/ShopDetail"));
const Search         = lazy(() => import("@/pages/Search"));

const Privacy            = lazy(() => import("@/pages/legal/Privacy"));
const Terms              = lazy(() => import("@/pages/legal/Terms"));
const RefundCancellation = lazy(() => import("@/pages/legal/RefundCancellation"));
const ContactSupport     = lazy(() => import("@/pages/legal/ContactSupport"));
const DeleteAccount      = lazy(() => import("@/pages/legal/DeleteAccount"));

const VendorDashboard    = lazy(() => import("@/pages/vendor/Dashboard"));
const VendorProducts     = lazy(() => import("@/pages/vendor/Products"));
const AddProduct         = lazy(() => import("@/pages/vendor/AddProduct"));
const EditProduct        = lazy(() => import("@/pages/vendor/EditProduct"));
const VendorOrders       = lazy(() => import("@/pages/vendor/Orders"));
const VendorShopProfile  = lazy(() => import("@/pages/vendor/ShopProfile"));
const VendorRegister     = lazy(() => import("@/pages/VendorRegister"));
const VendorStatus       = lazy(() => import("@/pages/VendorStatus"));

const Admin       = lazy(() => import("@/pages/Admin"));
const AllProducts = lazy(() => import("@/pages/AllProducts"));

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

const CATEGORY_PRIORITY: Record<string, number> = {
  grocery: 1, "kirana-store": 2, "fruits-vegetables": 3, vegetables: 4, fruits: 5,
  "sweet-shop": 6, bakery: 7, dairy: 8, snacks: 9, drinks: 10,
  restaurant: 11, "cloud-kitchen": 12, "fast-food": 13, "meat-fish": 14, "meat-shop": 15, "fish-shop": 16,
  medicine: 17, pharmacy: 18, cosmetics: 19, "personal-care": 20, beauty: 21,
  clothing: 22, fashion: 23, handmade: 24, electronics: 25, "mobile-phone": 26,
  toys: 27, household: 28, gifts: 29, gaming: 30, hardware: 31,
};
function sortCategories<T extends { id: string; name: string }>(cats: T[]): T[] {
  return [...cats].sort((a, b) => {
    const pa = CATEGORY_PRIORITY[a.id] ?? 999;
    const pb = CATEGORY_PRIORITY[b.id] ?? 999;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });
}

function Categories() {
  const [apiCategories, setApiCategories] = useState<DisplayCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; categories: Array<{ _id: string; name: string; slug: string; emoji?: string; color?: string }> }>('/categories')
      .then(d => {
        const mapped = (d.categories ?? []).map((c, i) => ({
          id: c.slug,
          name: c.name,
          emoji: c.emoji ?? "🛍️",
          color: c.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        }));
        setApiCategories(sortCategories(mapped));
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
            Currently serving: <strong>Balurghat (733101 &amp; 733103)</strong>
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
  return <>{children}</>;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return (
    <AuthGuard>
      <PincodeGuard>
        <Header />
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location}
            className="flex-1 w-full bg-background"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <Suspense fallback={<PageLoader />}>
              {children}
            </Suspense>
          </motion.main>
        </AnimatePresence>
        <BottomNav />
      </PincodeGuard>
    </AuthGuard>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
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
        <Route path="/products">
          <ProtectedLayout><AllProducts /></ProtectedLayout>
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

/**
 * Handles two things for logged-in users:
 * 1. Shows the notification permission prompt after login (if not yet granted/dismissed).
 * 2. Listens for push messages from the service worker and plays a sound + shows a
 *    toast when a notification arrives while the app is in the foreground.
 */
function PushManager() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const cleanup = setupPushMessageListener((title, body) => {
      playNotificationSound();
      toast(title, { description: body, duration: 5000 });
    });
    return cleanup;
  }, [user]);

  if (!user) return null;
  return <NotificationPrompt userId={user.id} />;
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
              <PushManager />
              <InstallPrompt />
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
