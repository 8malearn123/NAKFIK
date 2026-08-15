import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Clock, Mail, MessageCircle, Smartphone, RefreshCw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// تذكيرات المدعوين: القسم العلوي إعدادات القنوات الخارجية (تُفعّل عند ربط
// التكاملات)، والقسم السفلي حالة التذكيرات المجدولة الفعلية من قاعدة البيانات
// (scheduled / sent / failed) التي يعالجها مشغّل pg_cron كل 5 دقائق.

interface ReminderConfig {
  enabled: boolean;
  times: string[]; // 1h | 1d | 3d
  channels: string[]; // whatsapp | sms | email
  message: string;
}

const DEFAULT_MESSAGE =
  "تذكير: نتشرف بحضوركم غداً — لا تنسوا إبراز رمز الدعوة عند الباب 🌷";

const defaultConfig: ReminderConfig = {
  enabled: true,
  times: ["1d"],
  channels: ["whatsapp"],
  message: DEFAULT_MESSAGE,
};

const storageKey = (invitationId: string) => `nakfik:reminders:${invitationId}`;

export const loadReminderConfig = (invitationId: string): ReminderConfig => {
  try {
    const raw = localStorage.getItem(storageKey(invitationId));
    return raw ? { ...defaultConfig, ...JSON.parse(raw) } : defaultConfig;
  } catch {
    return defaultConfig;
  }
};

const TIME_OPTIONS = [
  { id: "1h", label: "قبل ساعة" },
  { id: "1d", label: "قبل يوم" },
  { id: "3d", label: "قبل 3 أيام" },
];

const CHANNEL_OPTIONS = [
  { id: "whatsapp", label: "واتساب", Icon: MessageCircle, activeCls: "bg-green-600 text-white border-green-600" },
  { id: "sms", label: "SMS", Icon: Smartphone, activeCls: "bg-blue-600 text-white border-blue-600" },
  { id: "email", label: "بريد إلكتروني", Icon: Mail, activeCls: "bg-primary text-primary-foreground border-primary" },
];

interface Props {
  invitationId: string;
  invitationTitle: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface ReminderRow {
  id: string;
  guest_id: string;
  scheduled_at: string;
  status: "scheduled" | "sent" | "failed" | "cancelled";
  channel: string;
  sent_at: string | null;
  error_message: string | null;
  guest_name?: string;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "مجدول", cls: "bg-blue-500/10 text-blue-700" },
  sent: { label: "مُرسل ✓", cls: "bg-green-500/10 text-green-700" },
  failed: { label: "فشل", cls: "bg-destructive/10 text-destructive" },
  cancelled: { label: "ملغي", cls: "bg-muted text-muted-foreground" },
};

