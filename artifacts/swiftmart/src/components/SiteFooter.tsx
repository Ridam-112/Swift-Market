import { Link } from "wouter";
import { MapPin } from "lucide-react";

/**
 * SiteFooter — global about/legal footer used on public-facing pages.
 * Provides inbound links to all legal/support routes so they are never
 * orphaned in the crawl graph.
 */
export function SiteFooter() {
  return (
    <section aria-label="About SwiftMart" className="border-t border-border/30 pt-6 space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <MapPin className="w-3.5 h-3.5" />
        About SwiftMart
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        SwiftMart is Balurghat&apos;s very own quick commerce &amp; e-grocery app — built for the
        people of Balurghat, by the people of Balurghat. We deliver groceries, daily essentials,
        snacks, beverages, household items, and much more right to your doorstep in as fast as{" "}
        <span className="font-semibold text-foreground">10 minutes</span>.
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        No more waiting in queues or travelling to the market. Open the app, pick what you need from
        your favourite local shops, and sit back — SwiftMart handles the rest. Our network of
        trusted local vendors across Balurghat ensures you always get fresh, quality products at
        honest prices.
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        {["⚡ 10-Min Delivery", "🛒 E-Grocery", "🏪 Local Shops", "📍 Balurghat Only"].map(tag => (
          <span
            key={tag}
            className="text-[10px] font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground font-medium">
        Proudly serving Balurghat, West Bengal 🇮🇳
      </p>
      <nav aria-label="Legal and support links" className="flex items-center gap-3 flex-wrap text-xs pt-1">
        <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
          Privacy
        </Link>
        <span className="text-border" aria-hidden="true">·</span>
        <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
          Terms
        </Link>
        <span className="text-border" aria-hidden="true">·</span>
        <Link href="/refund-cancellation" className="text-muted-foreground hover:text-foreground transition-colors">
          Refunds
        </Link>
        <span className="text-border" aria-hidden="true">·</span>
        <Link href="/contact-support" className="text-muted-foreground hover:text-foreground transition-colors">
          Support
        </Link>
      </nav>
    </section>
  );
}
