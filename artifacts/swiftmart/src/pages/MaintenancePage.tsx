import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { MessageCircle, Phone, RefreshCw, Smartphone, Store, Sparkles, ShoppingBag, MapPin, Calendar, CheckCircle2 } from "lucide-react";

export default function MaintenancePage() {
  const [copied, setCopied] = useState(false);
  const phoneNumber = "6296118949";
  const formattedPhone = "+91 62961 18949";
  const whatsappUrl = `https://wa.me/91${phoneNumber}?text=${encodeURIComponent("Hello SwiftMart! Ami ekta order dite chai.")}`;

  const copyPhone = () => {
    navigator.clipboard.writeText(phoneNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Helmet>
        <title>SwiftMart (Swift Mart) — 10-Minute Delivery | Balurghat</title>
        <meta name="description" content="SwiftMart (Swift Mart) Balurghat website is currently undergoing a major platform upgrade. We are launching after 5th with many new partner shops and every product. WhatsApp ordering is 100% active at 6296118949." />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta property="og:updated_time" content="2026-10-03T12:00:00+05:30" />
        <meta property="article:modified_time" content="2026-10-03T12:00:00+05:30" />
        <link rel="canonical" href="https://swiftmart.space/" />
      </Helmet>

      <div className="min-h-screen bg-[#090a10] text-white flex flex-col items-center justify-start py-8 px-4 sm:px-6 relative overflow-x-hidden font-sans">
        {/* Background ambient lighting */}
        <div
          className="pointer-events-none fixed top-[-120px] left-1/2 -translate-x-1/2 w-[750px] h-[550px] rounded-full opacity-30 blur-[110px]"
          style={{
            background: "radial-gradient(circle, #f59e0b 0%, #6366f1 40%, #10b981 70%, transparent 85%)",
          }}
        />

        {/* Main Card */}
        <div className="relative w-full max-w-[700px] bg-gradient-to-b from-[#151722]/95 to-[#0d0e15]/95 border border-amber-500/30 rounded-3xl p-6 sm:p-10 text-center shadow-2xl shadow-purple-950/30 backdrop-blur-2xl mb-8">
          
          {/* Brand header */}
          <header className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30">
              🛒
            </div>
            <div className="text-left">
              <span className="text-2xl font-black tracking-tight text-white block leading-none">
                Swift<span className="text-amber-400">Mart</span>
              </span>
              <span className="text-[10px] text-amber-400/90 font-bold uppercase tracking-widest">
                Fastest Hyperlocal Delivery · Balurghat
              </span>
            </div>
          </header>

          {/* Animated badge */}
          <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wide px-4 py-1.5 rounded-full mb-4 animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>WEBSITE UPDATE IN PROGRESS · LAUNCHING SOON</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug mb-3">
            Platform Upgrade in Progress 🚀
          </h1>
          
          {/* Date announcement box */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-5 text-center">
            <div className="flex items-center justify-center gap-2 text-amber-400 font-extrabold text-sm sm:text-base mb-1">
              <Calendar className="w-5 h-5" />
              <span>Full Platform Relaunch Coming Soon!</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 font-medium">
              We are expanding our catalog with verified neighborhood partner stores and hundreds of new products.
            </p>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 max-w-xl mx-auto">
            Welcome to the official <strong>SwiftMart (Swift Mart)</strong> Balurghat portal. Founded by <strong>Ridam Mohanta</strong> and <strong>Abhi Das</strong>. We are upgrading our platform for ultra-fast performance, real-time inventory, and wider merchant onboarding across Balurghat. Our <strong>delivery fleet and instant WhatsApp ordering line are 100% operational!</strong>
          </p>

          {/* Feature Highlights Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-left">
            <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Verified Local Stores</h3>
                <p className="text-[11px] text-amber-200/80">Top partner merchants from Chakbhabani, Gourlo Math, and Raghunathpur.</p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-3.5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Comprehensive Catalog</h3>
                <p className="text-[11px] text-emerald-200/80">Fresh vegetables, daily dairy, groceries, OTC medicines, sweets, and bakery goods.</p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-indigo-500/30 rounded-xl p-3.5 flex items-start gap-3 sm:col-span-2">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">SwiftMart Android &amp; Web App</h3>
                <p className="text-[11px] text-indigo-200/80">Ultra-fast experience with instant real-time order tracking and local support.</p>
              </div>
            </div>
          </div>

          {/* WhatsApp Order Action Box */}
          <div className="bg-gradient-to-b from-emerald-950/70 to-emerald-900/30 border-2 border-emerald-500/50 rounded-2xl p-5 mb-6 text-left shadow-xl shadow-emerald-950/40">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm uppercase tracking-wide mb-1.5">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span>Need Urgent Delivery? Instant WhatsApp Ordering is Active</span>
            </div>
            
            <p className="text-xs text-slate-200 mb-4 font-medium leading-relaxed">
              While the catalog is updating, you can order groceries, dairy, vegetables, sweets, cakes, or OTC medicines directly via WhatsApp. Our delivery team delivers within 10-15 minutes across Balurghat:
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-3.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Order via WhatsApp</span>
              </a>

              <a
                href={`tel:${phoneNumber}`}
                className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-3.5 rounded-xl border border-slate-700 transition-all text-sm"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>{formattedPhone}</span>
              </a>
            </div>

            <div className="mt-3.5 text-center sm:text-left flex items-center justify-between text-[11px] text-emerald-400/90 pt-2.5 border-t border-emerald-500/25">
              <span>📱 Helpline &amp; WhatsApp: <strong>{formattedPhone}</strong></span>
              <button 
                onClick={copyPhone}
                type="button"
                className="text-xs text-amber-300 hover:underline font-bold cursor-pointer"
              >
                {copied ? "✓ Copied!" : "Copy Number"}
              </button>
            </div>
          </div>

          {/* Verified Local Business Address Microdata */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-left mb-6 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
              <MapPin className="w-4 h-4" />
              <span>Verified Local Business — Swift Mart Balurghat</span>
            </div>
            <address
              className="not-italic leading-relaxed text-slate-300"
              itemProp="address"
              itemScope
              itemType="https://schema.org/PostalAddress"
            >
              <strong>SwiftMart Head Office:</strong>{" "}
              <span itemProp="streetAddress">Gourlo Math</span>,{" "}
              <span itemProp="addressLocality">Balurghat</span>,{" "}
              <span itemProp="addressRegion">West Bengal</span> —{" "}
              <span itemProp="postalCode">733103</span>, India<br />
              <strong>Phone:</strong> <span itemProp="telephone">{formattedPhone}</span> | <strong>Timings:</strong> 07:00 AM – 11:00 PM (Daily)
            </address>
          </div>

          {/* Internal Links Directory (Sitemap Pages) */}
          <nav aria-label="Explore SwiftMart Website" className="border-t border-slate-800/80 pt-5 text-left mb-6">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
              SwiftMart Pages
            </h3>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <li><Link href="/about" className="text-amber-300 hover:underline">About Us &amp; Team</Link></li>
              <li><Link href="/contact-support" className="text-amber-300 hover:underline">Customer Support</Link></li>
              <li><Link href="/privacy" className="text-amber-300 hover:underline">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-amber-300 hover:underline">Terms of Service</Link></li>
              <li><Link href="/refund-cancellation" className="text-amber-300 hover:underline">Refund Policy</Link></li>
              <li><Link href="/sitemap" className="text-amber-300 hover:underline">Sitemap</Link></li>
            </ul>
          </nav>

          {/* Social Media Channels */}
          <div className="border-t border-slate-800/80 pt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 mb-6">
            <span className="font-semibold text-slate-300">Follow SwiftMart:</span>
            <a href="https://www.facebook.com/swiftmart.balurghat" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">Facebook</a>
            <span>•</span>
            <a href="https://www.instagram.com/swiftmart.balurghat" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">Instagram</a>
            <span>•</span>
            <a href="https://x.com/SwiftMart_IN" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">X (Twitter)</a>
            <span>•</span>
            <a href="https://www.linkedin.com/company/swiftmart-balurghat" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">LinkedIn</a>
            <span>•</span>
            <a href="https://www.youtube.com/@SwiftMartBalurghat" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">YouTube</a>
          </div>

          {/* Refresh Action */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              type="button"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Page (Check Status)</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <footer className="text-xs text-slate-500 font-medium text-center space-y-1">
          <p>© {new Date().getFullYear()} SwiftMart Technologies. Gourlo Math, Balurghat, West Bengal 733103.</p>
          <p>Balurghat&apos;s #1 Quick Commerce Service · 10-Minute Grocery Delivery</p>
        </footer>
      </div>
    </>
  );
}
