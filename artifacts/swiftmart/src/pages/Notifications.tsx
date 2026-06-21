import { useState, useEffect } from "react";
import { Bell, BellOff, CheckCheck, ShoppingBag, Store, Tag, Info, Megaphone, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/SectionHeader";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { registerFcmToken, unregisterFcmToken, getFcmState } from "@/lib/fcm";
import { playNotificationSound } from "@/lib/pushNotifications";
import { toast } from "sonner";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

const TYPE_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  order_update:    { icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  shop_approval:   { icon: Store,       color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
  delivery_update: { icon: ShoppingBag, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
  coupon:          { icon: Tag,         color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
  promo:           { icon: Megaphone,   color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30" },
  system:          { icon: Info,        color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-950/30" },
};

type FcmDisplayState = "subscribed" | "denied" | "default" | "unsupported";

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [fcmState, setFcmState] = useState<FcmDisplayState>("default");
  const [pushLoading, setPushLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const fetchNotifications = () => {
    setLoading(true);
    api.get<{ success: boolean; notifications: Notification[] }>("/notifications")
      .then(d => setNotifications(d.notifications))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
    getFcmState().then(setFcmState);
  }, []);

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
    finally { setMarkingAll(false); }
  };

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
  };

  const handleEnableFcm = async () => {
    setPushLoading(true);
    try {
      const result = await registerFcmToken();
      if (result.success) {
        setFcmState("subscribed");
        toast.success("Push notifications enabled! You'll get alerts even when the app is closed.");
      } else {
        const actual = await getFcmState();
        setFcmState(actual);
        toast.error(result.error);
      }
    } finally {
      setPushLoading(false);
    }
  };

  const handleDisableFcm = async () => {
    setPushLoading(true);
    try {
      await unregisterFcmToken();
      setFcmState("default");
      toast.success("Push notifications disabled.");
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    setTestLoading(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>("/fcm/test", {});
      if (res.success) {
        playNotificationSound();
        toast.success(res.message ?? "Test push sent! Check your notification bar.");
      } else {
        toast.error(res.message ?? "Push test failed.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("no active fcm") || msg.toLowerCase().includes("enable notifications")) {
        toast.error("No device registered. Tap Enable to set up notifications first.");
        setFcmState("default");
      } else if (msg.toLowerCase().includes("fcm not configured")) {
        toast.error("Push not configured on server yet. Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY secrets.");
      } else {
        toast.error("Push delivery failed. Check browser console for details.");
      }
    } finally {
      setTestLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto space-y-4">
        <SectionHeader title="Notifications" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-card rounded-2xl p-4 neu-card animate-pulse flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-2 bg-muted rounded w-full" />
              <div className="h-2 bg-muted rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader title="Notifications" />
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            disabled={markingAll}
            className="text-primary hover:bg-primary/10 text-xs"
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* FCM push notification banner */}
      {fcmState !== "unsupported" && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 p-4 rounded-2xl neu-card ${
            fcmState === "subscribed"
              ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
              : fcmState === "denied"
              ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
              : "bg-primary/5 border border-primary/20"
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            fcmState === "subscribed" ? "bg-green-100 dark:bg-green-900/40" :
            fcmState === "denied"    ? "bg-red-100 dark:bg-red-900/40" : "bg-primary/10"
          }`}>
            {fcmState === "subscribed"
              ? <BellRing className="w-5 h-5 text-green-600" />
              : fcmState === "denied"
              ? <BellOff className="w-5 h-5 text-red-500" />
              : <Bell className="w-5 h-5 text-primary" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">
              {fcmState === "subscribed" ? "Push notifications on" :
               fcmState === "denied"    ? "Notifications blocked" :
               "Get notified instantly"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fcmState === "subscribed"
                ? "You'll receive alerts on this device even when the app is closed."
                : fcmState === "denied"
                ? "Enable notifications in your browser or app settings."
                : "Allow notifications to get order updates, offers, and more."}
            </p>
          </div>
          {fcmState === "subscribed" ? (
            <div className="flex flex-col gap-1 shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={testLoading}
                onClick={handleTestPush}
                className="text-xs h-7 px-2 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40"
              >
                {testLoading ? "Sending…" : "Test Push"}
              </Button>
              <button
                disabled={pushLoading}
                onClick={handleDisableFcm}
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors text-center"
              >
                Turn off
              </button>
            </div>
          ) : fcmState === "default" ? (
            <Button
              size="sm"
              disabled={pushLoading}
              onClick={handleEnableFcm}
              className="shrink-0 text-xs bg-primary text-white hover:bg-primary/90"
            >
              {pushLoading ? "Enabling…" : "Enable"}
            </Button>
          ) : null}
        </motion.div>
      )}

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-4 neu-inset">
            <BellOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-lg text-foreground">No notifications yet</h3>
          <p className="text-muted-foreground text-sm mt-1">You're all caught up!</p>
        </div>
      ) : (
        <AnimatePresence>
          {notifications.map((n, i) => {
            const typeConfig = TYPE_ICONS[n.type] ?? TYPE_ICONS["system"];
            const Icon = typeConfig.icon;
            return (
              <motion.div
                key={n._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => !n.isRead && markRead(n._id)}
                className={`flex gap-4 p-4 rounded-2xl transition-colors cursor-pointer ${
                  n.isRead ? "bg-card neu-card opacity-70" : "bg-card neu-card border-l-4 border-primary"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeConfig.bg}`}>
                  <Icon className={`w-5 h-5 ${typeConfig.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold text-sm ${n.isRead ? "text-foreground" : "text-foreground"}`}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
