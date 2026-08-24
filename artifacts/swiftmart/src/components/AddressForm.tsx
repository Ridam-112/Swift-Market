import { useState } from "react";
import { Address } from "@/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { CheckCircle2, XCircle, MapPin } from "lucide-react";
import { isServicePincode, getServiceAreaName } from "@/lib/serviceArea";
import { MapLocationPicker, type MapLocationResult } from "./MapLocationPicker";

interface AddressFormProps {
  onSubmit: (address: Address) => void;
  onCancel: () => void;
  initialValues?: Partial<Address>;
}

export function AddressForm({ onSubmit, onCancel, initialValues }: AddressFormProps) {
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>((initialValues?.label as 'Home' | 'Work' | 'Other') ?? 'Home');
  const [line1, setLine1] = useState(initialValues?.line1 ?? "");
  const [line2, setLine2] = useState(initialValues?.line2 ?? "");
  const [city, setCity] = useState(initialValues?.city ?? "");
  const [pincode, setPincode] = useState(initialValues?.pincode ?? "");
  const [lat, setLat] = useState<number | undefined>(initialValues?.lat);
  const [lng, setLng] = useState<number | undefined>(initialValues?.lng);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const pincodeValid = pincode.length === 6 && isServicePincode(pincode);
  const pincodeOutOfArea = pincode.length === 6 && !isServicePincode(pincode);
  const areaName = getServiceAreaName(pincode);

  const handleMapConfirm = (loc: MapLocationResult) => {
    setLat(loc.lat);
    setLng(loc.lng);
    if (loc.line1) setLine1(loc.line1);
    if (loc.line2) setLine2(loc.line2);
    if (loc.city) setCity(loc.city);
    if (loc.pincode && loc.pincode.length === 6) setPincode(loc.pincode);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!line1 || !line2 || !city || !pincode) return;
    if (!pincodeValid) return;

    onSubmit({
      id: initialValues?.id ?? `a_${Date.now()}`,
      label,
      line1,
      line2,
      city,
      pincode,
      lat,
      lng,
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 bg-card p-4 rounded-2xl neu-card">
        {/* Map Location Picker Trigger */}
        <div className="bg-gradient-to-r from-amber-500/10 via-red-500/10 to-amber-500/10 p-3 rounded-2xl border border-amber-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-red-500" /> House Map Pin
            </span>
            {lat && lng ? (
              <span className="text-[10px] bg-green-500/20 text-green-700 dark:text-green-300 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Pin Set ({lat.toFixed(3)}, {lng.toFixed(3)})
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">Optional, helps rider navigate</span>
            )}
          </div>

          <Button
            type="button"
            onClick={() => setShowMapPicker(true)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-white rounded-xl py-2.5 text-xs font-bold shadow-md transition-all active:scale-[0.98]"
          >
            <MapPin className="w-4 h-4" />
            {lat && lng ? "📍 Change House Location Pin on Map" : "📍 Select House Location on Map"}
          </Button>
        </div>
      <div className="flex gap-2 mb-4">
        {(['Home', 'Work', 'Other'] as const).map(l => (
          <button
            key={l}
            type="button"
            onClick={() => setLabel(l)}
            className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
              label === l
                ? "bg-primary text-primary-foreground neu-inset"
                : "bg-background text-muted-foreground hover:bg-background/80"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="line1">Address Line 1*</Label>
        <Input
          id="line1"
          value={line1}
          onChange={e => setLine1(e.target.value)}
          placeholder="House/Flat No., Building Name"
          className="bg-background neu-inset border-none"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="line2">Area / Locality*</Label>
        <Input
          id="line2"
          value={line2}
          onChange={e => setLine2(e.target.value)}
          placeholder="Mohalla, ward, locality name"
          className="bg-background neu-inset border-none"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City*</Label>
          <Input
            id="city"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="City"
            className="bg-background neu-inset border-none"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pincode">Pincode*</Label>
          <div className="relative">
            <Input
              id="pincode"
              value={pincode}
              onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Pincode"
              className="bg-background neu-inset border-none pr-8"
              required
              maxLength={6}
            />
            {pincodeValid && <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
            {pincodeOutOfArea && <XCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />}
          </div>
        </div>
      </div>

      {pincodeValid && (
        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> SwiftMart delivers to {areaName}
        </p>
      )}
      {pincodeOutOfArea && (
        <p className="text-xs text-destructive font-medium">
          SwiftMart is not available at this pincode. Use 733101 or 733103.
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1 rounded-xl shadow-none" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!line1 || !line2 || !city || !pincodeValid}
          className="flex-1 rounded-xl shadow-none neu-card"
        >
          Save Address
        </Button>
      </div>
    </form>

    <MapLocationPicker
      isOpen={showMapPicker}
      onClose={() => setShowMapPicker(false)}
      onConfirm={handleMapConfirm}
      initialLat={lat}
      initialLng={lng}
    />
  </>
  );
}
