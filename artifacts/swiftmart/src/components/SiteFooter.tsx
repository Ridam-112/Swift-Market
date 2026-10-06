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
    a: "SwiftMart offers fast local delivery across Balurghat (pincodes 733101 and 733103). Most local store orders arrive within 30–60 minutes, while food and bakery are prepared fresh, and Super Mall or scheduled services follow merchant/technician timelines.",
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
        className="w-full bg-[#0a0d14] text-neutral-300 border-t border-border/40 pt-10 pb-24 md:pb-10 transition-colors"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main 4-Column Grid (Requirement #17) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-10">
            
            {/* ── Column 1: SwiftMart ── */}
            <div className="space-y-3 col-span-2 sm:col-span-1">
              <Link href="/" className="inline-flex items-center gap-2 group">
                <span className="text-xl font-black tracking-tight text-foreground flex items-center gap-1.5">
                  SWIFTMART
                  <span className="text-[9px] font-extrabold text-primary-foreground bg-primary px-1.5 py-0.5 rounded tracking-wide">
                    BALURGHAT
                  </span>
                </span>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Local stores, food, shopping &amp; home services — all in one place in Balurghat.
              </p>
              <ul className="space-y-2 text-xs pt-1">
                <li>
                  <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/vendor-register" className="text-muted-foreground hover:text-foreground transition-colors">
                    Partner With Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* ── Column 2: Help ── */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-foreground">
                Help
              </div>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/contact-support" className="text-muted-foreground hover:text-foreground transition-colors">
                    Support Desk
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => setFaqOpen(true)}
                    className="text-muted-foreground hover:text-foreground transition-colors text-left"
                  >
                    FAQ
                  </button>
                </li>
                <li>
                  <Link href="/orders" className="text-muted-foreground hover:text-foreground transition-colors">
                    Track Orders
                  </Link>
                </li>
              </ul>
            </div>

            {/* ── Column 3: Policies ── */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-foreground">
                Policies
              </div>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/refund-cancellation" className="text-muted-foreground hover:text-foreground transition-colors">
                    Refund &amp; Cancellation
                  </Link>
                </li>
              </ul>
            </div>

            {/* ── Column 4: Contact ── */}
            <div className="space-y-3 col-span-2 sm:col-span-1">
              <div className="text-xs font-bold uppercase tracking-wider text-foreground">
                Contact
              </div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-foreground transition-colors truncate">
                    {SUPPORT_EMAIL}
                  </a>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="hover:text-foreground transition-colors">
                    {SUPPORT_PHONE}
                  </a>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="leading-tight">
                    Saroj Ranjan Sarani, Gourlo Math, Balurghat, 733103
                  </span>
                </li>
              </ul>
            </div>

          </div>

          {/* Sub-footer Bottom Bar */}
          <div className="border-t border-border/40 pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p className="text-center sm:text-left">
              &copy; {new Date().getFullYear()} SwiftMart. All rights reserved.
            </p>
            <p className="text-center sm:text-right">
              Made with &#10084;&#65039; in Balurghat
            </p>
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
