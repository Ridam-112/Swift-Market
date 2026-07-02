import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

import { SEO } from "@/components/SEO";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-140px)] w-full flex items-center justify-center p-4">
      <SEO noIndex />
      <div className="w-full max-w-md bg-card p-8 rounded-3xl neu-card text-center">
        <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto mb-6 neu-inset text-destructive">
          <AlertCircle className="h-10 w-10" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">404 Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>

        <Link href="/">
          <Button className="w-full rounded-full h-12 font-bold shadow-none neu-card">
            Go to Homepage
          </Button>
        </Link>
      </div>
    </div>
  );
}
