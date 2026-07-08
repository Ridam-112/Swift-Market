import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Truck, Navigation, Wifi, WifiOff, Clock,
  Phone, MapPin, AlertCircle, Loader2,
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FleetRider {
  id: string;
  name: string;
  phone: string;
  vehicle: string | null;
  status: string;          // "active" | "inactive" | "banned"
  isAvailable: boolean;
  currentLat: number | null;
  currentLon: number | null;
  locationUpdatedAt: string | null;
  activeOrder: {
    id: string;
    status: string;
    totalAmount: number | null;
    address: Record<string, string> | null;
  } | null;
}

type RiderState = "on_delivery" | "available" | "offline" | "inactive";

function getRiderState(r: FleetRider): RiderState {
  if (r.status !== "active") return "inactive";
  if (r.activeOrder) return "on_delivery";
  if (r.isAvailable && r.currentLat) return "available";
  return "offline";
}

// ─── Icons ─────────────────────────────────────────────────────────────────
function makeRiderIcon(state: RiderState) {
  const configs: Record<RiderState, { bg: string; glow: string; ping: string }> = {
    on_delivery: { bg: "#2563eb", glow: "rgba(37,99,235,.5)", ping: "#2563eb" },
    available:   { bg: "#16a34a", glow: "rgba(22,163,74,.5)", ping: "#16a34a" },
    offline:     { bg: "#6b7280", glow: "rgba(107,114,128,.3)", ping: "#6b7280" },
    inactive:    { bg: "#9ca3af", glow: "rgba(156,163,175,.2)", ping: "#9ca3af" },
  };
  const c = configs[state];
  const doPing = state === "on_delivery" || state === "available";
  return new L.DivIcon({
    html: `
      <div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
        ${doPing ? `<div style="position:absolute;inset:0;border-radius:50%;background:${c.ping};opacity:.22;animation:fp${state} 2s ease-out infinite;"></div>` : ""}
        <div style="width:42px;height:42px;border-radius:50%;background:${c.bg};border:3px solid white;box-shadow:0 4px 16px ${c.glow};display:flex;align-items:center;justify-content:center;font-size:20px;position:relative;z-index:1;">🛵</div>
      </div>
      <style>
        @keyframes fpon_delivery{0%{transform:scale(1);opacity:.7}70%{transform:scale(2.2);opacity:0}100%{transform:scale(2.2);opacity:0}}
        @keyframes fpavailable{0%{transform:scale(1);opacity:.6}70%{transform:scale(1.9);opacity:0}100%{transform:scale(1.9);opacity:0}}
      </style>`,
    className: "",
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -30],
  });
}

