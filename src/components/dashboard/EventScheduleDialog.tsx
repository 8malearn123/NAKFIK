// حوار إلغاء / إعادة جدولة الفعالية:
// المنظم يختار أحد الخيارين، والنظام يُشعر جميع المسجلين تلقائياً برسالة اعتذار
// أو بالموعد الجديد، ويحفظ كل عملية في سجل الفعالية (event_schedule_changes).
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import StatusBadge from "@/components/app/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { ArrowRight, Bell, CalendarClock, History, XCircle } from "lucide-react";

interface ScheduleChange {
  id: string;
  action: "cancelled" | "rescheduled";
  reason: string | null;
  old_start_date: string | null;
  new_start_date: string | null;
  notified_count: number;
  created_at: string;
}

interface Props {
  event: { id: string; title_ar: string; start_date: string; status: string } | null;
  onOpenChange: (open: boolean) => void;
  onDone: (patch: { status?: string; start_date?: string }) => void;
}

const SQL_HINT = "شغّل ملف nakfik_event_schedule.sql في Supabase أولاً لتفعيل هذه الميزة";

// تنسيق التاريخ للعرض
const fmt = (d: string | null) => (d ? formatDateTime(d) : "—");

// عدد المسجلين بصياغة عربية صحيحة، مثل: مسجّل واحد، مسجّلَين، 5 مسجّلين، 23 مسجّلاً
const registrants = (count: number) => {
  if (count === 1) return "مسجّل واحد";
  if (count === 2) return "مسجّلَين";
  const tail = count % 100;
  if (tail >= 3 && tail <= 10) return `${formatNumber(count)} مسجّلين`;
  if (tail >= 11) return `${formatNumber(count)} مسجّلاً`;
  return `${formatNumber(count)} مسجّل`;
};

