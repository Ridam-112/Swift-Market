import { useState, useEffect } from "react";

const WORDS = ["SwiftMart", "Grocery", "Medicine", "Vegetables", "Food"] as const;

const WRITE_MS = 1900;
const HOLD_MS  = 1300;
const FADE_MS  = 650;
const GAP_MS   = 160;

type Phase = "writing" | "holding" | "fading";

function wordFontSize(word: string): number {
  if (word.length >= 10) return 68;
  if (word.length >= 8)  return 80;
  if (word.length >= 6)  return 92;
  return 102;
}

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

  const word = WORDS[wordIndex];
  const fs   = wordFontSize(word);

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

  // Room-fill light opacity — peaks on "holding", builds during "writing", off on "fading"
  const roomOpacity  = phase === "holding" ? 1 : phase === "writing" ? 0.5 : 0;
  const roomTransition =
    phase === "holding"
      ? `opacity ${WRITE_MS * 0.55}ms ease-out`
      : phase === "fading"
      ? `opacity ${FADE_MS * 0.8}ms ease-in`
      : "none";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div
        className="absolute inset-0 pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >

        {/* ── Main room-fill: neon text as light source ───────────────────────
            One giant radial centred exactly on the text (50%, ~38% from top).
            Amber core → warm orange mid → transparent edges.
            This naturally illuminates the screen and fades to dark at corners,
            just like a neon sign in a dark room.
        ─────────────────────────────────────────────────────────────────── */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(
              ellipse 140% 110% at 50% 38%,
              rgba(255, 210, 60, 0.22)   0%,
              rgba(255, 160, 20, 0.15)  25%,
              rgba(255, 110,  0, 0.08)  50%,
              rgba(200,  80,  0, 0.03)  70%,
              transparent               88%
            )
          `,
          opacity: roomOpacity,
          transition: roomTransition,
        }} />

        {/* ── Edge bleeds — thin amber strips on left / right / top ────────────
            The strips are brightest at the text's vertical position (38%)
            and fade to nothing at top and bottom.
            Left and right strips simulate light reaching the side walls.
        ─────────────────────────────────────────────────────────────────── */}

        {/* Left wall bleed */}
        <div style={{
          position: "absolute",
          top: 0, left: 0,
          width: "18vw", height: "100%",
          background: `
            linear-gradient(
              to right,
              rgba(255, 180, 0, 0.18) 0%,
              rgba(255, 140, 0, 0.08) 35%,
              transparent 100%
            )
          `,
          maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 25%, black 45%, rgba(0,0,0,0.6) 65%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 25%, black 45%, rgba(0,0,0,0.6) 65%, transparent 100%)",
          opacity: roomOpacity,
          transition: roomTransition,
        }} />

        {/* Right wall bleed */}
        <div style={{
          position: "absolute",
          top: 0, right: 0,
          width: "18vw", height: "100%",
          background: `
            linear-gradient(
              to left,
              rgba(255, 180, 0, 0.18) 0%,
              rgba(255, 140, 0, 0.08) 35%,
              transparent 100%
            )
          `,
          maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 25%, black 45%, rgba(0,0,0,0.6) 65%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 25%, black 45%, rgba(0,0,0,0.6) 65%, transparent 100%)",
          opacity: roomOpacity,
          transition: roomTransition,
        }} />

        {/* Top ceiling bleed */}
        <div style={{
          position: "absolute",
          top: 0, left: 0,
          height: "22vh", width: "100%",
          background: `
            linear-gradient(
              to bottom,
              rgba(255, 180, 0, 0.14) 0%,
              rgba(255, 140, 0, 0.06) 55%,
              transparent 100%
            )
          `,
          opacity: roomOpacity,
          transition: roomTransition,
        }} />

        {/* ── SVG handwriting ─────────────────────────────────────────────────── */}
        <svg
          width="100%"
          height="60%"
          viewBox="0 0 800 220"
          preserveAspectRatio="xMidYMid meet"
          style={{ position: "absolute", top: "10%", left: 0 }}
        >
          <defs>
            <filter id="hw-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="bigBlur" />
              <feColorMatrix
                in="bigBlur" type="matrix"
                values="1 0.6 0   0 0
                        0.7 0.5 0   0 0
                        0   0   0   0 0
                        0   0   0   0.9 0"
                result="amberHalo"
              />
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="tightBlur" />
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
            fontSize={fs}
            fontWeight="700"
            fill="none"
            stroke="rgba(255,255,255,0.92)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#hw-glow)"
            style={textStyle}
          >
            {word}
          </text>
        </svg>

        {/* Gradient keeps form readable */}
        <div style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(8,8,8,0.92) 22%, rgba(8,8,8,0.30) 60%, rgba(8,8,8,0.10) 100%)",
        }} />

        {/* Film grain */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
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
