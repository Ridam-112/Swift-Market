import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Zap,
  Target,
  Compass,
  Users,
  Award,
  Truck,
  HeartHandshake,
  ShoppingBag,
  Store,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Mail,
  Phone,
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  TrendingUp,
  Cpu,
  UserCheck,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { SiteFooter } from "@/components/SiteFooter";

// Schema for Google Search Console and Rich Snippets
const aboutJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About SwiftMart Balurghat",
    "description": "Learn about SwiftMart, Balurghat's premier 10-minute quick commerce platform founded by Ridam Mahanta and Abhi Das.",
    "url": "https://swiftmart.space/about",
    "mainEntity": {
      "@type": "Organization",
      "name": "SwiftMart",
      "alternateName": ["SwiftMart Balurghat", "Swift Mart"],
      "url": "https://swiftmart.space",
      "logo": "https://swiftmart.space/logo.png",
      "description": "Hyperlocal 10-minute grocery and essentials delivery service in Balurghat, West Bengal.",
      "foundingDate": "2024",
      "founders": [
        {
          "@type": "Person",
          "name": "Ridam Mahanta",
          "jobTitle": "Founder & Chief Executive Officer",
          "sameAs": "https://swiftmart.space/about#founders"
        },
        {
          "@type": "Person",
          "name": "Abhi Das",
          "jobTitle": "Co-Founder",
          "sameAs": "https://swiftmart.space/about#founders"
        }
      ],
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Balurghat Main Road",
        "addressLocality": "Balurghat",
        "addressRegion": "West Bengal",
        "postalCode": "733101",
        "addressCountry": "IN"
      },
      "areaServed": [
        {
          "@type": "AdministrativeArea",
          "name": "Balurghat (733101, 733103)"
        }
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+91 62961 18949",
        "contactType": "customer service",
        "email": "swiftmart144@gmail.com",
        "areaServed": "IN"
      }
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "SwiftMart Quick Commerce Delivery Balurghat",
    "image": "https://swiftmart.space/opengraph.jpg",
    "telephone": "+91 62961 18949",
    "email": "swiftmart144@gmail.com",
    "priceRange": "₹",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Balurghat",
      "addressRegion": "West Bengal",
      "postalCode": "733101",
      "addressCountry": "IN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 25.2215,
      "longitude": 88.7645
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      "opens": "07:00",
      "closes": "23:00"
    }
  }
];

