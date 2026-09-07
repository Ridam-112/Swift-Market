import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Store, MapPin, Search, RefreshCw, Navigation, CheckCircle,
  AlertCircle, Phone, Save, X, Layers, Compass, Crosshair,
  SlidersHorizontal, Check, Loader2, Info, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";

// ─── Balurghat Center & Key Landmarks ─────────────────────────────────────────
export const BALURGHAT_CENTER: [number, number] = [25.2217, 88.7698];

export const BALURGHAT_LANDMARKS = [
  { name: "Dunlop More", lat: 25.2198, lng: 88.7652 },
  { name: "Thana More", lat: 25.2215, lng: 88.7698 },
  { name: "Chakvrigu Kalibari", lat: 25.2340, lng: 88.7750 },
  { name: "Congress Para", lat: 25.2180, lng: 88.7640 },
  { name: "Municipality More", lat: 25.2230, lng: 88.7710 },
  { name: "Public Bus Stand", lat: 25.2260, lng: 88.7675 },
  { name: "New Market", lat: 25.2205, lng: 88.7680 },
  { name: "Khansama More", lat: 25.2150, lng: 88.7580 },
  { name: "Raghunathpur", lat: 25.2280, lng: 88.7810 },
  { name: "Beltala Park", lat: 25.2130, lng: 88.7740 },
  { name: "Mangalpur", lat: 25.2380, lng: 88.7850 },
];

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ShopMapItem {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  category: string;
  status: string;
  isOpen: boolean;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
  };
  lat: number | null;
  lng: number | null;
}

// ─── Marker Icon Generator ───────────────────────────────────────────────────
function getCategoryIconConfig(category?: string | null) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("food") || cat.includes("restaurant") || cat.includes("cafe") || cat.includes("bakery") || cat.includes("sweet")) {
    return { emoji: "🍕", color: "#f97316", bg: "bg-orange-500" };
  }
  if (cat.includes("veg") || cat.includes("fruit") || cat.includes("mandi")) {
    return { emoji: "🥦", color: "#16a34a", bg: "bg-green-600" };
  }
  if (cat.includes("grocery") || cat.includes("supermarket")) {
    return { emoji: "🛒", color: "#059669", bg: "bg-emerald-600" };
  }
  if (cat.includes("electronic") || cat.includes("mobile")) {
    return { emoji: "📱", color: "#0284c7", bg: "bg-sky-600" };
  }
  if (cat.includes("fashion") || cat.includes("dress") || cat.includes("cloth")) {
    return { emoji: "👗", color: "#9333ea", bg: "bg-purple-600" };
  }
  return { emoji: "🏪", color: "#4f46e5", bg: "bg-indigo-600" };
}

