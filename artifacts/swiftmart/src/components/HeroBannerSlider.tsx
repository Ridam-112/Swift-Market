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
    title: "Daily Kirana & Fresh Produce",
    subtitle: "Farm-fresh vegetables, dairy & staples from Balurghat neighborhood stores",
    emoji: "🛒",
    gradient: "from-lime-600 to-emerald-800",
    tag: "Local Kirana",
    decoration: "🥦🥛🍎",
  },
  {
    id: 2,
    title: "Hot Food & Bakery Treats",
    subtitle: "Fresh biryani, rolls, custom cakes & sweets from top food hubs",
    emoji: "🍱",
    gradient: "from-amber-600 to-orange-800",
    tag: "Food & Bakery",
    decoration: "🍔🍜🍰",
  },
  {
    id: 3,
    title: "Upahar Electronics Lab Services",
    subtitle: "Certified TV, AC, Fridge & home appliance repair at your doorstep",
    emoji: "🛠️",
    gradient: "from-blue-700 to-indigo-900",
    tag: "Appliance Care",
    decoration: "📺❄️🔧",
  },
  {
    id: 4,
    title: "SwiftMart Super Mall",
    subtitle: "Trending fashion, electronics & lifestyle products with doorstep delivery",
    emoji: "🛍️",
    gradient: "from-purple-700 to-fuchsia-900",
    tag: "Pan-India Catalog",
    decoration: "👗🎧💄",
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
    const interval = setInterval(next, 3000);
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
      className="relative w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[2.3/1] max-h-72 sm:max-h-80 md:max-h-96 rounded-2xl overflow-hidden my-2 select-none shadow-xs border border-border/40"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}

      <button
        onClick={prev}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 md:w-9 md:h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white flex items-center justify-center transition-all z-10 shadow-md cursor-pointer active:scale-95"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      <button
        onClick={next}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 md:w-9 md:h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white flex items-center justify-center transition-all z-10 shadow-md cursor-pointer active:scale-95"
        aria-label="Next slide"
      >
        <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {Array.from({ length: slideCount }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 drop-shadow-sm ${
              i === current ? "w-6 bg-white shadow-sm" : "w-1.5 bg-white/60 hover:bg-white/80"
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
          className={`absolute inset-0 transition-opacity duration-700 cursor-pointer ${
            i === current ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => handleBannerClick(b)}
        >
          <img
            src={b.imageUrl}
            alt={b.title || "SwiftMart 10-Minute Delivery Balurghat"}
            width={1200}
            height={400}
            decoding="async"
            className="w-full h-full object-cover object-center"
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "low"}
          />
          {(b.title || b.subtitle || b.buttonText) && (
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent flex items-center px-5 md:px-8">
              <div className="flex flex-col gap-2 max-w-[65%]">
                {b.title && (
                  <h2 className="text-lg md:text-2xl font-black text-white leading-tight drop-shadow">
                    {b.title}
                  </h2>
                )}
                {b.subtitle && (
                  <p className="text-xs md:text-sm text-white/85 font-medium leading-snug">
                    {b.subtitle}
                  </p>
                )}
                {b.buttonText && (
                  <button
                    className="mt-1 inline-flex items-center bg-white text-black text-xs md:text-sm font-bold px-4 py-2 rounded-full hover:bg-white/90 transition-colors w-fit"
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
    staticSlides.map((s, i) => (
      <div
        key={s.id}
        className={`absolute inset-0 bg-gradient-to-br ${s.gradient} transition-opacity duration-700 ${
          i === current ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_50%,white,transparent)]" />
        <div className="absolute inset-0 flex items-center justify-between px-5 md:px-8">
          <div className="flex flex-col gap-1.5 max-w-[55%]">
            <span className="inline-block text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/70 bg-white/20 px-2.5 py-0.5 rounded-full w-fit">
              {s.tag}
            </span>
            <h2 className="text-lg md:text-2xl font-black text-white leading-tight drop-shadow">
              {s.title}
            </h2>
            <p className="text-xs md:text-sm text-white/85 font-medium leading-snug">
              {s.subtitle}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1 opacity-90">
            <span className="text-4xl md:text-6xl drop-shadow-lg">{s.emoji}</span>
            <span className="text-base md:text-xl tracking-widest opacity-60">{s.decoration}</span>
          </div>
        </div>
      </div>
    )),
    staticSlides.length
  );
}
