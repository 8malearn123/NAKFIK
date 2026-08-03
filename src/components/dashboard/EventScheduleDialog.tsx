// حوار إلغاء / إعادة جدولة الفعالية:
// المنظم يختار أحد الخيارين، والنظام يُشعر جميع المسجلين تلقائياً برسالة اعتذار
// أو بالموعد الجديد، ويحفظ كل عملية في سجل الفعالية (event_schedule_changes).
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarClock, XCircle, History, ArrowLeft, Bell } from "lucide-react";

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
const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" }) : "—";

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
    toast.success(`تم إلغاء الفعالية وإرسال رسالة الاعتذار إلى ${Number(data) || 0} مسجّل`);
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
    toast.success(`تم تحديث الموعد وإشعار ${Number(data) || 0} مسجّل بالموعد الجديد`);
    onDone({ start_date: iso, ...(event.status === "cancelled" ? { status: "published" } : {}) });
    onOpenChange(false);
  };

  return (
    <Dialog open={!!event} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إلغاء / إعادة جدولة — {event.title_ar}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1">
          الموعد الحالي: <span className="font-bold text-foreground">{fmt(event.start_date)}</span>
        </p>

        {!mode ? (
          <div className="grid grid-cols-2 gap-3 py-2">
            <button
              type="button"
              onClick={() => setMode("cancel")}
              className="rounded-2xl border-2 border-border hover:border-destructive p-4 text-right transition-all hover:-translate-y-0.5"
            >
              <XCircle className="w-7 h-7 text-destructive mb-2" />
              <p className="font-bold text-sm">إلغاء الفعالية</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                إشعار ورسالة اعتذار رسمية تلقائية لجميع المسجلين مع إمكانية ذكر السبب
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("reschedule")}
              className="rounded-2xl border-2 border-border hover:border-primary p-4 text-right transition-all hover:-translate-y-0.5"
            >
              <CalendarClock className="w-7 h-7 text-primary mb-2" />
              <p className="font-bold text-sm">إعادة جدولة</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                موعد جديد يُحدَّث تلقائياً في التذاكر مع إشعار جميع المسجلين به
              </p>
            </button>
          </div>
        ) : mode === "cancel" ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-destructive/5 border border-destructive/30 p-3 text-xs leading-relaxed text-destructive">
              سيتم تغيير حالة الفعالية إلى "ملغاة" وإرسال رسالة اعتذار رسمية فورية لجميع المسجلين.
            </div>
            <div className="space-y-1.5">
              <Label>سبب الإلغاء (يظهر في رسالة الاعتذار — اختياري)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: ظروف خارجة عن الإرادة، سنعلن عن موعد بديل قريباً..."
                rows={3}
              />
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={doCancel}
              disabled={busy}
            >
              <Bell className="w-4 h-4 ml-1" />
              {busy ? "جارٍ الإلغاء وإرسال الإشعارات..." : "تأكيد الإلغاء وإشعار جميع المسجلين"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>الموعد الجديد (التاريخ والوقت) *</Label>
              <Input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label>سبب التأجيل (يظهر في الإشعار — اختياري)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: بناءً على طلب الجهة المستضيفة..."
                rows={2}
              />
            </div>
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs leading-relaxed text-muted-foreground">
              سيتم تحديث موعد الفعالية في جميع التذاكر تلقائياً، وإرسال إشعار لكل مسجّل يوضح الموعد الجديد.
            </div>
            <Button className="w-full" onClick={doReschedule} disabled={busy}>
              <Bell className="w-4 h-4 ml-1" />
              {busy ? "جارٍ التحديث وإرسال الإشعارات..." : "تأكيد التأجيل وإشعار جميع المسجلين"}
            </Button>
          </div>
        )}

        {/* سجل التعديلات — تاريخ كامل لكل عمليات الإلغاء وإعادة الجدولة */}
        {log.length > 0 && (
          <div className="mt-2 pt-3 border-t border-border/50">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
              <History className="w-3.5 h-3.5" /> سجل التعديلات
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {log.map((l) => (
                <div key={l.id} className="rounded-lg border border-border/50 bg-muted/30 p-2.5 text-[11px] leading-relaxed">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${l.action === "cancelled" ? "text-destructive" : "text-primary"}`}>
                      {l.action === "cancelled" ? "إلغاء" : "إعادة جدولة"}
                    </span>
                    <span className="text-muted-foreground">{fmt(l.created_at)}</span>
                  </div>
                  {l.action === "rescheduled" && (
                    <p className="text-muted-foreground mt-0.5">
                      من {fmt(l.old_start_date)} إلى <span className="font-bold text-foreground">{fmt(l.new_start_date)}</span>
                    </p>
                  )}
                  {l.reason && <p className="mt-0.5">السبب: {l.reason}</p>}
                  <p className="text-muted-foreground mt-0.5">تم إشعار {l.notified_count} مسجّل</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {mode && (
            <Button variant="ghost" onClick={() => setMode(null)} disabled={busy}>
              <ArrowLeft className="w-4 h-4 ml-1 rotate-180" /> رجوع
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventScheduleDialog;
