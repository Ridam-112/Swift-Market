import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tv,
  Speaker,
  Snowflake,
  Refrigerator,
  Fan,
  Wrench,
  ShieldCheck,
  Clock,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  ChevronRight,
  ExternalLink,
  Plus,
  RefreshCw,
  UserCheck,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

interface ServiceItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  badge?: string;
  popular?: boolean;
  presets: string[];
  brandsCovered: string;
}

interface ServiceBooking {
  id: string;
  bookingNumber: string;
  shopName: string;
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
  cancelReason?: string;
  completedAt?: string;
  createdAt: string;
}

export default function ServiceCorner() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"services" | "my-bookings">("services");
  const [catalog, setCatalog] = useState<{
    provider: { name: string; slug: string; city: string; verified: boolean; description: string };
    services: ServiceItem[];
    timeSlots: { id: string; label: string }[];
  } | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [myBookings, setMyBookings] = useState<ServiceBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Booking Modal State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [applianceBrand, setApplianceBrand] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0]!;
  });
  const [preferredSlot, setPreferredSlot] = useState("afternoon");
  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");
  const [serviceAddress, setServiceAddress] = useState(
    (user as any)?.address?.line1 || (user as any)?.address?.street || ""
  );
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState((user as any)?.pincode || "733101");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBooking, setSuccessBooking] = useState<ServiceBooking | null>(null);

  // Load Catalog
  useEffect(() => {
    let mounted = true;
    api.get<{ success: boolean; services: ServiceItem[]; provider: any; timeSlots: any }>("/services/catalog")
      .then((res) => {
        if (mounted && res.success) {
          setCatalog({
            provider: res.provider,
            services: res.services,
            timeSlots: res.timeSlots,
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load services catalog:", err);
      })
      .finally(() => {
        if (mounted) setLoadingCatalog(false);
      });
    return () => { mounted = false; };
  }, []);

  // Sync user info into form
  useEffect(() => {
    if (user) {
      if (!customerName && user.name) setCustomerName(user.name);
      if (!customerPhone && user.phone) setCustomerPhone(user.phone);
      const userAddr = (user as any)?.address?.line1 || (user as any)?.address?.street || "";
      if (!serviceAddress && userAddr) setServiceAddress(userAddr);
      if (user.pincode && pincode === "733101") setPincode(user.pincode);
    }
  }, [user]);

  // Load User's Bookings
  const fetchMyBookings = async () => {
    if (!user) return;
    setLoadingBookings(true);
    try {
      const res = await api.get<{ success: boolean; bookings: ServiceBooking[] }>("/services/my-bookings");
      if (res.success) {
        setMyBookings(res.bookings || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch my bookings:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (activeTab === "my-bookings" && user) {
      fetchMyBookings();
    }
  }, [activeTab, user]);

  const handleOpenBooking = (service: ServiceItem) => {
    if (!user) {
      toast.info("Please sign in or create an account to book a technician.");
      setLocation("/auth");
      return;
    }
    setSelectedService(service);
    setProblemDescription("");
    setApplianceBrand("");
    setBookingModalOpen(true);
  };

  const handlePresetClick = (preset: string) => {
    if (problemDescription) {
      setProblemDescription((prev) => `${prev}, ${preset}`);
    } else {
      setProblemDescription(preset);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    if (!problemDescription.trim()) {
      toast.error("Please describe the problem or select a symptom.");
      return;
    }
    if (!serviceAddress.trim()) {
      toast.error("Please enter your complete service address.");
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 10) {
      toast.error("Please provide a valid 10-digit mobile number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; message: string; booking: ServiceBooking }>("/services/book", {
        serviceType: selectedService.id,
        serviceCategoryTitle: selectedService.title,
        applianceBrandModel: applianceBrand.trim(),
        problemDescription: problemDescription.trim(),
        preferredDate,
        preferredTimeSlot: preferredSlot,
        serviceAddress: serviceAddress.trim(),
        landmark: landmark.trim(),
        pincode: pincode.trim(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
      });

      if (res.success && res.booking) {
        setSuccessBooking(res.booking);
        setBookingModalOpen(false);
        fetchMyBookings();
        toast.success("Service booked successfully! Upahar Electronics Lab has been notified.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this service request?")) return;
    try {
      const res = await api.patch<{ success: boolean; message: string }>(`/services/${id}/cancel`, {
        reason: "Customer requested cancellation",
      });
      if (res.success) {
        toast.success("Booking cancelled.");
        fetchMyBookings();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel booking.");
    }
  };

  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case "Tv": return <Tv className="w-6 h-6" />;
      case "Speaker": return <Speaker className="w-6 h-6" />;
      case "Snowflake": return <Snowflake className="w-6 h-6" />;
      case "Refrigerator": return <Refrigerator className="w-6 h-6" />;
      case "Fan": return <Fan className="w-6 h-6" />;
      default: return <Wrench className="w-6 h-6" />;
    }
  };

  const getStatusBadge = (status: ServiceBooking["status"]) => {
    switch (status) {
      case "requested":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 border border-amber-500/30">🟡 Request Received</span>;
      case "inspection_scheduled":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-600 border border-blue-500/30">🔵 Inspection Scheduled</span>;
      case "quote_provided":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-600 border border-purple-500/30">🟣 Quote Shared for Review</span>;
      case "in_progress":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-600 border border-orange-500/30">🟠 Repair in Progress</span>;
      case "completed":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">🟢 Service Completed</span>;
      case "cancelled":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 border border-rose-500/30">🔴 Cancelled</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{status}</span>;
    }
  };

  return (
    <>
      <SEO
        title="Service Corner Balurghat — TV, AC, Fridge, Home Theatre Repair | SwiftMart"
        description="Book certified electronics repair in Balurghat. Professional TV, AC, Refrigerator, Home Theatre and Fan repair powered by Upahar Electronics Lab on SwiftMart."
      />

      <div className="min-h-screen bg-background pb-20">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-b from-primary/15 via-primary/5 to-background pt-8 pb-10 border-b border-border/60">
          <div className="max-w-5xl mx-auto px-4">
            {/* Top Partner Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur border border-primary/30 text-xs font-semibold text-foreground shadow-sm mb-4">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Official Electronics Partner:</span>
              <span className="text-primary font-bold">Upahar Electronics Lab, Balurghat</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                  SwiftMart <span className="text-primary">Service Corner</span> 🛠️
                </h1>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl">
                  Book verified doorstep repair services for TV, AC, Refrigerator, Home Theatre and Fans by expert technicians in Balurghat.
                </p>

                {/* Key value propositions */}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-foreground">
                  <div className="flex items-center gap-1.5 bg-card/80 px-2.5 py-1 rounded-md border border-border">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Doorstep Inspection</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-card/80 px-2.5 py-1 rounded-md border border-border">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>100% Genuine Parts & Warranty</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-card/80 px-2.5 py-1 rounded-md border border-border">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Transparent Online Bill Quote</span>
                  </div>
                </div>
              </div>

              {/* Action Tabs Toggle */}
              <div className="flex items-center gap-1.5 bg-muted/80 p-1.5 rounded-xl border border-border/80 self-start md:self-auto shrink-0 shadow-sm">
                <button
                  type="button"
                  onClick={() => setActiveTab("services")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "services"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🛠️ All Services
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      toast.info("Please sign in to track your service bookings.");
                      setLocation("/auth");
                    } else {
                      setActiveTab("my-bookings");
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === "my-bookings"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>📋 My Bookings</span>
                  {myBookings.length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                      {myBookings.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-5xl mx-auto px-4 py-8">
          {activeTab === "services" ? (
            <div className="space-y-10">
              {/* How it works 4-step explainer */}
              <div className="bg-card rounded-2xl p-5 sm:p-6 border border-border/80 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm sm:text-base text-foreground">
                    How It Works
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-extrabold flex items-center justify-center shrink-0 text-sm">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Book Service</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Select your appliance issue and choose a convenient inspection slot.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 font-extrabold flex items-center justify-center shrink-0 text-sm">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Home Inspection</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Upahar Electronics Lab technician visits your home to inspect.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 font-extrabold flex items-center justify-center shrink-0 text-sm">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Online Quotation</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Get transparent parts & service charges quoted online after diagnosis.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 font-extrabold flex items-center justify-center shrink-0 text-sm">
                      4
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Repair & Payment</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Once approved, technician repairs your appliance. Pay cash or online.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Cards Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
                      Available Electronics &amp; Repair Services
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select the service you need and book doorstep inspection
                    </p>
                  </div>
                </div>

                {loadingCatalog ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    {catalog?.services.map((service) => (
                      <motion.div
                        key={service.id}
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.15 }}
                        className="bg-card rounded-2xl border border-border/80 p-5 shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                {getServiceIcon(service.icon)}
                              </div>
                              <div>
                                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                                  {service.title}
                                  {service.badge && (
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                                      {service.badge}
                                    </span>
                                  )}
                                </h3>
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                  {service.subtitle}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Quick Symptoms / Presets */}
                          <div className="mt-3">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                              Common Issues &amp; Symptoms:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {service.presets.slice(0, 3).map((p, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] px-2 py-0.5 rounded-md bg-muted/60 text-foreground/80 border border-border/40"
                                >
                                  {p}
                                </span>
                              ))}
                              {service.presets.length > 3 && (
                                <span className="text-[11px] px-1.5 py-0.5 text-muted-foreground font-medium">
                                  +{service.presets.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Brands covered */}
                          <p className="mt-3 text-[11px] text-muted-foreground/90 italic">
                            <span className="font-semibold text-foreground/70 not-italic">Brands: </span>
                            {service.brandsCovered}
                          </p>
                        </div>

                        {/* Action Bar */}
                        <div className="mt-5 pt-3.5 border-t border-border/60 flex items-center justify-between gap-2">
                          <div className="text-left">
                            <span className="text-[10px] text-muted-foreground block font-medium">Inspection Fee</span>
                            <span className="text-xs font-bold text-emerald-600">Quote after home visit</span>
                          </div>

                          <Button
                            type="button"
                            onClick={() => handleOpenBooking(service)}
                            size="sm"
                            className="font-bold text-xs gap-1.5 rounded-xl shadow-xs"
                          >
                            <span>Book Now</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shop Profile & Guarantee Banner */}
              <div className="bg-gradient-to-br from-card via-card to-primary/5 rounded-2xl p-6 border border-primary/20 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                    <Wrench className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-base text-foreground">
                        Upahar Electronics Lab
                      </h4>
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Balurghat's leading verified repair lab. Years of technical expertise with specialized diagnostic tools.
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-foreground/80 font-medium">
                      <span>📍 Balurghat Hub</span>
                      <span>⭐ 4.8+ Customer Rating</span>
                      <span>⚡ Fast Turnaround</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/uphar-electronics-lab")}
                  className="rounded-xl shrink-0 gap-1.5 text-xs font-bold"
                >
                  <span>View Store Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            /* My Bookings Tab */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
                    My Service Bookings
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Track inspection status and view dynamic price quotations
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchMyBookings}
                  disabled={loadingBookings}
                  className="gap-1.5 rounded-xl text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingBookings ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </Button>
              </div>

              {loadingBookings ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : myBookings.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border/80">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground mb-3">
                    <Wrench className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">No service bookings found</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Need an appliance repaired? Book an expert technician from Upahar Electronics Lab today.
                  </p>
                  <Button
                    onClick={() => setActiveTab("services")}
                    className="mt-4 rounded-xl text-xs font-bold"
                  >
                    Browse Services
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myBookings.map((b) => (
                    <div
                      key={b.id}
                      className="bg-card rounded-2xl border border-border/80 p-5 shadow-xs transition-all hover:border-border"
                    >
                      {/* Top Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-primary font-mono">
                              #{b.bookingNumber}
                            </span>
                            {getStatusBadge(b.status)}
                          </div>
                          <h3 className="font-extrabold text-sm sm:text-base text-foreground mt-1">
                            {b.serviceCategoryTitle} {b.applianceBrandModel ? `— ${b.applianceBrandModel}` : ""}
                          </h3>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-muted-foreground block">Booking Date</span>
                          <span className="text-xs font-semibold text-foreground">
                            {new Date(b.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Middle Details */}
                      <div className="py-3.5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-[11px] text-muted-foreground font-medium block mb-0.5">Problem Description:</span>
                          <p className="text-foreground font-medium bg-muted/40 p-2.5 rounded-xl border border-border/50">
                            {b.problemDescription}
                          </p>
                        </div>

                        <div>
                          <span className="text-[11px] text-muted-foreground font-medium block mb-0.5">Inspection Slot &amp; Address:</span>
                          <div className="space-y-1 text-foreground/90 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-primary" />
                              <span>{b.preferredDate} ({b.preferredTimeSlot.toUpperCase()})</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{b.serviceAddress}, {b.pincode}</span>
                            </div>
                          </div>
                        </div>

                        {/* Assigned Technician Card */}
                        <div>
                          <span className="text-[11px] text-muted-foreground font-medium block mb-0.5">Assigned Technician:</span>
                          {b.technicianName ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                                    <UserCheck className="w-4 h-4 text-emerald-500" />
                                    <span>{b.technicianName}</span>
                                  </div>
                                  <span className="text-[11px] text-muted-foreground">Upahar Lab Specialist</span>
                                </div>
                                {b.technicianPhone && (
                                  <a
                                    href={`tel:${b.technicianPhone}`}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs hover:bg-emerald-600 transition-colors"
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>Call</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-muted/40 border border-border/50 p-2.5 rounded-xl text-muted-foreground text-[11px]">
                              ⏳ Technician schedule under review. An expert will be assigned shortly.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pricing & Quote Section (Dynamically updated by Admin) */}
                      {(b.totalAmount > 0 || b.quoteNotes) && (
                        <div className="mt-3 p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                              <IndianRupee className="w-3.5 h-3.5" />
                              <span>Online Quotation &amp; Estimated Bill</span>
                            </span>

                            <div className="text-right">
                              <span className="text-[11px] text-muted-foreground">Total Bill: </span>
                              <span className="text-base font-extrabold text-primary">₹{b.totalAmount}</span>
                            </div>
                          </div>

                          {/* Breakdown */}
                          <div className="grid grid-cols-3 gap-2 text-[11px] bg-card p-2 rounded-lg border border-border/50 text-foreground">
                            <div>
                              <span className="text-muted-foreground block">Visiting Fee:</span>
                              <span className="font-semibold">₹{b.visitingFee || 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Parts Cost:</span>
                              <span className="font-semibold">₹{b.partsCost || 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Service Charge:</span>
                              <span className="font-semibold">₹{b.serviceCharge || 0}</span>
                            </div>
                          </div>

                          {b.quoteNotes && (
                            <p className="mt-2 text-xs text-foreground/90 italic bg-card/60 p-2 rounded-lg border border-border/40">
                              <span className="font-semibold text-purple-600 not-italic">Technician Report: </span>
                              "{b.quoteNotes}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action footer */}
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground text-[11px]">
                          Service Partner: <strong className="text-foreground">Upahar Electronics Lab</strong>
                        </span>

                        {(b.status === "requested" || b.status === "inspection_scheduled") && (
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(b.id)}
                            className="text-rose-500 hover:text-rose-600 font-bold text-[11px] transition-colors"
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Booking Modal ───────────────────────────────────────────────────── */}
        <AnimatePresence>
          {bookingModalOpen && selectedService && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      {getServiceIcon(selectedService.icon)}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground">
                        Book {selectedService.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Upahar Electronics Lab • Balurghat
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBookingModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Form Body */}
                <form onSubmit={handleSubmitBooking} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
                  {/* Quick Preset Symptoms */}
                  <div>
                    <label className="font-semibold text-foreground block mb-1.5">
                      Common Issues &amp; Quick Select:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedService.presets.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handlePresetClick(preset)}
                          className="px-2.5 py-1 rounded-lg text-xs bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-border/60 text-foreground"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Appliance Brand & Model */}
                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Appliance Brand &amp; Model (e.g. LG 43" Smart TV / Whirlpool 190L Fridge):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Samsung 43-inch Smart LED TV"
                      value={applianceBrand}
                      onChange={(e) => setApplianceBrand(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
                    />
                  </div>

                  {/* Problem Description */}
                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Problem Description <span className="text-rose-500">*</span>:
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Describe what issue you are facing (e.g. sound is working but screen is black...)"
                      value={problemDescription}
                      onChange={(e) => setProblemDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
                    />
                  </div>

                  {/* Date & Slot */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">
                        Preferred Inspection Date <span className="text-rose-500">*</span>:
                      </label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split("T")[0]}
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1">
                        Preferred Time Slot <span className="text-rose-500">*</span>:
                      </label>
                      <select
                        value={preferredSlot}
                        onChange={(e) => setPreferredSlot(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
                      >
                        <option value="morning">Morning (10:00 AM – 01:00 PM)</option>
                        <option value="afternoon">Afternoon (01:00 PM – 05:00 PM)</option>
                        <option value="evening">Evening (05:00 PM – 08:00 PM)</option>
                      </select>
                    </div>
                  </div>

                  {/* Address & Phone */}
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">
                        Service Address <span className="text-rose-500">*</span>:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="House / Flat No., Street, Landmark / Area"
                        value={serviceAddress}
                        onChange={(e) => setServiceAddress(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-foreground block mb-1">
                          Landmark (Optional):
                        </label>
                        <input
                          type="text"
                          placeholder="Near Temple / School / Club"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-foreground block mb-1">
                          Phone Number <span className="text-rose-500">*</span>:
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="10-digit phone"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:outline-hidden focus:ring-1 focus:ring-primary text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Transparent Pricing Notice */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-300">
                    ℹ️ <strong>Transparent Pricing Policy:</strong> No advance payment required today. An expert technician will inspect your appliance at home and provide a clear quotation (Parts + Service) online. Work begins only after your approval.
                  </div>

                  {/* Modal Footer */}
                  <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBookingModalOpen(false)}
                      className="rounded-xl text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmitting}
                      className="rounded-xl text-xs font-bold gap-1.5"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing Booking...</span>
                        </>
                      ) : (
                        <span>Confirm &amp; Book Now</span>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Success Modal ───────────────────────────────────────────────────── */}
        <AnimatePresence>
          {successBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-2xl text-center"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-extrabold text-foreground">
                  Service Booking Confirmed! 🎉
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Booking Reference Number:
                </p>
                <div className="mt-2 inline-block px-3 py-1 rounded-lg bg-primary/10 text-primary font-mono font-bold text-sm">
                  #{successBooking.bookingNumber}
                </div>

                <p className="mt-4 text-xs text-foreground/80 bg-muted/40 p-3 rounded-xl border border-border/50 text-left">
                  📅 <strong>Inspection Date &amp; Slot:</strong> {successBooking.preferredDate} ({successBooking.preferredTimeSlot.toUpperCase()})<br />
                  🏠 <strong>Address:</strong> {successBooking.serviceAddress}<br />
                  👨‍🔧 <strong>Service Partner:</strong> Upahar Electronics Lab
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => {
                      setSuccessBooking(null);
                      setActiveTab("my-bookings");
                    }}
                    className="flex-1 rounded-xl text-xs font-bold"
                  >
                    Track Booking
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSuccessBooking(null)}
                    className="rounded-xl text-xs font-bold"
                  >
                    Done
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
