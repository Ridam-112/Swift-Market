import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

interface ApiBanner {
  _id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  redirectType: "category" | "shop" | "product" | "internal" | "external";
  redirectValue: string;
}

const staticSlides = [
  {
    id: 1,
    title: "Fresh Groceries Delivered",
    subtitle: "Rice, Dal, Vegetables & daily essentials delivered fast",
    emoji: "🛒",
    gradient: "from-lime-400 to-green-600",
    tag: "Grocery & Daily Needs",
    decoration: "🥦🥛🍎",
  },
  {
    id: 2,
    title: "Medicines at Your Doorstep",
    subtitle: "Medicines, supplements & healthcare essentials",
    emoji: "💊",
    gradient: "from-sky-400 to-blue-600",
    tag: "Medicine & Healthcare",
    decoration: "🏥💉🩺",
  },
  {
    id: 3,
    title: "Hot Food, Delivered Fresh",
    subtitle: "Biryani, Pizza, Burgers from local restaurants",
    emoji: "🍕",
    gradient: "from-orange-400 to-red-600",
    tag: "Food & Restaurant",
    decoration: "🍔🍜🧆",
  },
  {
    id: 4,
    title: "Local Artisans & Boutiques",
    subtitle: "Handmade jewelry, clothing & unique crafts",
    emoji: "🎨",
    gradient: "from-violet-400 to-purple-600",
    tag: "Fashion & Handmade",
    decoration: "💍👗🧵",
  },
  {
    id: 5,
    title: "Upahar Electronics Lab Services",
    subtitle: "TV, AC, Fridge, Fan & Home Theatre repair by certified experts",
    emoji: "🛠️",
    gradient: "from-teal-400 to-cyan-600",
    tag: "Electronics Repair Partner",
    decoration: "📺❄️🧊",
  },
];

const DEFAULT_HERO_BANNERS: ApiBanner[] = [
  {
    _id: "default-swiftmart-main",
    imageUrl: "/banners/swiftmart-main-banner.jpg",
    title: "",
    subtitle: "",
    buttonText: "",
    redirectType: "internal",
    redirectValue: "/grocery",
  },
  {
    _id: "default-service-corner",
    imageUrl: "/banners/service-corner-banner.jpg",
    title: "",
    subtitle: "",
    buttonText: "",
    redirectType: "internal",
    redirectValue: "/services",
  },
];

// Module-level cache — avoids re-fetching banners on every Home re-mount.
const BANNER_TTL = 5 * 60_000; // 5 min
let _bannersCache: { data: ApiBanner[]; at: number } | null = null;

