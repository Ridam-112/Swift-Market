import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, MapPin, Loader2, AlertCircle, RefreshCw, Bike, Clock } from "lucide-react";
import { api } from "@/lib/api";

// ─── Icons ─────────────────────────────────────────────────────────────────
const RIDER_ICON = new L.DivIcon({
  html: `
    <div style="position:relative;width:54px;height:54px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.18);animation:riderPing 2s ease-out infinite;"></div>
      <div style="width:44px;height:44px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 4px 18px rgba(37,99,235,.6);display:flex;align-items:center;justify-content:center;font-size:22px;position:relative;z-index:1;">🛵</div>
    </div>
    <style>@keyframes riderPing{0%{transform:scale(1);opacity:.7}70%{transform:scale(2.3);opacity:0}100%{transform:scale(2.3);opacity:0}}</style>`,
  className: "",
  iconSize: [54, 54],
  iconAnchor: [27, 27],
  popupAnchor: [0, -32],
});

const CUSTOMER_ICON = new L.DivIcon({
  html: `<div style="width:38px;height:38px;background:#16a34a;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.3);border:3px solid white"><span style="transform:rotate(45deg);font-size:17px">🏠</span></div>`,
  className: "",
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -44],
});

// ─── Geocode + route helpers ────────────────────────────────────────────────
type LatLon = [number, number];
const geoCache = new Map<string, LatLon>();

async function geocodeAddress(addr: DeliveryAddress): Promise<LatLon | null> {
  const parts = [addr.line1, addr.city, addr.pincode].filter(Boolean);
  if (!parts.length) return null;
  const key = [...parts, "India"].join(", ");
  if (geoCache.has(key)) return geoCache.get(key)!;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(key)}&format=json&limit=1&countrycodes=in`,
      { headers: { "User-Agent": "SwiftMart-Customer/1.0" } },
    );
    const d = await r.json() as { lat: string; lon: string }[];
    if (d[0]) {
      const c: LatLon = [parseFloat(d[0].lat), parseFloat(d[0].lon)];
      geoCache.set(key, c);
      return c;
    }
    // pincode fallback
    if (addr.pincode && addr.city) {
      const fb = `${addr.pincode}, ${addr.city}, India`;
      if (geoCache.has(fb)) return geoCache.get(fb)!;
      const r2 = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fb)}&format=json&limit=1&countrycodes=in`,
        { headers: { "User-Agent": "SwiftMart-Customer/1.0" } },
      );
      const d2 = await r2.json() as { lat: string; lon: string }[];
      if (d2[0]) {
        const c: LatLon = [parseFloat(d2[0].lat), parseFloat(d2[0].lon)];
        geoCache.set(fb, c);
        return c;
      }
    }
  } catch { /* ignore */ }
  return null;
}

async function fetchRoute(from: LatLon, to: LatLon): Promise<{ path: LatLon[]; distanceM: number } | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const r = await fetch(url);
    const d = await r.json() as { routes?: { geometry: { coordinates: [number, number][] }; distance: number }[] };
    if (d.routes?.[0]) {
      return {
        path: d.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon] as LatLon),
        distanceM: d.routes[0].distance,
      };
    }
  } catch { /* ignore */ }
  return null;
}

function etaLabel(distanceM: number): string {
  // Assume 30 km/h average city speed → 500 m/min
  const mins = Math.max(1, Math.ceil(distanceM / 500));
  return mins <= 1 ? "Arriving now" : `~${mins} min away`;
}