const ReminderSettings = ({ invitationId, invitationTitle, open, onOpenChange }: Props) => {
  const [config, setConfig] = useState<ReminderConfig>(defaultConfig);
  const [rows, setRows] = useState<ReminderRow[]>([]);
  const [remindersReady, setRemindersReady] = useState(true);
  const [processing, setProcessing] = useState(false);

  const loadRows = async () => {
    const { data, error } = await (supabase as any)
      .from("invitation_reminders")
      .select("*")
      .eq("invitation_id", invitationId)
      .order("scheduled_at", { ascending: true });
    if (error) {
      setRemindersReady(false);
      return;
    }
    setRemindersReady(true);
    const list = (data || []) as ReminderRow[];
    if (list.length) {
      const { data: guests } = await supabase
        .from("private_invitation_guests")
        .select("id, guest_name")
        .in("id", list.map((r) => r.guest_id));
      list.forEach((r) => {
        r.guest_name = (guests || []).find((g: any) => g.id === r.guest_id)?.guest_name;
      });
    }
    setRows(list);
  };

  useEffect(() => {
    if (open) {
      setConfig(loadReminderConfig(invitationId));
      loadRows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invitationId]);

  // تشغيل المعالج يدوياً (نفس ما يشغله pg_cron كل 5 دقائق) — مفيد للاختبار
  const runNow = async () => {
    setProcessing(true);
    const { data, error } = await (supabase as any).rpc("process_due_invitation_reminders");
    setProcessing(false);
    if (error) return toast.error("شغّل ملف nakfik_reminders.sql في Supabase أولاً");
    toast.success(`تمت معالجة ${Number(data) || 0} تذكير`);
    loadRows();
  };

  const toggleIn = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const save = () => {
    if (config.enabled && config.times.length === 0) {
      toast.error("اختر وقت تذكير واحداً على الأقل");
      return;
    }
    if (config.enabled && config.channels.length === 0) {
      toast.error("اختر طريقة إرسال واحدة على الأقل");
      return;
    }
    try {
      localStorage.setItem(storageKey(invitationId), JSON.stringify(config));
    } catch {
      // التخزين محجوب — نكتفي بالتأكيد البصري
    }
    toast.success("تم حفظ إعدادات التذكير");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            تذكيرات المدعوين
          </DialogTitle>
          <DialogDescription className="text-right">
            «{invitationTitle}» — يصل التذكير تلقائياً للمدعوين قبل موعد المناسبة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* التفعيل */}
          <div className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-foreground">تفعيل التذكيرات</p>
              <p className="text-[11px] text-muted-foreground">إيقافها يلغي كل التذكيرات المجدولة</p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => setConfig((c) => ({ ...c, enabled: v }))}
            />
          </div>

          {/* وقت التذكير */}
          <div className={config.enabled ? "" : "opacity-40 pointer-events-none"}>
            <p className="text-xs text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> وقت التذكير (يمكن اختيار أكثر من وقت)
            </p>
            <div className="flex gap-2 flex-wrap">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, times: toggleIn(c.times, opt.id) }))}
                  className={`text-xs font-bold rounded-full px-4 py-2 border transition-colors ${
                    config.times.includes(opt.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* طريقة الإرسال */}
          <div className={config.enabled ? "" : "opacity-40 pointer-events-none"}>
            <p className="text-xs text-muted-foreground font-semibold mb-2">
              طريقة الإرسال (يمكن اختيار أكثر من طريقة)
            </p>
            <div className="flex gap-2 flex-wrap">
              {CHANNEL_OPTIONS.map(({ id, label, Icon, activeCls }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, channels: toggleIn(c.channels, id) }))}
                  className={`text-xs font-bold rounded-full px-4 py-2 border transition-colors inline-flex items-center gap-1.5 ${
                    config.channels.includes(id)
                      ? activeCls
                      : "bg-background text-foreground border-border hover:border-primary/40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* نص التذكير */}
          <div className={config.enabled ? "" : "opacity-40 pointer-events-none"}>
            <p className="text-xs text-muted-foreground font-semibold mb-2">نص التذكير</p>
            <Textarea
              value={config.message}
              onChange={(e) => setConfig((c) => ({ ...c, message: e.target.value }))}
              maxLength={300}
              rows={3}
              className="rounded-xl text-sm"
            />
          </div>

          {/* حالة التذكيرات المجدولة الفعلية — من قاعدة البيانات */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> التذكيرات المجدولة فعلياً ({rows.length})
              </p>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" className="h-7 text-[11px]" onClick={loadRows}>
                  <RefreshCw className="w-3 h-3 ml-1" /> تحديث
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" onClick={runNow} disabled={processing}>
                  <Play className="w-3 h-3 ml-1" /> {processing ? "جارٍ..." : "معالجة الآن"}
                </Button>
              </div>
            </div>

            {!remindersReady ? (
              <p className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 leading-relaxed">
                ⚠️ نظام الجدولة الفعلي غير مفعّل بعد — شغّل ملف <b>nakfik_reminders.sql</b> في Supabase.
                بدونه يبقى التذكير قيمة محفوظة بلا إرسال فعلي.
              </p>
            ) : rows.length === 0 ? (
              <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-xl p-3 leading-relaxed">
                لا توجد تذكيرات مجدولة — حدد "تذكير المستفيد قبل الموعد" (1-12 ساعة) من تعديل الدعوة ← تبويب إضافات،
                وستُجدول التذكيرات تلقائياً لكل المدعوين.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-1.5 text-[11px]">
                    <span className="flex-1 truncate font-semibold">{r.guest_name || "مدعو"}</span>
                    <span className="text-muted-foreground" dir="ltr">
                      {new Date(r.status === "sent" && r.sent_at ? r.sent_at : r.scheduled_at).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-bold ${STATUS_META[r.status]?.cls || ""}`}
                      title={r.status === "failed" ? "لا توجد قناة إرسال: المدعو بلا حساب مسجل، والبريد/واتساب يتطلبان ربط تكامل" : r.status === "sent" ? "أُرسل إشعاراً داخل المنصة" : undefined}
                    >
                      {STATUS_META[r.status]?.label || r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* توضيح صريح لقنوات الإرسال — لا نعتبر التذكير منفذاً بمجرد ظهوره */}
            <p className="text-[11px] leading-relaxed bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3 mt-2">
              <b>قناة الإرسال الفعلية حالياً:</b> إشعار داخل منصة نكفيك يصل تلقائياً للمدعو الذي يملك حساباً
              مسجلاً بنفس بريده أو جواله (يعالجها النظام كل 5 دقائق)، إضافة إلى تنبيه التذكير الذي يظهر في صفحة
              دعوته. <b>أما الإرسال عبر واتساب / SMS / البريد فيتطلب ربط تكامل خارجي</b> (مثل WhatsApp Business API
              أو Resend) — وحتى يتم الربط، تُعلَّم تذكيرات المدعوين بلا حساب بحالة "فشل" مع السبب، ولا تُعتبر مرسلة.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button className="rounded-full flex-1" onClick={save}>
            حفظ الإعدادات
          </Button>
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderSettings;
