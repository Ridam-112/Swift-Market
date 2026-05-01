import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, MapPin, ShoppingBag, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { RoleSwitcher } from "./RoleSwitcher";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { AddressForm } from "./AddressForm";
import { AddressCard } from "./AddressCard";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function Header() {
  const { user, role, selectedDeliveryAddress, setSelectedDeliveryAddress, addAddress } = useAuth();
  const { totalItems } = useCart();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchClick = () => {
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass w-full px-4 py-3 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link href="/" className="font-bold text-2xl text-primary flex items-center gap-2">
              <span className="bg-primary text-white rounded-xl w-8 h-8 flex items-center justify-center neu-card">S</span>
              <span className="hidden sm:inline">SwiftMart</span>
            </Link>
            
            {role === 'customer' && (
              <button 
                onClick={() => setIsLocationOpen(true)}
                className="flex items-center gap-2 text-sm bg-background/50 rounded-full px-3 py-1.5 neu-inset hover:bg-background/80 transition-colors"
              >
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <div className="flex flex-col items-start text-left">
                  <span className="font-bold text-xs leading-none text-foreground">
                    {selectedDeliveryAddress?.label || "Deliver to"}
                  </span>
                  <span className="text-muted-foreground text-[10px] truncate max-w-[100px] md:max-w-[150px] leading-none mt-0.5">
                    {selectedDeliveryAddress?.city || "Select Location"}
                  </span>
                </div>
              </button>
            )}
          </div>

          {role === 'customer' && (
            <div className="flex-1 max-w-xl hidden md:flex gap-4">
              <Link href="/shops" className="hidden md:flex items-center gap-2 font-medium hover:text-primary transition-colors text-foreground">
                <Store className="w-4 h-4" /> Shops
              </Link>
              <div className="relative flex-1">
                <button onClick={handleSearchClick} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <Search className="w-4 h-4" />
                </button>
                <Input 
                  className="w-full pl-9 bg-background/50 neu-inset border-none h-10 rounded-full focus-visible:ring-1 focus-visible:ring-primary/50 text-foreground" 
                  placeholder="Search for groceries, vegetables, personal care..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
            {user?.isVendorRegistered && <RoleSwitcher />}
            
            {role === 'customer' && (
              <>
                <Link href="/search" className="md:hidden p-2 rounded-full hover-elevate transition-colors neu-card">
                  <Search className="w-5 h-5 text-foreground" />
                </Link>
                <Link href="/cart" className="relative p-2 rounded-full hover-elevate transition-colors neu-card">
                  <ShoppingBag className="w-5 h-5 text-foreground" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center neu-card">
                      {totalItems}
                    </span>
                  )}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <Dialog open={isLocationOpen} onOpenChange={setIsLocationOpen}>
        <DialogContent className="sm:max-w-md bg-card neu-card border-none">
          <DialogHeader>
            <DialogTitle className="text-foreground">Deliver to</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {!showAddressForm ? (
              <>
                <div className="grid gap-3">
                  {user?.addresses.map(addr => (
                    <AddressCard 
                      key={addr.id}
                      address={addr}
                      selected={selectedDeliveryAddress?.id === addr.id}
                      onClick={() => {
                        setSelectedDeliveryAddress(addr);
                        setIsLocationOpen(false);
                      }}
                    />
                  ))}
                  {(!user?.addresses || user.addresses.length === 0) && (
                    <div className="text-center p-4 bg-background rounded-2xl neu-inset text-muted-foreground">
                      No addresses saved. Please add one.
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full text-primary border-primary/20 hover:bg-primary/5 rounded-xl h-12 neu-inset shadow-none"
                  onClick={() => setShowAddressForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add new address
                </Button>
              </>
            ) : (
              <AddressForm 
                onSubmit={(addr) => {
                  addAddress(addr);
                  setSelectedDeliveryAddress(addr);
                  setShowAddressForm(false);
                  setIsLocationOpen(false);
                  toast.success("Address added successfully");
                }}
                onCancel={() => setShowAddressForm(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
