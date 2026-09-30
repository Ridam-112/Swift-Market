import { Link } from "wouter";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

// Canonical NAP constants — keep in sync with LegalLayout.tsx
const SUPPORT_PHONE = "+91 62961 18949";
const SUPPORT_EMAIL = "swiftmart144@gmail.com";

/**
 * SiteFooter — global about/legal/NAP footer used on all public-facing pages.
 *
 * Displays consistent Name-Address-Phone (NAP) data so Google can associate
 * this site with the LocalBusiness schema and Google Business Profile.
 */
export function SiteFooter() {
  return (
    <footer aria-label="SwiftMart site footer" className="border-t border-border/30 pt-6 space-y-5">
      {/* About blurb */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            About SwiftMart
          </div>
          <Link href="/about" className="text-xs font-bold text-primary hover:underline">
            Read Our Story &rarr;
          </Link>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          SwiftMart is Balurghat&apos;s very own quick commerce &amp; e-grocery app — founded by Ridam Mahanta &amp; Abhi Das. Built for the
          people of Balurghat, delivering groceries, daily essentials,
          fresh produce, sweets, and medicines right to your doorstep in as fast as{" "}
          <span className="font-semibold text-foreground">10 minutes</span>.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {["⚡ 10-Min Delivery", "🛒 Quick Commerce", "🏪 Local Dukandars", "📍 Balurghat Only"].map(tag => (
            <span
              key={tag}
              className="text-[10px] font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* NAP block — Name, Address, Phone for local SEO */}
      <address
        className="not-italic bg-card rounded-2xl p-4 space-y-2.5 text-xs text-muted-foreground neu-card"
        aria-label="SwiftMart contact information"
        itemProp="address"
        itemScope
        itemType="https://schema.org/PostalAddress"
      >
        <div className="text-xs font-bold text-foreground uppercase tracking-wide mb-1 flex items-center justify-between">
          <span>Contact Us &amp; Head Office</span>
          <span className="text-[10px] text-amber-500 font-semibold">5.0 ★★★★★ Verified</span>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-foreground">SwiftMart Balurghat</strong><br />
            <span itemProp="streetAddress">Gourlo Math</span>,{" "}
            <span itemProp="addressLocality">Balurghat</span>,{" "}
            <span itemProp="addressRegion">West Bengal</span> &ndash;{" "}
            <span itemProp="postalCode">733103</span>, India
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
          <a
            href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
            className="hover:text-primary transition-colors font-medium"
            itemProp="telephone"
          >
            {SUPPORT_PHONE}
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="hover:text-primary transition-colors font-medium"
          >
            {SUPPORT_EMAIL}
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
          <span>Open daily, <span className="font-semibold text-foreground">7:00 AM – 11:00 PM</span></span>
        </div>
      </address>

      {/* Social Media Links for SEO & Trust */}
      <div className="pt-1 border-t border-border/20 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Connect with us:</span>
        <a href="https://www.facebook.com/swiftmart.balurghat" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Facebook</a>
        <span>·</span>
        <a href="https://www.instagram.com/swiftmart.balurghat" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Instagram</a>
        <span>·</span>
        <a href="https://x.com/SwiftMart_IN" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">X (Twitter)</a>
        <span>·</span>
        <a href="https://www.linkedin.com/company/swiftmart-balurghat" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">LinkedIn</a>
        <span>·</span>
        <a href="https://www.youtube.com/@SwiftMartBalurghat" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">YouTube</a>
      </div>

      <p className="text-xs text-muted-foreground font-medium">
        Proudly serving Balurghat, West Bengal 🇮🇳
      </p>

      {/* Legal & About links */}
      <nav aria-label="Legal and support links" className="flex items-center gap-3 flex-wrap text-xs pb-2">
        <Link href="/about" className="text-primary font-semibold hover:underline transition-colors">
          About Us
        </Link>
        <span className="text-border" aria-hidden="true">·</span>
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
    </footer>
  );
}