export default function AboutUs() {
  // Photos can be updated when provided by setting state or asset paths
  const [photoRidam] = useState<string | null>(null);
  const [photoAbhi] = useState<string | null>(null);

  return (
    <>
      <SEO
        title="About Us | SwiftMart Balurghat - 10-Min Quick Commerce & Grocery Delivery"
        description="Meet SwiftMart, Balurghat's homegrown 10-minute quick commerce delivery service founded by Ridam Mahanta and Abhi Das. Like Blinkit and Zepto, delivering groceries, fresh produce, sweets, and medicines near you."
        canonical="/about"
        keywords="quick commerce near me, online grocery delivery balurghat, 10 minute delivery balurghat, blinkit balurghat, zepto balurghat, swiftmart founders, ridam mahanta, abhi das, fastest grocery delivery dakshin dinajpur, local commerce balurghat, buy groceries online balurghat"
        jsonLd={aboutJsonLd}
      />

      <div className="min-h-screen bg-background text-foreground pb-20">
        {/* ── Top Hero Banner ── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/15 via-background to-background pt-10 pb-16 px-4 border-b border-border/40">
          <div className="absolute inset-0 pointer-events-none opacity-25">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[340px] bg-primary/20 blur-[90px] rounded-full" />
          </div>

          <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
            {/* Tagline Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider"
            >
              <Zap className="w-3.5 h-3.5 fill-primary" />
              <span>Balurghat's Own Quick Commerce Revolution</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]"
            >
              Ultra-Fast <span className="text-primary underline decoration-primary/40 underline-offset-8">10-Minute Delivery</span>,<br />
              Powered by Balurghat&apos;s Trusted Shops.
            </motion.h1>

            {/* Subtitle / Value proposition */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              Bringing the world-class speed of <strong>Blinkit</strong> and <strong>Zepto</strong> to Balurghat.
              Founded by <strong>Ridam Mahanta</strong> and <strong>Abhi Das</strong>, SwiftMart combines neighborhood dukandar trust with modern instant delivery technology.
            </motion.p>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-3 pt-2 flex-wrap"
            >
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:opacity-90 active:scale-95 transition-all"
              >
                <ShoppingBag className="w-4 h-4" /> Start Shopping
              </Link>
              <a
                href="#founders"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted/70 active:scale-95 transition-all"
              >
                <Users className="w-4 h-4 text-primary" /> Meet the Founders
              </a>
            </motion.div>

            {/* Live Impact Stats */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8 max-w-3xl mx-auto"
            >
              <div className="bg-card/80 backdrop-blur border border-border/60 rounded-2xl p-4 text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-primary">10-15</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Mins Avg Delivery</p>
              </div>
              <div className="bg-card/80 backdrop-blur border border-border/60 rounded-2xl p-4 text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground">100+</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Local Partner Stores</p>
              </div>
              <div className="bg-card/80 backdrop-blur border border-border/60 rounded-2xl p-4 text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground">5,000+</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Happy Balurghat Homes</p>
              </div>
              <div className="bg-card/80 backdrop-blur border border-border/60 rounded-2xl p-4 text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-primary">733101</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">& 733103 Serviced</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Main Container ── */}
        <div className="max-w-5xl mx-auto px-4 py-12 space-y-16">

          {/* ── Section 1: The Origin Story ── */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wide">
                <Sparkles className="w-4 h-4" />
                The SwiftMart Story
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Why Wait Hours or Days for Groceries in Balurghat?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For years, mega quick-commerce giants like <strong>Blinkit</strong>, <strong>Zepto</strong>, and <strong>Instamart</strong> focused solely on tier-1 metropolitan cities like Kolkata, Delhi, and Bangalore. Residents in towns like Balurghat were left with two inconvenient options: stepping out into the burning summer heat or monsoon rain, or ordering from platforms that took 2 to 3 days to deliver basic essentials.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                In 2024, <strong>Ridam Mahanta</strong> and <strong>Abhi Das</strong> set out to change this paradigm. They believed that people of Balurghat deserve the exact same convenience, freshness, and lightning speed as any metro citizen.
              </p>
              <div className="bg-muted/40 border-l-4 border-primary rounded-r-xl p-3.5 text-xs text-foreground font-medium leading-relaxed">
                &ldquo;SwiftMart was born right here in Balurghat with a single mission: empowering local neighborhood shopkeepers with modern technology while ensuring every family gets their daily necessities delivered to their door in 10 minutes.&rdquo;
              </div>
            </div>

            <div className="md:col-span-5 bg-gradient-to-br from-primary/10 via-card to-background border border-border/80 rounded-3xl p-6 space-y-4 neu-card">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" /> The Quick Commerce Difference
              </h3>
              <ul className="space-y-3 text-xs text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Zero Long Waits:</strong> Dispatched immediately from nearest local store nodes within 60 seconds.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Neighborhood Empowerment:</strong> We don&apos;t destroy local shops; we digitize them and send customers to their doors.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Fresh Produce &amp; Dairy:</strong> Sourced daily from local farmers, bakeries, and dairies across Balurghat.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Live GPS Fleet:</strong> 60 FPS visual tracking so you always know where your rider is.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* ── Section 2: Vision & Mission (Dual Pillar Cards) ── */}
          <section className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wide">
                <TrendingUp className="w-4 h-4" />
                Our Guiding Principles
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                Our Vision &amp; Mission
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Building a modern, sustainable hyperlocal ecosystem tailored for Balurghat and beyond.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vision Card */}
              <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-4 hover:border-primary/50 transition-all neu-card relative overflow-hidden">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Our Vision</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To establish Balurghat as the model quick commerce hub of Eastern India. We envision a connected community where geographic distance never restricts access to fresh groceries, emergency medicines, hot restaurant food, or daily lifestyle essentials.
                </p>
                <div className="space-y-2 pt-2 border-t border-border/40 text-xs text-muted-foreground font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Democratizing 10-minute convenience beyond metro cities</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Pioneering green &amp; sustainable delivery fleets in North Bengal</span>
                  </div>
                </div>
              </div>

              {/* Mission Card */}
              <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-4 hover:border-emerald-500/50 transition-all neu-card relative overflow-hidden">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Our Mission</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To equip every local grocer, pharmacist, baker, and artisan with digital catalog tools and on-demand delivery logistics, while providing consumers with lightning-fast doorstep fulfillment, competitive pricing, and heartfelt customer care.
                </p>
                <div className="space-y-2 pt-2 border-t border-border/40 text-xs text-muted-foreground font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Transparent, fair-profit partnership with local merchants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Empowering youth with dignified, flexible rider earnings</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Section 3: Meet The Founders ── */}
          <section id="founders" className="space-y-8 scroll-mt-20">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wide">
                <Users className="w-4 h-4" />
                Leadership Team
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                Meet the Founders of SwiftMart
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Driven by a deep love for Balurghat and a passion for technology, our founders are reshaping how our hometown shops.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">

              {/* Founder 1: Ridam Mahanta */}
              <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-5 neu-card relative overflow-hidden flex flex-col justify-between group hover:border-primary/60 transition-all">
                <div className="space-y-4">
                  {/* Photo / Avatar Placeholder */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20 shrink-0 relative overflow-hidden flex items-center justify-center">
                      {photoRidam ? (
                        <img
                          src={photoRidam}
                          alt="Ridam Mahanta - Founder & CEO"
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white">
                          <span className="text-xl font-black tracking-wider text-amber-400">RM</span>
                          <span className="text-[9px] text-slate-300 font-semibold uppercase mt-0.5">Founder</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-lg font-bold text-foreground">Ridam Mahanta</h3>
                        <BadgeCheck className="w-4 h-4 text-primary fill-primary/20 shrink-0" />
                      </div>
                      <p className="text-xs font-semibold text-primary">Founder &amp; Chief Executive Officer</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-primary" /> Balurghat, West Bengal
                      </p>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Tech entrepreneur and visionary leading SwiftMart&apos;s product development, platform engineering, and quick-commerce architecture. Ridam focuses on algorithmic delivery dispatch, customer-first design, and scaling instant logistics tailored for non-metro towns.
                  </p>

                  {/* Focus Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["Platform Architecture", "Fleet Dispatch", "Product Vision", "Growth"].map(skill => (
                      <span key={skill} className="text-[10px] font-medium bg-muted px-2.5 py-1 rounded-lg text-foreground">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quote Box */}
                <div className="pt-4 border-t border-border/50 text-xs italic text-muted-foreground">
                  &ldquo;We wanted Balurghat to experience the speed of Blinkit and Zepto without relying on distant corporations. SwiftMart is proud to be built right here at home.&rdquo;
                </div>
              </div>

              {/* Founder 2: Abhi Das */}
              <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-5 neu-card relative overflow-hidden flex flex-col justify-between group hover:border-emerald-500/60 transition-all">
                <div className="space-y-4">
                  {/* Photo / Avatar Placeholder */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-300 p-0.5 shadow-lg shadow-emerald-500/20 shrink-0 relative overflow-hidden flex items-center justify-center">
                      {photoAbhi ? (
                        <img
                          src={photoAbhi}
                          alt="Abhi Das - Co-Founder"
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white">
                          <span className="text-xl font-black tracking-wider text-emerald-400">AD</span>
                          <span className="text-[9px] text-slate-300 font-semibold uppercase mt-0.5">Co-Founder</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-lg font-bold text-foreground">Abhi Das</h3>
                        <BadgeCheck className="w-4 h-4 text-emerald-500 fill-emerald-500/20 shrink-0" />
                      </div>
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Co-Founder &amp; Head of Operations</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-emerald-500" /> Balurghat, West Bengal
                      </p>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Operations specialist leading merchant relations, ground supply chain logistics, and delivery partner fleet welfare in Balurghat. Abhi works closely with neighborhood shop owners to digitize inventory and ensure order packaging meets 10-minute turnaround times.
                  </p>

                  {/* Focus Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["Merchant Partnerships", "Supply Chain", "Fleet Relations", "Quality Control"].map(skill => (
                      <span key={skill} className="text-[10px] font-medium bg-muted px-2.5 py-1 rounded-lg text-foreground">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quote Box */}
                <div className="pt-4 border-t border-border/50 text-xs italic text-muted-foreground">
                  &ldquo;Local dukandars are the backbone of our town. Our technology gives them the tools to compete on equal footing with multi-billion dollar tech companies.&rdquo;
                </div>
              </div>

            </div>
          </section>

          {/* ── Section 4: What We Deliver in 10 Minutes ── */}
          <section className="bg-card border border-border/80 rounded-3xl p-6 sm:p-10 space-y-8 neu-card">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">
                Everything You Need, Delivered Near You
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Search &apos;quick commerce near me&apos; in Balurghat, and SwiftMart fulfills it across all categories:
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-background border border-border/50 text-center space-y-2">
                <span className="text-3xl">🥦</span>
                <p className="text-xs font-bold text-foreground">Fresh Fruits &amp; Veggies</p>
                <p className="text-[11px] text-muted-foreground">Directly from local Balurghat sabzi mandi</p>
              </div>

              <div className="p-4 rounded-2xl bg-background border border-border/50 text-center space-y-2">
                <span className="text-3xl">🥛</span>
                <p className="text-xs font-bold text-foreground">Milk, Dairy &amp; Bread</p>
                <p className="text-[11px] text-muted-foreground">Fresh morning dairy delivered by 7 AM</p>
              </div>

              <div className="p-4 rounded-2xl bg-background border border-border/50 text-center space-y-2">
                <span className="text-3xl">💊</span>
                <p className="text-xs font-bold text-foreground">Pharmacy &amp; Wellness</p>
                <p className="text-[11px] text-muted-foreground">Emergency OTC medicines in 10 minutes</p>
              </div>

              <div className="p-4 rounded-2xl bg-background border border-border/50 text-center space-y-2">
                <span className="text-3xl">🍰</span>
                <p className="text-xs font-bold text-foreground">Sweets &amp; Bakery</p>
                <p className="text-[11px] text-muted-foreground">Famous Balurghat mishti and freshly baked cakes</p>
              </div>
            </div>
          </section>

          {/* ── Section 5: Local SEO FAQs ── */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground text-center">Frequently Asked Questions</h2>
            <div className="space-y-3 max-w-3xl mx-auto">
              <div className="bg-card border border-border/70 rounded-2xl p-4 space-y-1">
                <p className="text-sm font-bold text-foreground">Is SwiftMart really delivering in 10 minutes in Balurghat?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Yes! Our riders are distributed across major points in Balurghat (covering Pincodes 733101 and 733103). When you place an order, the closest partner merchant packs it within 2 minutes, and our rider delivers it directly to your address in 10 to 15 minutes.
                </p>
              </div>

              <div className="bg-card border border-border/70 rounded-2xl p-4 space-y-1">
                <p className="text-sm font-bold text-foreground">How is SwiftMart different from Blinkit or Zepto?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  While Blinkit and Zepto operate exclusively in top metropolitan cities using private dark stores, SwiftMart is tailored specially for Balurghat. We partner directly with trusted neighborhood stores and sweet shops, providing the same ultra-fast speed while keeping business within the local community.
                </p>
              </div>

              <div className="bg-card border border-border/70 rounded-2xl p-4 space-y-1">
                <p className="text-sm font-bold text-foreground">Who owns and manages SwiftMart?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  SwiftMart is co-founded by <strong>Ridam Mahanta</strong> (Founder &amp; CEO) and <strong>Abhi Das</strong> (Co-Founder), based out of Balurghat, Dakshin Dinajpur, West Bengal.
                </p>
              </div>
            </div>
          </section>

          {/* ── Section 6: CTA Bottom Card ── */}
          <section className="bg-gradient-to-r from-primary/20 via-primary/10 to-background border border-primary/30 rounded-3xl p-6 sm:p-8 text-center space-y-4">
            <h3 className="text-xl sm:text-2xl font-black text-foreground">Experience the 10-Minute Difference Today</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Join thousands of happy families in Balurghat. Order groceries, snacks, fresh food, or daily essentials now!
            </p>
            <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:opacity-90 active:scale-95 transition-all"
              >
                Browse Products <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/contact-support"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-card border border-border text-foreground font-semibold text-xs hover:bg-muted active:scale-95 transition-all"
              >
                <Phone className="w-3.5 h-3.5 text-primary" /> Contact Support
              </Link>
            </div>
          </section>

          {/* ── Global Site Footer ── */}
          <SiteFooter />

        </div>
      </div>
    </>
  );
}
