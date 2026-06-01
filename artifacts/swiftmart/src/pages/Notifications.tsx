import { useState, useEffect } from "react";
import { Bell, BellOff, CheckCheck, ShoppingBag, Store, Tag, Info, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/SectionHeader";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

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

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = () => {
    setLoading(true);
    api.get<{ success: boolean; notifications: Notification[] }>("/notifications")
      .then(d => setNotifications(d.notifications))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(); }, []);

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
