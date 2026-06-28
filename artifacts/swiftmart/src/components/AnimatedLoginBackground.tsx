import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ShoppingBasket, Stethoscope, Sparkles, Pencil, Layers } from "lucide-react";

const CATEGORIES = [
  {
    id: "grocery",
    label: "GROCERY",
    Icon: ShoppingBasket,
    color: "#4ade80",
  },
  {
    id: "medicine",
    label: "MEDICINE",
    Icon: Stethoscope,
    color: "#60a5fa",
  },
  {
    id: "cosmetics",
    label: "COSMETICS",
    Icon: Sparkles,
    color: "#f472b6",
  },
  {
    id: "stationary",
    label: "STATIONARY",
    Icon: Pencil,
    color: "#fbbf24",
  },
  {
    id: "all",
    label: "ALL IN ONE",
    sublabel: "IN JUST ONE CLICK",
    Icon: Layers,
    color: "#c084fc",
  },
] as const;

const HOLD_MS = 2000;
const ENTER_S = 0.6;
const EXIT_S  = 0.45;
const FAST_MS = 700;

type Mode = "idle" | "revealing";

// Crisp neon: tight white core + soft colour halo (not blurry)
function neonText(color: string) {
  return `0 0 1px #fff, 0 0 3px #fff, 0 0 14px ${color}cc, 0 0 32px ${color}66`;
}

function neonDrop(color: string) {
  return `drop-shadow(0 0 5px ${color}) drop-shadow(0 0 16px ${color}99)`;
}

export function AnimatedLoginBackground() {
  const shouldReduce            = useReducedMotion();
  const [index, setIndex]       = useState(0);
  const [mode, setMode]         = useState<Mode>("idle");
  const [opacity, setOpacity]   = useState(0.50);
  const [revealed, setRevealed] = useState(false);
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearT = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  // Normal loop
  useEffect(() => {
    if (mode !== "idle") return;
    clearT();
    timerRef.current = setTimeout(
      () => setIndex(i => (i + 1) % CATEGORIES.length),
      HOLD_MS + (EXIT_S + ENTER_S) * 1000,
    );
    return clearT;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, mode]);

  // First-tap reveal
  const handleClick = () => {
    if (revealed || mode === "revealing") return;
    setRevealed(true);
    setMode("revealing");
    setOpacity(0.80);
    clearT();
    let i = 0;
    const step = () => {
      setIndex(i);
      if (i < CATEGORIES.length - 1) {
        timerRef.current = setTimeout(() => { i++; step(); }, FAST_MS);
      } else {
        timerRef.current = setTimeout(() => { setOpacity(0.50); setMode("idle"); }, FAST_MS + 400);
      }
    };
    step();
  };

  if (shouldReduce) {
    return (
      <div className="fixed inset-0 z-0 bg-[#080808]" aria-hidden="true">
        <div className="absolute inset-0 flex items-center justify-center opacity-20 select-none pointer-events-none">
          <div className="text-center">
            <ShoppingBasket className="w-28 h-28 mx-auto mb-4" style={{ color: "#4ade80" }} />
            <div className="text-6xl font-black tracking-widest" style={{ color: "#4ade80" }}>GROCERY</div>
          </div>
        </div>
      </div>
    );
  }

  const cat = CATEGORIES[index];

  return (
    <div
      className="fixed inset-0 z-0 bg-[#080808] overflow-hidden cursor-pointer"
      onClick={handleClick}
      aria-hidden="true"
    >
      {/* ── Ambient blobs — smoothly cross-fade to current category colour ── */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        animate={{ backgroundColor: `${cat.color}1a` }}
        transition={{ duration: 1.0, ease: "easeInOut" }}
        style={{
          width: "90vw", height: "90vw",
          top: "-25%", left: "-25%",
          filter: "blur(80px)",
        }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        animate={{ backgroundColor: `${cat.color}12` }}
        transition={{ duration: 1.2, ease: "easeInOut", delay: 0.1 }}
        style={{
          width: "65vw", height: "65vw",
          bottom: "-10%", right: "-10%",
          filter: "blur(70px)",
        }}
      />

      {/* ── Category display — no rotateX to keep text crisp ── */}
      <div
        className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
        style={{ paddingBottom: "28vh" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={cat.id}
            className="flex flex-col items-center gap-5 text-center"
            initial={{ opacity: 0, scale: 0.55, y: 40 }}
            animate={{ opacity, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: 1.45,
              y: -30,
              transition: { duration: EXIT_S, ease: "easeIn" },
            }}
            transition={{ duration: ENTER_S, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Neon icon — subtle flicker */}
            <motion.div
              animate={{ opacity: [1, 0.88, 1, 0.93, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <cat.Icon
                style={{
                  width:  "clamp(52px, 10vw, 108px)",
                  height: "clamp(52px, 10vw, 108px)",
                  color: cat.color,
                  filter: neonDrop(cat.color),
                }}
              />
            </motion.div>

            {/* Neon main label — crisp white core */}
            <motion.div
              animate={{ opacity: [1, 0.9, 1, 0.95, 1] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                fontFamily: "inherit",
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: "0.15em",
                fontSize: "clamp(2.2rem, 8vw, 6.5rem)",
                color: cat.color,
                textShadow: neonText(cat.color),
                WebkitFontSmoothing: "antialiased",
                MozOsxFontSmoothing: "grayscale",
              }}
            >
              {cat.label}
            </motion.div>

            {/* Sublabel — only for "ALL IN ONE" */}
            {"sublabel" in cat && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 0.80, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={{
                  fontWeight: 600,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  fontSize: "clamp(0.65rem, 2.2vw, 1rem)",
                  color: cat.color,
                  textShadow: `0 0 6px ${cat.color}, 0 0 16px ${cat.color}88`,
                  WebkitFontSmoothing: "antialiased",
                }}
              >
                {cat.sublabel}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Tap hint ── */}
      <AnimatePresence>
        {!revealed && (
          <motion.p
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.35em] uppercase pointer-events-none select-none"
            style={{ color: "rgba(255,255,255,0.25)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            transition={{ delay: 3.5, duration: 1.5 }}
          >
            tap anywhere
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
