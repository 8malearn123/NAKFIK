import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";

interface Notification {
  id: string;
  recipient_phone: string;
  recipient_name: string | null;
  type: string;
  channel: string;
  status: string;
  message: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

const statusConfig = {
  sent: { icon: CheckCircle, label: "تم الإرسال", color: "bg-emerald-500/10 text-emerald-600" },
  failed: { icon: XCircle, label: "فشل", color: "bg-destructive/10 text-destructive" },
  pending: { icon: Clock, label: "قيد الانتظار", color: "bg-amber-500/10 text-amber-600" },
};

const typeLabels: Record<string, string> = {
  event_reminder: "تذكير بالفعالية",
  registration_confirmation: "تأكيد تسجيل",
  custom_message: "رسالة مخصصة",
};

const NotificationsLog = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications((data as Notification[]) || []);
      setLoading(false);
    };
    fetchNotifications();
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-12 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-muted-foreground text-sm mt-3">جارٍ التحميل...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-12 text-center">
        <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <h3 className="font-semibold text-foreground">لا توجد إشعارات بعد</h3>
        <p className="text-sm text-muted-foreground mt-1">ستظهر هنا جميع الإشعارات المرسلة</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-6">
      <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-primary" />
        سجل الإشعارات ({notifications.length})
      </h3>
      <div className="space-y-3">
        {notifications.map((notif) => {
          const statusInfo = statusConfig[notif.status as keyof typeof statusConfig] || statusConfig.pending;
          const StatusIcon = statusInfo.icon;
          return (
            <div key={notif.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusInfo.color}`}>
                  <StatusIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {notif.recipient_name || notif.recipient_phone}
                  </p>
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {notif.recipient_phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="text-left">
                  <Badge variant="outline" className="text-xs mb-1">
                    {typeLabels[notif.type] || notif.type}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notif.created_at).toLocaleDateString("ar-SA", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsLog;
