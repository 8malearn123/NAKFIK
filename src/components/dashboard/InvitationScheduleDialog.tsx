// حوار إلغاء / إعادة جدولة الدعوة الخاصة:
// المدعوون ليسوا مستخدمين مسجلين، لذا يصلهم الإشعار من صفحة دعوتهم نفسها —
// الرابط يعرض تلقائياً اعتذار الإلغاء أو الموعد الجديد، ويوفّر الحوار نصاً
// جاهزاً يرسله المنظم عبر واتساب. كل عملية تُحفظ في سجل الدعوة.
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
import { CalendarClock, XCircle, History, Copy, CheckCircle2 } from "lucide-react";

interface ScheduleChange {
  id: string;
  action: "cancelled" | "rescheduled";
  reason: string | null;
  old_event_date: string | null;
  new_event_date: string | null;
  created_at: string;
}

interface Props {
  inv: { id: string; title: string; event_date: string; status: string } | null;
  onOpenChange: (open: boolean) => void;
  onDone: (patch: Record<string, unknown>) => void;
}

const SQL_HINT = "شغّل ملف nakfik_invitation_schedule.sql في Supabase لتفعيل الميزة كاملة";

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" }) : "—";

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const InvitationScheduleDialog = ({ inv, onOpenChange, onDone }: Props) => {
  const [mode, setMode] = useState<null | "cancel" | "reschedule">(null);
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<ScheduleChange[]>([]);
  // نص جاهز للإرسال بعد نجاح العملية
  const [shareText, setShareText] = useState<string | null>(null);

  useEffect(() => {
    if (!inv) return;
    setMode(null);
    setReason("");
    setShareText(null);
    setNewDate(toLocalInput(inv.event_date));
    (async () => {
      const { data } = await (supabase as any)
        .from("invitation_schedule_changes")
        .select("*")
        .eq("invitation_id", inv.id)
        .order("created_at", { ascending: false });
      setLog((data as ScheduleChange[]) || []);
    })();
  }, [inv]);

  if (!inv) return null;

  const writeLog = async (action: "cancelled" | "rescheduled", newEventDate: string | null) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await (supabase as any).from("invitation_schedule_changes").insert({
      invitation_id: inv.id,
      action,
      reason: reason.trim() || null,
      old_event_date: inv.event_date,
      new_event_date: newEventDate,
      created_by: u.user.id,
    });
  };

  const doCancel = async () => {
    if (!confirm(`تأكيد إلغاء "${inv.title}"؟ سيظهر الاعتذار لكل مدعو يفتح رابط دعوته.`)) return;
    setBusy(true);
    // مع سبب الإلغاء — ولو العمود غير موجود بعد نحدّث الحالة فقط مع تنبيه
    let { error } = await supabase
      .from("private_invitations")
      .update({ status: "cancelled", cancel_reason: reason.trim() || null } as any)
      .eq("id", inv.id);
    if (error) {
      const retry = await supabase
        .from("private_invitations")
        .update({ status: "cancelled" } as any)
        .eq("id", inv.id);
      error = retry.error;
      if (!error) toast.warning(SQL_HINT);
    }
    if (!error) await writeLog("cancelled", null);
    setBusy(false);
    if (error) {
      toast.error("تعذّر إلغاء الدعوة");
      return;
    }
    toast.success("تم إلغاء المناسبة — سيشاهد المدعوون الاعتذار عند فتح دعواتهم");
    onDone({ status: "cancelled", cancel_reason: reason.trim() || null });
    setShareText(
      `نعتذر منكم 🙏\nتم إلغاء "${inv.title}" التي كانت مقررة بتاريخ ${fmt(inv.event_date)}.` +
      (reason.trim() ? `\nالسبب: ${reason.trim()}` : "") +
      `\nنشكر تفهمكم ونعتذر عن أي إزعاج، ونتطلع للقائكم في مناسبة قادمة بإذن الله.`
    );
    setMode(null);
  };

  const doReschedule = async () => {
    if (!newDate) {
      toast.error("حدد الموعد الجديد أولاً");
      return;
    }
    const iso = new Date(newDate).toISOString();
    setBusy(true);
    const fullPatch = {
      event_date: iso,
      rescheduled_from: inv.event_date,
      reschedule_note: reason.trim() || null,
      cancel_reason: null,
      status: inv.status === "cancelled" ? "active" : inv.status,
    };
    let { error } = await supabase
      .from("private_invitations")
      .update(fullPatch as any)
      .eq("id", inv.id);
    if (error) {
      const retry = await supabase
        .from("private_invitations")
        .update({ event_date: iso } as any)
        .eq("id", inv.id);
      error = retry.error;
      if (!error) toast.warning(SQL_HINT);
    }
    if (!error) await writeLog("rescheduled", iso);
    setBusy(false);
    if (error) {
      toast.error("تعذّر تحديث الموعد");
      return;
    }
    toast.success("تم تحديث الموعد — دعوات المدعوين تعرض الموعد الجديد تلقائياً");
    onDone(fullPatch);
    setShareText(
      `تنبيه بتغيير الموعد 📅\nتم تأجيل "${inv.title}" إلى موعد جديد: ${fmt(iso)}.` +
      (reason.trim() ? `\nالسبب: ${reason.trim()}` : "") +
      `\nرابط دعوتكم كما هو ويعرض الموعد الجديد تلقائياً — نتشرف بحضوركم.`
    );
    setMode(null);
  };

  return (
    <Dialog open={!!inv} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إلغاء / إعادة جدولة — {inv.title}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1">
          الموعد الحالي: <span className="font-bold text-foreground">{fmt(inv.event_date)}</span>
        </p>

        {shareText ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-green-500/10 border border-green-400/40 p-3 text-xs text-green-800 flex items-start gap-2 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              تمت العملية. صفحة كل مدعو تعرض التحديث تلقائياً — وهذا نص جاهز ترسله للمدعوين عبر واتساب:
            </div>
            <Textarea value={shareText} onChange={(e) => setShareText(e.target.value)} rows={5} className="text-sm" />
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(shareText);
                toast.success("تم نسخ النص — ألصقه في واتساب");
              }}
            >
              <Copy className="w-4 h-4 ml-1" /> نسخ النص
            </Button>
          </div>
        ) : !mode ? (
          <div className="grid grid-cols-2 gap-3 py-2">
            <button
              type="button"
              onClick={() => setMode("cancel")}
              className="rounded-2xl border-2 border-border hover:border-destructive p-4 text-right transition-all hover:-translate-y-0.5"
            >
              <XCircle className="w-7 h-7 text-destructive mb-2" />
              <p className="font-bold text-sm">إلغاء المناسبة</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                رسالة اعتذار رسمية تظهر لكل مدعو يفتح رابط دعوته، مع إمكانية ذكر السبب
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
                موعد جديد يظهر تلقائياً في كل الدعوات مع تنبيه واضح بالتغيير
              </p>
            </button>
          </div>
        ) : mode === "cancel" ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-destructive/5 border border-destructive/30 p-3 text-xs leading-relaxed text-destructive">
              ستتحول المناسبة إلى "ملغاة"، وكل مدعو يفتح رابط دعوته سيشاهد رسالة الاعتذار بدلاً من أزرار تأكيد الحضور.
            </div>
            <div className="space-y-1.5">
              <Label>سبب الإلغاء (يظهر للمدعوين — اختياري)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: ظرف طارئ، سنوافيكم بموعد بديل قريباً..."
                rows={3}
              />
            </div>
            <Button variant="destructive" className="w-full" onClick={doCancel} disabled={busy}>
              {busy ? "جارٍ الإلغاء..." : "تأكيد إلغاء المناسبة"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>الموعد الجديد (التاريخ والوقت) *</Label>
              <Input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>سبب التأجيل (يظهر للمدعوين — اختياري)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: تعارض مع مناسبة أخرى..."
                rows={2}
              />
            </div>
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs leading-relaxed text-muted-foreground">
              ستعرض كل الدعوات الموعد الجديد تلقائياً مع تنبيه واضح "تم تغيير الموعد" — وروابط المدعوين تبقى كما هي.
            </div>
            <Button className="w-full" onClick={doReschedule} disabled={busy}>
              {busy ? "جارٍ التحديث..." : "تأكيد التأجيل"}
            </Button>
          </div>
        )}

        {/* سجل التعديلات */}
        {log.length > 0 && !shareText && (
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
                      من {fmt(l.old_event_date)} إلى <span className="font-bold text-foreground">{fmt(l.new_event_date)}</span>
                    </p>
                  )}
                  {l.reason && <p className="mt-0.5">السبب: {l.reason}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {mode && !shareText && (
            <Button variant="ghost" onClick={() => setMode(null)} disabled={busy}>رجوع</Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvitationScheduleDialog;
