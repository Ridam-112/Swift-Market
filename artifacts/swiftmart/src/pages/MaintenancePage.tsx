/**
 * MaintenancePage — React component rendered when VITE_MAINTENANCE_MODE=true.
 *
 * Shown by App.tsx before any routing occurs (covers every public route).
 * Mirrors the server-rendered HTML page so the experience is consistent
 * whether the user hits the Vite dev server or the production Express server.
 */

import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";

const VITE_MESSAGE = import.meta.env["VITE_MAINTENANCE_MESSAGE"] as string | undefined;
const VITE_END_TIME = import.meta.env["VITE_MAINTENANCE_END_TIME"] as string | undefined;

const DEFAULT_MESSAGE =
  "We're performing scheduled maintenance to improve your experience. Our team is working hard to get everything back up as quickly as possible.";

function useCountdown(endTimeStr?: string) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!endTimeStr) return;
    const target = new Date(endTimeStr);
    if (isNaN(target.getTime())) return;

    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        setLabel("We should be back any moment — refresh the page!");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const parts: string[] = [];
      if (h) parts.push(`${h}h`);
      if (m || h) parts.push(`${m}m`);
      parts.push(`${s}s`);
      setLabel(parts.join(" ") + " remaining");
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTimeStr]);

  return label;
}

export default function MaintenancePage() {
  const message = VITE_MESSAGE ?? DEFAULT_MESSAGE;
  const endTime = VITE_END_TIME;
  const countdown = useCountdown(endTime);

  return (
    <>
      <Helmet>
        <title>SwiftMart — Under Maintenance</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-dvh bg-[#0d0d0d] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Ambient glow */}
        <div
          className="pointer-events-none fixed top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 65%)",
            animation: "pulse 4s ease-in-out infinite",
          }}
        />

        {/* Card */}
        <div className="relative w-full max-w-[520px] bg-[#161616] border border-amber-500/20 rounded-3xl p-10 sm:p-12 text-center shadow-2xl">

          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-11 h-11 bg-gradient-to-br from-amber-500 to-amber-300 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-amber-500/30">
              🛒
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white">
              Swift<span className="text-amber-400">Mart</span>
            </span>
          </div>

          {/* Animated gears */}
          <div className="flex items-center justify-center gap-1 mb-7">
            <span className="text-4xl inline-block" style={{ animation: "spin-cw 3s linear infinite", filter: "drop-shadow(0 0 8px rgba(245,158,11,0.4))" }}>⚙️</span>
            <span className="text-2xl inline-block mb-[-4px]" style={{ animation: "spin-ccw 2s linear infinite", filter: "drop-shadow(0 0 8px rgba(245,158,11,0.4))" }}>⚙️</span>
            <span className="text-3xl inline-block" style={{ animation: "spin-cw 4s linear infinite", filter: "drop-shadow(0 0 8px rgba(245,158,11,0.4))" }}>⚙️</span>
          </div>

          {/* Status badge */}
          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-semibold tracking-widest uppercase px-3.5 py-1 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b] animate-pulse" />
            Under Maintenance
          </div>

          <h1 className="text-[26px] sm:text-[28px] font-extrabold text-white tracking-tight leading-tight mb-3.5">
            We'll be back shortly
          </h1>

          <p className="text-sm sm:text-base text-gray-500 leading-relaxed mb-7">
            {message}
          </p>

          {/* ETA box */}
          {endTime && (
            <div className="bg-amber-500/7 border border-amber-500/20 rounded-2xl px-5 py-4 mb-7">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-amber-500 mb-1.5">
                Estimated back online
              </p>
              <p className="text-base font-bold text-white mb-1">{endTime}</p>
              {countdown && (
                <p className="text-sm text-gray-500">{countdown}</p>
              )}
            </div>
          )}

          <hr className="border-t border-white/5 my-6" />

          {/* Contact section */}
          <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-600 mb-3.5">
            Need help in the meantime?
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <a
              href="https://wa.me/916296118949"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-white/10 rounded-xl text-sm font-medium text-gray-300 bg-white/[0.03] hover:border-amber-500 hover:text-amber-300 hover:bg-amber-500/8 transition-all"
            >
              💬 WhatsApp Support
            </a>
            <a
              href="mailto:support@swiftmart.space"
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-white/10 rounded-xl text-sm font-medium text-gray-300 bg-white/[0.03] hover:border-amber-500 hover:text-amber-300 hover:bg-amber-500/8 transition-all"
            >
              ✉️ Email Us
            </a>
          </div>
        </div>

        <p className="mt-8 text-xs text-gray-700">
          © {new Date().getFullYear()} SwiftMart. All rights reserved.
        </p>

        {/* Inline keyframe styles */}
        <style>{`
          @keyframes spin-cw  { to { transform: rotate(360deg);  } }
          @keyframes spin-ccw { to { transform: rotate(-360deg); } }
          @keyframes pulse {
            0%,100% { opacity: 0.6; transform: translateX(-50%) scale(0.95); }
            50%      { opacity: 1;   transform: translateX(-50%) scale(1.05); }
          }
        `}</style>
      </div>
    </>
  );
}
