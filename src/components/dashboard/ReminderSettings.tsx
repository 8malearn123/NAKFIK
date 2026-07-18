import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Clock, Mail, MessageCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// إعدادات تذكير المدعوين — واجهة فقط في هذه المرحلة (تُحفظ محلياً،
// ويُربط الإرسال الفعلي بالواجهة الخلفية لاحقاً دون تغيير التصميم).

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

const ReminderSettings = ({ invitationId, invitationTitle, open, onOpenChange }: Props) => {
  const [config, setConfig] = useState<ReminderConfig>(defaultConfig);

  useEffect(() => {
    if (open) setConfig(loadReminderConfig(invitationId));
  }, [open, invitationId]);

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

          <p className="text-[11px] text-muted-foreground bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3">
            معاينة تصميم — جدولة الإرسال الفعلي (واتساب/SMS/بريد) ستُفعّل في مرحلة الربط القادمة.
          </p>
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
