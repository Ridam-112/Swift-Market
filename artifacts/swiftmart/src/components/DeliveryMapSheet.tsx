import { useState, useEffect, useRef, useCallback } from "react";
import { mappls } from "mappls-web-maps";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Navigation2, Truck, CheckCircle, Loader2,
  Store, User, X, MapPin, AlertCircle, Phone,
  KeyRound, RefreshCw,
} from "lucide-react";
import { formatINR } from "@/lib/currency";
import { api } from "@/lib/api";
import { toast } from "sonner";

type AddressObj = { line1?: string; line2?: string; city?: string; pincode?: string };

const geoCache = new Map<string, [number, number]>();

const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_API_KEY as string | undefined;
const mapplsObj = new mappls();
let mapplsSdkLoaded = false;
let mapplsSdkLoading: Promise<void> | null = null;

function loadMapplsSdk(): Promise<void> {
  if (mapplsSdkLoaded) return Promise.resolve();
  if (mapplsSdkLoading) return mapplsSdkLoading;
  mapplsSdkLoading = new Promise((resolve, reject) => {
    if (!MAPPLS_KEY) { reject(new Error("Mappls API key missing")); return; }
    const timeout = setTimeout(() => {
      console.warn("[Mappls] map SDK failed to initialize (check API key / domain whitelisting)");
      reject(new Error("Mappls SDK init timeout"));
    }, 10000);
    mapplsObj.initialize(MAPPLS_KEY, { map: true, layer: "raster", version: "3.0" }, () => {
      clearTimeout(timeout);
      mapplsSdkLoaded = true;
      resolve();
    });
  });
  return mapplsSdkLoading;
}

// Pin/circle marker icons rendered as inline SVG data URIs (Mappls markers take an icon URL, not raw HTML)
const makePinIconUrl = (color: string, emoji: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="48" viewBox="0 0 42 48">
    <path d="M21 47C21 47 40 29.6 40 20A19 19 0 1 0 2 20C2 29.6 21 47 21 47Z" fill="${color}" stroke="white" stroke-width="3"/>
    <text x="21" y="24" font-size="17" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const makeCircleIconUrl = (color: string, emoji: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="15" fill="${color}" stroke="white" stroke-width="3"/>
    <text x="18" y="19" font-size="15" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const RIDER_ICON_URL    = makeCircleIconUrl("#7c3aed", "\u{1F6F5}");
const SHOP_ICON_URL     = makePinIconUrl("#2563eb", "\u{1F3EA}");
const CUSTOMER_ICON_URL = makePinIconUrl("#16a34a", "\u{1F3E0}");

async function geocodeAddress(addr: AddressObj): Promise<[number, number] | null> {
  const parts = [addr.line1, addr.city, addr.pincode].filter(Boolean);
  if (parts.length === 0) return null;
  const query = [...parts, "India"].join(", ");
  if (geoCache.has(query)) return geoCache.get(query)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`,
      { headers: { "User-Agent": "SwiftMart-Delivery/1.0" } },
    );
    const data = await res.json() as { lat: string; lon: string }[];
    if (data[0]) {
      const c: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geoCache.set(query, c);
      return c;
    }
    if (addr.pincode && addr.city) {
      const fb = `${addr.pincode}, ${addr.city}, India`;
      if (geoCache.has(fb)) return geoCache.get(fb)!;
      const r2 = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fb)}&format=json&limit=1&countrycodes=in`,
        { headers: { "User-Agent": "SwiftMart-Delivery/1.0" } },
      );
      const d2 = await r2.json() as { lat: string; lon: string }[];
      if (d2[0]) {
        const c: [number, number] = [parseFloat(d2[0].lat), parseFloat(d2[0].lon)];
        geoCache.set(fb, c);
        return c;
      }
    }
  } catch { /* network error */ }
  return null;
}

async function fetchRoute(from: [number, number], to: [number, number]): Promise<{ path: [number, number][]; distanceKm: number } | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json() as {
      routes?: { geometry: { coordinates: [number, number][] }; distance: number }[];
    };
    if (data.routes?.[0]) {
      const coords = data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
      const distanceKm = +(data.routes[0].distance / 1000).toFixed(1);
      return { path: coords, distanceKm };
    }
  } catch { /* ignore */ }
  return null;
}

function formatAddr(a: AddressObj) {
  return [a.line1, a.line2, a.city, a.pincode].filter(Boolean).join(", ") || "Address not available";
}

