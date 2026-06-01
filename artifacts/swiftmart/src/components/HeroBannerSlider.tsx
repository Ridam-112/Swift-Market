import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    id: 1,
    title: "Fresh Groceries Delivered",
    subtitle: "Rice, Dal, Vegetables & more in 10 minutes",
    emoji: "🛒",
    gradient: "from-lime-400 to-green-600",
    accentColor: "#16a34a",
    tag: "Grocery & Daily Needs",
    decoration: "🥦🥛🍎",
  },
  {
    id: 2,
    title: "Medicines at Your Doorstep",
    subtitle: "Medicines, supplements & healthcare essentials",
    emoji: "💊",
    gradient: "from-sky-400 to-blue-600",
    accentColor: "#2563eb",
    tag: "Medicine & Healthcare",
    decoration: "🏥💉🩺",
  },
  {
    id: 3,
    title: "Hot Food, Delivered Fresh",
    subtitle: "Biryani, Pizza, Burgers from local restaurants",
    emoji: "🍕",
    gradient: "from-orange-400 to-red-600",
    accentColor: "#dc2626",
    tag: "Food & Restaurant",
    decoration: "🍔🍜🧆",
  },
  {
    id: 4,
    title: "Local Artisans & Boutiques",
    subtitle: "Handmade jewelry, clothing & unique crafts",
    emoji: "🎨",
    gradient: "from-violet-400 to-purple-600",
    accentColor: "#7c3aed",
    tag: "Fashion & Handmade",
    decoration: "💍👗🧵",
  },
  {
    id: 5,
    title: "Support Your Local Shops",
    subtitle: "Services, repairs, hardware & more near you",
    emoji: "🏪",
    gradient: "from-teal-400 to-cyan-600",
    accentColor: "#0891b2",
    tag: "Local Shops & Services",
    decoration: "🔧🪴🐾",
  },
];

export function HeroBannerSlider() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent(c => (c + 1) % slides.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent(c => (c - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [next, paused]);

  const slide = slides[current];

  return (
    <div
      className="relative rounded-2xl overflow-hidden my-2 select-none"
      style={{ height: "clamp(160px, 40vw, 220px)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {slides.map((s, i) => (
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
      ))}

      <button
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 md:w-9 md:h-9 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur-sm text-white flex items-center justify-center transition-all z-10"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      <button
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 md:w-9 md:h-9 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur-sm text-white flex items-center justify-center transition-all z-10"
        aria-label="Next slide"
      >
        <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? "w-6 bg-white" : "w-1.5 bg-white/50"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
