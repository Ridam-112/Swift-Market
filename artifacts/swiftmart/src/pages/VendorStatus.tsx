import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { useEffect } from "react";

export default function VendorStatus() {
  const { user, setRole } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user?.vendorStatus === 'none') {
      setLocation("/vendor-register");
    }
  }, [user, setLocation]);

  if (!user || user.vendorStatus === 'none') return null;

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-[100dvh] flex flex-col justify-center relative overflow-hidden bg-background">
      {user.vendorStatus === 'pending' && (
        <div className="bg-amber-50 dark:bg-amber-950/20 p-8 rounded-[2rem] neu-card space-y-6 text-center border border-amber-200 dark:border-amber-900/50">
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-500 shadow-inner">
            <Clock className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-amber-900 dark:text-amber-50 mb-2">Application Under Review</h1>
            <p className="text-amber-700/80 dark:text-amber-200/70">Our team reviews applications within 24 hours.</p>
          </div>
          <Link href="/">
            <Button className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card bg-amber-500 hover:bg-amber-600 text-white mt-4">
              Go to Home
            </Button>
          </Link>
        </div>
      )}

      {user.vendorStatus === 'approved' && (
        <div className="bg-green-50 dark:bg-green-950/20 p-8 rounded-[2rem] neu-card space-y-6 text-center border border-green-200 dark:border-green-900/50">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-500 shadow-inner">
            <CheckCircle className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-green-900 dark:text-green-50 mb-2">You're a verified seller!</h1>
            <p className="text-green-700/80 dark:text-green-200/70">Your store is ready to go live on SwiftMart.</p>
          </div>
          <Button 
            onClick={() => {
              setRole('vendor');
              setLocation("/vendor");
            }}
            className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card bg-green-600 hover:bg-green-700 text-white mt-4"
          >
            Go to Vendor Dashboard <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}

      {user.vendorStatus === 'rejected' && (
        <div className="bg-red-50 dark:bg-red-950/20 p-8 rounded-[2rem] neu-card space-y-6 text-center border border-red-200 dark:border-red-900/50">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto text-red-600 dark:text-red-500 shadow-inner">
            <XCircle className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-red-900 dark:text-red-50 mb-2">Application Rejected</h1>
            <p className="text-red-700/80 dark:text-red-200/70">Unfortunately, we could not approve your application at this time.</p>
          </div>
          <div className="pt-4 flex gap-3">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full rounded-2xl h-14 font-bold border-none neu-inset bg-red-100 text-red-900 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-100">
                Home
              </Button>
            </Link>
            <Link href="/vendor-register" className="flex-1">
              <Button className="w-full rounded-2xl h-14 font-bold shadow-none neu-card bg-red-600 hover:bg-red-700 text-white">
                Re-apply
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
