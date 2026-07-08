import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Bell, Check, Inbox } from "lucide-react";

interface InAppNotif {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

const InAppNotifications = () => {
  const { t, lang } = useLanguage();
  const [notifications, setNotifications] = useState<InAppNotif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("in_app_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications((data as InAppNotif[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const markAsRead = async (id: string) => {
    await supabase
      .from("in_app_notifications")
      .update({ is_read: true })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from("in_app_notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-12 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-muted-foreground text-sm mt-3">{t("common.loading")}</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-12 text-center">
        <Inbox className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">{t("inbox.emptyTitle")}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t("inbox.emptyDesc")}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          {t("inbox.title")}
          {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full font-bold">
              {unreadCount}
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs">
            <Check className="w-3.5 h-3.5" />
            {t("inbox.markAllRead")}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`p-4 rounded-xl transition-colors cursor-pointer ${
              notif.is_read ? "bg-muted/30" : "bg-primary/5 border border-primary/10"
            }`}
            onClick={() => !notif.is_read && markAsRead(notif.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                  <p className="font-semibold text-foreground text-sm">{notif.title}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{notif.body}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap ms-3">
                {new Date(notif.created_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InAppNotifications;