// تحويل تاريخ الفعالية إلى قيمة datetime-local محلية
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EventScheduleDialog = ({ event, onOpenChange, onDone }: Props) => {
  const [mode, setMode] = useState<null | "cancel" | "reschedule">(null);
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<ScheduleChange[]>([]);

  useEffect(() => {
    if (!event) return;
    setMode(null);
    setReason("");
    setNewDate(toLocalInput(event.start_date));
    (async () => {
      const { data } = await (supabase as any)
        .from("event_schedule_changes")
        .select("*")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false });
      setLog((data as ScheduleChange[]) || []);
    })();
  }, [event]);

  if (!event) return null;

  const rpcError = (e: any) => {
    const msg = String(e?.message || "");
    if (msg.includes("function") || msg.includes("schema cache")) return SQL_HINT;
    if (msg.includes("NOT_AUTHORIZED")) return "لا تملك صلاحية تعديل هذه الفعالية";
    if (msg.includes("ALREADY_CANCELLED")) return "الفعالية ملغاة مسبقاً";
    return "تعذّر تنفيذ العملية — حاول مرة أخرى";
  };

  const doCancel = async () => {
    if (!confirm(`تأكيد إلغاء "${event.title_ar}"؟ سيصل إشعار اعتذار رسمي لجميع المسجلين فوراً.`)) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("cancel_event", {
      p_event_id: event.id,
      p_reason: reason.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(rpcError(error));
      return;
    }
    toast.success(`تم إلغاء الفعالية وإرسال رسالة الاعتذار إلى ${registrants(Number(data) || 0)}`);
    onDone({ status: "cancelled" });
    onOpenChange(false);
  };

  const doReschedule = async () => {
    if (!newDate) {
      toast.error("حدد الموعد الجديد أولاً");
      return;
    }
    const iso = new Date(newDate).toISOString();
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("reschedule_event", {
      p_event_id: event.id,
      p_new_start: iso,
      p_reason: reason.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(rpcError(error));
      return;
    }
    toast.success(`تم تحديث الموعد وإشعار ${registrants(Number(data) || 0)} بالموعد الجديد`);
    onDone({ start_date: iso, ...(event.status === "cancelled" ? { status: "published" } : {}) });
    onOpenChange(false);
  };

  return (
    <Dialog open={!!event} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl">
        <DialogHeader className="pe-6 text-start sm:text-start">
          <DialogTitle>إلغاء / إعادة جدولة — {event.title_ar}</DialogTitle>
          <DialogDescription>
            الموعد الحالي: <span className="font-semibold text-foreground">{fmt(event.start_date)}</span>
          </DialogDescription>
        </DialogHeader>

        {!mode ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("cancel")}
              className="rounded-xl bg-muted/50 p-4 text-start transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="mb-3 grid h-9 w-9 place-items-center rounded-[10px] bg-[#FBECEA] text-[#B42F24]"><XCircle className="h-[18px] w-[18px]" /></span>
              <p className="text-sm font-bold">إلغاء الفعالية</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                إشعار ورسالة اعتذار رسمية تلقائية لجميع المسجلين مع إمكانية ذكر السبب
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("reschedule")}
              className="rounded-xl bg-muted/50 p-4 text-start transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="mb-3 grid h-9 w-9 place-items-center rounded-[10px] bg-secondary text-primary"><CalendarClock className="h-[18px] w-[18px]" /></span>
              <p className="text-sm font-bold">إعادة جدولة</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                موعد جديد يُحدَّث تلقائياً في التذاكر مع إشعار جميع المسجلين به
              </p>
            </button>
          </div>
        ) : mode === "cancel" ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#FBECEA] p-3 text-[13px] leading-5 text-[#B42F24]">
              سيتم تغيير حالة الفعالية إلى "ملغاة" وإرسال رسالة اعتذار رسمية فورية لجميع المسجلين.
            </div>
            <div className="space-y-2">
              <Label>سبب الإلغاء (يظهر في رسالة الاعتذار — اختياري)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: ظروف خارجة عن الإرادة، سنعلن عن موعد بديل قريباً..."
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الموعد الجديد (التاريخ والوقت) *</Label>
              <Input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>سبب التأجيل (يظهر في الإشعار — اختياري)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: بناءً على طلب الجهة المستضيفة..."
                rows={2}
              />
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-[13px] leading-5 text-muted-foreground">
              سيتم تحديث موعد الفعالية في جميع التذاكر تلقائياً، وإرسال إشعار لكل مسجّل يوضح الموعد الجديد.
            </div>
          </div>
        )}

        {/* سجل التعديلات — تاريخ كامل لكل عمليات الإلغاء وإعادة الجدولة */}
        {log.length > 0 && (
          <div className="border-t border-border pt-4">
            <p className="mb-2.5 flex items-center gap-1.5 text-[13px] font-bold leading-5">
              <History className="h-4 w-4 text-muted-foreground" /> سجل التعديلات
            </p>
            <div className="max-h-44 space-y-2 overflow-y-auto">
              {log.map((l) => (
                <div key={l.id} className="space-y-1 rounded-xl bg-muted/50 p-3 text-xs leading-5">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <StatusBadge tone={l.action === "cancelled" ? "danger" : "primary"}>
                      {l.action === "cancelled" ? "إلغاء" : "إعادة جدولة"}
                    </StatusBadge>
                    <span className="text-muted-foreground">{fmt(l.created_at)}</span>
                  </div>
                  {l.action === "rescheduled" && (
                    <p className="text-muted-foreground">
                      من {fmt(l.old_start_date)} إلى <span className="font-semibold text-foreground">{fmt(l.new_start_date)}</span>
                    </p>
                  )}
                  {l.reason && <p>السبب: {l.reason}</p>}
                  <p className="text-muted-foreground">تم إشعار {registrants(Number(l.notified_count) || 0)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-start">
          {mode === "cancel" && (
            <Button variant="destructive" onClick={doCancel} disabled={busy}>
              <Bell className="h-4 w-4" />
              {busy ? "جارٍ الإلغاء وإرسال الإشعارات..." : "تأكيد الإلغاء وإشعار جميع المسجلين"}
            </Button>
          )}
          {mode === "reschedule" && (
            <Button onClick={doReschedule} disabled={busy}>
              <Bell className="h-4 w-4" />
              {busy ? "جارٍ التحديث وإرسال الإشعارات..." : "تأكيد التأجيل وإشعار جميع المسجلين"}
            </Button>
          )}
          {mode && (
            <Button variant="ghost" onClick={() => setMode(null)} disabled={busy}>
              <ArrowRight className="h-4 w-4" /> رجوع
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventScheduleDialog;
