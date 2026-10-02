import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Wrench,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  Phone,
  MapPin,
  X,
  Search,
  IndianRupee,
  ShieldCheck,
  MessageCircle,
  Trash2,
  Filter,
  Tv,
  Speaker,
  Snowflake,
  Refrigerator,
  Fan,
  FileEdit,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface AdminServiceBooking {
  _id?: string;
  id: string;
  bookingNumber: string;
  shopName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceType: string;
  serviceCategoryTitle: string;
  applianceBrandModel?: string;
  problemDescription: string;
  preferredDate: string;
  preferredTimeSlot: string;
  serviceAddress: string;
  landmark?: string;
  pincode: string;
  status: "requested" | "inspection_scheduled" | "quote_provided" | "in_progress" | "completed" | "cancelled";
  visitingFee: number;
  partsCost: number;
  serviceCharge: number;
  totalAmount: number;
  isPaid: boolean;
  paymentMethod: string;
  quoteNotes?: string;
  quotedAt?: string;
  technicianName?: string;
  technicianPhone?: string;
  assignedAt?: string;
  adminNotes?: string;
  cancelReason?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "requested", label: "🟡 Requested" },
  { id: "inspection_scheduled", label: "🔵 Scheduled" },
  { id: "quote_provided", label: "🟣 Quoted" },
  { id: "in_progress", label: "🟠 In Progress" },
  { id: "completed", label: "🟢 Completed" },
  { id: "cancelled", label: "🔴 Cancelled" },
];

