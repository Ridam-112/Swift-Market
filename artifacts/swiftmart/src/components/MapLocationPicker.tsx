import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MapPin, Navigation, Search, Loader2, Check, X, Building, Compass } from "lucide-react";
import { toast } from "sonner";

// Default coordinates: Balurghat City Center
const BALURGHAT_CENTER: [number, number] = [25.2217, 88.7698];

// Custom Pin Icon for House Selection
const HOUSE_PIN_ICON = new L.DivIcon({
  html: `
    <div style="position:relative;width:44px;height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <div style="width:42px;height:42px;background:#ef4444;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(239,68,68,0.45);border:3px solid white;">
        <span style="transform:rotate(45deg);font-size:18px">🏠</span>
      </div>
      <div style="width:8px;height:4px;background:rgba(0,0,0,0.3);border-radius:50%;margin-top:2px;filter:blur(1px);"></div>
    </div>
  `,
  className: "",
  iconSize: [44, 52],
  iconAnchor: [22, 52],
  popupAnchor: [0, -48],
});

export interface MapLocationResult {
  lat: number;
  lng: number;
  line1: string;
  line2: string;
  city: string;
  pincode: string;
}

interface MapLocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (location: MapLocationResult) => void;
  initialLat?: number;
  initialLng?: number;
}

// Helper component to center map smoothly
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 17, { animate: true, duration: 1.2 });
  }, [center, map]);
  return null;
}

// Map events handler to sync position on map move/drag
function MapEventsHandler({ onMoveEnd }: { onMoveEnd: (pos: [number, number]) => void }) {
  const map = useMapEvents({
    dragend: () => {
      const c = map.getCenter();
      onMoveEnd([c.lat, c.lng]);
    },
    zoomend: () => {
      const c = map.getCenter();
      onMoveEnd([c.lat, c.lng]);
    },
  });
  return null;
}

export function MapLocationPicker({
  isOpen,
  onClose,
  onConfirm,
  initialLat,
  initialLng,
}: MapLocationPickerProps) {
  const [position, setPosition] = useState<[number, number]>(
    initialLat && initialLng ? [initialLat, initialLng] : BALURGHAT_CENTER
  );
  const [addressDetails, setAddressDetails] = useState<{
    line1: string;
    line2: string;
    city: string;
    pincode: string;
  }>({
    line1: "",
    line2: "",
    city: "Balurghat",
    pincode: "733101",
  });

  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // Perform reverse geocoding via OpenStreetMap Nominatim
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { "User-Agent": "SwiftMart-App/1.0" } }
      );
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const road = addr.road || addr.street || addr.pedestrian || addr.suburb || addr.neighbourhood || "";
        const houseNo = addr.house_number || addr.building || "";
        const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.village || addr.hamlet || road || "Balurghat";
        const cityName = addr.city || addr.town || addr.county || "Balurghat";
        const postCode = (addr.postcode || "733101").replace(/\D/g, "").slice(0, 6);

        setAddressDetails({
          line1: [houseNo, road].filter(Boolean).join(", ") || locality,
          line2: locality !== road ? locality : "Balurghat",
          city: cityName,
          pincode: postCode.length === 6 ? postCode : "733101",
        });
      }
    } catch {
      // Fallback
    } finally {
      setGeocoding(false);
    }
  }, []);

  // Update position and reverse geocode
  const handlePositionChange = useCallback(
    (newPos: [number, number]) => {
      setPosition(newPos);
      reverseGeocode(newPos[0], newPos[1]);
    },
    [reverseGeocode]
  );

  // Request browser GPS location
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const userPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        handlePositionChange(userPos);
        toast.success("Located your current position 🎯");
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location permission denied. Please select manually on map.");
        } else {
          toast.error("Could not fetch GPS location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Search location via Nominatim
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const q = searchQuery.includes("Balurghat") ? searchQuery : `${searchQuery}, Balurghat, West Bengal, India`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { "User-Agent": "SwiftMart-App/1.0" } }
      );
      const data = await res.json();
      if (data && data[0]) {
        const foundPos: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        handlePositionChange(foundPos);
        setSearchQuery("");
      } else {
        toast.error("Location not found. Try dragging the map pin.");
      }
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  // Trigger initial reverse geocode when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!initialLat || !initialLng) {
        handleLocateMe();
      } else {
        reverseGeocode(position[0], position[1]);
      }
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm({
      lat: position[0],
      lng: position[1],
      line1: addressDetails.line1 || "Selected House Location",
      line2: addressDetails.line2 || "Balurghat",
      city: addressDetails.city || "Balurghat",
      pincode: addressDetails.pincode || "733101",
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[9999] backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Modal / Sheet Container */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-[10000] bg-background rounded-t-3xl overflow-hidden flex flex-col max-w-2xl mx-auto shadow-2xl"
            style={{ height: "92dvh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Select House Location</h3>
                  <p className="text-xs text-muted-foreground">Drag pin to your exact building or house</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 bg-muted/40 border-b border-border flex-shrink-0">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search colony, landmark, street in Balurghat..."
                    className="pl-9 bg-background rounded-xl border-border text-xs h-10"
                  />
                </div>
                <Button type="submit" disabled={searching} size="sm" className="rounded-xl h-10 text-xs px-4">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                </Button>
              </form>
            </div>

            {/* Map Canvas */}
            <div className="relative flex-1 w-full bg-muted/20">
              <MapContainer
                center={position}
                zoom={17}
                style={{ width: "100%", height: "100%" }}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  subdomains="abc"
                  maxZoom={19}
                />
                <Marker
                  position={position}
                  icon={HOUSE_PIN_ICON}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => {
                      const marker = e.target;
                      const p = marker.getLatLng();
                      handlePositionChange([p.lat, p.lng]);
                    },
                  }}
                />
                <MapController center={position} />
                <MapEventsHandler onMoveEnd={handlePositionChange} />
              </MapContainer>

              {/* Locate Me GPS floating button */}
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={locating}
                className="absolute top-4 right-4 z-[400] bg-card hover:bg-card/90 text-foreground border border-border shadow-lg px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 active:scale-95 transition-transform"
              >
                {locating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <Navigation className="w-4 h-4 text-primary" />
                )}
                <span>{locating ? "Locating GPS..." : "Locate Me"}</span>
              </button>

              {/* Instructional Banner floating at bottom of map */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
                <div className="bg-card/95 backdrop-blur-md text-foreground border border-border shadow-lg px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2">
                  <Compass className="w-4 h-4 text-red-500 animate-bounce" />
                  <span>Drag map or pin over your house</span>
                </div>
              </div>
            </div>

            {/* Address Details & Confirm Action Footer */}
            <div className="p-4 bg-card border-t border-border flex-shrink-0 space-y-3">
              <div className="bg-muted/50 rounded-2xl p-3 flex items-start gap-3">
                <Building className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {geocoding ? "Fetching location address..." : addressDetails.line1 || "Selected Location"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[addressDetails.line2, addressDetails.city, addressDetails.pincode].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
                    📍 Coordinates: {position[0].toFixed(5)}, {position[1].toFixed(5)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-12 text-xs">
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={geocoding}
                  className="flex-1 rounded-xl h-12 text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                >
                  <Check className="w-4 h-4" /> Confirm House Pin Location
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
