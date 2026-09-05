/**
 * GoogleAdSense.tsx
 *
 * Google AdSense integration for SwiftMart Web.
 *
 * Key Design Principles:
 * 1. ONLY active on Web (strictly disabled on Capacitor native apps).
 * 2. Non-intrusive placements:
 *    - In-Feed Product Card Ad: Blends natively into product catalogue grids.
 *    - Section Banner Ad: Clean, elegant horizontal banner placed between homepage sections.
 * 3. 100% Crash-Proof & Invisible when Unfilled:
 *    - Uses isolated AdErrorBoundary so AdSense script issues never crash the main application.
 *    - Uses imperative DOM management so React Virtual DOM never conflicts with AdSense iframe mutations.
 *    - Containers remain display: none until Google AdSense actually fills an active ad.
 */

import React, { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { Megaphone, ExternalLink } from "lucide-react";

// Official AdSense Client ID
const ADSENSE_CLIENT_ID =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_ADSENSE_CLIENT_ID) ||
  "ca-pub-3119816437064520";

const ADSENSE_ENABLED =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_ADSENSE_ENABLED !== "false");

interface AdSenseSlotProps {
  slotId?: string;
  format?: "auto" | "fluid" | "horizontal" | "rectangle";
  layoutKey?: string;
  className?: string;
  variant?: "section_banner" | "in_feed_card" | "display";
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

/**
 * Isolated Error Boundary specifically for ad slots.
 * Ensures that no third-party ad error can ever break the host app.
 */
class AdErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env?.DEV) {
      console.warn("[AdSense] Suppressed ad slot error:", error);
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

let scriptInjected = false;

function injectAdSenseScript(clientId: string) {
  if (typeof window === "undefined" || scriptInjected) return;
  if (document.querySelector('script[src*="adsbygoogle.js"]')) {
    scriptInjected = true;
    return;
  }
  if (!clientId || clientId === "ca-pub-XXXXXXXXXXXXXXXX") return;

  try {
    const script = document.createElement("script");
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
    scriptInjected = true;
  } catch (e) {
    console.warn("Failed to inject Google AdSense script:", e);
  }
}

function AdSlotInner({
  slotId,
  format = "auto",
  layoutKey,
  className = "",
  variant = "display",
}: AdSenseSlotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFilled, setIsFilled] = useState(false);

  // Strictly disabled inside Native Capacitor App (Android/iOS) or if disabled
  if (api.isCapacitorNative || !ADSENSE_ENABLED) {
    return null;
  }

  useEffect(() => {
    injectAdSenseScript(ADSENSE_CLIENT_ID);

    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    // Clear previous elements safely
    try {
      container.innerHTML = "";
    } catch {}

    // Create the <ins> tag imperatively so React Virtual DOM never touches AdSense mutations
    const ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.style.width = "100%";
    ins.setAttribute("data-ad-client", ADSENSE_CLIENT_ID);
    if (slotId) ins.setAttribute("data-ad-slot", slotId);
    if (format) ins.setAttribute("data-ad-format", format);
    if (layoutKey) ins.setAttribute("data-ad-layout-key", layoutKey);
    ins.setAttribute("data-full-width-responsive", "true");

    try {
      container.appendChild(ins);
    } catch {
      return;
    }

    // Push ad to AdSense queue safely
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      if (import.meta.env?.DEV) {
        console.warn("[AdSense] Push error:", e);
      }
    }

    // Check status
    const checkStatus = () => {
      try {
        if (!ins) return;
        const status = ins.getAttribute("data-ad-status");
        if (status === "filled") {
          setIsFilled(true);
        } else if (status === "unfilled") {
          setIsFilled(false);
        } else {
          const iframe = ins.querySelector("iframe");
          if (iframe && (iframe.offsetHeight > 10 || iframe.clientHeight > 10)) {
            setIsFilled(true);
          }
        }
      } catch {}
    };

    let obs: MutationObserver | null = null;
    try {
      obs = new MutationObserver(() => checkStatus());
      obs.observe(ins, { attributes: true, childList: true, subtree: true });
    } catch {}

    const interval = setInterval(checkStatus, 1000);

    return () => {
      if (obs) {
        try {
          obs.disconnect();
        } catch {}
      }
      clearInterval(interval);
      try {
        container.innerHTML = "";
      } catch {}
    };
  }, [slotId, format, layoutKey]);

  // Section Banner Variant
  if (variant === "section_banner") {
    return (
      <div
        className={`w-full transition-all duration-300 ${
          isFilled ? `my-4 sm:my-6 ${className}` : "hidden"
        }`}
        style={{ display: isFilled ? "block" : "none" }}
      >
        <div className="bg-gradient-to-r from-card/80 via-card to-card/80 rounded-2xl p-3 sm:p-4 border border-border/60 neu-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 bg-muted/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Megaphone className="w-2.5 h-2.5" /> Sponsored
            </span>
          </div>

          <div className="min-h-[90px] sm:min-h-[100px] flex items-center justify-center overflow-hidden">
            <div ref={containerRef} className="w-full" />
          </div>
        </div>
      </div>
    );
  }

  // In-Feed Product Card Variant
  if (variant === "in_feed_card") {
    return (
      <div
        className={`transition-all duration-300 ${
          isFilled
            ? `bg-card rounded-2xl p-3 flex flex-col justify-between neu-card group relative overflow-hidden border border-border/60 hover:shadow-md min-h-[260px] ${className}`
            : "hidden"
        }`}
        style={{ display: isFilled ? "flex" : "none" }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 bg-muted/60 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Megaphone className="w-2.5 h-2.5" /> Ad
          </span>
          <ExternalLink className="w-3 h-3 text-muted-foreground/40" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
          <div ref={containerRef} className="w-full h-full" />
        </div>

        <div className="pt-2 border-t border-border/40 mt-auto">
          <div className="w-full py-1.5 px-2.5 rounded-xl bg-muted/40 text-center text-[10px] font-bold text-muted-foreground">
            Sponsored Partner
          </div>
        </div>
      </div>
    );
  }

  // Standard Display Ad Variant
  return (
    <div
      className={`w-full overflow-hidden my-3 ${isFilled ? className : "hidden"}`}
      style={{ display: isFilled ? "block" : "none" }}
    >
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

/**
 * Core Google AdSense Slot component
 * Safely wrapped in AdErrorBoundary to protect the application.
 */
export function AdSenseSlot(props: AdSenseSlotProps) {
  return (
    <AdErrorBoundary>
      <AdSlotInner {...props} />
    </AdErrorBoundary>
  );
}

/**
 * Native in-feed ad card designed to sit seamlessly inside a ProductGrid.
 */
export function AdSenseInFeedCard({
  slotId,
  className = "",
}: {
  slotId?: string;
  className?: string;
}) {
  return (
    <AdSenseSlot
      slotId={slotId}
      variant="in_feed_card"
      className={className}
    />
  );
}

/**
 * Elegant horizontal ad banner designed to sit between content sections.
 */
export function AdSenseSectionBanner({
  slotId,
  className = "",
}: {
  slotId?: string;
  className?: string;
}) {
  return (
    <AdSenseSlot
      slotId={slotId}
      variant="section_banner"
      className={className}
    />
  );
}
