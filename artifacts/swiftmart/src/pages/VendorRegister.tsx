import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, ChevronDown, CheckCircle2, XCircle, Upload, Loader2, X, FileText, Camera } from "lucide-react";
import { categories } from "@/data/categories";
import { api } from "@/lib/api";
import { isServicePincode, getServiceAreaName } from "@/lib/serviceArea";
import { toast } from "sonner";

const FSSAI_CATEGORIES = ["groceries", "vegetables", "dairy", "food-restaurant", "cloud-kitchen", "meat-fish", "local-brands"];
const DRUG_LICENSE_CATEGORIES = ["medicine"];

function getCertificateRequirement(category: string): "fssai" | "drug_license" | null {
  if (FSSAI_CATEGORIES.includes(category)) return "fssai";
  if (DRUG_LICENSE_CATEGORIES.includes(category)) return "drug_license";
  return null;
}

const CERT_LABELS: Record<string, { name: string; numberLabel: string; icon: string }> = {
  fssai: { name: "FSSAI License", numberLabel: "FSSAI License Number", icon: "🏛️" },
  drug_license: { name: "Drug License", numberLabel: "Drug License Number", icon: "💊" },
};

async function uploadFile(file: File, endpoint: string, fieldName: string): Promise<string> {
  const formData = new FormData();
  formData.append(fieldName, file);
  const token = localStorage.getItem("sm_at");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json() as { success: boolean; imageUrl?: string; fileUrl?: string; message?: string };
  if (!data.success) throw new Error(data.message ?? "Upload failed");
  return (data.imageUrl ?? data.fileUrl) as string;
}

function ImageUploadBox({ label, url, onUpload, uploading, required, accept = "image/*" }: {
  label: string;
  url: string | null;
  onUpload: (file: File) => void;
  uploading: boolean;
  required?: boolean;
  accept?: string;
}) {
  const isPdf = url?.includes("cloudinary") && url?.includes("/raw/");
  return (
    <div className="space-y-2">
      <Label>{label}{required && <span className="text-destructive ml-1">*</span>}</Label>
      <div className="relative h-32 rounded-xl bg-background neu-inset border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
        {url ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {isPdf ? (
              <div className="flex flex-col items-center gap-1 text-primary">
                <FileText className="w-10 h-10" />
                <span className="text-xs font-medium">Document uploaded</span>
              </div>
            ) : (
              <img src={url} alt={label} className="h-full w-full object-cover" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-card/70 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
            {!uploading && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-6 h-6 text-white" />
                <input type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
              </label>
            )}
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 cursor-pointer w-full h-full text-muted-foreground hover:text-primary transition-colors">
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <>
                <Upload className="w-8 h-8" />
                <span className="text-xs text-center px-4">Click to upload{accept.includes("pdf") ? " (JPG, PNG, PDF)" : " (JPG, PNG, WebP)"}</span>
              </>
            )}
            <input type="file" accept={accept} className="hidden" disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
          </label>
        )}
      </div>
    </div>
  );
}

