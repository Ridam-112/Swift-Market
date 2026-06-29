import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ShoppingBasket, Stethoscope, Sparkles, Pencil, Layers } from "lucide-react";

const CATEGORIES = [
  { id: "grocery",    label: "Grocery",    Icon: ShoppingBasket, color: "#4ade80" },
  { id: "medicine",   label: "Medicine",   Icon: Stethoscope,    color: "#60a5fa" },
  { id: "cosmetics",  label: "Cosmetics",  Icon: Sparkles,       color: "#f472b6" },
  { id: "stationary", label: "Stationary", Icon: Pencil,         color: "#fbbf24" },
  { id: "all",        label: "All in One", Icon: Layers,         color: "#c084fc" },
] as const;

// How long each category shows before switching (ms)
const HOLD_MS   = 2800;
// Per-character stagger (s)
const STAGGER_S = 0.07;
// Spring feel per character
const charVariants = {
  hidden: { opacity: 0, y: 18, rotate: -6, scale: 0.85 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotate: 0,
    scale: 1,
    transition: {
      delay: i * STAGGER_S,
      type: "spring" as const,
      damping: 14,
      stiffness: 160,
    },
  }),
  exit: { opacity: 0, y: -12, transition: { duration: 0.25, ease: "easeIn" as const } },
};

function neonDrop(color: string) {
  return `drop-shadow(0 0 5px ${color}) drop-shadow(0 0 18px ${color}99)`;
}
function neonGlow(color: string) {
  return `0 0 2px #fff9, 0 0 12px ${color}, 0 0 35px ${color}88`;
}

export function AnimatedLoginBackground() {
  const shouldReduce      = useReducedMotion();
  const [index, setIndex] = useState(0);
  const timerRef          = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cat    = CATEGORIES[index];
  const chars  = cat.label.split("");
  // total time to write all chars + hold before switching
  const writeDuration = chars.length * STAGGER_S * 1000 + 400;

  const clearT = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => {
    clearT();
    timerRef.current = setTimeout(
      () => setIndex(i => (i + 1) % CATEGORIES.length),
      writeDuration + HOLD_MS,
    );
    return clearT;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (shouldReduce) {
    return (
      <div className="fixed inset-0 z-0 bg-[#080808]" aria-hidden="true">
        <div className="absolute inset-0 flex items-center justify-center opacity-20 select-none pointer-events-none">
          <ShoppingBasket className="w-28 h-28" style={{ color: "#4ade80" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-0 bg-[#080808] overflow-hidden" aria-hidden="true">

      {/* ── Ambient blobs ── */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        animate={{ backgroundColor: `${cat.color}1a` }}
        transition={{ duration: 1.0, ease: "easeInOut" }}
        style={{ width: "90vw", height: "90vw", top: "-25%", left: "-25%", filter: "blur(80px)" }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        animate={{ backgroundColor: `${cat.color}12` }}
        transition={{ duration: 1.2, ease: "easeInOut", delay: 0.1 }}
        style={{ width: "65vw", height: "65vw", bottom: "-10%", right: "-10%", filter: "blur(70px)" }}
      />

      {/* ── Category display ── */}
      <div
        className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
        style={{ paddingBottom: "28vh" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={cat.id}
            className="flex flex-col items-center gap-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.1 }}
          >
            {/* Neon icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 14, stiffness: 150, delay: 0.05 }}
            >
              <motion.div
                animate={{ opacity: [1, 0.88, 1, 0.93, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <cat.Icon
                  style={{
                    width:  "clamp(44px, 8vw, 90px)",
                    height: "clamp(44px, 8vw, 90px)",
                    color: cat.color,
                    filter: neonDrop(cat.color),
                  }}
                />
              </motion.div>
            </motion.div>

            {/* ── Cursive handwriting animation ── */}
            <div
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontWeight: 700,
                lineHeight: 1.1,
                fontSize: "clamp(2.8rem, 10vw, 7.5rem)",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "0 0.04em",
              }}
            >
              {chars.map((char, i) => (
                <motion.span
                  key={`${cat.id}-${i}`}
                  custom={i}
                  variants={charVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  style={{
                    display: "inline-block",
                    color: cat.color,
                    textShadow: neonGlow(cat.color),
                    // preserve space width
                    minWidth: char === " " ? "0.3em" : undefined,
                    whiteSpace: "pre",
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