export function AdminServiceCornerTab() {
  const [bookings, setBookings] = useState<AdminServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // Edit / Quote Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<AdminServiceBooking | null>(null);

  // Form fields inside Modal
  const [editStatus, setEditStatus] = useState<string>("requested");
  const [techName, setTechName] = useState("");
  const [techPhone, setTechPhone] = useState("");
  const [visitingFee, setVisitingFee] = useState<number | string>(0);
  const [partsCost, setPartsCost] = useState<number | string>(0);
  const [serviceCharge, setServiceCharge] = useState<number | string>(0);
  const [totalAmount, setTotalAmount] = useState<number | string>(0);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash_on_service");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Load Bookings
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (serviceTypeFilter !== "all") params.append("serviceType", serviceTypeFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await api.get<{
        success: boolean;
        bookings: AdminServiceBooking[];
        statusCounts: Record<string, number>;
      }>(`/services/admin/bookings?${params.toString()}`);

      if (res.success) {
        setBookings(res.bookings || []);
        setStatusCounts(res.statusCounts || {});
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load service bookings");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, serviceTypeFilter, search]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Open Edit Quote Modal
  const handleOpenEdit = (b: AdminServiceBooking) => {
    setSelectedBooking(b);
    setEditStatus(b.status);
    setTechName(b.technicianName || "");
    setTechPhone(b.technicianPhone || "");
    setVisitingFee(b.visitingFee || 0);
    setPartsCost(b.partsCost || 0);
    setServiceCharge(b.serviceCharge || 0);
    setTotalAmount(b.totalAmount || 0);
    setIsPaid(Boolean(b.isPaid));
    setPaymentMethod(b.paymentMethod || "cash_on_service");
    setQuoteNotes(b.quoteNotes || "");
    setAdminNotes(b.adminNotes || "");
    setEditModalOpen(true);
  };

  // Auto-calculate Total Amount when individual fee fields change
  const handleFeeChange = (vf: number, pc: number, sc: number) => {
    setVisitingFee(vf);
    setPartsCost(pc);
    setServiceCharge(sc);
    setTotalAmount(vf + pc + sc);
  };

  // Save Quote & Technician Updates
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setSaving(true);
    try {
      const res = await api.patch<{ success: boolean; message: string }>(
        `/services/admin/bookings/${selectedBooking.id || selectedBooking._id}`,
        {
          status: editStatus,
          technicianName: techName.trim(),
          technicianPhone: techPhone.trim(),
          visitingFee: Number(visitingFee) || 0,
          partsCost: Number(partsCost) || 0,
          serviceCharge: Number(serviceCharge) || 0,
          totalAmount: Number(totalAmount) || 0,
          isPaid,
          paymentMethod,
          quoteNotes: quoteNotes.trim(),
          adminNotes: adminNotes.trim(),
        }
      );

      if (res.success) {
        toast.success("Quote & status updated successfully!");
        setEditModalOpen(false);
        fetchBookings();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update booking");
    } finally {
      setSaving(false);
    }
  };

  // Quick Status Change from card
  const handleQuickStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await api.patch<{ success: boolean; message: string }>(
        `/services/admin/bookings/${id}`,
        { status: newStatus }
      );
      if (res.success) {
        toast.success(`Status updated to ${newStatus}`);
        fetchBookings();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    }
  };

  // Delete Booking
  const handleDeleteBooking = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this service booking?")) return;
    try {
      const res = await api.delete<{ success: boolean; message: string }>(`/services/admin/bookings/${id}`);
      if (res.success) {
        toast.success("Booking deleted.");
        fetchBookings();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete booking");
    }
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case "tv_repair": return <Tv className="w-5 h-5 text-blue-500" />;
      case "home_theatre": return <Speaker className="w-5 h-5 text-indigo-500" />;
      case "ac_service": return <Snowflake className="w-5 h-5 text-cyan-500" />;
      case "fridge_repair": return <Refrigerator className="w-5 h-5 text-teal-500" />;
      case "fan_appliances": return <Fan className="w-5 h-5 text-amber-500" />;
      default: return <Wrench className="w-5 h-5 text-primary" />;
    }
  };

  const getStatusBadge = (status: AdminServiceBooking["status"]) => {
    switch (status) {
      case "requested":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">🟡 Requested</span>;
      case "inspection_scheduled":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 border border-blue-500/30">🔵 Scheduled</span>;
      case "quote_provided":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-600 border border-purple-500/30">🟣 Quote Sent</span>;
      case "in_progress":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/15 text-orange-600 border border-orange-500/30">🟠 In Progress</span>;
      case "completed":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">🟢 Completed</span>;
      case "cancelled":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30">🔴 Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-foreground">
              🛠️ Service Corner (উপহার ইলেকট্রনিক্স ল্যাব)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
              Official Partner
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            টিভি, এসি, ফ্রিজ, হোম থিয়েটার ও ফ্যান রিপেয়ার সার্ভিসের গ্রাহক বুকিংস ও অনলাইন প্রাইস কোটেশন ম্যানেজার
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchBookings}
          disabled={loading}
          className="rounded-xl text-xs font-bold gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* KPI Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card p-3.5 rounded-2xl border border-border/80 shadow-xs">
          <span className="text-[11px] text-muted-foreground block font-medium">Total Bookings</span>
          <span className="text-xl font-black text-foreground">{statusCounts.all || 0}</span>
        </div>
        <div className="bg-card p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-xs">
          <span className="text-[11px] text-amber-700 dark:text-amber-400 block font-medium">🟡 Requested</span>
          <span className="text-xl font-black text-amber-600">{statusCounts.requested || 0}</span>
        </div>
        <div className="bg-card p-3.5 rounded-2xl border border-blue-500/30 bg-blue-500/5 shadow-xs">
          <span className="text-[11px] text-blue-700 dark:text-blue-400 block font-medium">🔵 Scheduled</span>
          <span className="text-xl font-black text-blue-600">{statusCounts.inspection_scheduled || 0}</span>
        </div>
        <div className="bg-card p-3.5 rounded-2xl border border-purple-500/30 bg-purple-500/5 shadow-xs">
          <span className="text-[11px] text-purple-700 dark:text-purple-400 block font-medium">🟣 Quote Provided</span>
          <span className="text-xl font-black text-purple-600">{statusCounts.quote_provided || 0}</span>
        </div>
        <div className="bg-card p-3.5 rounded-2xl border border-orange-500/30 bg-orange-500/5 shadow-xs">
          <span className="text-[11px] text-orange-700 dark:text-orange-400 block font-medium">🟠 In Progress</span>
          <span className="text-xl font-black text-orange-600">{statusCounts.in_progress || 0}</span>
        </div>
        <div className="bg-card p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-xs">
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-medium">🟢 Completed</span>
          <span className="text-xl font-black text-emerald-600">{statusCounts.completed || 0}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card rounded-2xl p-4 border border-border/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Booking #, Customer name, Phone, Appliance..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
            />
          </div>

          {/* Service Type Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={serviceTypeFilter}
              onChange={(e) => setServiceTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-background border border-border text-xs focus:outline-hidden font-medium"
            >
              <option value="all">All Service Types</option>
              <option value="tv_repair">📺 TV Repair</option>
              <option value="home_theatre">🔊 Home Theatre</option>
              <option value="ac_service">❄️ AC Service</option>
              <option value="fridge_repair">🧊 Fridge Repair</option>
              <option value="fan_appliances">🌀 Fan & Appliances</option>
              <option value="other">🔌 Other Electronics</option>
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === f.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {f.label}
              {f.id !== "all" && statusCounts[f.id] !== undefined && (
                <span className="ml-1.5 opacity-80 font-mono">({statusCounts[f.id]})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border/80">
          <Wrench className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <h3 className="font-bold text-base text-foreground">No Service Bookings Found</h3>
          <p className="text-xs text-muted-foreground mt-1">Try changing your search query or status filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const cleanPhone = b.customerPhone?.replace(/\D/g, "") || "";
            const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
            const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(
              `Hello ${b.customerName}, this is regarding your SwiftMart Service Booking #${b.bookingNumber} (${b.serviceCategoryTitle}) by Upahar Electronics Lab.`
            )}`;

            return (
              <div
                key={b.id || b._id}
                className="bg-card rounded-2xl border border-border/80 p-5 shadow-xs transition-all hover:border-primary/40 space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                      {getServiceIcon(b.serviceType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-primary">
                          #{b.bookingNumber}
                        </span>
                        {getStatusBadge(b.status)}
                      </div>
                      <h3 className="font-extrabold text-sm sm:text-base text-foreground mt-0.5">
                        {b.serviceCategoryTitle} {b.applianceBrandModel ? `— ${b.applianceBrandModel}` : ""}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status quick select */}
                    <select
                      value={b.status}
                      onChange={(e) => handleQuickStatusChange(b.id || b._id, e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-muted text-foreground text-xs font-semibold border border-border focus:outline-hidden"
                    >
                      <option value="requested">🟡 Requested</option>
                      <option value="inspection_scheduled">🔵 Inspection Scheduled</option>
                      <option value="quote_provided">🟣 Quote Provided</option>
                      <option value="in_progress">🟠 In Progress</option>
                      <option value="completed">🟢 Completed</option>
                      <option value="cancelled">🔴 Cancelled</option>
                    </select>

                    <Button
                      size="sm"
                      onClick={() => handleOpenEdit(b)}
                      className="rounded-xl text-xs font-bold gap-1 shadow-xs"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Edit Quote / Tech</span>
                    </Button>

                    <button
                      type="button"
                      onClick={() => handleDeleteBooking(b.id || b._id)}
                      className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Delete booking"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 3-Column Info Body */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Customer Information */}
                  <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border border-border/50">
                    <span className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider block">
                      Customer Info:
                    </span>
                    <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                      {b.customerName}
                    </p>
                    <p className="font-mono text-muted-foreground flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      {b.customerPhone}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      {b.customerPhone && (
                        <a
                          href={`tel:${b.customerPhone}`}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs hover:bg-emerald-600 transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                      )}
                      {cleanPhone && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-green-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs hover:bg-green-700 transition-colors"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                    <div className="pt-1.5 text-[11px] text-muted-foreground flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                      <span>{b.serviceAddress}{b.landmark ? `, Near ${b.landmark}` : ""}, {b.pincode}</span>
                    </div>
                  </div>

                  {/* Appliance & Problem Description */}
                  <div className="space-y-1.5 bg-muted/30 p-3 rounded-xl border border-border/50">
                    <span className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider block">
                      Appliance &amp; Problem:
                    </span>
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>Slot: {b.preferredDate} ({b.preferredTimeSlot.toUpperCase()})</span>
                    </div>
                    {b.applianceBrandModel && (
                      <p className="text-muted-foreground font-medium">
                        Model: <strong className="text-foreground">{b.applianceBrandModel}</strong>
                      </p>
                    )}
                    <div className="bg-card p-2 rounded-lg border border-border/50 text-[11px] mt-1 text-foreground">
                      "{b.problemDescription}"
                    </div>
                  </div>

                  {/* Assigned Technician & Pricing */}
                  <div className="space-y-2 bg-muted/30 p-3 rounded-xl border border-border/50">
                    <span className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider block">
                      Technician &amp; Quote Status:
                    </span>

                    {b.technicianName ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground">{b.technicianName}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{b.technicianPhone}</p>
                        </div>
                        {b.technicianPhone && (
                          <a
                            href={`tel:${b.technicianPhone}`}
                            className="p-1 rounded-md bg-emerald-500 text-white"
                            title="Call Technician"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-600 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        ⚠️ No technician assigned yet.
                      </div>
                    )}

                    {/* Price Breakdown */}
                    <div className="pt-1 text-[11px] space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Visiting Fee:</span>
                        <span className="font-semibold">₹{b.visitingFee || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Parts Cost:</span>
                        <span className="font-semibold">₹{b.partsCost || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service Charge:</span>
                        <span className="font-semibold">₹{b.serviceCharge || 0}</span>
                      </div>
                      <div className="flex justify-between font-bold text-xs pt-1 border-t border-border/60 text-primary">
                        <span>Total Quoted Bill:</span>
                        <span>₹{b.totalAmount || 0} {b.isPaid ? "(Paid ✅)" : "(Unpaid)"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Optional Quote / Admin Notes */}
                {(b.quoteNotes || b.adminNotes) && (
                  <div className="pt-2 text-xs flex flex-wrap gap-3">
                    {b.quoteNotes && (
                      <div className="flex-1 bg-purple-500/5 border border-purple-500/20 p-2.5 rounded-xl">
                        <span className="font-bold text-[10px] text-purple-600 uppercase tracking-wider block">
                          Customer Quote Notes:
                        </span>
                        <p className="text-foreground text-[11px] mt-0.5">"{b.quoteNotes}"</p>
                      </div>
                    )}
                    {b.adminNotes && (
                      <div className="flex-1 bg-muted/60 border border-border p-2.5 rounded-xl">
                        <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider block">
                          Internal Admin Note:
                        </span>
                        <p className="text-foreground text-[11px] mt-0.5">"{b.adminNotes}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit Quote & Assign Technician Modal ─────────────────────────────── */}
      <AnimatePresence>
        {editModalOpen && selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card w-full max-w-xl rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <span>Edit Quote &amp; Technician</span>
                    <span className="font-mono text-primary text-xs">#{selectedBooking.bookingNumber}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedBooking.serviceCategoryTitle} • {selectedBooking.customerName} ({selectedBooking.customerPhone})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveEdit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
                {/* Status Selection */}
                <div>
                  <label className="font-bold text-foreground block mb-1">
                    Booking Status:
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs focus:outline-hidden font-semibold"
                  >
                    <option value="requested">🟡 Requested (নতুন বুকিং পর্যালোচনা প্রয়োজন)</option>
                    <option value="inspection_scheduled">🔵 Inspection Scheduled (টেকনিশিয়ান ভিজিটিং কনফার্ম)</option>
                    <option value="quote_provided">🟣 Quote Provided (গ্রাহককে অনলাইনে বিল পাঠানো হয়েছে)</option>
                    <option value="in_progress">🟠 In Progress (মেরামতের কাজ চলছে)</option>
                    <option value="completed">🟢 Completed (কাজ সম্পন্ন হয়েছে)</option>
                    <option value="cancelled">🔴 Cancelled (বাতিল)</option>
                  </select>
                </div>

                {/* Technician Assignment */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-3">
                  <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>Upahar Lab Technician Assignment:</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-muted-foreground block mb-1">টেকনিশিয়ানের নাম (Technician Name):</label>
                      <input
                        type="text"
                        placeholder="e.g. Subhashish Roy"
                        value={techName}
                        onChange={(e) => setTechName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground block mb-1">ফোন নম্বর (Technician Phone):</label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={techPhone}
                        onChange={(e) => setTechPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Dynamic Pricing Box (User Request: "age problem dekhbo then puro price ta oder k bole dbo online e tai jeno edit kora jay") */}
                <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/30 space-y-3">
                  <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 text-xs">
                    <IndianRupee className="w-4 h-4" />
                    <span>অনলাইন কোটেশন ও সার্ভিস বিল এডিটর (Post-Inspection Quote):</span>
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">ভিজিট ফি (₹):</label>
                      <input
                        type="number"
                        min="0"
                        value={visitingFee}
                        onChange={(e) =>
                          handleFeeChange(
                            Number(e.target.value) || 0,
                            Number(partsCost) || 0,
                            Number(serviceCharge) || 0
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">পার্টস খরচ (₹):</label>
                      <input
                        type="number"
                        min="0"
                        value={partsCost}
                        onChange={(e) =>
                          handleFeeChange(
                            Number(visitingFee) || 0,
                            Number(e.target.value) || 0,
                            Number(serviceCharge) || 0
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">সার্ভিসিং চার্জ (₹):</label>
                      <input
                        type="number"
                        min="0"
                        value={serviceCharge}
                        onChange={(e) =>
                          handleFeeChange(
                            Number(visitingFee) || 0,
                            Number(partsCost) || 0,
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Total Amount Override */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border">
                    <span className="font-bold text-foreground text-xs">সর্বমোট বিল (Total Quoted Bill):</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-primary text-base">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(Number(e.target.value) || 0)}
                        className="w-24 px-2.5 py-1 rounded-lg bg-background border border-border text-sm font-extrabold text-primary font-mono text-right"
                      />
                    </div>
                  </div>

                  {/* Payment Checkbox */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isPaidCheck"
                      checked={isPaid}
                      onChange={(e) => setIsPaid(e.target.checked)}
                      className="rounded border-border text-primary w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="isPaidCheck" className="text-xs font-semibold text-foreground cursor-pointer">
                      Payment Collected / Paid (পেমেন্ট গ্রহণ করা হয়েছে)
                    </label>
                  </div>
                </div>

                {/* Customer Visible Diagnosis / Quote Notes */}
                <div>
                  <label className="font-bold text-foreground block mb-1">
                    গ্রাহকের জন্য নোট ও ওয়ারেন্টি বিবরণ (Shown Online to Customer):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. টিভি মাদারবোর্ড আইসি পরিবর্তন করা হয়েছে। ৩ মাসের সার্ভিস ওয়ারেন্টি প্রযোজ্য।"
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs"
                  />
                </div>

                {/* Internal Admin Notes */}
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">
                    অভ্যন্তরীণ অ্যাডমিন নোট (Internal Admin Notes only):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Technician collected ₹450 cash, receipt #1042"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditModalOpen(false)}
                    className="rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={saving}
                    className="rounded-xl text-xs font-bold gap-1.5"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Quote &amp; Notify Customer</span>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
