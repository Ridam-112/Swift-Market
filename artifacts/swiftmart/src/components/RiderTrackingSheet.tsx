import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, MapPin, Loader2, AlertCircle, RefreshCw, Bike } from "lucide-react";
import { api } from "@/lib/api";

// ─── Delivery guy DivIcon ──────────────────────────────────────────────────
const RIDER_ICON = new L.DivIcon({
  html: `
    <div style="
      position:relative;
      width:52px;
      height:52px;
      display:flex;
      align-items:center;
      justify-content:center;
    ">
      <div style="
        position:absolute;
        inset:0;
        border-radius:50%;
        background:rgba(37,99,235,0.18);
        animation:riderPulse 2s ease-out infinite;
      "></div>
      <div style="
        width:42px;
        height:42px;
        border-radius:50%;
        background:#2563eb;
        border:3px solid white;
        box-shadow:0 4px 16px rgba(37,99,235,.55);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:20px;
        position:relative;
        z-index:1;
      ">🛵</div>
    </div>
    <style>
      @keyframes riderPulse {
        0%   { transform:scale(1);   opacity:.7; }
        70%  { transform:scale(2.2); opacity:0;  }
        100% { transform:scale(2.2); opacity:0;  }
      }
    </style>
  `,
  className: "",
  iconSize: [52, 52],
  iconAnchor: [26, 26],
  popupAnchor: [0, -32],
});

const CUSTOMER_ICON = new L.DivIcon({
  html: `<div style="width:36px;height:36px;background:#16a34a;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.3);border:3px solid white"><span style="transform:rotate(45deg);font-size:16px">🏠</span></div>`,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -42],
});

function FlyTo({ pos }: { pos: [number, number] }) {
  const map = useMap();
  const prevRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    const prev = prevRef.current;
    if (!prev || Math.abs(prev[0] - pos[0]) > 0.0001 || Math.abs(prev[1] - pos[1]) > 0.0001) {
      map.flyTo(pos, map.getZoom() < 14 ? 15 : map.getZoom(), { animate: true, duration: 1.2 });
      prevRef.current = pos;
    }
  }, [pos, map]);
  return null;
}

interface RiderLocation {
  lat: number;
  lon: number;
  updatedAt: string | null;
}

interface RiderInfo {
  name: string;
  phone: string;
  vehicle: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  shopName?: string;
}

export default function RiderTrackingSheet({ isOpen, onClose, orderId, shopName }: Props) {
  const [riderPos, setRiderPos]   = useState<RiderLocation | null>(null);
  const [riderInfo, setRiderInfo] = useState<RiderInfo | null>(null);
  const [loading, setLoading]     = useState(true);
  const [noRider, setNoRider]     = useState(false);
  const [lastSeen, setLastSeen]   = useState<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLocation = async () => {
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
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setLoading(true);
    setRiderPos(null);
    setNoRider(false);
    fetchLocation();
    intervalRef.current = setInterval(fetchLocation, 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, orderId]);

  const riderLatLng: [number, number] | null = riderPos ? [riderPos.lat, riderPos.lon] : null;

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
            {/* Header */}
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

            {/* Map */}
            <div className="relative flex-1 min-h-0">
              {loading && (
                <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-3 z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Fetching rider location…</p>
                </div>
              )}

              {!loading && noRider && (
                <div className="absolute inset-0 bg-muted/80 flex flex-col items-center justify-center gap-3 z-10 px-8">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-amber-500" />
                  </div>
                  <p className="text-sm font-semibold">No rider assigned yet</p>
                  <p className="text-xs text-center text-muted-foreground">
                    A delivery partner will be assigned soon. Check back in a moment.
                  </p>
                </div>
              )}

              {!loading && !noRider && !riderLatLng && (
                <div className="absolute inset-0 bg-muted/80 flex flex-col items-center justify-center gap-3 z-10 px-8">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-3xl">
                    🛵
                  </div>
                  <p className="text-sm font-semibold">Waiting for rider location</p>
                  <p className="text-xs text-center text-muted-foreground">
                    {riderInfo?.name} hasn't shared their location yet. It should appear shortly.
                  </p>
                  <button
                    onClick={fetchLocation}
                    className="flex items-center gap-1.5 text-xs text-primary font-semibold"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>
              )}

              {riderLatLng && (
                <MapContainer
                  center={riderLatLng}
                  zoom={15}
                  style={{ width: "100%", height: "100%" }}
                  zoomControl={false}
                  attributionControl={false}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    subdomains="abcd"
                  />

                  <Marker position={riderLatLng} icon={RIDER_ICON}>
                    <Popup className="text-xs font-semibold">
                      {riderInfo?.name ?? "Your rider"}{lastSeen ? ` · ${lastSeen}` : ""}
                    </Popup>
                  </Marker>

                  <FlyTo pos={riderLatLng} />
                </MapContainer>
              )}

              {/* Live pulse badge */}
              {riderLatLng && (
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

            {/* Rider info footer */}
            {!loading && riderInfo && (
              <div className="flex-shrink-0 px-4 py-4 border-t border-border bg-background">
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