export default function VendorRegister() {
  const [, setLocation] = useLocation();
  const { user, submitVendorApplication } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
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

  const [shopLogoUrl, setShopLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [certFile, setCertFile] = useState<string | null>(null);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [certNumber, setCertNumber] = useState("");
  const [certExpiry, setCertExpiry] = useState("");

  const [panNumber, setPanNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  const [bankHolderName, setBankHolderName] = useState(user?.name || "");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfscCode, setBankIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");

  const visibleCategories = activeShopSlugs === null
    ? categories
    : categories.filter(c => activeShopSlugs.includes(c.id));

  const selectedCat = visibleCategories.find(c => c.id === storeCategory);
  const certRequired = storeCategory ? getCertificateRequirement(storeCategory) : null;
  const certLabel = certRequired ? CERT_LABELS[certRequired] : null;

  const pinValid = storePincode.length === 6 && isServicePincode(storePincode);
  const pinOutOfArea = storePincode.length === 6 && !isServicePincode(storePincode);
  const areaName = getServiceAreaName(storePincode);

  const step1Valid =
    !!storeName && !!storeCategory && !!storeDescription && !!ownerName &&
    !!storeAddress && !!storeArea && !!storeCity && pinValid && !!shopLogoUrl && !uploadingLogo;

  const step2Valid = certRequired
    ? (!!certFile && !uploadingCert && !!certNumber && !!certExpiry)
    : true;

  const step3Valid = !!panNumber && panNumber.length === 10;

  const step4Valid = !!bankHolderName && !!bankAccountNumber && bankIfscCode.length === 11;

  const slideVariants = {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" as const } },
    exit: { x: -20, opacity: 0, transition: { duration: 0.2, ease: "easeIn" as const } },
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const url = await uploadFile(file, "/api/upload/shop-image", "image");
      setShopLogoUrl(url);
    } catch {
      toast.error("Logo upload failed — please try again");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCertUpload = async (file: File) => {
    setUploadingCert(true);
    try {
      const url = await uploadFile(file, "/api/upload/certificate", "file");
      setCertFile(url);
    } catch {
      toast.error("Document upload failed — please try again");
    } finally {
      setUploadingCert(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && step1Valid) setStep(2);
    else if (step === 2 && step2Valid) setStep(3);
    else if (step === 3 && step3Valid) setStep(4);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!step4Valid || submitting) return;

    setSubmitting(true);
    try {
      await submitVendorApplication({
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
        shopLogoUrl: shopLogoUrl ?? undefined,
        bankAccountHolderName: bankHolderName,
        certificateType: certRequired ?? undefined,
        certificateNumber: certNumber || undefined,
        certificateExpiryDate: certExpiry || undefined,
        certificateFile: certFile ?? undefined,
      });
      setLocation("/vendor-status");
    } catch {
      toast.error("Application failed — please check your details and try again.");
    } finally {
      setSubmitting(false);
    }
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
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 h-2 rounded-full overflow-hidden bg-muted">
            <motion.div
              className="h-full bg-primary"
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
                <p className="text-sm text-muted-foreground">Add your shop details and upload your shop logo</p>
              </div>

              <div className="space-y-4">
                <ImageUploadBox
                  label="Shop Logo"
                  url={shopLogoUrl}
                  onUpload={handleLogoUpload}
                  uploading={uploadingLogo}
                  required
                />

                <div className="space-y-2">
                  <Label>Store Name</Label>
                  <Input value={storeName} onChange={e => setStoreName(e.target.value)} className="bg-background neu-inset border-none h-12 rounded-xl" placeholder="e.g. Sharma Grocery" />
                </div>

                <div className="space-y-2">
                  <Label>Main Business Category</Label>
                  <div className="relative">
                    <select
                      value={storeCategory}
                      onChange={e => { setStoreCategory(e.target.value); setStoreSubcategory(""); setCertFile(null); setCertNumber(""); setCertExpiry(""); }}
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
                  </div>
                )}

                {certRequired && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-medium">
                    <span>{certLabel?.icon}</span>
                    <span>{certLabel?.name} required for this category — you'll upload it in the next step.</span>
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
                  <Input placeholder="Shop Full Address (door no., street)" value={storeAddress} onChange={e => setStoreAddress(e.target.value)} className="bg-background neu-inset border-none h-12 rounded-xl" />
                  <Input placeholder="Area / Locality / Mohalla" value={storeArea} onChange={e => setStoreArea(e.target.value)} className="bg-background neu-inset border-none h-12 rounded-xl" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="City" value={storeCity} onChange={e => setStoreCity(e.target.value)} className="bg-background neu-inset border-none h-12 rounded-xl" />
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

                <Button onClick={handleNext} disabled={!step1Valid} className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card mt-4">
                  Continue <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="bg-card p-6 rounded-[2rem] neu-card space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold">Compliance Documents</h2>
                <p className="text-sm text-muted-foreground">
                  {certRequired
                    ? `${certLabel?.name} is required for ${selectedCat?.name}`
                    : "No mandatory documents for your category"}
                </p>
              </div>

              <div className="space-y-4">
                {certRequired ? (
                  <>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-medium">
                      <span className="text-base">{certLabel?.icon}</span>
                      <span>{certLabel?.name} is mandatory to submit your application</span>
                    </div>

                    <ImageUploadBox
                      label={`${certLabel?.name} Document`}
                      url={certFile}
                      onUpload={handleCertUpload}
                      uploading={uploadingCert}
                      required
                      accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
                    />

                    <div className="space-y-2">
                      <Label>{certLabel?.numberLabel} <span className="text-destructive">*</span></Label>
                      <Input
                        value={certNumber}
                        onChange={e => setCertNumber(e.target.value.toUpperCase())}
                        className="bg-background neu-inset border-none h-12 rounded-xl uppercase"
                        placeholder={certRequired === "fssai" ? "e.g. 12345678901234" : "e.g. MH/12345/2024"}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Expiry Date <span className="text-destructive">*</span></Label>
                      <Input
                        type="date"
                        value={certExpiry}
                        onChange={e => setCertExpiry(e.target.value)}
                        className="bg-background neu-inset border-none h-12 rounded-xl"
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-300 text-xs font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>No mandatory compliance documents required for your category</span>
                    </div>

                    <p className="text-xs text-muted-foreground">You may optionally upload a business certificate or registration document:</p>

                    <ImageUploadBox
                      label="Business Certificate (optional)"
                      url={certFile}
                      onUpload={handleCertUpload}
                      uploading={uploadingCert}
                      accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
                    />

                    {certFile && (
                      <>
                        <div className="space-y-2">
                          <Label>Certificate Number <span className="text-xs text-muted-foreground">(optional)</span></Label>
                          <Input value={certNumber} onChange={e => setCertNumber(e.target.value)} className="bg-background neu-inset border-none h-12 rounded-xl" placeholder="Certificate number" />
                        </div>
                        <div className="space-y-2">
                          <Label>Expiry Date <span className="text-xs text-muted-foreground">(optional)</span></Label>
                          <Input type="date" value={certExpiry} onChange={e => setCertExpiry(e.target.value)} className="bg-background neu-inset border-none h-12 rounded-xl" min={new Date().toISOString().split("T")[0]} />
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-2xl h-14 font-bold border-none neu-inset bg-background text-foreground">
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!step2Valid}
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
                <h2 className="text-xl font-bold">Verify your identity</h2>
                <p className="text-sm text-muted-foreground">Required for seller verification — details are kept private</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>PAN Number <span className="text-destructive">*</span></Label>
                  <Input
                    value={panNumber}
                    onChange={e => setPanNumber(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="bg-background neu-inset border-none h-12 rounded-xl uppercase"
                    placeholder="ABCDE1234F"
                  />
                </div>

                <div className="space-y-2">
                  <Label>GST Number <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    value={gstNumber}
                    onChange={e => setGstNumber(e.target.value.toUpperCase())}
                    maxLength={15}
                    className="bg-background neu-inset border-none h-12 rounded-xl uppercase"
                    placeholder="27AADCS1234D1Z5"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 rounded-2xl h-14 font-bold border-none neu-inset bg-background text-foreground">
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!step3Valid}
                    className="flex-[2] rounded-2xl h-14 text-lg font-bold shadow-none neu-card"
                  >
                    Continue <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="bg-card p-6 rounded-[2rem] neu-card space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold">Set up your payments</h2>
                <p className="text-sm text-muted-foreground">You'll receive payouts to this account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Account Holder Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={bankHolderName}
                    onChange={e => setBankHolderName(e.target.value)}
                    className="bg-background neu-inset border-none h-12 rounded-xl"
                    placeholder="As per bank records"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Bank Account Number <span className="text-destructive">*</span></Label>
                  <Input
                    value={bankAccountNumber}
                    onChange={e => setBankAccountNumber(e.target.value.replace(/\D/g, ""))}
                    type="password"
                    placeholder="••••••••••••"
                    className="bg-background neu-inset border-none h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>IFSC Code <span className="text-destructive">*</span></Label>
                  <Input
                    value={bankIfscCode}
                    onChange={e => setBankIfscCode(e.target.value.toUpperCase())}
                    maxLength={11}
                    className="bg-background neu-inset border-none h-12 rounded-xl uppercase"
                    placeholder="SBIN0001234"
                  />
                </div>

                <div className="space-y-2">
                  <Label>UPI ID <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    value={upiId}
                    onChange={e => setUpiId(e.target.value.toLowerCase())}
                    className="bg-background neu-inset border-none h-12 rounded-xl"
                    placeholder="name@bank"
                  />
                </div>

                <p className="text-xs text-muted-foreground text-center pt-2">
                  🔒 Your bank details are encrypted and never shared
                </p>

                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(3)} className="flex-1 rounded-2xl h-14 font-bold border-none neu-inset bg-background text-foreground">
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={!step4Valid || submitting}
                    className="flex-[2] rounded-2xl h-14 text-lg font-bold shadow-none neu-card bg-primary text-primary-foreground"
                  >
                    {submitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Submitting…</> : <><span>Submit Application</span><Check className="w-5 h-5 ml-2" /></>}
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