function dedupeBanners(list: ApiBanner[]): ApiBanner[] {
  const seen = new Set<string>();
  return list.filter(b => {
    const key = (b.imageUrl || b._id).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function HeroBannerSlider() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [banners, setBanners] = useState<ApiBanner[]>(
    _bannersCache && Date.now() - _bannersCache.at < BANNER_TTL
      ? _bannersCache.data
      : dedupeBanners(DEFAULT_HERO_BANNERS)
  );
  const [, setLocation] = useLocation();
  const viewTrackedRef = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    // Serve from cache if fresh — avoids re-fetching on every Home re-mount.
    if (_bannersCache && Date.now() - _bannersCache.at < BANNER_TTL) {
      setBanners(_bannersCache.data);
      return;
    }
    fetch("/api/hero-banners")
      .then(r => r.json())
      .then((data: { success: boolean; banners: ApiBanner[] }) => {
        const raw = data.success && data.banners.length > 0 ? data.banners : DEFAULT_HERO_BANNERS;
        const result = dedupeBanners(raw);
        _bannersCache = { data: result, at: Date.now() };
        setBanners(result);
      })
      .catch(() => {
        const fallback = dedupeBanners(DEFAULT_HERO_BANNERS);
        _bannersCache = { data: fallback, at: Date.now() };
        setBanners(fallback);
      });
  }, []);

  useEffect(() => {
    if (!banners || banners.length === 0 || viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    fetch("/api/hero-banners/batch-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: banners.map(b => b._id) }),
    }).catch(() => {});
  }, [banners]);

  const usingApi = banners.length > 0;
  const count = usingApi ? banners.length : staticSlides.length;

  const next = useCallback(() => setCurrent(c => (c + 1) % count), [count]);
  const prev = useCallback(() => setCurrent(c => (c - 1 + count) % count), [count]);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(next, 4000);
    return () => clearInterval(interval);
  }, [next, paused]);

  const handleBannerClick = useCallback((banner: ApiBanner) => {
    fetch(`/api/hero-banners/${banner._id}/click`, { method: "POST" }).catch(() => {});
    switch (banner.redirectType) {
      case "category": setLocation(`/category/${banner.redirectValue}`); break;
      case "shop": setLocation(`/shop/${banner.redirectValue}`); break;
      case "product": setLocation(`/product/${banner.redirectValue}`); break;
      case "internal": setLocation(banner.redirectValue); break;
      case "external": window.open(banner.redirectValue, "_blank", "noopener,noreferrer"); break;
    }
  }, [setLocation]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setPaused(false);
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only treat as a horizontal swipe if wider than tall (avoids scroll conflicts)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) next(); else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const sharedContainer = (children: React.ReactNode, slideCount: number) => (
    <div
      className="relative w-full aspect-[2/1] sm:aspect-[2.4/1] md:aspect-[3.1/1] max-h-56 sm:max-h-72 md:max-h-84 rounded-2xl sm:rounded-3xl overflow-hidden my-2 sm:my-3 select-none shadow-xs border border-border/50 group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Horizontal Sliding Track (Flipkart-style carousel) */}
      <div
        className="flex w-full h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {children}
      </div>

      {/* Flipkart-Style Round Prev Arrow */}
      <button
        onClick={(e) => { e.stopPropagation(); prev(); }}
        className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all z-20 cursor-pointer active:scale-95 opacity-0 group-hover:opacity-100 sm:opacity-90"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-800" />
      </button>

      {/* Flipkart-Style Round Next Arrow */}
      <button
        onClick={(e) => { e.stopPropagation(); next(); }}
        className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all z-20 cursor-pointer active:scale-95 opacity-0 group-hover:opacity-100 sm:opacity-90"
        aria-label="Next slide"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-800" />
      </button>

      {/* Flipkart-Style Indicator Dots Pill */}
      <div className="absolute bottom-2.5 sm:bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-xs z-20">
        {Array.from({ length: slideCount }, (_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
            className={`rounded-full transition-all duration-300 cursor-pointer ${
              i === current ? "w-5 sm:w-6 h-1.5 bg-white shadow-xs" : "w-1.5 h-1.5 bg-white/60 hover:bg-white/90"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );

  if (usingApi) {
    return sharedContainer(
      banners.map((b, i) => (
        <div
          key={b._id}
          className="w-full h-full shrink-0 relative cursor-pointer overflow-hidden"
          onClick={() => handleBannerClick(b)}
        >
          <img
            src={b.imageUrl}
            alt={b.title || "SwiftMart Balurghat"}
            width={1200}
            height={400}
            decoding="async"
            className="w-full h-full object-cover object-center select-none"
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "low"}
          />
          {(b.title || b.subtitle || b.buttonText) && (
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent flex items-center px-4 sm:px-8">
              <div className="flex flex-col gap-1.5 max-w-[70%] sm:max-w-[60%]">
                {b.title && (
                  <h2 className="text-base sm:text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-md">
                    {b.title}
                  </h2>
                )}
                {b.subtitle && (
                  <p className="text-xs sm:text-sm text-white/90 font-medium leading-snug drop-shadow line-clamp-2">
                    {b.subtitle}
                  </p>
                )}
                {b.buttonText && (
                  <button
                    className="mt-1 sm:mt-2 inline-flex items-center bg-white text-black text-xs sm:text-sm font-bold px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full hover:bg-white/90 shadow-sm transition-colors w-fit"
                    onClick={e => { e.stopPropagation(); handleBannerClick(b); }}
                  >
                    {b.buttonText}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )),
      banners.length
    );
  }

  return sharedContainer(
    staticSlides.map((s) => (
      <div
        key={s.id}
        className={`w-full h-full shrink-0 relative bg-gradient-to-br ${s.gradient} overflow-hidden cursor-pointer`}
        onClick={() => setLocation("/stores")}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_50%,white,transparent)]" />
        <div className="absolute inset-0 flex items-center justify-between px-4 sm:px-8">
          <div className="flex flex-col gap-1 max-w-[60%]">
            <span className="inline-block text-[9px] sm:text-xs font-bold uppercase tracking-widest text-white/80 bg-white/20 px-2 py-0.5 rounded-full w-fit backdrop-blur-xs">
              {s.tag}
            </span>
            <h2 className="text-sm sm:text-2xl md:text-3xl font-black text-white leading-tight drop-shadow">
              {s.title}
            </h2>
            <p className="text-[11px] sm:text-sm text-white/90 font-medium leading-snug line-clamp-2">
              {s.subtitle}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1 opacity-95 shrink-0 pr-2 sm:pr-4">
            <span className="text-3xl sm:text-5xl md:text-6xl drop-shadow-lg">{s.emoji}</span>
            <span className="text-xs sm:text-lg tracking-widest opacity-70 hidden sm:inline">{s.decoration}</span>
          </div>
        </div>
      </div>
    )),
    staticSlides.length
  );
}