// ─── Fit all visible riders ────────────────────────────────────────────────
function FitAll({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const prevCount = useRef(0);
  useEffect(() => {
    if (!positions.length || positions.length === prevCount.current) return;
    prevCount.current = positions.length;
    if (positions.length === 1) {
      map.flyTo(positions[0], 15, { animate: true, duration: 1 });
    } else {
      map.flyToBounds(L.latLngBounds(positions), { padding: [64, 64], animate: true, duration: 1.2 });
    }
  }, [positions, map]);
  return null;
}

// ─── Ago helper ─────────────────────────────────────────────────────────────
function agoLabel(iso: string | null): string {
  if (!iso) return "never";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

// ─── State badge ─────────────────────────────────────────────────────────────
function StateBadge({ state }: { state: RiderState }) {
  const map: Record<RiderState, { label: string; cls: string }> = {
    on_delivery: { label: "On Delivery", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
    available:   { label: "Available",   cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
    offline:     { label: "Offline",     cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
    inactive:    { label: "Inactive",    cls: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300" },
  };
  const { label, cls } = map[state];
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

// ─── Rider list row ─────────────────────────────────────────────────────────
function RiderRow({ rider, onSelect }: { rider: FleetRider; onSelect: () => void }) {
  const state = getRiderState(rider);
  return (
    <button
      onClick={onSelect}
      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors"
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 border-2 ${
        state === "on_delivery" ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
          : state === "available" ? "border-green-400 bg-green-50 dark:bg-green-900/20"
          : "border-muted bg-muted"
      }`}>🛵</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate">{rider.name}</span>
          <StateBadge state={state} />
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
          {rider.currentLat ? (
            <>
              <Navigation className="w-3 h-3 text-green-500" />
              <span>{agoLabel(rider.locationUpdatedAt)}</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>No GPS</span>
            </>
          )}
          {rider.vehicle && <span className="opacity-60">· {rider.vehicle}</span>}
        </div>
      </div>
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function FleetMapTab() {
  const [fleet, setFleet] = useState<FleetRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [filter, setFilter] = useState<"all" | RiderState>("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchFleet = useCallback(async () => {
    try {
      const data = await api.get<{ success: boolean; fleet: FleetRider[] }>("/delivery/fleet");
      if (data.success) {
        setFleet(data.fleet);
        setLastRefresh(new Date());
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchFleet();
    intervalRef.current = setInterval(fetchFleet, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchFleet]);

  const visibleRiders = fleet.filter(r => {
    if (filter === "all") return true;
    return getRiderState(r) === filter;
  });

  const mappedRiders = visibleRiders.filter(r => r.currentLat && r.currentLon);
  const fitPositions: [number, number][] = mappedRiders.map(r => [r.currentLat!, r.currentLon!]);

  // Stats
  const counts = {
    on_delivery: fleet.filter(r => getRiderState(r) === "on_delivery").length,
    available:   fleet.filter(r => getRiderState(r) === "available").length,
    offline:     fleet.filter(r => getRiderState(r) === "offline").length,
    total:       fleet.length,
  };

  const defaultCenter: [number, number] = mappedRiders[0]
    ? [mappedRiders[0].currentLat!, mappedRiders[0].currentLon!]
    : [22.58, 88.82]; // fallback Balurghat approx

  return (
    <div className="flex flex-col h-[calc(100dvh-80px)] md:h-[calc(100dvh-48px)] overflow-hidden">
      {/* ─── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
        <div className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold">Fleet Map</h2>
          <p className="text-xs text-muted-foreground">
            Live rider positions · Auto-refreshes every 10s
            {!loading && <> · Last: {lastRefresh.toLocaleTimeString()}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFleet}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle rider list"
          >
            <Truck className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Stats strip ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex gap-0 border-b border-border bg-muted/30 overflow-x-auto">
        {(["all", "on_delivery", "available", "offline"] as const).map(f => {
          const labels: Record<string, string> = {
            all: `All (${counts.total})`,
            on_delivery: `🔵 Delivering (${counts.on_delivery})`,
            available: `🟢 Available (${counts.available})`,
            offline: `⚫ Offline (${counts.offline})`,
          };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                filter === f
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* ─── Body: map + sidebar ──────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Map */}
        <div className="relative flex-1 min-w-0">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {!loading && fleet.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-muted/60 z-10">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">🛵</div>
              <div className="text-center">
                <p className="font-semibold">No delivery partners yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add partners from the Delivery Partners tab</p>
              </div>
            </div>
          )}

          {!loading && fleet.length > 0 && mappedRiders.length === 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 shadow-lg">
                <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                  No riders have shared their GPS yet
                </p>
              </div>
            </div>
          )}

          <MapContainer
            center={defaultCenter}
            zoom={13}
            style={{ width: "100%", height: "100%" }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={20}
              attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>'
            />

            {mappedRiders.map(rider => {
              const state = getRiderState(rider);
              return (
                <Marker
                  key={rider.id}
                  position={[rider.currentLat!, rider.currentLon!]}
                  icon={makeRiderIcon(state)}
                >
                  <Popup minWidth={200} maxWidth={260}>
                    <div className="font-sans text-xs space-y-1.5 py-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm">{rider.name}</span>
                        <StateBadge state={state} />
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <a href={`tel:${rider.phone}`} className="text-primary hover:underline">{rider.phone}</a>
                      </div>
                      {rider.vehicle && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Truck className="w-3 h-3" />
                          {rider.vehicle}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Location: {agoLabel(rider.locationUpdatedAt)}
                      </div>
                      {rider.activeOrder && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
                            <Navigation className="w-3 h-3" />
                            Active delivery
                          </div>
                          {rider.activeOrder.address && (
                            <div className="flex items-start gap-1.5 text-muted-foreground mt-1">
                              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                              <span>{
                                [
                                  (rider.activeOrder.address as Record<string,string>)["line1"],
                                  (rider.activeOrder.address as Record<string,string>)["city"],
                                ].filter(Boolean).join(", ")
                              }</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            <FitAll positions={fitPositions} />
          </MapContainer>

          {/* Live indicator */}
          <div className="absolute top-3 left-3 z-[400] pointer-events-none">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-background/90 border border-border shadow-sm backdrop-blur-sm text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              {mappedRiders.length} rider{mappedRiders.length !== 1 ? "s" : ""} on map
            </div>
          </div>
        </div>

        {/* ─── Sidebar rider list ─────────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="flex-shrink-0 border-l border-border bg-background flex flex-col overflow-hidden"
            >
              <div className="flex-shrink-0 px-3 pt-3 pb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {visibleRiders.length} Rider{visibleRiders.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto px-1 pb-4 space-y-0.5">
                {visibleRiders.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
                    <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No riders match this filter</p>
                  </div>
                )}
                {visibleRiders.map(rider => (
                  <RiderRow
                    key={rider.id}
                    rider={rider}
                    onSelect={() => {
                      // no-op: map auto-fits; future: could fly to rider
                    }}
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="flex-shrink-0 px-3 py-3 border-t border-border bg-muted/20 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Legend</p>
                {([
                  ["on_delivery", "🔵", "Delivering"],
                  ["available",   "🟢", "Available & online"],
                  ["offline",     "⚫", "Not sharing GPS"],
                ] as const).map(([, dot, label]) => (
                  <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{dot}</span><span>{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
