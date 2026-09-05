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
 * 3. Graceful handling of ad-blockers, development mode, and unapproved publisher IDs.
 * 4. Zero layout shifts (CLS safe) and fully responsive across mobile & desktop.
 */

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Megaphone, ExternalLink, Sparkles } from "lucide-react";

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
 */
export function AdSenseSlot({
  slotId,
  format = "auto",
  layoutKey,
  className = "",
  variant = "display",
}: AdSenseSlotProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adFailed, setAdFailed] = useState(false);

  // 1. Strictly disabled inside Native Capacitor App (Android/iOS)
  if (api.isCapacitorNative || !ADSENSE_ENABLED) {
    return null;
  }

  const isPlaceholder = !ADSENSE_CLIENT_ID || ADSENSE_CLIENT_ID === "ca-pub-XXXXXXXXXXXXXXXX";

  useEffect(() => {
    injectAdSenseScript(ADSENSE_CLIENT_ID);

    if (isPlaceholder) return;

    // Push ad safely inside useEffect after component has mounted
    try {
      if (typeof window !== "undefined" && adRef.current) {
        if (!adRef.current.getAttribute("data-adsbygoogle-status")) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          setAdLoaded(true);
        }
      }
    } catch (e) {
      console.warn("Google AdSense push error:", e);
      setAdFailed(true);
    }
  }, [isPlaceholder, slotId]);

  // Section Banner Variant
  if (variant === "section_banner") {
    return (
      <div className={"w-full my-4 sm:my-6 " + className}>
        <div className="bg-gradient-to-r from-card/80 via-card to-card/80 rounded-2xl p-3 sm:p-4 border border-border/60 neu-card relative overflow-hidden transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 bg-muted/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Megaphone className="w-2.5 h-2.5" /> Sponsored
            </span>
          </div>

          <div className="min-h-[90px] sm:min-h-[100px] flex items-center justify-center overflow-hidden">
            {isPlaceholder ? (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-muted/20 rounded-xl border border-dashed border-border/70 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Advertise on SwiftMart</p>
                    <p className="text-[11px] text-muted-foreground">Reach thousands of active shoppers in Balurghat every day.</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-primary px-2.5 py-1 rounded-lg bg-primary/10 shrink-0">
                  Google Ad Space
                </span>
              </div>
            ) : (
              <ins
                ref={adRef}
                className="adsbygoogle block w-full"
                style={{ display: "block" }}
                data-ad-client={ADSENSE_CLIENT_ID}
                data-ad-slot={slotId}
                data-ad-format={format}
                data-full-width-responsive="true"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // In-Feed Product Card Variant (Matches ProductCard styling & dimensions)
  if (variant === "in_feed_card") {
    return (
      <div className={"bg-card rounded-2xl p-3 flex flex-col justify-between neu-card group relative overflow-hidden border border-border/60 transition-all duration-300 hover:shadow-md min-h-[260px] " + className}>
        {/* Top Header Badge */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 bg-muted/60 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Megaphone className="w-2.5 h-2.5" /> Ad
          </span>
          <ExternalLink className="w-3 h-3 text-muted-foreground/40" />
        </div>

        {/* Ad Body */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
          {isPlaceholder ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-foreground leading-tight">Featured Sponsor</p>
              <p className="text-[10px] text-muted-foreground max-w-[130px] line-clamp-2">
                Special offers & top deals curated for you
              </p>
            </div>
          ) : (
            <ins
              ref={adRef}
              className="adsbygoogle block w-full h-full"
              style={{ display: "block" }}
              data-ad-client={ADSENSE_CLIENT_ID}
              data-ad-slot={slotId}
              data-ad-format="fluid"
              data-ad-layout-key={layoutKey || "-6t+ed+2i-1n-4w"}
            />
          )}
        </div>

        {/* Bottom CTA Bar */}
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
    <div className={"w-full overflow-hidden my-3 " + className}>
      {isPlaceholder ? (
        <div className="p-3 bg-muted/20 rounded-xl border border-dashed border-border/60 text-center">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Advertisement
          </span>
        </div>
      ) : (
        <ins
          ref={adRef}
          className="adsbygoogle block w-full"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={slotId}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      )}
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
