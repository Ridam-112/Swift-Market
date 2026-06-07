import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, ArrowRight, AlertCircle, Upload, Loader2, FileText } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface ShopData {
  _id: string;
  status: string;
  verificationStatus?: string;
  certificateStatus?: string;
  certificateRejectReason?: string;
  certificateType?: string;
}

async function uploadCertificate(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const token = localStorage.getItem("sm_at");
  const res = await fetch("/api/upload/certificate", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json() as { success: boolean; fileUrl?: string; message?: string };
  if (!data.success || !data.fileUrl) throw new Error(data.message ?? "Upload failed");
  return data.fileUrl;
}

const CERT_NAMES: Record<string, string> = {
  fssai: "FSSAI License",
  drug_license: "Drug License",
};

export default function VendorStatus() {
  const { user, setRole } = useAuth();
  const [, setLocation] = useLocation();
  const [shop, setShop] = useState<ShopData | null>(null);
  const [loadingShop, setLoadingShop] = useState(false);
  const [reuploadingCert, setReuploadingCert] = useState(false);
  const [newCertUrl, setNewCertUrl] = useState<string | null>(null);
  const [newCertNumber, setNewCertNumber] = useState("");
  const [newCertExpiry, setNewCertExpiry] = useState("");
  const [submittingReupload, setSubmittingReupload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.vendorStatus === "none") {
      setLocation("/vendor-register");
    }
  }, [user, setLocation]);

  useEffect(() => {
    if (user && user.vendorStatus !== "none") {
      setLoadingShop(true);
      api.get<{ success: boolean; shops: ShopData[] }>(`/shops?ownerId=${user.id}&limit=1`)
        .then(d => setShop(d.shops?.[0] ?? null))
        .catch(() => {})
        .finally(() => setLoadingShop(false));
    }
  }, [user]);

  if (!user || user.vendorStatus === "none") return null;

  const certRejected = shop?.certificateStatus === "rejected";
  const certName = shop?.certificateType ? (CERT_NAMES[shop.certificateType] ?? "Certificate") : "Certificate";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReuploadingCert(true);
    try {
      const url = await uploadCertificate(file);
      setNewCertUrl(url);
    } catch {
      toast.error("Upload failed — please try again");
    } finally {
      setReuploadingCert(false);
    }
  };

  const handleResubmitCert = async () => {
    if (!newCertUrl || !shop) return;
    setSubmittingReupload(true);
    try {
      await api.patch("/shops/my/certificate", {
        certificateFile: newCertUrl,
        certificateNumber: newCertNumber || undefined,
        certificateExpiryDate: newCertExpiry || undefined,
      });
      toast.success("Document resubmitted — the admin will review it shortly");
      setShop(prev => prev ? { ...prev, certificateStatus: "pending", certificateRejectReason: undefined } : prev);
      setNewCertUrl(null);
      setNewCertNumber("");
      setNewCertExpiry("");
    } catch {
      toast.error("Resubmission failed — please try again");
    } finally {
      setSubmittingReupload(false);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-[100dvh] flex flex-col justify-center relative overflow-hidden bg-background">

      {user.vendorStatus === "pending" && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/20 p-8 rounded-[2rem] neu-card space-y-6 text-center border border-amber-200 dark:border-amber-900/50">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-500 shadow-inner">
              <Clock className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-amber-900 dark:text-amber-50 mb-2">Application Under Review</h1>
              <p className="text-amber-700/80 dark:text-amber-200/70">Our team reviews applications within 24 hours.</p>
            </div>

            {certRejected && (
              <div className="text-left bg-red-50 dark:bg-red-950/20 rounded-2xl p-4 border border-red-200 dark:border-red-900/50 space-y-3">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold text-sm">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {certName} Rejected
                </div>
                {shop?.certificateRejectReason && (
                  <p className="text-xs text-red-600 dark:text-red-300">{shop.certificateRejectReason}</p>
                )}

                {newCertUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-xs font-medium">
                      <FileText className="w-4 h-4" /> New document uploaded
                    </div>
                    <input
                      type="text"
                      placeholder="Certificate number (optional)"
                      value={newCertNumber}
                      onChange={e => setNewCertNumber(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm outline-none"
                    />
                    <input
                      type="date"
                      value={newCertExpiry}
                      onChange={e => setNewCertExpiry(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm outline-none"
                      min={new Date().toISOString().split("T")[0]}
                    />
                    <Button
                      onClick={handleResubmitCert}
                      disabled={submittingReupload}
                      className="w-full rounded-xl h-10 text-sm font-semibold shadow-none neu-card bg-primary text-primary-foreground"
                    >
                      {submittingReupload ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : "Submit for Review"}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={reuploadingCert}
                      className="w-full rounded-xl h-10 text-sm font-semibold shadow-none neu-card"
                    >
                      {reuploadingCert ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4 mr-2" /> Re-upload {certName}</>}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <Link href="/">
              <Button className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card bg-amber-500 hover:bg-amber-600 text-white mt-4">
                Go to Home
              </Button>
            </Link>
          </div>
        </div>
      )}

      {user.vendorStatus === "approved" && (
        <div className="space-y-4">
          {(!loadingShop && shop?.verificationStatus === "pending") && (
            <div className="bg-blue-50 dark:bg-blue-950/20 p-5 rounded-2xl neu-card border border-blue-200 dark:border-blue-900/50 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100 text-sm">Compliance Verification Pending</p>
                <p className="text-xs text-blue-700/80 dark:text-blue-200/70 mt-1">Admin is reviewing your compliance documents. You can start using your shop, and full verification unlocks all payout features.</p>
              </div>
            </div>
          )}

          {certRejected && (
            <div className="bg-red-50 dark:bg-red-950/20 p-5 rounded-2xl neu-card border border-red-200 dark:border-red-900/50 space-y-3">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold text-sm">
                <XCircle className="w-4 h-4 shrink-0" /> {certName} Rejected
              </div>
              {shop?.certificateRejectReason && (
                <p className="text-xs text-red-600 dark:text-red-300">{shop.certificateRejectReason}</p>
              )}
              {newCertUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-xs font-medium">
                    <FileText className="w-4 h-4" /> New document uploaded
                  </div>
                  <input type="text" placeholder="Certificate number (optional)" value={newCertNumber} onChange={e => setNewCertNumber(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm outline-none" />
                  <input type="date" value={newCertExpiry} onChange={e => setNewCertExpiry(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm outline-none" min={new Date().toISOString().split("T")[0]} />
                  <Button onClick={handleResubmitCert} disabled={submittingReupload} className="w-full rounded-xl h-10 text-sm font-semibold shadow-none neu-card bg-primary text-primary-foreground">
                    {submittingReupload ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : "Submit for Review"}
                  </Button>
                </div>
              ) : (
                <div>
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={reuploadingCert} className="w-full rounded-xl h-10 text-sm font-semibold shadow-none neu-card">
                    {reuploadingCert ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4 mr-2" /> Re-upload {certName}</>}
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="bg-green-50 dark:bg-green-950/20 p-8 rounded-[2rem] neu-card space-y-6 text-center border border-green-200 dark:border-green-900/50">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-500 shadow-inner">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-green-900 dark:text-green-50 mb-2">You're approved!</h1>
              <p className="text-green-700/80 dark:text-green-200/70">Your store is live on SwiftMart. Start adding products and accepting orders.</p>
            </div>
            <Button
              onClick={() => { setRole("vendor"); setLocation("/vendor"); }}
              className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card bg-green-600 hover:bg-green-700 text-white mt-4"
            >
              Go to Vendor Dashboard <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {user.vendorStatus === "rejected" && (
        <div className="bg-red-50 dark:bg-red-950/20 p-8 rounded-[2rem] neu-card space-y-6 text-center border border-red-200 dark:border-red-900/50">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto text-red-600 dark:text-red-500 shadow-inner">
            <XCircle className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-red-900 dark:text-red-50 mb-2">Application Rejected</h1>
            <p className="text-red-700/80 dark:text-red-200/70">Please register your shop again to continue selling on SwiftMart.</p>
          </div>
          <div className="pt-4 flex gap-3">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full rounded-2xl h-14 font-bold border-none neu-inset bg-red-100 text-red-900 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-100">
                Home
              </Button>
            </Link>
            <Link href="/vendor-register" className="flex-1">
              <Button className="w-full rounded-2xl h-14 font-bold shadow-none neu-card bg-red-600 hover:bg-red-700 text-white">
                Register Again
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
