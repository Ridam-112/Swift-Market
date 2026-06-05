import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, ChevronDown, CheckCircle2, XCircle } from "lucide-react";
import { categories } from "@/data/categories";
import { api } from "@/lib/api";
import { isServicePincode, getServiceAreaName } from "@/lib/serviceArea";

export default function VendorRegister() {
  const [, setLocation] = useLocation();
  const { user, submitVendorApplication } = useAuth();

  const [step, setStep] = useState(1);
  const [activeShopSlugs, setActiveShopSlugs] = useState<string[] | null>(null);

  useEffect(() => {
    api.get<{ success: boolean; shopTypes: { slug: string }[] }>("/shop-types/active")
      .then(d => setActiveShopSlugs(d.shopTypes.map(st => st.slug)))
      .catch(() => setActiveShopSlugs(null));
  }, []);

  const [storeName, setStoreName] = useState("");
  const [storeCategory, setStoreCategory] = useState("");
  const [storeSubcategory, setStoreSubcategory] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [ownerName, setOwnerName] = useState(user?.name || "");

  const [storeAddress, setStoreAddress] = useState("");
  const [storeArea, setStoreArea] = useState("");
  const [storeCity, setStoreCity] = useState("");
  const [storePincode, setStorePincode] = useState("");

  const [panNumber, setPanNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  const [upiId, setUpiId] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfscCode, setBankIfscCode] = useState("");

  const visibleCategories = activeShopSlugs === null
    ? categories
    : categories.filter(c => activeShopSlugs.includes(c.id));

  const selectedCat = visibleCategories.find(c => c.id === storeCategory);

  const pinValid = storePincode.length === 6 && isServicePincode(storePincode);
  const pinOutOfArea = storePincode.length === 6 && !isServicePincode(storePincode);
  const areaName = getServiceAreaName(storePincode);

  const step1Valid =
    !!storeName && !!storeCategory && !!storeDescription && !!ownerName &&
    !!storeAddress && !!storeArea && !!storeCity && pinValid;

  const slideVariants = {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" as const } },
    exit: { x: -20, opacity: 0, transition: { duration: 0.2, ease: "easeIn" as const } },
  };

  const handleNext = () => {
    if (step === 1) {
      if (!step1Valid) return;
      setStep(2);
    } else if (step === 2) {
      if (!panNumber || panNumber.length !== 10) return;
      setStep(3);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId || !bankAccountNumber || !bankIfscCode) return;

    submitVendorApplication({
      storeName,
      storeCategory,
      storeSubcategory,
      storeDescription,
      ownerName,
      storeAddress,
      storeArea,
      storeCity,
      storePincode,
      panNumber,
      gstNumber,
      upiId,
      bankAccountNumber,
      bankIfscCode,
    });

    setLocation("/vendor-status");
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto relative overflow-hidden bg-background">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

      <div className="flex items-center gap-3 mb-8 relative z-10">
        <Link href="/profile" className="w-10 h-10 bg-card rounded-xl flex items-center justify-center neu-card text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-2xl text-foreground">Sell on SwiftMart</h1>
      </div>

      <div className="flex gap-2 mb-8 relative z-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-2 rounded-full overflow-hidden bg-muted">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: step >= i ? "100%" : "0%" }}
              animate={{ width: step >= i ? "100%" : "0%" }}
              transition={{ duration: 0.3 }}
            />
          </div>
        ))}
      </div>

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="bg-card p-6 rounded-[2rem] neu-card space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold">Tell us about your store</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Store Name</Label>
                  <Input value={storeName} onChange={e => setStoreName(e.target.value)} className="bg-background neu-inset border-none h-12 rounded-xl" placeholder="e.g. Sharma Grocery" />
                </div>

                <div className="space-y-2">
                  <Label>Main Business Category</Label>
                  <div className="relative">
                    <select
                      value={storeCategory}
                      onChange={e => { setStoreCategory(e.target.value); setStoreSubcategory(""); }}
                      className="w-full h-12 px-3 py-2 pr-10 rounded-xl bg-background neu-inset border-none text-sm focus:outline-none appearance-none text-foreground"
                    >
                      <option value="" disabled>Select Main Category</option>
                      {visibleCategories.map(c => (
                        <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {selectedCat && selectedCat.subcategories.length > 0 && (
                  <div className="space-y-2">
                    <Label>Subcategory <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                    <div className="relative">
                      <select
                        value={storeSubcategory}
                        onChange={e => setStoreSubcategory(e.target.value)}
                        className="w-full h-12 px-3 py-2 pr-10 rounded-xl bg-background neu-inset border-none text-sm focus:outline-none appearance-none text-foreground"
                      >
                        <option value="">All / General</option>
                        {selectedCat.subcategories.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                    {storeSubcategory && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                          {selectedCat.emoji} {selectedCat.name} › {storeSubcategory}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Store Description <span className="text-xs text-muted-foreground font-normal ml-2">({storeDescription.length}/200)</span></Label>
                  <Textarea
                    value={storeDescription}
                    onChange={e => setStoreDescription(e.target.value.slice(0, 200))}
                    className="bg-background neu-inset border-none rounded-xl min-h-[80px] resize-none"
                    placeholder="Short tagline or description of what you sell..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Owner Full Name</Label>
                  <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} className="bg-background neu-inset border-none h-12 rounded-xl" />
                </div>

                <div className="pt-2 border-t border-border space-y-3">
                  <Label className="text-base font-bold">Shop Address</Label>

                  <div className="space-y-2">
                    <Input
                      placeholder="Shop Full Address (door no., street)"
                      value={storeAddress}
                      onChange={e => setStoreAddress(e.target.value)}
                      className="bg-background neu-inset border-none h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Input
                      placeholder="Area / Locality / Mohalla"
                      value={storeArea}
                      onChange={e => setStoreArea(e.target.value)}
                      className="bg-background neu-inset border-none h-12 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="City"
                      value={storeCity}
                      onChange={e => setStoreCity(e.target.value)}
                      className="bg-background neu-inset border-none h-12 rounded-xl"
                    />
                    <div className="relative">
                      <Input
                        placeholder="Pincode"
                        value={storePincode}
                        onChange={e => setStorePincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        className="bg-background neu-inset border-none h-12 rounded-xl pr-9"
                      />
                      {pinValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
                      {pinOutOfArea && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />}
                    </div>
                  </div>

                  {pinValid && (
                    <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {areaName} — SwiftMart vendor area
                    </p>
                  )}
                  {pinOutOfArea && (
                    <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
                      <p className="font-semibold">Outside service area</p>
                      <p className="text-xs mt-0.5">SwiftMart vendor service is currently available only in 733101 and 733103.</p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleNext}
                  disabled={!step1Valid}
                  className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card mt-4"
                >
                  Continue <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="bg-card p-6 rounded-[2rem] neu-card space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold">Verify your identity</h2>
                <p className="text-sm text-muted-foreground">Required for seller verification — details are kept private</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>PAN Number</Label>
                  <Input
                    value={panNumber}
                    onChange={e => setPanNumber(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="bg-background neu-inset border-none h-12 rounded-xl uppercase"
                    placeholder="ABCDE1234F"
                  />
                </div>

                <div className="space-y-2">
                  <Label>GST Number (optional)</Label>
                  <Input
                    value={gstNumber}
                    onChange={e => setGstNumber(e.target.value.toUpperCase())}
                    maxLength={15}
                    className="bg-background neu-inset border-none h-12 rounded-xl uppercase"
                    placeholder="27AADCS1234D1Z5"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-2xl h-14 font-bold border-none neu-inset bg-background text-foreground">
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!panNumber || panNumber.length !== 10}
                    className="flex-[2] rounded-2xl h-14 text-lg font-bold shadow-none neu-card"
                  >
                    Continue <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="bg-card p-6 rounded-[2rem] neu-card space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold">Set up your payments</h2>
                <p className="text-sm text-muted-foreground">You'll receive payouts to this account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>UPI ID</Label>
                  <Input value={upiId} onChange={e => setUpiId(e.target.value.toLowerCase())} className="bg-background neu-inset border-none h-12 rounded-xl" placeholder="name@bank" />
                </div>

                <div className="space-y-2">
                  <Label>Bank Account Number</Label>
                  <Input value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value.replace(/\D/g, ''))} type="password" placeholder="••••••••••••" className="bg-background neu-inset border-none h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label>IFSC Code</Label>
                  <Input value={bankIfscCode} onChange={e => setBankIfscCode(e.target.value.toUpperCase())} maxLength={11} className="bg-background neu-inset border-none h-12 rounded-xl uppercase" placeholder="SBIN0001234" />
                </div>

                <p className="text-xs text-muted-foreground text-center pt-2">
                  🔒 Your bank details are encrypted and never shared
                </p>

                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 rounded-2xl h-14 font-bold border-none neu-inset bg-background text-foreground">
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={!upiId || !bankAccountNumber || bankIfscCode.length !== 11}
                    className="flex-[2] rounded-2xl h-14 text-lg font-bold shadow-none neu-card bg-primary text-primary-foreground"
                  >
                    Submit <Check className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
