import { useState } from "react";
import { Address } from "@/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface AddressFormProps {
  onSubmit: (address: Address) => void;
  onCancel: () => void;
}

export function AddressForm({ onSubmit, onCancel }: AddressFormProps) {
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!line1 || !city || !pincode) return;
    
    onSubmit({
      id: `a_${Date.now()}`,
      label,
      line1,
      line2,
      city,
      pincode
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-card p-4 rounded-2xl neu-card">
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
        <Label htmlFor="line2">Address Line 2 (Optional)</Label>
        <Input 
          id="line2" 
          value={line2} 
          onChange={e => setLine2(e.target.value)} 
          placeholder="Street, Area, Landmark"
          className="bg-background neu-inset border-none"
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
          <Input 
            id="pincode" 
            value={pincode} 
            onChange={e => setPincode(e.target.value)} 
            placeholder="Pincode"
            className="bg-background neu-inset border-none"
            required
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1 rounded-xl shadow-none" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1 rounded-xl shadow-none neu-card">
          Save Address
        </Button>
      </div>
    </form>
  );
}
