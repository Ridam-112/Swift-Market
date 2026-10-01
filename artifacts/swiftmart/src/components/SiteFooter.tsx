import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ChevronUp,
  Search,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// Canonical NAP constants — keep in sync with LegalLayout.tsx
export const SUPPORT_PHONE = "+91 62961 18949";
export const SUPPORT_EMAIL = "swiftmart144@gmail.com";
export const HEADQUARTERS_ADDRESS = "Saroj Ranjan Sarani, Gourlo Math, Balurghat, West Bengal 733103, India";

export const COVERAGE_AREAS = [
  "Khadimpur",
  "Power House More",
  "Raghunathpur",
  "Beltala",
  "Court More",
  "Station More",
  "Deshbandhu Para",
  "Parbatipur",
  "Nayananagar",
  "Senpara",
  "Madhyampara",
  "Netaji Colony",
];

export const FAQ_ITEMS = [
  {
    q: "How fast does SwiftMart deliver in Balurghat?",
    a: "SwiftMart delivers in as fast as 10 minutes across Balurghat (pincodes 733101 and 733103). Delivery time may vary based on shop distance and order volume.",
  },
  {
    q: "What can I order on SwiftMart?",
    a: "You can order fresh groceries, vegetables, fruits, dairy, bakery items, snacks, beverages, medicines, household essentials, and more from trusted local shops in Balurghat.",
  },
  {
    q: "Which areas does SwiftMart currently serve?",
    a: "SwiftMart currently serves Balurghat, West Bengal — pincodes 733101 and 733103, including Khadimpur, Raghunathpur, Beltala, Court More, Station More, and surrounding neighbourhoods. We are expanding to more areas soon.",
  },
  {
    q: "Does SwiftMart deliver medicines at night in Balurghat?",
    a: "Yes. SwiftMart delivers medicines and pharmacy items in Balurghat until 11:00 PM daily, subject to partner pharmacy availability. Simply search for 'medicine' or browse the Pharmacy category.",
  },
  {
    q: "How much does delivery cost on SwiftMart?",
    a: "Delivery fees vary by distance and order size. Express delivery under 2 km starts at ₹10, with a small packaging fee per order. The exact fee is shown at checkout before you confirm — no hidden charges.",
  },
  {
    q: "What payment methods does SwiftMart accept?",
    a: "SwiftMart accepts UPI (Google Pay, PhonePe, Paytm), Cash on Delivery (COD), and online payments via Razorpay. All transactions are secured with SSL encryption.",
  },
  {
    q: "How do I track my order?",
    a: "Once your order is placed, you can track it live on the Orders page. You'll see the rider's real-time location on the map when your order is out for delivery.",
  },
  {
    q: "Can local shops sell on SwiftMart?",
    a: "Yes! Local Balurghat shop owners can register as vendors on SwiftMart to reach more customers. Tap 'Become a Vendor' in your profile to get started.",
  },
];

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [faqOpen, setFaqOpen] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [faqFilter, setFaqFilter] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Monitor scroll for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    try {
      localStorage.setItem("sm_newsletter_email", cleanEmail);
    } catch {}
    toast.success("Subscribed! You'll receive exclusive Balurghat deals & offers 🎉");
    setEmail("");
  };

  const filteredFaqs = FAQ_ITEMS.filter(
    (item) =>
      item.q.toLowerCase().includes(faqFilter.toLowerCase()) ||
      item.a.toLowerCase().includes(faqFilter.toLowerCase())
  );

  return (
    <>
      <footer
        aria-label="SwiftMart global site footer"
        className="w-full bg-[#080B11] text-neutral-300 border-t border-white/10 pt-14 pb-28 md:pb-14 transition-colors"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main 4-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
            
            {/* ── Column 1: Brand, Tagline, Newsletter, Socials ── */}
            <div className="space-y-5">
              <Link href="/" className="inline-flex items-center gap-2 group">
                <span className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                  SWIFTMART
                  <span className="text-[10px] font-bold text-black bg-[#FACC15] px-1.5 py-0.5 rounded tracking-wide shadow-sm">
                    10 MIN
                  </span>
                </span>
              </Link>

              <p className="text-xs text-neutral-400 leading-relaxed">
                The omnichannel quick-commerce platform delivering groceries, fresh produce,
                daily essentials, and pharmacy items across Balurghat within 10–15 minutes.
              </p>

              {/* Newsletter subscription */}
              <div className="pt-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-white mb-2.5">
                  SUBSCRIBE TO DEALS &amp; DAILY OFFERS:
                </div>
                <form onSubmit={handleSubscribe} className="flex items-center gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="work-email@company.com"
                    required
                    className="bg-white text-neutral-900 text-xs font-medium px-3.5 py-2.5 rounded-lg flex-1 min-w-0 outline-none placeholder:text-neutral-500 shadow-sm focus:ring-2 focus:ring-[#FACC15]"
                  />
                  <button
                    type="submit"
                    className="bg-[#FACC15] hover:bg-[#EAB308] text-black font-extrabold text-xs px-5 py-2.5 rounded-lg shrink-0 shadow-md transition-all active:scale-95"
                  >
                    Join
                  </button>
                </form>
              </div>

              {/* Yellow squircle social buttons matching reference image */}
              <div className="pt-2 flex items-center gap-2.5">
                {/* LinkedIn */}
                <a
                  href="https://www.linkedin.com/company/swiftmart-balurghat"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="SwiftMart on LinkedIn"
                  className="w-8 h-8 rounded-lg bg-[#FACC15] text-black flex items-center justify-center hover:opacity-90 hover:scale-105 active:scale-95 transition-all shadow-sm"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                  </svg>
                </a>

                {/* Twitter / X */}
                <a
                  href="https://x.com/SwiftMart_IN"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="SwiftMart on X (Twitter)"
                  className="w-8 h-8 rounded-lg bg-[#FACC15] text-black flex items-center justify-center hover:opacity-90 hover:scale-105 active:scale-95 transition-all shadow-sm"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/swiftmart.balurghat"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="SwiftMart on Instagram"
                  className="w-8 h-8 rounded-lg bg-[#FACC15] text-black flex items-center justify-center hover:opacity-90 hover:scale-105 active:scale-95 transition-all shadow-sm"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>

                {/* WhatsApp */}
                <a
                  href="https://wa.me/916296118949"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="SwiftMart on WhatsApp"
                  className="w-8 h-8 rounded-lg bg-[#FACC15] text-black flex items-center justify-center hover:opacity-90 hover:scale-105 active:scale-95 transition-all shadow-sm"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24M8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.13.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.53.59.19 1.13.16 1.56.1.47-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29-.25-.13-1.46-.72-1.69-.8-.23-.09-.4-.13-.56.13-.17.25-.66.8-.8 1-.15.19-.3.22-.55.09-.25-.13-1.07-.39-2.04-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.84-.2-.48-.41-.42-.56-.43h-.48z"/>
                  </svg>
                </a>

                {/* Facebook */}
                <a
                  href="https://www.facebook.com/swiftmart.balurghat"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="SwiftMart on Facebook"
                  className="w-8 h-8 rounded-lg bg-[#FACC15] text-black flex items-center justify-center hover:opacity-90 hover:scale-105 active:scale-95 transition-all shadow-sm"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* ── Column 2: Quick Links / Solutions ── */}
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-white mb-4">
                SOLUTIONS &amp; QUICK LINKS
              </div>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link href="/category/fruits-vegetables" className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-block transition-transform">
                    Fresh Fruits &amp; Vegetables
                  </Link>
                </li>
                <li>
                  <Link href="/category/grocery" className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-block transition-transform">
                    Daily Kirana &amp; Groceries
                  </Link>
                </li>
                <li>
                  <Link href="/category/dairy" className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-block transition-transform">
                    Dairy, Bread &amp; Eggs
                  </Link>
                </li>
                <li>
                  <Link href="/category/sweet-shop" className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-block transition-transform">
                    Balurghat Sweets &amp; Bakery
                  </Link>
                </li>
                <li>
                  <Link href="/category/pharmacy" className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-block transition-transform">
                    Pharmacy &amp; Health Essentials
                  </Link>
                </li>
                <li>
                  <Link href="/all-products" className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-block transition-transform">
                    SwiftMart Super Store
                  </Link>
                </li>
                <li>
                  <Link href="/shops" className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-block transition-transform">
                    Balurghat Local Shops
                  </Link>
                </li>
                <li>
                  <Link href="/" className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-block transition-transform">
                    Instant 10-Minute Delivery
                  </Link>
                </li>
              </ul>
            </div>

            {/* ── Column 3: Expanded Catalog, Support & Legal ── */}
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-white mb-4">
                EXPANDED CATALOG &amp; SUPPORT
              </div>
              <ul className="space-y-2.5 text-xs">
                {/* Frequently Asked Questions trigger */}
                <li>
                  <button
                    onClick={() => setFaqOpen(true)}
                    className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-flex items-center gap-1.5 transition-transform text-left"
                  >
                    <span>Frequently Asked Questions</span>
                    <span className="text-[10px] bg-white/10 text-amber-400 px-1.5 py-0.2 rounded font-semibold">
                      FAQ
                    </span>
                  </button>
                </li>
                {/* Coverage areas trigger */}
                <li>
                  <button
                    onClick={() => setCoverageOpen(true)}
                    className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-flex items-center gap-1.5 transition-transform text-left"
                  >
                    <span>Delivery Coverage in Balurghat</span>
                    <span className="text-[10px] bg-white/10 text-emerald-400 px-1.5 py-0.2 rounded font-semibold">
                      733101 &amp; 733103
                    </span>
                  </button>
                </li>
                <li>
                  <Link href="/orders" className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-block transition-transform">
                    Track Live Orders
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-block transition-transform">
                    About Us &amp; Founders
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-block transition-transform">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-block transition-transform">
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/refund-cancellation" className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-block transition-transform">
                    Refund &amp; Cancellation
                  </Link>
                </li>
                <li>
                  <Link href="/contact-support" className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-block transition-transform">
                    Client Support Desk
                  </Link>
                </li>
                <li>
                  <Link href="/legal/delete-account" className="text-neutral-400 hover:text-white hover:translate-x-0.5 inline-block transition-transform">
                    Delete Account
                  </Link>
                </li>
              </ul>
            </div>

            {/* ── Column 4: Headquarters & Contact ── */}
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-white mb-4">
                HEADQUARTERS &amp; CONTACT
              </div>

              <address
                className="not-italic space-y-4 text-xs"
                itemProp="address"
                itemScope
                itemType="https://schema.org/PostalAddress"
              >
                {/* Hub Location */}
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-[#FACC15]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wider">
                      CENTRAL DISPATCH HUB
                    </div>
                    <div className="text-neutral-400 leading-relaxed">
                      <span itemProp="streetAddress">Saroj Ranjan Sarani, Gourlo Math</span>,<br />
                      <span itemProp="addressLocality">Balurghat</span>,{" "}
                      <span itemProp="addressRegion">West Bengal</span> &ndash;{" "}
                      <span itemProp="postalCode">733103</span>, India
                    </div>
                    <div className="text-[10px] text-amber-400 font-semibold pt-0.5">
                      Pincodes: 733101 &amp; 733103
                    </div>
                  </div>
                </div>

                {/* Corporate / Support Desk */}
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-[#FACC15]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wider">
                      CUSTOMER SUPPORT DESK
                    </div>
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      itemProp="email"
                      className="text-neutral-400 hover:text-white transition-colors block"
                    >
                      {SUPPORT_EMAIL}
                    </a>
                  </div>
                </div>

                {/* Client Helpline */}
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-[#FACC15]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wider">
                      CLIENT SUPPORT &amp; HELPLINE
                    </div>
                    <a
                      href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
                      itemProp="telephone"
                      className="text-neutral-400 hover:text-white font-medium transition-colors block"
                    >
                      {SUPPORT_PHONE}
                    </a>
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-[#FACC15]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wider">
                      OPERATING HOURS
                    </div>
                    <div className="text-neutral-400">
                      Mon &ndash; Sun: 7:00 AM &ndash; 11:00 PM IST
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold pt-0.5">
                      ⚡ Instant 10-Minute Express Delivery
                    </div>
                  </div>
                </div>
              </address>
            </div>

          </div>

          {/* Sub-footer Bottom Bar */}
          <div className="border-t border-white/10 pt-8 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
            <p className="text-center sm:text-left">
              &copy; {new Date().getFullYear()} SwiftMart. All rights reserved. Founded by{" "}
              <span className="text-neutral-300 font-medium">Ridam Mahanta</span> &amp;{" "}
              <span className="text-neutral-300 font-medium">Abhi Das</span>.
            </p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-neutral-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Balurghat Quick Commerce Active
              </span>
              <span>&middot;</span>
              <span className="text-neutral-400">Made with &#10084;&#65039; in Balurghat</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Floating Scroll-to-Top Button (matching reference image) ── */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll back to top"
          className="fixed bottom-36 right-4 md:bottom-24 md:right-7 z-40 w-11 h-11 rounded-full bg-[#0A0E17] border-2 border-sky-500 text-sky-400 hover:bg-sky-500 hover:text-white shadow-xl transition-all flex items-center justify-center group active:scale-95"
        >
          <ChevronUp className="w-5 h-5 stroke-[2.5] group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}

      {/* ── FAQ Modal Dialog ── */}
      <Dialog open={faqOpen} onOpenChange={setFaqOpen}>
        <DialogContent className="max-w-2xl bg-[#0B0F17] text-white border-white/10 p-6 max-h-[85vh] flex flex-col rounded-2xl shadow-2xl">
          <DialogHeader className="pb-3 border-b border-white/10 text-left">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FACC15]" />
              Frequently Asked Questions
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Instant answers about SwiftMart&apos;s 10-minute grocery delivery in Balurghat.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Search inside FAQ */}
          <div className="relative mt-2">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={faqFilter}
              onChange={(e) => setFaqFilter(e.target.value)}
              placeholder="Search question (e.g. delivery time, payment, medicine)..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#FACC15]"
            />
          </div>

          {/* Scrollable list of questions */}
          <div className="overflow-y-auto space-y-2.5 pr-1 mt-2 flex-1">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-xs">
                No matching questions found. Contact our support team via WhatsApp or call {SUPPORT_PHONE}.
              </div>
            ) : (
              filteredFaqs.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between gap-3 p-3.5 text-left text-xs font-semibold text-neutral-200 hover:text-white transition-colors"
                    >
                      <span>{item.q}</span>
                      <ChevronRight
                        className={`w-4 h-4 text-[#FACC15] shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 pt-1 text-xs text-neutral-400 leading-relaxed border-t border-white/5">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delivery Coverage Modal Dialog ── */}
      <Dialog open={coverageOpen} onOpenChange={setCoverageOpen}>
        <DialogContent className="max-w-2xl bg-[#0B0F17] text-white border-white/10 p-6 max-h-[85vh] flex flex-col rounded-2xl shadow-2xl">
          <DialogHeader className="pb-3 border-b border-white/10 text-left">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#FACC15]" />
              Delivery Coverage in Balurghat
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              We currently deliver across Balurghat (pincodes 733101 &amp; 733103) in as fast as 10 minutes.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto space-y-4 pr-1 mt-2 flex-1">
            {/* OpenStreetMap Map */}
            <div className="rounded-xl overflow-hidden border border-white/10 h-48 w-full bg-neutral-900">
              <iframe
                src="https://www.openstreetmap.org/export/embed.html?bbox=88.73%2C25.19%2C88.80%2C25.25&amp;layer=mapnik&amp;marker=25.2167%2C88.7667"
                width="100%"
                height="100%"
                title="SwiftMart Balurghat Delivery Zone Map"
                loading="lazy"
                className="border-0 w-full h-full"
              />
            </div>

            {/* List of active coverage areas */}
            <div>
              <div className="text-xs font-semibold text-neutral-300 mb-2">
                Active Delivery Hubs &amp; Neighbourhoods:
              </div>
              <div className="flex flex-wrap gap-2">
                {COVERAGE_AREAS.map((area) => (
                  <span
                    key={area}
                    className="text-[11px] font-medium bg-white/5 border border-white/10 px-3 py-1 rounded-full text-neutral-300 flex items-center gap-1"
                  >
                    📍 {area}
                  </span>
                ))}
                <span className="text-[11px] font-medium bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/30 px-3 py-1 rounded-full">
                  ⚡ Expanding to more zones soon
                </span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-neutral-400 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-neutral-200">Guaranteed 10-Minute Delivery:</strong> All orders inside
                the Balurghat municipality and surrounding 4 km radius are dispatched directly from our local partner stores and dark hubs.
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
