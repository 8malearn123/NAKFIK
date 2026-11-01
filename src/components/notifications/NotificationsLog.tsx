import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import EmptyState from "@/components/app/EmptyState";
import Panel from "@/components/app/Panel";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Send } from "lucide-react";
import { formatDateShort, formatNumber, formatTime } from "@/lib/format";

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

const statusConfig: Record<string, { label: string; tone: StatusTone }> = {
  sent: { label: "تم الإرسال", tone: "success" },
  failed: { label: "فشل", tone: "danger" },
  pending: { label: "قيد الانتظار", tone: "warning" },
};

const typeLabels: Record<string, string> = {
  event_reminder: "تذكير بالفعالية",
  registration_confirmation: "تأكيد تسجيل",
  custom_message: "رسالة مخصصة",
};

const NotificationsLog = ({ onCompose }: { onCompose?: () => void }) => {
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
    return <div className="h-80 animate-pulse rounded-2xl bg-card shadow-soft" />;
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-2xl bg-card shadow-soft">
        <EmptyState
          icon={MessageSquare}
          title="لا توجد إشعارات بعد"
          description="ستظهر هنا جميع الإشعارات المرسلة"
          action={onCompose && <Button onClick={onCompose}><Send className="w-4 h-4" /> إرسال إشعار</Button>}
        />
      </div>
    );
  }

  return (
    <Panel
      flush
      title="سجل الإشعارات"
      actions={<span className="grid h-[22px] min-w-[22px] flex-none place-items-center rounded-full bg-secondary px-1.5 text-xs font-semibold text-primary">{formatNumber(notifications.length)}</span>}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="ps-6">المستلم</TableHead>
            <TableHead>النوع</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead className="pe-6">الحالة</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notifications.map((notif) => {
            const statusInfo = statusConfig[notif.status] || statusConfig.pending;
            return (
              <TableRow key={notif.id}>
                <TableCell className="ps-6">
                  <p className="whitespace-nowrap font-semibold leading-[22px]">
                    {notif.recipient_name || <bdi dir="ltr">{notif.recipient_phone}</bdi>}
                  </p>
                  {notif.recipient_name && (
                    <p className="whitespace-nowrap text-xs leading-[18px] text-muted-foreground"><bdi dir="ltr">{notif.recipient_phone}</bdi></p>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">{typeLabels[notif.type] || notif.type}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDateShort(notif.created_at)}، {formatTime(notif.created_at)}</TableCell>
                <TableCell className="pe-6"><StatusBadge tone={statusInfo.tone}>{statusInfo.label}</StatusBadge></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Panel>
  );
};

export default NotificationsLog;
