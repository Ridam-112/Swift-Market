import { useState, useEffect } from "react";
import {
  ShoppingBag, ShoppingCart, Package, Store,
  Apple, Wheat, Carrot, Leaf,
  Pill, Heart, Stethoscope, Plus,
  UtensilsCrossed, Coffee, ChefHat, Pizza,
  type LucideIcon,
} from "lucide-react";

const WRITE_MS = 1800;
const HOLD_MS  = 3000;
const FADE_MS  = 600;
const GAP_MS   = 140;

type Phase = "writing" | "holding" | "fading";

interface WordEntry {
  label: string;
  fontSize: number;
  left:  [LucideIcon, LucideIcon];
  right: [LucideIcon, LucideIcon];
}

const WORDS: WordEntry[] = [
  { label: "SwiftMart",  fontSize: 68, left: [ShoppingBag, Package],       right: [Store,        ShoppingCart] },
  { label: "Grocery",    fontSize: 80, left: [ShoppingCart, Apple],         right: [Wheat,        Carrot]       },
  { label: "Medicine",   fontSize: 80, left: [Pill,         Heart],         right: [Stethoscope,  Plus]         },
  { label: "Vegetables", fontSize: 68, left: [Leaf,         Carrot],        right: [Apple,        Wheat]        },
  { label: "Food",       fontSize: 92, left: [UtensilsCrossed, Coffee],     right: [ChefHat,      Pizza]        },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');

@keyframes hw-write {
  from { stroke-dashoffset: 3200; opacity: 0; }
  8%   { opacity: 1; }
  to   { stroke-dashoffset: 0; opacity: 1; }
}

@keyframes hw-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; transform: scale(1.04); }
}

@keyframes hw-icon-in {
  from { opacity: 0; transform: translateY(8px) scale(0.82); }
  to   { opacity: 1; transform: translateY(0px) scale(1); }
}

