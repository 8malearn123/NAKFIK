import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Mail, MessageCircle, Smartphone, RefreshCw, Play } from "lucide-react";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatNumber } from "@/lib/format";
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
  { id: "whatsapp", label: "واتساب", Icon: MessageCircle },
  { id: "sms", label: "SMS", Icon: Smartphone },
  { id: "email", label: "بريد إلكتروني", Icon: Mail },
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

const STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  scheduled: { label: "مجدول", tone: "primary" },
  sent: { label: "مُرسل", tone: "success" },
  failed: { label: "فشل", tone: "danger" },
  cancelled: { label: "ملغي", tone: "neutral" },
};

const chipCls = (active: boolean) =>
  `inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
    active ? "bg-secondary text-primary ring-1 ring-inset ring-primary" : "bg-muted/50 hover:bg-muted"
  }`;
const NOTE_CLS = "rounded-xl p-3 text-xs leading-5";

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
      <DialogContent
        dir="rtl"
        className="flex max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl p-0 outline-none"
        onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).focus(); }}
      >
        <DialogHeader className="px-6 pb-4 pe-12 pt-6 text-start">
          <DialogTitle>تذكيرات المدعوين</DialogTitle>
          <DialogDescription>
            «{invitationTitle}» — يصل التذكير تلقائياً للمدعوين قبل موعد المناسبة
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6">
          {/* التفعيل */}
          <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-[22px]">تفعيل التذكيرات</p>
              <p className="text-xs leading-[18px] text-muted-foreground">إيقافها يلغي كل التذكيرات المجدولة</p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => setConfig((c) => ({ ...c, enabled: v }))}
            />
          </div>

          {/* وقت التذكير */}
          <div className={`space-y-2 ${config.enabled ? "" : "pointer-events-none opacity-40"}`}>
            <Label>وقت التذكير (يمكن اختيار أكثر من وقت)</Label>
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map((opt) => {
                const active = config.times.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setConfig((c) => ({ ...c, times: toggleIn(c.times, opt.id) }))}
                    className={chipCls(active)}
                  >
                    {active && <Check className="h-3.5 w-3.5" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* طريقة الإرسال */}
          <div className={`space-y-2 ${config.enabled ? "" : "pointer-events-none opacity-40"}`}>
            <Label>طريقة الإرسال (يمكن اختيار أكثر من طريقة)</Label>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_OPTIONS.map(({ id, label, Icon }) => {
                const active = config.channels.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setConfig((c) => ({ ...c, channels: toggleIn(c.channels, id) }))}
                    className={chipCls(active)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* نص التذكير */}
          <div className={`space-y-2 ${config.enabled ? "" : "pointer-events-none opacity-40"}`}>
            <Label>نص التذكير</Label>
            <Textarea
              value={config.message}
              onChange={(e) => setConfig((c) => ({ ...c, message: e.target.value }))}
              maxLength={300}
              rows={3}
            />
          </div>

          {/* حالة التذكيرات المجدولة الفعلية — من قاعدة البيانات */}
          <div className="space-y-3 border-t border-border pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[15px] font-bold leading-6">التذكيرات المجدولة فعلياً ({formatNumber(rows.length)})</h3>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={loadRows}>
                  <RefreshCw className="h-4 w-4" /> تحديث
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={runNow} disabled={processing}>
                  <Play className="h-4 w-4" /> {processing ? "جارٍ..." : "معالجة الآن"}
                </Button>
              </div>
            </div>

            {!remindersReady ? (
              <p className={`${NOTE_CLS} bg-[#FDF3E3] text-[#9A5F12]`}>
                نظام الجدولة الفعلي غير مفعّل بعد — شغّل ملف <b>nakfik_reminders.sql</b> في Supabase.
                بدونه يبقى التذكير قيمة محفوظة بلا إرسال فعلي.
              </p>
            ) : rows.length === 0 ? (
              <p className={`${NOTE_CLS} bg-muted/50 text-muted-foreground`}>
                لا توجد تذكيرات مجدولة — حدد "تذكير المستفيد قبل الموعد" (1-12 ساعة) من تعديل الدعوة
                <ArrowLeft className="mx-1 inline h-3 w-3" />
                تبويب إضافات، وستُجدول التذكيرات تلقائياً لكل المدعوين.
              </p>
            ) : (
              <div className="max-h-56 divide-y divide-border overflow-y-auto rounded-xl bg-muted/50">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-[22px]">{r.guest_name || "مدعو"}</p>
                      <p className="truncate text-xs leading-[18px] text-muted-foreground">
                        {formatDateTime(r.status === "sent" && r.sent_at ? r.sent_at : r.scheduled_at)}
                      </p>
                    </div>
                    <span title={r.status === "failed" ? "لا توجد قناة إرسال: المدعو بلا حساب مسجل، والبريد/واتساب يتطلبان ربط تكامل" : r.status === "sent" ? "أُرسل إشعاراً داخل المنصة" : undefined}>
                      <StatusBadge tone={STATUS_META[r.status]?.tone}>{STATUS_META[r.status]?.label || r.status}</StatusBadge>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* توضيح صريح لقنوات الإرسال — لا نعتبر التذكير منفذاً بمجرد ظهوره */}
            <p className={`${NOTE_CLS} bg-muted/50 text-muted-foreground`}>
              <b className="font-semibold text-foreground">قناة الإرسال الفعلية حالياً:</b> إشعار داخل منصة نكفيك يصل تلقائياً للمدعو الذي يملك حساباً
              مسجلاً بنفس بريده أو جواله (يعالجها النظام كل 5 دقائق)، إضافة إلى تنبيه التذكير الذي يظهر في صفحة
              دعوته. <b className="font-semibold text-foreground">أما الإرسال عبر واتساب / SMS / البريد فيتطلب ربط تكامل خارجي</b> (مثل WhatsApp Business API
              أو Resend) — وحتى يتم الربط، تُعلَّم تذكيرات المدعوين بلا حساب بحالة "فشل" مع السبب، ولا تُعتبر مرسلة.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 border-t border-border px-6 py-4">
          <Button className="flex-1 sm:flex-none" onClick={save}>
            حفظ الإعدادات
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderSettings;
