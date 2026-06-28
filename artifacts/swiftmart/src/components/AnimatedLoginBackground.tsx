import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ShoppingCart, Pill, ShoppingBasket, Carrot } from "lucide-react";

const CATEGORIES = [
  { id: "swiftmart",   label: "SWIFTMART",  Icon: ShoppingCart,  color: "#f59e0b" },
  { id: "medicine",    label: "MEDICINE",   Icon: Pill,          color: "#e2e8f0" },
  { id: "grocery",     label: "GROCERY",    Icon: ShoppingBasket,color: "#f59e0b" },
  { id: "vegetables",  label: "VEGETABLES", Icon: Carrot,        color: "#e2e8f0" },
] as const;

const HOLD_MS  = 2300;  // ms each item is held after entering
const ENTER_S  = 0.65;  // enter animation seconds
const EXIT_S   = 0.55;  // exit animation seconds
const FAST_MS  = 750;   // ms per-item during reveal sequence

type Mode = "idle" | "revealing";

export function AnimatedLoginBackground() {
  const shouldReduce = useReducedMotion();
  const [index, setIndex]               = useState(0);
  const [mode, setMode]                 = useState<Mode>("idle");
  const [opacity, setOpacity]           = useState(0.17);
  const [revealed, setRevealed]         = useState(false);
  const timerRef                        = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearT = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  // Normal idle loop — advance index after hold + transition time
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

  // First-tap reveal: quickly cycle all 4 at full opacity then settle back
  const handleClick = () => {
    if (revealed || mode === "revealing") return;
    setRevealed(true);
    setMode("revealing");
    setOpacity(0.65);
    clearT();

    let i = 0;
    const step = () => {
      setIndex(i);
      if (i < CATEGORIES.length - 1) {
        timerRef.current = setTimeout(() => { i++; step(); }, FAST_MS);
      } else {
        timerRef.current = setTimeout(() => {
          setOpacity(0.17);
          setMode("idle");
        }, FAST_MS + 400);
      }
    };
    step();
  };

  // Static background when user prefers reduced motion
  if (shouldReduce) {
    return (
      <div className="fixed inset-0 z-0 bg-[#080808]" aria-hidden="true">
        <div className="absolute inset-0 flex items-center justify-center opacity-10 select-none pointer-events-none">
          <div className="text-center">
            <ShoppingCart className="w-32 h-32 mx-auto mb-6 text-amber-400" />
            <div
              className="font-black tracking-[0.2em] text-amber-400"
              style={{ fontSize: "clamp(3rem,10vw,7rem)" }}
            >
              SWIFTMART
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { label, Icon, color } = CATEGORIES[index];

  return (
    <div
      className="fixed inset-0 z-0 bg-[#080808] overflow-hidden cursor-pointer"
      onClick={handleClick}
      aria-hidden="true"
    >
      {/* ── Ambient glow blobs ────────────────────────────────────────── */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)",
          width: "70vw", height: "70vw",
          top: "-15%", left: "-15%",
          filter: "blur(60px)",
        }}
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
          width: "55vw", height: "55vw",
          bottom: "-10%", right: "-10%",
          filter: "blur(60px)",
        }}
        animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />

      {/* ── 3-D category display ──────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
        style={{ perspective: "900px" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            className="flex flex-col items-center gap-6 text-center"
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
            <Icon
              style={{
                width:  "clamp(56px, 11vw, 128px)",
                height: "clamp(56px, 11vw, 128px)",
                color,
                filter: `drop-shadow(0 0 48px ${color}90)`,
              }}
            />
            <div
              className="font-black leading-none"
              style={{
                fontSize: "clamp(2rem, 8.5vw, 7rem)",
                letterSpacing: "0.18em",
                color,
                textShadow: `0 0 90px ${color}55, 0 0 180px ${color}22`,
              }}
            >
              {label}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Tap hint (fades in after 3s, fades out on first tap) ──────── */}
      <AnimatePresence>
        {!revealed && (
          <motion.p
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/22 text-[10px] tracking-[0.35em] uppercase pointer-events-none select-none"
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
