import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ShoppingBasket, Stethoscope, Sparkles, Pencil, Layers } from "lucide-react";

const CATEGORIES = [
  {
    id: "grocery",
    label: "GROCERY",
    Icon: ShoppingBasket,
    color: "#4ade80",
    glow: "#4ade80",
  },
  {
    id: "medicine",
    label: "MEDICINE",
    Icon: Stethoscope,
    color: "#60a5fa",
    glow: "#60a5fa",
  },
  {
    id: "cosmetics",
    label: "COSMETICS",
    Icon: Sparkles,
    color: "#f472b6",
    glow: "#f472b6",
  },
  {
    id: "stationary",
    label: "STATIONARY",
    Icon: Pencil,
    color: "#fbbf24",
    glow: "#fbbf24",
  },
  {
    id: "all",
    label: "ALL IN ONE",
    sublabel: "IN JUST ONE CLICK",
    Icon: Layers,
    color: "#c084fc",
    glow: "#c084fc",
  },
] as const;

const HOLD_MS  = 2000;
const ENTER_S  = 0.7;
const EXIT_S   = 0.5;
const FAST_MS  = 700;

type Mode = "idle" | "revealing";

function neonText(color: string) {
  return `0 0 4px #fff, 0 0 8px #fff, 0 0 18px ${color}, 0 0 38px ${color}, 0 0 70px ${color}55`;
}

function neonDrop(color: string) {
  return `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 18px ${color}) drop-shadow(0 0 36px ${color}88)`;
}

export function AnimatedLoginBackground() {
  const shouldReduce = useReducedMotion();
  const [index, setIndex]     = useState(0);
  const [mode, setMode]       = useState<Mode>("idle");
  const [opacity, setOpacity] = useState(0.45);
  const [revealed, setRevealed] = useState(false);
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearT = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

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

  const handleClick = () => {
    if (revealed || mode === "revealing") return;
    setRevealed(true);
    setMode("revealing");
    setOpacity(0.75);
    clearT();
    let i = 0;
    const step = () => {
      setIndex(i);
      if (i < CATEGORIES.length - 1) {
        timerRef.current = setTimeout(() => { i++; step(); }, FAST_MS);
      } else {
        timerRef.current = setTimeout(() => { setOpacity(0.45); setMode("idle"); }, FAST_MS + 400);
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
      {/* ── Ambient colour-matched glow blobs ── */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${cat.glow}18 0%, transparent 70%)`,
          width: "80vw", height: "80vw",
          top: "-20%", left: "-20%",
          filter: "blur(60px)",
        }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${cat.glow}10 0%, transparent 70%)`,
          width: "60vw", height: "60vw",
          bottom: "0%", right: "-10%",
          filter: "blur(60px)",
        }}
        animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* ── Main 3-D category display ── */}
      <div
        className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
        style={{ perspective: "900px", paddingBottom: "28vh" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={cat.id}
            className="flex flex-col items-center gap-5 text-center"
            style={{ transformStyle: "preserve-3d" }}
            initial={{ opacity: 0, scale: 0.25, rotateX: 35 }}
            animate={{ opacity, scale: 1, rotateX: 0 }}
            exit={{
              opacity: 0,
              scale: 1.8,
              rotateX: -18,
              transition: { duration: EXIT_S, ease: "easeIn" },
            }}
            transition={{ duration: ENTER_S, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Neon icon */}
            <motion.div
              animate={{ opacity: [1, 0.85, 1, 0.92, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", times: [0, 0.2, 0.5, 0.7, 1] }}
            >
              <cat.Icon
                style={{
                  width:  "clamp(52px, 10vw, 110px)",
                  height: "clamp(52px, 10vw, 110px)",
                  color: cat.color,
                  filter: neonDrop(cat.glow),
                }}
              />
            </motion.div>

            {/* Neon main label */}
            <motion.div
              animate={{ opacity: [1, 0.88, 1, 0.94, 1] }}
              transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut", times: [0, 0.15, 0.45, 0.75, 1] }}
              className="font-black leading-none"
              style={{
                fontSize: "clamp(2rem, 8vw, 6.5rem)",
                letterSpacing: "0.16em",
                color: cat.color,
                textShadow: neonText(cat.glow),
              }}
            >
              {cat.label}
            </motion.div>

            {/* Sublabel for "ALL IN ONE" slide */}
            {"sublabel" in cat && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 0.75, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="font-semibold tracking-[0.22em] uppercase"
                style={{
                  fontSize: "clamp(0.7rem, 2.5vw, 1.1rem)",
                  color: cat.color,
                  textShadow: `0 0 8px ${cat.glow}, 0 0 20px ${cat.glow}`,
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
