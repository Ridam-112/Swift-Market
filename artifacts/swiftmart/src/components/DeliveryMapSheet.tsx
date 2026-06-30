import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Navigation, Truck, CheckCircle, Loader2,
  Store, User, X, MapPin, AlertCircle, Phone,
} from "lucide-react";
import { formatINR } from "@/lib/currency";

type AddressObj = { line1?: string; line2?: string; city?: string; pincode?: string };

// Session-level geocode cache (avoids repeat Nominatim requests)
const geoCache = new Map<string, [number, number]>();

// Pure-CSS pin icons — avoids all Vite/Leaflet asset-path issues
const makePinIcon = (bg: string, emoji: string) =>
  new L.DivIcon({
    html: `<div style="background:${bg};width:38px;height:38px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,.35);border:2.5px solid white"><span style="transform:rotate(45deg);font-size:16px">${emoji}</span></div>`,
    className: "",
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -44],
  });

const SHOP_ICON = makePinIcon("#2563eb", "🏪");
const CUSTOMER_ICON = makePinIcon("#16a34a", "🏠");

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
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geoCache.set(query, coords);
      return coords;
    }

    // Fallback: pincode + city only
    if (addr.pincode && addr.city) {
      const fallback = `${addr.pincode}, ${addr.city}, India`;
      if (geoCache.has(fallback)) return geoCache.get(fallback)!;
      const r2 = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallback)}&format=json&limit=1&countrycodes=in`,
        { headers: { "User-Agent": "SwiftMart-Delivery/1.0" } },
      );
      const d2 = await r2.json() as { lat: string; lon: string }[];
      if (d2[0]) {
        const coords: [number, number] = [parseFloat(d2[0].lat), parseFloat(d2[0].lon)];
        geoCache.set(fallback, coords);
        return coords;
      }
    }
  } catch { /* network error */ }
  return null;
}

function FlyTo({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15, { animate: true, duration: 0.8 });
  }, [map, center[0], center[1]]); // eslint-disable-line react-hooks/exhaustive-deps
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

export default function DeliveryMapSheet({
  isOpen, onClose, order, onPickedUp, onDelivered, updating,
}: Props) {
  const isPickup = ["packed", "confirmed", "accepted", "preparing"].includes(order.status);
  const isDelivery = order.status === "out_for_delivery";

  const targetAddress = isPickup ? order.shopAddress : order.address;
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setGeoError(false);
    setCoords(null);
    setGeocoding(true);
    geocodeAddress(targetAddress).then(result => {
      if (result) {
        setCoords(result);
      } else {
        setGeoError(true);
      }
      setGeocoding(false);
    });
  }, [isOpen, order.status, JSON.stringify(targetAddress)]); // eslint-disable-line react-hooks/exhaustive-deps

  const openGoogleMaps = () => {
    const q = encodeURIComponent(formatAddr(targetAddress));
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  };

  const isUpdating = updating === order._id;
  const isCod = (order.paymentMethod ?? "COD").toUpperCase() === "COD";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl overflow-hidden flex flex-col"
            style={{ height: "92dvh", maxHeight: "92dvh" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-5 pb-3 border-b border-border flex-shrink-0">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                isPickup
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
              }`}>
                {isPickup ? <Store className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">
                  {isPickup ? `Pick up from ${order.shopName}` : `Deliver to ${order.customerName}`}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${isPickup ? "bg-blue-500" : "bg-green-500"}`} />
                  <p className="text-xs text-muted-foreground">
                    {isPickup ? "Go to shop · pick up order" : "Go to customer · hand over order"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Map (takes remaining space up to ~55%) */}
            <div className="relative flex-shrink-0" style={{ height: "52%" }}>
              {geocoding && (
                <div className="absolute inset-0 bg-muted/80 flex flex-col items-center justify-center gap-3 z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Locating address…</p>
                </div>
              )}

              {geoError && !geocoding && (
                <div className="absolute inset-0 bg-muted/80 flex flex-col items-center justify-center gap-3 z-10 px-8">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-amber-500" />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Map could not load for this address.<br />
                    Use the <strong>Navigate</strong> button to open Google Maps.
                  </p>
                </div>
              )}

              {!geocoding && !geoError && !coords && (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {coords && (
                <MapContainer
                  center={coords}
                  zoom={15}
                  style={{ width: "100%", height: "100%" }}
                  zoomControl={false}
                  attributionControl={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='© OpenStreetMap contributors'
                  />
                  <Marker position={coords} icon={isPickup ? SHOP_ICON : CUSTOMER_ICON}>
                    <Popup className="text-sm font-medium">
                      {isPickup ? order.shopName : order.customerName}
                    </Popup>
                  </Marker>
                  <FlyTo center={coords} />
                </MapContainer>
              )}

              {/* Phase pill overlay on map */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400]">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur ${
                  isPickup
                    ? "bg-blue-600/90 text-white"
                    : "bg-green-600/90 text-white"
                }`}>
                  {isPickup ? <><Store className="w-3 h-3" /> Shop Location</> : <><User className="w-3 h-3" /> Customer Location</>}
                </div>
              </div>
            </div>

            {/* Info panel */}
            <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
              {/* Address */}
              <div className={`rounded-2xl p-3.5 border ${
                isPickup
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              }`}>
                <div className="flex items-start gap-2.5">
                  <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isPickup ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"}`} />
                  <div>
                    <p className="text-xs font-semibold mb-0.5">
                      {isPickup ? "Shop Address" : "Delivery Address"}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {formatAddr(targetAddress)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer */}
              <div className="bg-muted/50 rounded-2xl p-3.5 flex items-center justify-between">
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

              {/* Earnings row */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-muted-foreground">
                  {isCod ? "COD · Collect cash on delivery" : "Online · Already paid"}
                </span>
                <span className="text-sm font-bold text-primary">
                  {formatINR(order.deliveryCharge)} <span className="text-xs font-normal text-muted-foreground">your cut</span>
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-11 text-xs gap-1.5 flex-shrink-0"
                  onClick={openGoogleMaps}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Navigate
                </Button>

                {isPickup && (
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl h-11 text-xs gap-1.5"
                    disabled={isUpdating}
                    onClick={() => onPickedUp(order._id)}
                  >
                    {isUpdating
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><Truck className="w-3.5 h-3.5" /> Order is Picked Up</>}
                  </Button>
                )}

                {isDelivery && (
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl h-11 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    disabled={isUpdating}
                    onClick={() => onDelivered(order._id)}
                  >
                    {isUpdating
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><CheckCircle className="w-3.5 h-3.5" /> Order Delivered Successfully</>}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
