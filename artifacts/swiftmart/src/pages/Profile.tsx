import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressCard } from "@/components/AddressCard";
import { AddressForm } from "@/components/AddressForm";
import { PincodeSelector } from "@/components/PincodeSelector";
import { toast } from "sonner";
import { LogOut, MapPin, Store, Clock, XCircle, Shield } from "lucide-react";
import { RoleSwitcher } from "@/components/RoleSwitcher";

const SUPPORTED_PINCODES = [
  { code: "733101", city: "Balurghat" },
  { code: "733103", city: "Gangarampur" },
];

export default function Profile() {
  const { user, logout, updateUser, addAddress, deleteAddress, setRole, role, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [showPincodeSelector, setShowPincodeSelector] = useState(false);

  if (!user) {
    return null;
  }

  const handleSaveProfile = () => {
    updateUser({ name, email });
    setIsEditing(false);
    toast.success("Profile updated");
  };

  const currentPincodeInfo = SUPPORTED_PINCODES.find(p => p.code === user.pincode);

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

      {/* Area / Pincode */}
      {role === 'customer' && (
        <section className="bg-card p-5 rounded-3xl neu-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Your Area
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowPincodeSelector(!showPincodeSelector)} className="text-primary hover:bg-primary/10">
              {showPincodeSelector ? "Cancel" : (user.pincode ? "Change" : "Set")}
            </Button>
          </div>

          {!showPincodeSelector && (
            user.pincode ? (
              <div className="flex items-center gap-3 p-3 bg-background rounded-2xl neu-inset">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">
                    {currentPincodeInfo?.city ?? "Unknown Area"}
                  </div>
                  <div className="text-xs text-muted-foreground">{user.pincode} · South Dinajpur, West Bengal</div>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 bg-background rounded-2xl neu-inset text-muted-foreground text-sm">
                No area selected. Set your area to see local shops and products.
              </div>
            )
          )}

          {showPincodeSelector && (
            <PincodeSelector compact onDone={() => setShowPincodeSelector(false)} />
          )}
        </section>
      )}

      {/* Vendor Settings */}
      <section className="bg-card p-5 rounded-3xl neu-card">
        {user.vendorStatus === 'none' && (
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary neu-inset mx-auto mb-2">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">Sell on SwiftMart</h3>
            <p className="text-sm text-muted-foreground">Join 500+ sellers. Easy setup, fast payouts.</p>
            <Link href="/vendor-register">
              <Button className="w-full mt-2 rounded-xl shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90">
                Start Selling
              </Button>
            </Link>
          </div>
        )}

        {user.vendorStatus === 'pending' && (
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 neu-inset mx-auto mb-2 dark:bg-amber-900/50 dark:text-amber-500">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-amber-900 dark:text-amber-50">Application Under Review</h3>
            <Link href="/vendor-status">
              <Button variant="outline" className="w-full mt-2 rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/30 neu-inset">
                Check Status
              </Button>
            </Link>
          </div>
        )}

        {user.vendorStatus === 'approved' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600 neu-inset dark:bg-green-900/50 dark:text-green-500">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Your Store</h3>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Verified Seller</p>
              </div>
            </div>
            <div className="p-4 bg-background rounded-2xl neu-inset space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Store Name</span>
                <span className="font-bold text-foreground">{user.vendorProfile?.storeName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Category</span>
                <span className="font-bold text-foreground capitalize">{user.vendorProfile?.storeCategory.replace('-', ' ')}</span>
              </div>
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground font-medium">Switch mode</p>
                <RoleSwitcher />
                {role === 'vendor' && (
                  <Button
                    className="w-full rounded-xl shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => setLocation("/vendor")}
                  >
                    Go to Vendor Dashboard
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {user.vendorStatus === 'rejected' && (
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 neu-inset mx-auto mb-2 dark:bg-red-900/50 dark:text-red-500">
              <XCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-red-900 dark:text-red-50">Application Rejected</h3>
            <Link href="/vendor-register">
              <Button className="w-full mt-2 rounded-xl shadow-none neu-card bg-red-600 text-white hover:bg-red-700">
                Re-apply
              </Button>
            </Link>
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

      {isAdmin && (
        <section>
          <Link href="/admin">
            <Button variant="outline" className="w-full rounded-2xl h-14 font-bold text-lg shadow-none neu-inset bg-background text-foreground border-none">
              <Shield className="w-5 h-5 mr-2 text-primary" /> Admin Panel
            </Button>
          </Link>
        </section>
      )}

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
