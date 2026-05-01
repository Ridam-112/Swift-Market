import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressCard } from "@/components/AddressCard";
import { AddressForm } from "@/components/AddressForm";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { LogOut, MapPin, Store } from "lucide-react";

export default function Profile() {
  const { user, logout, updateUser, addAddress, deleteAddress, setRole, role } = useAuth();
  const [, setLocation] = useLocation();
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  if (!user) {
    return null;
  }

  const handleSaveProfile = () => {
    updateUser({ name, email });
    setIsEditing(false);
    toast.success("Profile updated");
  };

  const handleVendorToggle = (checked: boolean) => {
    updateUser({ isVendorRegistered: checked });
    if (checked) {
      if (!user.vendorProfile) {
        updateUser({ vendorProfile: { storeName: `${user.name}'s Store`, gstin: "Pending" } });
      }
      toast.success("Registered as Vendor successfully!");
    } else {
      setRole('customer');
      toast.info("Unregistered from Vendor");
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto space-y-8">
      <SectionHeader title="Profile" />

      {/* User Info */}
      <section className="bg-card p-5 rounded-3xl neu-card space-y-4">
        <div className="flex items-center gap-4 border-b border-border pb-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl neu-inset">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-xl">{user.name}</h2>
            <p className="text-muted-foreground text-sm">{user.phone}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)} className="text-primary hover:bg-primary/10">
            {isEditing ? "Cancel" : "Edit"}
          </Button>
        </div>

        {isEditing && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="bg-background neu-inset border-none" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-background neu-inset border-none" placeholder="Add email" />
            </div>
            <Button onClick={handleSaveProfile} className="w-full rounded-xl shadow-none neu-card">Save Changes</Button>
          </div>
        )}
      </section>

      {/* Vendor Settings */}
      <section className="bg-card p-5 rounded-3xl neu-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary neu-inset">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold">Register as Vendor</h3>
              <p className="text-xs text-muted-foreground">Start selling on SwiftMart</p>
            </div>
          </div>
          <Switch checked={user.isVendorRegistered} onCheckedChange={handleVendorToggle} />
        </div>

        {user.isVendorRegistered && (
          <div className="mt-6 p-4 bg-background rounded-2xl neu-inset space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Store Name</span>
              <span className="font-bold">{user.vendorProfile?.storeName}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">GSTIN</span>
              <span className="font-bold">{user.vendorProfile?.gstin}</span>
            </div>
            <Button 
              className="w-full mt-2 rounded-xl shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setRole(role === 'vendor' ? 'customer' : 'vendor')}
            >
              Switch to {role === 'vendor' ? 'Customer' : 'Vendor'} Dashboard
            </Button>
          </div>
        )}
      </section>

      {/* Addresses */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5" /> Saved Addresses
          </h3>
          {!showAddressForm && (
            <Button variant="ghost" size="sm" onClick={() => setShowAddressForm(true)} className="text-primary hover:bg-primary/10">
              Add New
            </Button>
          )}
        </div>

        {showAddressForm && (
          <div className="mb-4">
            <AddressForm 
              onSubmit={(addr) => {
                addAddress(addr);
                setShowAddressForm(false);
                toast.success("Address added");
              }}
              onCancel={() => setShowAddressForm(false)}
            />
          </div>
        )}

        <div className="grid gap-3">
          {user.addresses.map(addr => (
            <AddressCard 
              key={addr.id}
              address={addr}
              onDelete={() => deleteAddress(addr.id)}
            />
          ))}
          {user.addresses.length === 0 && !showAddressForm && (
            <div className="text-center p-6 bg-card rounded-2xl neu-inset text-muted-foreground">
              No addresses saved
            </div>
          )}
        </div>
      </section>

      <Button 
        variant="destructive" 
        className="w-full rounded-2xl h-14 font-bold text-lg shadow-none neu-card"
        onClick={() => {
          logout();
          setLocation("/auth");
        }}
      >
        <LogOut className="w-5 h-5 mr-2" /> Logout
      </Button>
    </div>
  );
}