@keyframes hw-icon-out {
  from { opacity: 1; transform: translateY(0px) scale(1); }
  to   { opacity: 0; transform: translateY(-6px) scale(0.88); }
}
`;

export default function HandwritingBackground() {
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase]         = useState<Phase>("writing");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    setPhase("writing");
    timers.push(setTimeout(() => setPhase("holding"), WRITE_MS));
    timers.push(setTimeout(() => setPhase("fading"),  WRITE_MS + HOLD_MS));
    timers.push(setTimeout(
      () => setWordIndex(i => (i + 1) % WORDS.length),
      WRITE_MS + HOLD_MS + FADE_MS + GAP_MS,
    ));
    return () => timers.forEach(clearTimeout);
  }, [wordIndex]);

  const entry = WORDS[wordIndex];
  const [LeftA, LeftB]   = entry.left;
  const [RightA, RightB] = entry.right;

  const textStyle: React.CSSProperties =
    phase === "writing"
      ? {
          strokeDasharray: 3200,
          animation: `hw-write ${WRITE_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
        }
      : phase === "fading"
      ? {
          strokeDasharray: 3200,
          strokeDashoffset: 0,
          opacity: 1,
          animation: `hw-fade-out ${FADE_MS}ms ease-in forwards`,
        }
      : {
          strokeDasharray: 3200,
          strokeDashoffset: 0,
          opacity: 1,
        };

  // Room-fill glow — reduced intensity, transitions per phase
  const roomOpacity = phase === "holding" ? 1 : phase === "writing" ? 0.4 : 0;
  const roomTransition =
    phase === "holding"  ? `opacity ${WRITE_MS * 0.6}ms ease-out` :
    phase === "fading"   ? `opacity ${FADE_MS * 0.8}ms ease-in`   : "none";

  // Icon animation class key — remount on each new word so animation re-fires
  const iconAnimKey = `${wordIndex}-${phase}`;

  const iconAnim = (delayMs: number): React.CSSProperties =>
    phase === "holding"
      ? { animation: `hw-icon-in 420ms ${delayMs}ms cubic-bezier(0.22,1,0.36,1) both` }
      : phase === "fading"
      ? { animation: `hw-icon-out ${FADE_MS * 0.75}ms ease-in both` }
      : { opacity: 0 };

  const iconGlow = "drop-shadow(0 0 6px rgba(255,200,60,0.85)) drop-shadow(0 0 14px rgba(255,140,0,0.45))";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div
        className="absolute inset-0 pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        {/* ── Room-fill radial — neon text as light source ────────────────── */}
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(
            ellipse 140% 110% at 50% 38%,
            rgba(255,210,60,0.15)  0%,
            rgba(255,160,20,0.09) 25%,
            rgba(255,110, 0,0.05) 50%,
            rgba(200, 80, 0,0.02) 70%,
            transparent           88%
          )`,
          opacity: roomOpacity,
          transition: roomTransition,
        }} />

        {/* Left wall bleed */}
        <div style={{
          position: "absolute", top: 0, left: 0, width: "18vw", height: "100%",
          background: "linear-gradient(to right, rgba(255,180,0,0.12) 0%, rgba(255,140,0,0.05) 40%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 25%, black 45%, rgba(0,0,0,0.7) 65%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 25%, black 45%, rgba(0,0,0,0.7) 65%, transparent 100%)",
          opacity: roomOpacity, transition: roomTransition,
        }} />

        {/* Right wall bleed */}
        <div style={{
          position: "absolute", top: 0, right: 0, width: "18vw", height: "100%",
          background: "linear-gradient(to left, rgba(255,180,0,0.12) 0%, rgba(255,140,0,0.05) 40%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 25%, black 45%, rgba(0,0,0,0.7) 65%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 25%, black 45%, rgba(0,0,0,0.7) 65%, transparent 100%)",
          opacity: roomOpacity, transition: roomTransition,
        }} />

        {/* Top ceiling bleed */}
        <div style={{
          position: "absolute", top: 0, left: 0, height: "22vh", width: "100%",
          background: "linear-gradient(to bottom, rgba(255,180,0,0.10) 0%, rgba(255,140,0,0.04) 55%, transparent 100%)",
          opacity: roomOpacity, transition: roomTransition,
        }} />

        {/* ── Category icons — left side ──────────────────────────────────── */}
        <div
          key={`left-${iconAnimKey}`}
          style={{
            position: "absolute",
            top: "28%",
            left: "clamp(20px, 8vw, 80px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <LeftA
            size={30}
            color="rgba(255,200,60,0.75)"
            strokeWidth={1.4}
            style={{ filter: iconGlow, ...iconAnim(80) }}
          />
          <LeftB
            size={22}
            color="rgba(255,180,50,0.55)"
            strokeWidth={1.4}
            style={{ filter: iconGlow, ...iconAnim(180) }}
          />
        </div>

        {/* ── Category icons — right side ─────────────────────────────────── */}
        <div
          key={`right-${iconAnimKey}`}
          style={{
            position: "absolute",
            top: "28%",
            right: "clamp(20px, 8vw, 80px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <RightA
            size={30}
            color="rgba(255,200,60,0.75)"
            strokeWidth={1.4}
            style={{ filter: iconGlow, ...iconAnim(130) }}
          />
          <RightB
            size={22}
            color="rgba(255,180,50,0.55)"
            strokeWidth={1.4}
            style={{ filter: iconGlow, ...iconAnim(220) }}
          />
        </div>

        {/* ── SVG handwriting ─────────────────────────────────────────────── */}
        <svg
          width="100%" height="60%"
          viewBox="0 0 800 220"
          preserveAspectRatio="xMidYMid meet"
          style={{ position: "absolute", top: "10%", left: 0 }}
        >
          <defs>
            <filter id="hw-glow" x="-40%" y="-40%" width="180%" height="180%">
              {/* Slightly reduced glow vs before */}
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="bigBlur" />
              <feColorMatrix
                in="bigBlur" type="matrix"
                values="1 0.6 0   0 0
                        0.7 0.5 0   0 0
                        0   0   0   0 0
                        0   0   0   0.8 0"
                result="amberHalo"
              />
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="tightBlur" />
              <feMerge>
                <feMergeNode in="amberHalo" />
                <feMergeNode in="tightBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <text
            key={wordIndex}
            x="400" y="160"
            textAnchor="middle"
            fontFamily="'Dancing Script', cursive"
            fontSize={entry.fontSize}
            fontWeight="700"
            fill="none"
            stroke="rgba(255,255,255,0.90)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#hw-glow)"
            style={textStyle}
          >
            {entry.label}
          </text>
        </svg>

        {/* Bottom fade so form stays readable */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(8,8,8,0.92) 22%, rgba(8,8,8,0.30) 60%, rgba(8,8,8,0.10) 100%)",
        }} />

        {/* Film grain */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          mixBlendMode: "overlay",
          opacity: 0.35,
          pointerEvents: "none",
        }} />
      </div>
    </>
  );
}
