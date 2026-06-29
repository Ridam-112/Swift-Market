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
  from {
    stroke-dashoffset: 3200;
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  to {
    stroke-dashoffset: 0;
    opacity: 1;
  }
}

@keyframes hw-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; transform: scale(1.04); }
}

@keyframes hw-orb-pulse {
  0%, 100% { opacity: 0.12; transform: translate(-50%, -50%) scale(1);   }
  50%       { opacity: 0.22; transform: translate(-50%, -50%) scale(1.12); }
}

@keyframes hw-orb-pulse2 {
  0%, 100% { opacity: 0.07; transform: scale(1);   }
  50%       { opacity: 0.15; transform: scale(1.08); }
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

  // Edge/corner glow intensities per phase
  const edgeOpacity = phase === "holding" ? 1 : phase === "writing" ? 0.45 : 0;
  const edgeTransition =
    phase === "holding"
      ? `opacity ${WRITE_MS * 0.6}ms ease-out`
      : phase === "fading"
      ? `opacity ${FADE_MS}ms ease-in`
      : `opacity ${WRITE_MS * 0.5}ms ease-out`;

  const edgeStyle = (base: React.CSSProperties): React.CSSProperties => ({
    ...base,
    opacity: edgeOpacity,
    transition: edgeTransition,
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div
        className="absolute inset-0 pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        {/* ── Ambient centre orb ─────────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            width: "min(600px, 90vw)",
            aspectRatio: "1",
            borderRadius: "50%",
            top: "22%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(255,190,0,0.18) 0%, rgba(255,120,0,0.06) 50%, transparent 70%)",
            animation: "hw-orb-pulse 7s ease-in-out infinite",
          }}
        />

        {/* Lower-right secondary orb */}
        <div
          style={{
            position: "absolute",
            width: "min(380px, 60vw)",
            aspectRatio: "1",
            borderRadius: "50%",
            bottom: "28%",
            right: "8%",
            background:
              "radial-gradient(circle, rgba(255,160,0,0.10) 0%, transparent 65%)",
            animation: "hw-orb-pulse2 9s ease-in-out infinite 2s",
          }}
        />

        {/* ── Edge & corner reflections ───────────────────────────────────────── */}

        {/* Top-left corner */}
        <div style={edgeStyle({
          position: "absolute",
          top: 0, left: 0,
          width: "38vw", height: "38vh",
          background: "radial-gradient(ellipse at top left, rgba(255,180,0,0.22) 0%, rgba(255,120,0,0.08) 40%, transparent 70%)",
          borderRadius: "0 0 100% 0",
        })} />

        {/* Top-right corner */}
        <div style={edgeStyle({
          position: "absolute",
          top: 0, right: 0,
          width: "38vw", height: "38vh",
          background: "radial-gradient(ellipse at top right, rgba(255,180,0,0.22) 0%, rgba(255,120,0,0.08) 40%, transparent 70%)",
          borderRadius: "0 0 0 100%",
        })} />

        {/* Bottom-left corner */}
        <div style={edgeStyle({
          position: "absolute",
          bottom: 0, left: 0,
          width: "28vw", height: "28vh",
          background: "radial-gradient(ellipse at bottom left, rgba(255,150,0,0.14) 0%, rgba(255,100,0,0.05) 45%, transparent 70%)",
          borderRadius: "0 100% 0 0",
        })} />

        {/* Bottom-right corner */}
        <div style={edgeStyle({
          position: "absolute",
          bottom: 0, right: 0,
          width: "28vw", height: "28vh",
          background: "radial-gradient(ellipse at bottom right, rgba(255,150,0,0.14) 0%, rgba(255,100,0,0.05) 45%, transparent 70%)",
          borderRadius: "100% 0 0 0",
        })} />

        {/* Left edge streak */}
        <div style={edgeStyle({
          position: "absolute",
          top: 0, left: 0,
          width: "6px", height: "100%",
          background: "linear-gradient(to bottom, transparent 0%, rgba(255,190,0,0.55) 35%, rgba(255,190,0,0.55) 65%, transparent 100%)",
        })} />

        {/* Right edge streak */}
        <div style={edgeStyle({
          position: "absolute",
          top: 0, right: 0,
          width: "6px", height: "100%",
          background: "linear-gradient(to bottom, transparent 0%, rgba(255,190,0,0.55) 35%, rgba(255,190,0,0.55) 65%, transparent 100%)",
        })} />

        {/* Top edge streak */}
        <div style={edgeStyle({
          position: "absolute",
          top: 0, left: 0,
          height: "4px", width: "100%",
          background: "linear-gradient(to right, transparent 0%, rgba(255,190,0,0.5) 30%, rgba(255,220,80,0.7) 50%, rgba(255,190,0,0.5) 70%, transparent 100%)",
        })} />

        {/* ── SVG handwriting canvas ──────────────────────────────────────────── */}
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
                in="bigBlur"
                type="matrix"
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
            x="400"
            y="160"
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

        {/* Gradient so the login form at bottom stays readable */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(8,8,8,0.92) 22%, rgba(8,8,8,0.30) 60%, rgba(8,8,8,0.10) 100%)",
          }}
        />

        {/* Film-grain texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
            backgroundSize: "256px 256px",
            mixBlendMode: "overlay",
            opacity: 0.35,
            pointerEvents: "none",
          }}
        />
      </div>
    </>
  );
}