export interface MapOrder {
  _id: string;
  shopName: string;
  shopAddress: AddressObj;
  customerName: string;
  customerPhone: string;
  address: AddressObj;
  status: string;
  netAmount: number;
  deliveryCharge: number;
  paymentMethod: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: MapOrder;
  onPickedUp: (orderId: string) => void;
  onDelivered: (orderId: string) => void;
  updating: string | null;
}

export default function DeliveryMapSheet({ isOpen, onClose, order, onPickedUp, onDelivered, updating }: Props) {
  const isPickup   = ["packed", "confirmed", "accepted", "preparing"].includes(order.status);
  const isDelivery = order.status === "out_for_delivery";

  const targetAddress = isPickup ? order.shopAddress : order.address;

  const [riderPos, setRiderPos]         = useState<[number, number] | null>(null);
  const [destPos, setDestPos]           = useState<[number, number] | null>(null);
  const [routePath, setRoutePath]       = useState<[number, number][] | null>(null);
  const [distanceKm, setDistanceKm]     = useState<number | null>(null);
  const [geocoding, setGeocoding]       = useState(false);
  const [geoError, setGeoError]         = useState(false);

  const [showOtp, setShowOtp]           = useState(false);
  const [otpDigits, setOtpDigits]       = useState(["", "", "", ""]);
  const [otpLoading, setOtpLoading]     = useState(false);
  const [isCodCollect, setIsCodCollect] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isCod      = (order.paymentMethod ?? "COD").toUpperCase() === "COD";
  const isUpdating = updating === order._id;

  const watchRef = useRef<number | null>(null);
  const destPosRef = useRef<[number, number] | null>(null);
  const lastRouteRiderRef = useRef<[number, number] | null>(null);

  // ── Mappls map instance (only for this delivery-boy map) ──────────────
  const [mapDivId] = useState(() => `delivery-map-${Math.random().toString(36).slice(2)}`);
  const [mapLoadError, setMapLoadError] = useState(false);
  const mapObjRef        = useRef<any>(null);
  const destMarkerRef    = useRef<any>(null);
  const riderMarkerRef   = useRef<any>(null);
  const polylineRef      = useRef<any>(null);

  // Create the map once we have a destination to center on
  useEffect(() => {
    if (!destPos || geocoding || geoError) return;
    let cancelled = false;

    loadMapplsSdk()
      .then(() => {
        if (cancelled) return;
        const map = mapplsObj.Map({
          id: mapDivId,
          properties: {
            center: destPos,
            zoom: 14,
            zoomControl: false,
            geolocation: false,
          },
        });
        map.on("load", () => {
          if (cancelled) return;
          mapObjRef.current = map;
          destMarkerRef.current = mapplsObj.Marker({
            map,
            position: { lat: destPos[0], lng: destPos[1] },
            icon: isPickup ? SHOP_ICON_URL : CUSTOMER_ICON_URL,
            width: 42,
            height: 48,
            popupHtml: isPickup ? order.shopName : order.customerName,
          });
        });
      })
      .catch(() => { if (!cancelled) setMapLoadError(true); });

    return () => {
      cancelled = true;
      if (mapObjRef.current) {
        try { mapObjRef.current.remove(); } catch { /* noop */ }
      }
      mapObjRef.current = null;
      destMarkerRef.current = null;
      riderMarkerRef.current = null;
      polylineRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destPos?.join(","), geocoding, geoError, mapDivId]);

  // Add/update the rider marker as GPS position changes
  useEffect(() => {
    const map = mapObjRef.current;
    if (!map || !riderPos) return;
    if (riderMarkerRef.current) {
      riderMarkerRef.current.setPosition({ lat: riderPos[0], lng: riderPos[1] });
    } else {
      riderMarkerRef.current = mapplsObj.Marker({
        map,
        position: { lat: riderPos[0], lng: riderPos[1] },
        icon: RIDER_ICON_URL,
        width: 36,
        height: 36,
        popupHtml: "You are here",
      });
    }
    if (destPos) {
      try {
        map.fitBounds([[riderPos[0], riderPos[1]], [destPos[0], destPos[1]]], { padding: 60 });
      } catch { /* fitBounds signature may vary by SDK version — non-fatal */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riderPos?.join(",")]);

  // Draw/update the route polyline
  useEffect(() => {
    const map = mapObjRef.current;
    if (!map || !routePath || routePath.length === 0) return;
    if (polylineRef.current) {
      try { polylineRef.current.remove(); } catch { /* noop */ }
    }
    polylineRef.current = mapplsObj.Polyline({
      map,
      paths: routePath.map(([lat, lng]) => ({ lat, lng })),
      strokeColor: "#2563eb",
      strokeOpacity: 0.85,
      strokeWeight: 5,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePath?.map(p => p.join(",")).join("|")]);

  // Refresh route when rider moves >30m from last *successful* route calculation
  const maybeRefreshRoute = useCallback(async (rider: [number, number], dest: [number, number]) => {
    const last = lastRouteRiderRef.current;
    if (last) {
      const dLat = (rider[0] - last[0]) * 111000;
      const dLon = (rider[1] - last[1]) * 111000 * Math.cos(rider[0] * Math.PI / 180);
      const moved = Math.sqrt(dLat * dLat + dLon * dLon);
      if (moved < 30) return; // less than 30m moved — skip
    }
    // Only advance the ref AFTER a successful fetch so transient failures
    // don't suppress the next attempt
    const route = await fetchRoute(rider, dest);
    if (route) {
      lastRouteRiderRef.current = rider;
      setRoutePath(route.path);
      setDistanceKm(route.distanceKm);
    }
  }, []);

  const loadMap = useCallback(async () => {
    setGeoError(false);
    setMapLoadError(false);
    setDestPos(null);
    setRoutePath(null);
    setDistanceKm(null);
    setGeocoding(true);
    lastRouteRiderRef.current = null;

    const dest = await geocodeAddress(targetAddress);
    setGeocoding(false);
    if (!dest) { setGeoError(true); return; }
    setDestPos(dest);
    destPosRef.current = dest;

    if (!navigator.geolocation) return;

    // Stop any existing watch
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }

    // Continuous GPS watch — updates rider marker in real time
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const rider: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setRiderPos(rider);
        if (destPosRef.current) maybeRefreshRoute(rider, destPosRef.current);
      },
      () => {
        // On error, fall back to one-shot
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const rider: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setRiderPos(rider);
            if (destPosRef.current) maybeRefreshRoute(rider, destPosRef.current);
          },
          () => { /* no GPS available */ },
          { timeout: 8000, maximumAge: 30000 },
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }, [order.status, JSON.stringify(targetAddress), maybeRefreshRoute]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) {
      setShowOtp(false);
      setOtpDigits(["", "", "", ""]);
      // Stop GPS watch when sheet closes
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      return;
    }
    loadMap();
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, [isOpen, loadMap]);

  const handleOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[idx] = digit;
    setOtpDigits(next);
    if (digit && idx < 3) inputRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  const handleOtpSubmit = async () => {
    const otp = otpDigits.join("");
    if (otp.length < 4) { toast.error("Enter all 4 digits"); return; }
    setOtpLoading(true);
    try {
      await api.post(`/delivery/me/orders/${order._id}/verify-otp`, {
        otp,
        confirmCash: isCodCollect,
      });
      toast.success("OTP verified! Order delivered ✅");
      setShowOtp(false);
      onDelivered(order._id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Incorrect OTP";
      toast.error(msg);
      setOtpDigits(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl overflow-hidden flex flex-col"
            style={{ height: "92dvh" }}
          >
            {/* ─── Header ─────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                isPickup ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                         : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
              }`}>
                {isPickup ? <Store className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">
                  {isPickup ? `Pick up · ${order.shopName}` : `Deliver to ${order.customerName}`}
                </p>
                {distanceKm !== null && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Navigation2 className="w-3 h-3" />
                    {distanceKm} km away
                  </p>
                )}
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ─── Map ────────────────────────────────────────────── */}
            <div className="relative flex-shrink-0" style={{ height: "50%" }}>
              {geocoding && (
                <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-3 z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading map…</p>
                </div>
              )}

              {geoError && !geocoding && (
                <div className="absolute inset-0 bg-muted/90 flex flex-col items-center justify-center gap-3 z-10 px-8">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-amber-500" />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Could not locate this address on the map.
                  </p>
                  <button onClick={loadMap} className="text-xs text-primary font-semibold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Try again
                  </button>
                </div>
              )}

              {mapLoadError && !geocoding && !geoError && (
                <div className="absolute inset-0 bg-muted/90 flex flex-col items-center justify-center gap-3 z-10 px-8">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-amber-500" />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Map failed to load.
                  </p>
                  <button onClick={loadMap} className="text-xs text-primary font-semibold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Try again
                  </button>
                </div>
              )}

              {!geocoding && !geoError && destPos && (
                <div id={mapDivId} style={{ width: "100%", height: "100%" }} />
              )}

              {/* Phase pill */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm ${
                  isPickup ? "bg-blue-600/90 text-white" : "bg-green-600/90 text-white"
                }`}>
                  {isPickup ? <><Store className="w-3 h-3" /> Shop Location</> : <><User className="w-3 h-3" /> Customer Location</>}
                </div>
              </div>

              {/* Refresh GPS button */}
              <button
                onClick={loadMap}
                className="absolute bottom-3 right-3 z-[400] w-9 h-9 rounded-xl bg-background shadow-lg border border-border flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* ─── Info + Actions panel ───────────────────────────── */}
            <div className="flex-1 overflow-auto px-4 py-3 space-y-3">

              {/* Address card */}
              <div className={`rounded-2xl p-3.5 border ${
                isPickup ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                         : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              }`}>
                <div className="flex items-start gap-2.5">
                  <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isPickup ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"}`} />
                  <div>
                    <p className="text-xs font-semibold mb-0.5">{isPickup ? "Shop Address" : "Delivery Address"}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{formatAddr(targetAddress)}</p>
                  </div>
                </div>
              </div>

              {/* Customer row */}
              <div className="bg-muted/40 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                  </div>
                </div>
                <a
                  href={`tel:${order.customerPhone}`}
                  className="flex items-center gap-1 text-xs font-semibold text-primary px-3 py-1.5 rounded-xl bg-primary/10 active:scale-95 transition-transform"
                >
                  <Phone className="w-3 h-3" /> Call
                </a>
              </div>

              {/* Amount row */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-muted-foreground">
                  {isCod ? "COD · Collect cash on delivery" : "Online · Already paid"}
                </span>
                <span className="text-sm font-bold text-primary">
                  {formatINR(order.deliveryCharge)} <span className="text-xs font-normal text-muted-foreground">your cut</span>
                </span>
              </div>

              {/* ─── OTP entry panel (delivery phase) ─────────────── */}
              <AnimatePresence>
                {showOtp && isDelivery && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Enter Delivery OTP</p>
                      </div>
                      <p className="text-xs text-amber-700 dark:text-amber-300 -mt-2">
                        Ask the customer for the 4-digit code shown on their order.
                      </p>

                      {/* 4-box OTP input */}
                      <div className="flex gap-3 justify-center">
                        {[0, 1, 2, 3].map(i => (
                          <input
                            key={i}
                            ref={el => { inputRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={otpDigits[i]}
                            onChange={e => handleOtpChange(i, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(i, e)}
                            className="w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-950/30 text-foreground focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 transition-colors"
                          />
                        ))}
                      </div>

                      {/* COD checkbox */}
                      {isCod && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isCodCollect}
                            onChange={e => setIsCodCollect(e.target.checked)}
                            className="w-4 h-4 accent-amber-600 rounded"
                          />
                          <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                            I collected ₹{order.netAmount.toLocaleString("en-IN")} cash from customer
                          </span>
                        </label>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl h-11 flex-1 text-xs"
                          onClick={() => { setShowOtp(false); setOtpDigits(["", "", "", ""]); }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-xl h-11 flex-1 text-xs bg-green-600 hover:bg-green-700 text-white gap-1.5"
                          disabled={otpLoading || otpDigits.join("").length < 4}
                          onClick={handleOtpSubmit}
                        >
                          {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5" /> Confirm Delivery</>}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ─── Action buttons ─────────────────────────────────── */}
              {!showOtp && (
                <div className="flex gap-2 pb-2">
                  {isPickup && (
                    <Button
                      size="sm"
                      className="flex-1 rounded-xl h-11 text-xs gap-1.5"
                      disabled={isUpdating}
                      onClick={() => onPickedUp(order._id)}
                    >
                      {isUpdating
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <><Truck className="w-3.5 h-3.5" /> Picked Up from Shop</>}
                    </Button>
                  )}

                  {isDelivery && (
                    <Button
                      size="sm"
                      className="flex-1 rounded-xl h-11 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => { setShowOtp(true); setTimeout(() => inputRefs.current[0]?.focus(), 300); }}
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Enter OTP & Deliver
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
