import { Link, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export const SUPPORT_EMAIL  = "swiftmart144@gmail.com";
export const SUPPORT_PHONE  = "+91 62961 18949";
export const APP_NAME       = "SwiftMart";

interface LegalLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, subtitle, children }: LegalLayoutProps) {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else navigate("/");
          }}
          className="w-9 h-9 rounded-xl bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <Link href="/" className="ml-auto text-xs text-primary font-medium flex-shrink-0 hover:underline">
          Home
        </Link>
      </header>

      {/* Page content */}
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full space-y-6 pb-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 px-4 py-5 text-center space-y-2">
        <div className="flex items-center justify-center gap-1.5">
          <img src="/logo.png" alt="SwiftMart" className="h-5 w-auto object-contain opacity-70" />
        </div>
        <p className="text-xs text-muted-foreground font-medium">
          Serving Balurghat, West Bengal
        </p>
        <p className="text-xs text-muted-foreground">
          Questions? Email us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline font-medium">
            {SUPPORT_EMAIL}
          </a>
          {" "}or call{" "}
          <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="text-primary hover:underline font-medium">
            {SUPPORT_PHONE}
          </a>
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap text-xs">
          <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
          <span className="text-border">·</span>
          <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
          <span className="text-border">·</span>
          <Link href="/refund-cancellation" className="text-muted-foreground hover:text-foreground transition-colors">Refunds</Link>
          <span className="text-border">·</span>
          <Link href="/contact-support" className="text-muted-foreground hover:text-foreground transition-colors">Support</Link>
          <span className="text-border">·</span>
          <Link href="/delete-account" className="text-muted-foreground hover:text-foreground transition-colors">Delete Account</Link>
        </div>
      </footer>
    </div>
  );
}

/** Reusable section block */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-2xl p-5 space-y-3">
      <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h2>
      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  );
}

/** Small highlighted info callout */
export function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-sm text-primary leading-relaxed">
      {children}
    </div>
  );
}