function makeShopMapIcon(shop: ShopMapItem, isSelected: boolean, isEditing: boolean) {
  const cfg = getCategoryIconConfig(shop.category);
  const isOpen = shop.isOpen;

  const borderColor = isEditing
    ? "#06b6d4" // bright cyan when editing
    : isSelected
    ? "#3b82f6" // blue when selected
    : isOpen
    ? "#22c55e" // green when open
    : "#64748b"; // gray when closed

  const pulseHtml = isEditing
    ? `<div style="position:absolute;inset:-8px;border-radius:50%;background:#06b6d4;opacity:.35;animation:shopPinPulse 1.5s ease-out infinite;"></div>`
    : isSelected
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:#3b82f6;opacity:.25;animation:shopPinPulse 2s ease-out infinite;"></div>`
    : "";

  return new L.DivIcon({
    html: `
      <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
        ${pulseHtml}
        <div style="
          width:36px;
          height:36px;
          border-radius:50%;
          background:white;
          border:3px solid ${borderColor};
          box-shadow:0 4px 12px rgba(0,0,0,0.25);
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:17px;
          position:relative;
          z-index:2;
          cursor:pointer;
        ">
          ${cfg.emoji}
        </div>
        <div style="
          position:absolute;
          bottom:-2px;
          right:-2px;
          width:12px;
          height:12px;
          border-radius:50%;
          background:${isOpen ? '#22c55e' : '#94a3b8'};
          border:2px solid white;
          z-index:3;
        "></div>
      </div>
      <style>
        @keyframes shopPinPulse{0%{transform:scale(1);opacity:.5}70%{transform:scale(2);opacity:0}100%{transform:scale(2);opacity:0}}
      </style>
    `,
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

// ─── Active Draggable Target Pin ─────────────────────────────────────────────
const TARGET_EDIT_ICON = new L.DivIcon({
  html: `
    <div style="position:relative;width:56px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:grab;">
      <div style="position:absolute;inset:0;border-radius:50%;background:#06b6d4;opacity:.35;animation:shopPinPulse 1.2s ease-out infinite;"></div>
      <div style="
        width:48px;
        height:48px;
        background:#0f172a;
        border:3px solid #06b6d4;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 8px 24px rgba(6,182,212,0.5);
      ">
        <span style="transform:rotate(45deg);font-size:22px;">📍</span>
      </div>
      <div style="width:12px;height:5px;background:rgba(0,0,0,0.4);border-radius:50%;margin-top:2px;filter:blur(1px);"></div>
    </div>
  `,
  className: "",
  iconSize: [56, 64],
  iconAnchor: [28, 64],
  popupAnchor: [0, -60],
});

// ─── Map Controller (Fly & Click Handler) ─────────────────────────────────────
function MapController({
  flyTarget,
  isEditing,
  onMapClick,
}: {
  flyTarget: [number, number] | null;
  isEditing: boolean;
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (flyTarget) {
      map.flyTo(flyTarget, 16, { animate: true, duration: 1 });
    }
  }, [flyTarget, map]);

  useMapEvents({
    click(e) {
      if (isEditing) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return null;
}

// ─── Main Shops Map Tab Component ─────────────────────────────────────────────
export default function ShopsMapTab() {
  const [shops, setShops] = useState<ShopMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  // Editing state
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [pendingLat, setPendingLat] = useState<number | null>(null);
  const [pendingLng, setPendingLng] = useState<number | null>(null);

  // Map settings
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [showZoning, setShowZoning] = useState(true);
  const [showShopRadius, setShowShopRadius] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "mapped" | "unmapped">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Fetch shops
  const fetchShops = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; shops: any[] }>("/shops?limit=200&status=all");
      if (res.success && Array.isArray(res.shops)) {
        const parsed: ShopMapItem[] = res.shops.map(s => {
          const addr = s.address || {};
          const latVal = typeof addr.lat === "number" ? addr.lat : (typeof addr.latitude === "number" ? addr.latitude : null);
          const lngVal = typeof addr.lng === "number" ? addr.lng : (typeof addr.longitude === "number" ? addr.longitude : null);
          return {
            id: s._id || s.id,
            shopName: s.shopName || s.name || "Untitled Shop",
            ownerName: s.ownerName || "",
            phone: s.phone || "",
            category: s.category || s.shopType || "general",
            status: s.status || "approved",
            isOpen: s.isOpen ?? true,
            address: addr,
            lat: latVal,
            lng: lngVal,
          };
        });
        setShops(parsed);
      }
    } catch (err: any) {
      toast.error("Failed to load shops: " + (err?.message || "Network error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  // Selected shop object
  const selectedShop = useMemo(() => {
    return shops.find(s => s.id === selectedShopId) || null;
  }, [shops, selectedShopId]);

  // Editing shop object
  const editingShop = useMemo(() => {
    return shops.find(s => s.id === editingShopId) || null;
  }, [shops, editingShopId]);

  // Filtered shops
  const filteredShops = useMemo(() => {
    return shops.filter(s => {
      const matchesSearch =
        s.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.address.line1 || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery);

      const hasGps = s.lat != null && s.lng != null;
      const matchesStatus =
        statusFilter === "all" ? true :
        statusFilter === "mapped" ? hasGps : !hasGps;

      const matchesCat =
        categoryFilter === "all" ? true :
        s.category.toLowerCase() === categoryFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesCat;
    });
  }, [shops, searchQuery, statusFilter, categoryFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = shops.length;
    const mapped = shops.filter(s => s.lat != null && s.lng != null).length;
    const unmapped = total - mapped;
    return { total, mapped, unmapped };
  }, [shops]);

  // Start editing location
  const handleStartEdit = (shop: ShopMapItem) => {
    setEditingShopId(shop.id);
    setSelectedShopId(shop.id);
    // Use current lat/lng or fallback to Balurghat center
    const curLat = shop.lat ?? BALURGHAT_CENTER[0];
    const curLng = shop.lng ?? BALURGHAT_CENTER[1];
    setPendingLat(curLat);
    setPendingLng(curLng);
    setFlyTarget([curLat, curLng]);
    toast.info(`Positioning "${shop.shopName}". Click map or drag pin to adjust location.`, {
      duration: 4000,
    });
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingShopId(null);
    setPendingLat(null);
    setPendingLng(null);
  };

  // Save updated location to backend
  const handleSaveLocation = async () => {
    if (!editingShop || pendingLat == null || pendingLng == null) return;

    try {
      setSaving(true);
      const updatedAddress = {
        ...(editingShop.address || {}),
        lat: Number(pendingLat.toFixed(6)),
        lng: Number(pendingLng.toFixed(6)),
        latitude: Number(pendingLat.toFixed(6)),
        longitude: Number(pendingLng.toFixed(6)),
        city: editingShop.address?.city || "Balurghat",
        pincode: editingShop.address?.pincode || "733101",
      };

      const res = await api.patch<{ success: boolean; shop: any }>(`/shops/${editingShop.id}`, {
        address: updatedAddress,
      });

      if (res.success) {
        toast.success(`📍 Saved location for "${editingShop.shopName}"!`, {
          description: `Coords: ${pendingLat.toFixed(4)}, ${pendingLng.toFixed(4)}`,
        });

        // Update in local state
        setShops(prev =>
          prev.map(s =>
            s.id === editingShop.id
              ? { ...s, lat: pendingLat, lng: pendingLng, address: updatedAddress }
              : s
          )
        );

        setEditingShopId(null);
        setPendingLat(null);
        setPendingLng(null);
      } else {
        toast.error("Failed to save shop location");
      }
    } catch (err: any) {
      toast.error("Error saving location: " + (err?.message || "Server error"));
    } finally {
      setSaving(false);
    }
  };

  // Handle Map Click during edit
  const handleMapClick = (lat: number, lng: number) => {
    setPendingLat(Number(lat.toFixed(6)));
    setPendingLng(Number(lng.toFixed(6)));
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-80px)] md:h-[calc(100dvh-48px)] overflow-hidden bg-background">
      {/* ─── Top Control Bar ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Shops Map & Zoning Manager</h2>
              <Badge variant="outline" className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border-indigo-200">
                Balurghat Town
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Verify shop GPS pins, drag/click to fix locations, & inspect delivery zones (₹50 Max Cap)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoning toggle */}
          <Button
            size="sm"
            variant={showZoning ? "default" : "outline"}
            onClick={() => setShowZoning(v => !v)}
            className="text-xs font-semibold gap-1.5 h-9 rounded-xl"
            title="Toggle Core, Extended, & Outer Town Delivery Zones"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showZoning ? "Zoning: ON" : "Zoning: OFF"}</span>
          </Button>

          {/* Shop radius toggle */}
          <Button
            size="sm"
            variant={showShopRadius ? "secondary" : "ghost"}
            onClick={() => setShowShopRadius(v => !v)}
            className="text-xs font-semibold gap-1.5 h-9 rounded-xl hidden sm:flex"
            title="Show 3km delivery reach circle around selected shop"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Shop Radius</span>
          </Button>

          {/* Refresh */}
          <Button
            size="sm"
            variant="outline"
            onClick={fetchShops}
            disabled={loading}
            className="h-9 px-2.5 rounded-xl"
            title="Refresh shops list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          {/* Sidebar toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSidebarOpen(v => !v)}
            className="h-9 px-2.5 rounded-xl"
            title="Toggle Shop Directory Sidebar"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ─── Active Editing Banner (When an Admin is moving a shop pin) ───── */}
      {editingShop && pendingLat != null && pendingLng != null && (
        <div className="flex-shrink-0 bg-cyan-600 text-white px-4 py-2.5 flex items-center justify-between gap-4 shadow-md z-20">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 text-xs">
              <span className="font-bold">Repositioning: </span>
              <span className="font-extrabold underline truncate">{editingShop.shopName}</span>
              <span className="opacity-90 ml-2 hidden sm:inline">
                (Lat: {pendingLat.toFixed(5)}, Lng: {pendingLng.toFixed(5)}) · Click map or drag cyan pin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCancelEdit}
              className="h-8 text-xs bg-white/20 hover:bg-white/30 text-white border-0 rounded-lg"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveLocation}
              disabled={saving}
              className="h-8 text-xs bg-white text-cyan-900 hover:bg-white/90 font-bold rounded-lg shadow-sm"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Save Location
            </Button>
          </div>
        </div>
      )}

      {/* ─── Main Content (Map + Sidebar) ─────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Map Container */}
        <div className="flex-1 relative min-w-0 h-full">
          {loading && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-semibold text-muted-foreground">Loading Balurghat shops...</p>
            </div>
          )}

          {/* Quick Landmarks Floating Bar (Top Left) */}
          <div className="absolute top-3 left-3 z-[400] max-w-[calc(100%-80px)] overflow-x-auto flex items-center gap-1.5 py-1 px-2 rounded-2xl bg-card/90 border border-border shadow-md backdrop-blur-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 px-1">
              <Compass className="w-3 h-3 text-indigo-500" /> Fly:
            </span>
            {BALURGHAT_LANDMARKS.slice(0, 7).map(lm => (
              <button
                key={lm.name}
                onClick={() => {
                  setFlyTarget([lm.lat, lm.lng]);
                  if (editingShopId) {
                    setPendingLat(lm.lat);
                    setPendingLng(lm.lng);
                  }
                }}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors whitespace-nowrap"
              >
                {lm.name}
              </button>
            ))}
          </div>

          {/* Zoning Legend (Bottom Left) */}
          {showZoning && (
            <div className="absolute bottom-4 left-4 z-[400] bg-card/95 border border-border rounded-xl p-2.5 shadow-lg backdrop-blur-md text-[11px] space-y-1 pointer-events-auto">
              <p className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                <Layers className="w-3.5 h-3.5 text-indigo-500" /> Balurghat Delivery Zones
              </p>
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <span className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500 inline-block shrink-0"></span>
                <span>Zone 1: Core Town (0–2 km) · ₹25–₹30</span>
              </div>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <span className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500 inline-block shrink-0"></span>
                <span>Zone 2: Extended (2–4 km) · ₹30–₹40</span>
              </div>
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <span className="w-3 h-3 rounded-full bg-purple-500/20 border border-purple-500 inline-block shrink-0"></span>
                <span>Zone 3: Outer (4–6 km) · ₹40–₹50 (Max Cap)</span>
              </div>
            </div>
          )}

          {/* Leaflet Map with Google Maps Tiles */}
          <MapContainer
            center={BALURGHAT_CENTER}
            zoom={14}
            style={{ width: "100%", height: "100%" }}
            zoomControl={false}
            attributionControl={false}
          >
            {/* Google Maps Roadmap Tiles (Exact same as Fleet Map) */}
            <TileLayer
              url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              subdomains={["mt0", "mt1", "mt2", "mt3"]}
              maxZoom={20}
            />

            <MapController
              flyTarget={flyTarget}
              isEditing={editingShopId != null}
              onMapClick={handleMapClick}
            />

            {/* ─── Concentric Zoning Circles around Balurghat Center ─── */}
            {showZoning && (
              <>
                {/* Zone 1: Core (2 km) */}
                <Circle
                  center={BALURGHAT_CENTER}
                  radius={2000}
                  pathOptions={{
                    color: "#16a34a",
                    fillColor: "#16a34a",
                    fillOpacity: 0.07,
                    weight: 2,
                    dashArray: "5 5",
                  }}
                />
                {/* Zone 2: Extended (4 km) */}
                <Circle
                  center={BALURGHAT_CENTER}
                  radius={4000}
                  pathOptions={{
                    color: "#eab308",
                    fillColor: "#eab308",
                    fillOpacity: 0.05,
                    weight: 2,
                    dashArray: "6 6",
                  }}
                />
                {/* Zone 3: Outer (6 km) */}
                <Circle
                  center={BALURGHAT_CENTER}
                  radius={6000}
                  pathOptions={{
                    color: "#9333ea",
                    fillColor: "#9333ea",
                    fillOpacity: 0.03,
                    weight: 2,
                    dashArray: "8 8",
                  }}
                />
              </>
            )}

            {/* ─── Selected Shop Coverage Radius (3 km circle) ─── */}
            {showShopRadius && selectedShop && selectedShop.lat != null && selectedShop.lng != null && (
              <Circle
                center={[selectedShop.lat, selectedShop.lng]}
                radius={3000}
                pathOptions={{
                  color: "#3b82f6",
                  fillColor: "#3b82f6",
                  fillOpacity: 0.12,
                  weight: 2,
                }}
              />
            )}

            {/* ─── Shop Markers ─── */}
            {shops.map(shop => {
              // If this shop is currently being edited, we render the interactive target pin instead
              if (shop.id === editingShopId && pendingLat != null && pendingLng != null) {
                return (
                  <Marker
                    key={`edit-${shop.id}`}
                    position={[pendingLat, pendingLng]}
                    icon={TARGET_EDIT_ICON}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const marker = e.target;
                        const pos = marker.getLatLng();
                        setPendingLat(Number(pos.lat.toFixed(6)));
                        setPendingLng(Number(pos.lng.toFixed(6)));
                      },
                    }}
                  >
                    <Popup minWidth={220}>
                      <div className="p-1 space-y-1 text-xs">
                        <p className="font-bold text-cyan-600">🎯 Dragging Location</p>
                        <p className="font-semibold text-sm">{shop.shopName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {pendingLat.toFixed(5)}, {pendingLng.toFixed(5)}
                        </p>
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" onClick={handleSaveLocation} className="h-7 text-xs flex-1">
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-7 text-xs">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              }

              // Only display mapped shops on the map
              if (shop.lat == null || shop.lng == null) return null;

              const isSelected = shop.id === selectedShopId;
              const isEditing = shop.id === editingShopId;

              return (
                <Marker
                  key={shop.id}
                  position={[shop.lat, shop.lng]}
                  icon={makeShopMapIcon(shop, isSelected, isEditing)}
                  eventHandlers={{
                    click: () => {
                      setSelectedShopId(shop.id);
                    },
                  }}
                >
                  <Popup minWidth={240} maxWidth={280}>
                    <div className="p-1 space-y-2 text-xs font-sans">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm text-foreground">{shop.shopName}</p>
                          <Badge variant="outline" className="text-[10px] mt-0.5">
                            {shop.category}
                          </Badge>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          shop.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        }`}>
                          {shop.isOpen ? "OPEN" : "CLOSED"}
                        </span>
                      </div>

                      <div className="text-muted-foreground space-y-0.5 text-[11px]">
                        {shop.ownerName && <p>👤 Owner: {shop.ownerName}</p>}
                        {shop.phone && (
                          <p className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-primary" /> {shop.phone}
                          </p>
                        )}
                        <p className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                          <span>{shop.address.line1 || "No street address"}, {shop.address.city || "Balurghat"} ({shop.address.pincode || "733101"})</span>
                        </p>
                        <p className="text-[10px] font-mono opacity-70">
                          📍 {shop.lat.toFixed(5)}, {shop.lng.toFixed(5)}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleStartEdit(shop)}
                          className="w-full h-8 text-xs font-bold gap-1 rounded-lg"
                        >
                          <Navigation className="w-3 h-3" />
                          Adjust / Move Pin
                        </Button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* ─── Shop Directory Sidebar ───────────────────────────────────────── */}
        <div
          className={`w-80 md:w-96 border-l border-border bg-card flex flex-col shrink-0 transition-all duration-300 z-10 ${
            sidebarOpen ? "translate-x-0" : "translate-x-full hidden md:flex md:w-0 md:opacity-0"
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-3 border-b border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Shop Directory ({filteredShops.length})
              </span>
              <div className="flex gap-1 text-[11px]">
                <Badge variant="outline" className="text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200">
                  {stats.mapped} Mapped
                </Badge>
                {stats.unmapped > 0 && (
                  <Badge variant="outline" className="text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                    {stats.unmapped} Needs Pin
                  </Badge>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search shop, owner, or road..."
                className="pl-8 h-8 text-xs rounded-xl"
              />
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              {(["all", "mapped", "unmapped"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-2.5 py-1 rounded-lg font-semibold capitalize whitespace-nowrap transition-colors ${
                    statusFilter === f
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "All Shops" : f === "mapped" ? "📍 GPS Set" : "⚠️ Needs GPS"}
                </button>
              ))}
            </div>
          </div>

          {/* Shop Cards List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredShops.length === 0 ? (
              <div className="text-center py-10 px-4 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold">No shops found</p>
                <p className="text-[11px] opacity-75 mt-1">Try clearing filters or search query</p>
              </div>
            ) : (
              filteredShops.map(shop => {
                const isSelected = shop.id === selectedShopId;
                const isEditing = shop.id === editingShopId;
                const hasGps = shop.lat != null && shop.lng != null;
                const cfg = getCategoryIconConfig(shop.category);

                return (
                  <div
                    key={shop.id}
                    onClick={() => {
                      setSelectedShopId(shop.id);
                      if (hasGps) {
                        setFlyTarget([shop.lat!, shop.lng!]);
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isEditing
                        ? "border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-md ring-1 ring-cyan-500"
                        : isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center text-base shrink-0">
                        {cfg.emoji}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-foreground truncate">{shop.shopName}</h4>
                          <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                            shop.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}>
                            {shop.isOpen ? "Open" : "Closed"}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {shop.address.line1 || shop.ownerName || "Balurghat"}
                        </p>

                        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/60">
                          {hasGps ? (
                            <span className="text-[10px] font-mono text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {shop.lat!.toFixed(4)}, {shop.lng!.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> No GPS Pin
                            </span>
                          )}

                          <Button
                            size="sm"
                            variant={hasGps ? "ghost" : "default"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(shop);
                            }}
                            className={`h-6 text-[10px] font-bold px-2 rounded-lg ${
                              hasGps
                                ? "text-primary hover:bg-primary/10"
                                : "bg-amber-600 hover:bg-amber-700 text-white"
                            }`}
                          >
                            <Navigation className="w-2.5 h-2.5 mr-1" />
                            {hasGps ? "Move Pin" : "📍 Set Pin"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
