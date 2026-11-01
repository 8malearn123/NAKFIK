import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import EmptyState from "@/components/app/EmptyState";
import Panel from "@/components/app/Panel";
import { Button } from "@/components/ui/button";
import { Bell, Check, Inbox } from "lucide-react";
import { formatDateShort, formatNumber, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface InAppNotif {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

const InAppNotifications = () => {
  const { t } = useLanguage();
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
    return <div className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />;
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-2xl bg-card shadow-soft">
        <EmptyState icon={Inbox} title={t("inbox.emptyTitle")} description={t("inbox.emptyDesc")} />
      </div>
    );
  }

  return (
    <Panel
      flush
      title={t("inbox.title")}
      description={unreadCount > 0 ? `${formatNumber(unreadCount)} غير مقروء` : undefined}
      actions={
        unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="-my-1 flex-none text-[13px] text-primary">
            <Check className="w-3.5 h-3.5" />
            {t("inbox.markAllRead")}
          </Button>
        )
      }
    >
      <div className="divide-y divide-border border-t border-border">
        {notifications.map((notif) => {
          const time = `${formatDateShort(notif.created_at)}، ${formatTime(notif.created_at)}`;
          return (
            <div
              key={notif.id}
              className={cn("flex items-start gap-3 px-6 py-4 transition-colors", !notif.is_read && "cursor-pointer hover:bg-muted/50")}
              onClick={() => !notif.is_read && markAsRead(notif.id)}
            >
              <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary"><Bell className="h-[17px] w-[17px]" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {!notif.is_read && <i className="h-2 w-2 flex-none rounded-full bg-primary" />}
                  <p className={cn("text-sm leading-[22px]", notif.is_read ? "font-medium" : "font-semibold")}>{notif.title}</p>
                </div>
                <p className="text-[13px] leading-5 text-muted-foreground">{notif.body}</p>
                <p className="mt-1 text-xs leading-[18px] text-muted-foreground sm:hidden">{time}</p>
              </div>
              <span className="hidden whitespace-nowrap text-xs leading-[22px] text-muted-foreground sm:block">{time}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

export default InAppNotifications;
