import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, Clock, CheckCircle, XCircle, Building2, CreditCard, User, CreditCardIcon } from "lucide-react";
import { VendorApplication, VendorStatus } from "@/types";

export default function Admin() {
  const { applications, approveApplication, rejectApplication } = useAuth();
  const [filter, setFilter] = useState<VendorStatus | 'all'>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const filteredApplications = applications.filter(app => filter === 'all' || app.status === filter);

  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  const handleApprove = (id: string) => {
    approveApplication(id);
    toast.success("Application approved");
  };

  const handleReject = (id: string) => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    rejectApplication(id, rejectReason);
    setRejectingId(null);
    setRejectReason("");
    toast.success("Application rejected");
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-4xl mx-auto space-y-8">
      <SectionHeader title="Admin Panel" />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-2xl neu-card text-center">
          <div className="text-2xl font-bold text-foreground">{applications.length}</div>
          <div className="text-xs text-muted-foreground">Total Apps</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl neu-card text-center border border-amber-200 dark:border-amber-900/50">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">{pendingCount}</div>
          <div className="text-xs text-amber-700 dark:text-amber-400">Pending</div>
        </div>
        <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-2xl neu-card text-center border border-green-200 dark:border-green-900/50">
          <div className="text-2xl font-bold text-green-600 dark:text-green-500">{approvedCount}</div>
          <div className="text-xs text-green-700 dark:text-green-400">Approved</div>
        </div>
        <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-2xl neu-card text-center border border-red-200 dark:border-red-900/50">
          <div className="text-2xl font-bold text-red-600 dark:text-red-500">{rejectedCount}</div>
          <div className="text-xs text-red-700 dark:text-red-400">Rejected</div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter === f 
                ? 'bg-primary text-primary-foreground neu-card' 
                : 'bg-background text-muted-foreground neu-inset'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredApplications.length === 0 ? (
          <div className="text-center p-12 bg-card rounded-3xl neu-inset text-muted-foreground border border-dashed border-border/50">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No applications found</p>
          </div>
        ) : (
          filteredApplications.map(app => (
            <div key={app.id} className="bg-card p-6 rounded-3xl neu-card space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xl text-foreground">{app.storeName}</h3>
                    <Badge variant="secondary" className="bg-background neu-inset text-xs border-none capitalize">
                      {app.storeCategory.replace('-', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" /> {app.ownerName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Applied: {new Date(app.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  {app.status === 'pending' && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 neu-inset border-none px-3 py-1"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>}
                  {app.status === 'approved' && <Badge className="bg-green-100 text-green-800 hover:bg-green-100 neu-inset border-none px-3 py-1"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>}
                  {app.status === 'rejected' && <Badge className="bg-red-100 text-red-800 hover:bg-red-100 neu-inset border-none px-3 py-1"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-background p-4 rounded-2xl neu-inset">
                <div className="space-y-2">
                  <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Building2 className="w-4 h-4" /> KYC Details
                  </div>
                  <div className="text-sm grid grid-cols-[80px_1fr] gap-1">
                    <span className="text-muted-foreground">PAN:</span>
                    <span className="font-mono text-foreground">{app.panNumber.substring(0,2)}***{app.panNumber.substring(5,6)}***{app.panNumber.substring(9)}</span>
                    {app.gstNumber && (
                      <>
                        <span className="text-muted-foreground">GST:</span>
                        <span className="font-mono text-foreground">{app.gstNumber.substring(0,2)}***{app.gstNumber.substring(12)}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <CreditCardIcon className="w-4 h-4" /> Payment Details
                  </div>
                  <div className="text-sm grid grid-cols-[80px_1fr] gap-1">
                    <span className="text-muted-foreground">UPI:</span>
                    <span className="text-foreground">{app.upiId}</span>
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-mono text-foreground">****{app.bankAccountNumber.slice(-4)}</span>
                  </div>
                </div>
              </div>

              {app.status === 'pending' && (
                <div className="pt-2 border-t border-border flex flex-col md:flex-row gap-3">
                  {rejectingId === app.id ? (
                    <div className="w-full space-y-3 bg-red-50/50 dark:bg-red-950/10 p-3 rounded-xl">
                      <Textarea 
                        placeholder="Reason for rejection..." 
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        className="bg-background neu-inset border-red-200 dark:border-red-900 resize-none h-20"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(""); }} className="flex-1">
                          Cancel
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(app.id)} className="flex-1 bg-red-600 hover:bg-red-700 shadow-none neu-card text-white">
                          Confirm Rejection
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button onClick={() => handleApprove(app.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-none neu-card">
                        <CheckCircle className="w-4 h-4 mr-2" /> Approve Application
                      </Button>
                      <Button onClick={() => setRejectingId(app.id)} variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/30 rounded-xl shadow-none neu-inset bg-background">
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              )}

              {app.status === 'rejected' && app.rejectionReason && (
                <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100 dark:border-red-900/50 mt-2">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-400 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{app.rejectionReason}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
