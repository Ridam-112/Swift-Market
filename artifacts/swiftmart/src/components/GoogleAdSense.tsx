/**
 * GoogleAdSense.tsx
 *
 * Google AdSense integration for SwiftMart Web.
 *
 * Key Design Principles:
 * 1. ONLY active on Web (strictly disabled on Capacitor native apps).
 * 2. Non-intrusive placements:
 *    - In-Feed Product Card Ad: Blends natively into product catalogue grids after every N products.
 *    - Section Banner Ad: Clean, elegant horizontal banner placed between homepage sections.
 * 3. 100% Invisible when Unfilled / Inactive:
 *    - Absolutely ZERO empty placeholder boxes, blank borders, or empty "Sponsored" tags.
 *    - Ad containers remain completely collapsed (0 height, 0 padding, no border/background)
 *      until Google AdSense actually fills and renders an active ad.
 * 4. Zero layout shifts (CLS safe) and fully responsive across mobile & desktop.
 */

import { useEffect, useRef, useState } from "react";
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
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + clientId;
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
    scriptInjected = true;
  } catch (e) {
    console.warn("Failed to inject Google AdSense script:", e);
  }
}

/**
 * Core Google AdSense Slot component
 * Only renders visual chrome (card frames, borders, "Sponsored" tags) if an ad is verified and filled.
 */
export function AdSenseSlot({
  slotId,
  format = "auto",
  layoutKey,
  className = "",
  variant = "display",
}: AdSenseSlotProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const [isFilled, setIsFilled] = useState(false);
  const [isUnfilled, setIsUnfilled] = useState(false);

  // 1. Strictly disabled inside Native Capacitor App (Android/iOS) or if disabled
  if (api.isCapacitorNative || !ADSENSE_ENABLED) {
    return null;
  }

  // 2. If AdSense explicitly reports unfilled or failed, unmount completely
  if (isUnfilled) {
    return null;
  }

  useEffect(() => {
    injectAdSenseScript(ADSENSE_CLIENT_ID);

    const el = adRef.current;
    if (!el || typeof window === "undefined") return;

    let checkTimer: number | null = null;
    let observer: MutationObserver | null = null;

    const checkStatus = () => {
      if (!el) return;
      const status = el.getAttribute("data-ad-status");
      if (status === "filled") {
        setIsFilled(true);
        setIsUnfilled(false);
        return;
      }
      if (status === "unfilled") {
        setIsUnfilled(true);
        setIsFilled(false);
        return;
      }

      // Check if AdSense injected an iframe with real content height
      const iframe = el.querySelector("iframe");
      if (iframe) {
        const height = iframe.offsetHeight || iframe.clientHeight;
        if (height > 10) {
          setIsFilled(true);
          setIsUnfilled(false);
        }
      }
    };

    // Observer to detect when AdSense injects iframe or updates attributes
    try {
      observer = new MutationObserver(() => {
        checkStatus();
      });

      observer.observe(el, {
        attributes: true,
        attributeFilter: ["data-ad-status", "data-adsbygoogle-status", "style"],
        childList: true,
        subtree: true,
      });
    } catch {
      // Fallback
    }

    // Push ad to AdSense queue
    try {
      if (!el.getAttribute("data-adsbygoogle-status")) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.warn("Google AdSense push error:", e);
      setIsUnfilled(true);
    }

    // Periodic check up to 5 seconds to catch any delayed iframe render
    let checksCount = 0;
    checkTimer = window.setInterval(() => {
      checksCount++;
      checkStatus();
      if (checksCount >= 10) {
        if (checkTimer) clearInterval(checkTimer);
      }
    }, 500);

    return () => {
      if (observer) observer.disconnect();
      if (checkTimer) clearInterval(checkTimer);
    };
  }, [slotId]);

  // Section Banner Variant
  if (variant === "section_banner") {
    return (
      <div
        className={`w-full transition-all duration-300 ${
          isFilled
            ? `my-4 sm:my-6 ${className}`
            : "h-0 min-h-0 m-0 p-0 overflow-hidden opacity-0 pointer-events-none"
        }`}
        style={
          !isFilled
            ? {
                height: 0,
                minHeight: 0,
                margin: 0,
                padding: 0,
                overflow: "hidden",
                border: "none",
              }
            : undefined
        }
      >
        <div
          className={`transition-all duration-300 ${
            isFilled
              ? "bg-gradient-to-r from-card/80 via-card to-card/80 rounded-2xl p-3 sm:p-4 border border-border/60 neu-card relative overflow-hidden"
              : "p-0 m-0 border-none bg-transparent"
          }`}
        >
          {isFilled && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 bg-muted/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Megaphone className="w-2.5 h-2.5" /> Sponsored
              </span>
            </div>
          )}

          <div
            className={
              isFilled
                ? "min-h-[90px] sm:min-h-[100px] flex items-center justify-center overflow-hidden"
                : "w-full"
            }
          >
            <ins
              ref={adRef}
              className="adsbygoogle block w-full"
              style={{ display: "block" }}
              data-ad-client={ADSENSE_CLIENT_ID}
              data-ad-slot={slotId}
              data-ad-format={format}
              data-full-width-responsive="true"
            />
          </div>
        </div>
      </div>
    );
  }

  // In-Feed Product Card Variant (Matches ProductCard styling & dimensions)
  if (variant === "in_feed_card") {
    return (
      <div
        className={`transition-all duration-300 ${
          isFilled
            ? `bg-card rounded-2xl p-3 flex flex-col justify-between neu-card group relative overflow-hidden border border-border/60 hover:shadow-md min-h-[260px] ${className}`
            : "h-0 min-h-0 m-0 p-0 overflow-hidden opacity-0 pointer-events-none border-none bg-transparent absolute"
        }`}
        style={
          !isFilled
            ? {
                height: 0,
                minHeight: 0,
                margin: 0,
                padding: 0,
                overflow: "hidden",
                border: "none",
                position: "absolute",
                zIndex: -1,
              }
            : undefined
        }
      >
        {isFilled && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 bg-muted/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Megaphone className="w-2.5 h-2.5" /> Ad
            </span>
            <ExternalLink className="w-3 h-3 text-muted-foreground/40" />
          </div>
        )}

        <div
          className={
            isFilled
              ? "flex-1 flex flex-col items-center justify-center text-center p-2"
              : "w-full"
          }
        >
          <ins
            ref={adRef}
            className="adsbygoogle block w-full h-full"
            style={{ display: "block" }}
            data-ad-client={ADSENSE_CLIENT_ID}
            data-ad-slot={slotId}
            data-ad-format="fluid"
            data-ad-layout-key={layoutKey || "-6t+ed+2i-1n-4w"}
          />
        </div>

        {isFilled && (
          <div className="pt-2 border-t border-border/40 mt-auto">
            <div className="w-full py-1.5 px-2.5 rounded-xl bg-muted/40 text-center text-[10px] font-bold text-muted-foreground">
              Sponsored Partner
            </div>
          </div>
        )}
      </div>
    );
  }

  // Standard Display Ad Variant
  return (
    <div
      className={`w-full transition-all duration-300 ${
        isFilled
          ? `overflow-hidden my-3 ${className}`
          : "h-0 min-h-0 m-0 p-0 overflow-hidden opacity-0 pointer-events-none"
      }`}
      style={
        !isFilled
          ? {
              height: 0,
              minHeight: 0,
              margin: 0,
              padding: 0,
              overflow: "hidden",
              border: "none",
            }
          : undefined
      }
    >
      <ins
        ref={adRef}
        className="adsbygoogle block w-full"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
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