// ─── FitBounds helper ────────────────────────────────────────────────────────
function FitBounds({ positions }: { positions: LatLon[] }) {
  const map = useMap();
  const prevKey = useRef("");
  useEffect(() => {
    if (!positions.length) return;
    const key = positions.map(p => p.join(",")).join("|");
    if (key === prevKey.current) return;
    prevKey.current = key;
    if (positions.length === 1) {
      map.flyTo(positions[0], Math.max(map.getZoom(), 15), { animate: true, duration: 1.2 });
    } else {
      map.flyToBounds(L.latLngBounds(positions), { padding: [56, 56], animate: true, duration: 1.2 });
    }
  }, [positions, map]);
  return null;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface RiderLocation { lat: number; lon: number; updatedAt: string | null }
interface RiderInfo     { name: string; phone: string; vehicle: string | null }
export interface DeliveryAddress { line1?: string; city?: string; pincode?: string }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  shopName?: string;
  deliveryAddress?: DeliveryAddress;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function RiderTrackingSheet({ isOpen, onClose, orderId, shopName, deliveryAddress }: Props) {
  const [riderPos, setRiderPos]       = useState<RiderLocation | null>(null);
  const [riderInfo, setRiderInfo]     = useState<RiderInfo | null>(null);
  const [loading, setLoading]         = useState(true);
  const [noRider, setNoRider]         = useState(false);
  const [lastSeen, setLastSeen]       = useState("");
  const [customerPos, setCustomerPos] = useState<LatLon | null>(null);
  const [routePath, setRoutePath]     = useState<LatLon[] | null>(null);
  const [distanceM, setDistanceM]     = useState<number | null>(null);
  const geocodedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Geocode customer address once when sheet opens
  useEffect(() => {
    if (!isOpen || geocodedRef.current || !deliveryAddress) return;
    geocodeAddress(deliveryAddress).then(pos => {
      if (pos) { setCustomerPos(pos); geocodedRef.current = true; }
    });
  }, [isOpen, deliveryAddress]);

  // Re-fetch OSRM route whenever rider or customer position changes
  useEffect(() => {
    if (!riderPos || !customerPos) { setRoutePath(null); setDistanceM(null); return; }
    const rider: LatLon = [riderPos.lat, riderPos.lon];
    fetchRoute(rider, customerPos).then(result => {
      if (result) { setRoutePath(result.path); setDistanceM(result.distanceM); }
    });
  }, [riderPos, customerPos]);

  const fetchLocation = useCallback(async () => {
    try {
      const data = await api.get<{
        success: boolean;
        location: RiderLocation | null;
        rider?: RiderInfo;
      }>(`/orders/${orderId}/rider-location`);

      if (!data.success) return;

      if (!data.rider) {
        setNoRider(true);
      } else {
        setRiderInfo(data.rider);
        setNoRider(false);
      }

      if (data.location) {
        setRiderPos(data.location);
        const ago = data.location.updatedAt
          ? Math.round((Date.now() - new Date(data.location.updatedAt).getTime()) / 1000)
          : null;
        setLastSeen(ago !== null ? (ago < 60 ? `${ago}s ago` : `${Math.round(ago / 60)}m ago`) : "");
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => {
    if (!isOpen) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    setLoading(true);
    setRiderPos(null);
    setNoRider(false);
    setRoutePath(null);
    setDistanceM(null);
    geocodedRef.current = false;
    fetchLocation();
    intervalRef.current = setInterval(fetchLocation, 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isOpen, orderId, fetchLocation]);

  const riderLatLng: LatLon | null = riderPos ? [riderPos.lat, riderPos.lon] : null;
  const fitPositions: LatLon[] = [];
  if (riderLatLng) fitPositions.push(riderLatLng);
  if (customerPos)  fitPositions.push(customerPos);

  const eta = distanceM !== null ? etaLabel(distanceM) : null;
  const distKm = distanceM !== null ? (distanceM / 1000).toFixed(1) : null;

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
            style={{ height: "88dvh" }}
          >
            {/* ─── Header ──────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
              <div className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Bike className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">Track your rider</p>
                {shopName && <p className="text-xs text-muted-foreground truncate">{shopName}</p>}
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ─── ETA banner ──────────────────────────────────────── */}
            <AnimatePresence>
              {eta && (
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-blue-600 text-white"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 opacity-80" />
                    <span className="text-sm font-bold">{eta}</span>
                    {distKm && (
                      <span className="text-xs opacity-75 font-medium">· {distKm} km</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs opacity-80 font-medium">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                    </span>
                    Live tracking
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Map ─────────────────────────────────────────────── */}
            <div className="relative flex-1 min-h-0">
              {loading && (
                <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-3 z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Fetching rider location…</p>
                </div>
              )}

              {!loading && noRider && (
                <div className="absolute inset-0 bg-muted/80 flex flex-col items-center justify-center gap-4 z-10 px-8">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-amber-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">No rider assigned yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      A delivery partner will be assigned soon.
                    </p>
                  </div>
                </div>
              )}

              {!loading && !noRider && !riderLatLng && (
                <div className="absolute inset-0 bg-muted/80 flex flex-col items-center justify-center gap-4 z-10 px-8">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-3xl">
                    🛵
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">Waiting for rider location</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {riderInfo?.name} hasn't shared their location yet.
                    </p>
                  </div>
                  <button onClick={fetchLocation} className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>
              )}

              {(riderLatLng || customerPos) && (
                <MapContainer
                  center={riderLatLng ?? customerPos!}
                  zoom={14}
                  style={{ width: "100%", height: "100%" }}
                  zoomControl={false}
                  attributionControl={false}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    subdomains="abcd"
                    attribution='© OpenStreetMap © CARTO'
                  />

                  {/* Route polyline */}
                  {routePath && routePath.length > 0 && (
                    <Polyline
                      positions={routePath}
                      pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.85 }}
                    />
                  )}

                  {/* Rider pin */}
                  {riderLatLng && (
                    <Marker position={riderLatLng} icon={RIDER_ICON}>
                      <Popup className="text-xs font-semibold">
                        {riderInfo?.name ?? "Your rider"}{lastSeen ? ` · ${lastSeen}` : ""}
                      </Popup>
                    </Marker>
                  )}

                  {/* Customer / drop-off pin */}
                  {customerPos && (
                    <Marker position={customerPos} icon={CUSTOMER_ICON}>
                      <Popup className="text-xs font-semibold">Your location</Popup>
                    </Marker>
                  )}

                  <FitBounds positions={fitPositions} />
                </MapContainer>
              )}

              {/* Live pill overlay (only when no ETA banner — i.e. no route yet) */}
              {riderLatLng && !eta && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/90 text-white text-xs font-bold shadow-lg backdrop-blur-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    Live · {lastSeen || "Just now"}
                  </div>
                </div>
              )}

              {/* Re-center button */}
              {riderLatLng && (
                <button
                  onClick={fetchLocation}
                  className="absolute bottom-4 right-4 z-[400] w-10 h-10 rounded-xl bg-background shadow-lg border border-border flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* ─── Rider info footer ────────────────────────────────── */}
            {!loading && riderInfo && (
              <div className="flex-shrink-0 px-4 py-3.5 border-t border-border bg-background">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl">
                      🛵
                    </div>
                    <div>
                      <p className="text-sm font-bold">{riderInfo.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {riderInfo.vehicle ?? "Delivery Partner"}
                        {distKm && <> · <span className="text-primary font-medium">{distKm} km away</span></>}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`tel:${riderInfo.phone}`}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary px-4 py-2 rounded-xl bg-primary/10 active:scale-95 transition-transform"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Rider
                  </a>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
