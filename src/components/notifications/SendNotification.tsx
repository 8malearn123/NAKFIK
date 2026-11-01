import { useState, useEffect } from "react";
import Panel from "@/components/app/Panel";
import StatusBadge from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, Link2, MessageSquare, Plus, Send, Server, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, formatNumber, formatTime } from "@/lib/format";
import { toast } from "sonner";

interface EventOption {
  id: string;
  title_ar: string;
}

interface Recipient {
  name: string;
  phone: string;
}

const variableChips = [
  { label: "اسم الضيف", value: "{{اسم_الضيف}}" },
  { label: "اسم الفعالية", value: "{{اسم_الفعالية}}" },
  { label: "التاريخ", value: "{{التاريخ}}" },
  { label: "الوقت", value: "{{الوقت}}" },
  { label: "المكان", value: "{{المكان}}" },
];

const METHODS = {
  nakfeek: { label: "نكفيك", icon: MessageSquare },
  rest_api: { label: "REST API خارجي", icon: Server },
  qr_gateway: { label: "QR Gateway", icon: Server },
  deeplink: { label: "هيبرلينك (يدوي)", icon: Link2 },
};

// قيم المعاينة فقط، ولا تدخل في الرسالة المرسلة
const SAMPLE_DATE = new Date(2026, 4, 15, 19, 0);

// صياغة العدد بالعربية: مستلم واحد، مستلمان، 5 مستلمين، 12 مستلماً
const recipientsLabel = (n: number) => {
  if (n === 0) return "0 مستلم";
  if (n === 1) return "مستلم واحد";
  if (n === 2) return "مستلمان";
  return n <= 10 ? `${n} مستلمين` : `${formatNumber(n)} مستلماً`;
};

const SendNotification = () => {
  const { user, organization } = useAuth();
  const [connectionType, setConnectionType] = useState<string>("deeplink");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [recipientMode, setRecipientMode] = useState<string>("all");
  const [customPhones, setCustomPhones] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [showSummary, setShowSummary] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      // Fetch connection type
      const { data: conn } = await supabase
        .from("whatsapp_connections")
        .select("connection_type")
        .eq("account_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (conn) setConnectionType((conn as any).connection_type);

      // Fetch events
      if (organization) {
        const { data: evts } = await supabase
          .from("events")
          .select("id, title_ar")
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false });
        setEvents((evts || []) as EventOption[]);
      }
    };
    load();
  }, [user, organization]);

  // Load recipients when event or mode changes
  useEffect(() => {
    if (!selectedEventId || recipientMode === "custom") {
      setRecipients([]);
      return;
    }
    const loadRecipients = async () => {
      // Try event_guests first (private events)
      let query = supabase.from("event_guests").select("guest_name, guest_phone, rsvp_status").eq("event_id", selectedEventId);
      if (recipientMode === "confirmed") query = query.eq("rsvp_status", "confirmed");
      if (recipientMode === "pending") query = query.neq("rsvp_status", "confirmed");
      
      const { data: guests } = await query;
      if (guests && guests.length > 0) {
        setRecipients(guests.map((g: any) => ({ name: g.guest_name, phone: g.guest_phone })));
        return;
      }

      // Fallback to registrations
      const { data: regs } = await supabase
        .from("registrations")
        .select("attendee_id, status")
        .eq("event_id", selectedEventId);
      
      if (regs && regs.length > 0) {
        const filteredRegs = recipientMode === "confirmed" 
          ? regs.filter((r: any) => r.status === "confirmed" || r.status === "checked_in")
          : recipientMode === "pending" 
          ? regs.filter((r: any) => r.status === "pending")
          : regs;
        
        const ids = filteredRegs.map((r: any) => r.attendee_id);
        if (ids.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("full_name, phone").in("id", ids);
          setRecipients((profiles || []).filter((p: any) => p.phone).map((p: any) => ({ name: p.full_name || "", phone: p.phone })));
        }
      }
    };
    loadRecipients();
  }, [selectedEventId, recipientMode]);

  const getRecipientsToSend = (): Recipient[] => {
    if (recipientMode === "custom") {
      return customPhones.split(/[\n,،]/).map(p => p.trim()).filter(Boolean).map(p => ({ name: "", phone: p }));
    }
    return recipients;
  };

  const insertChip = (chip: string) => {
    setMessage(prev => prev + " " + chip);
  };

  const getPreviewMessage = () => {
    const selectedEvent = events.find(e => e.id === selectedEventId);
    return message
      .replace(/\{\{اسم_الضيف\}\}/g, "محمد أحمد")
      .replace(/\{\{اسم_الفعالية\}\}/g, selectedEvent?.title_ar || "اسم الفعالية")
      .replace(/\{\{التاريخ\}\}/g, formatDate(SAMPLE_DATE))
      .replace(/\{\{الوقت\}\}/g, formatTime(SAMPLE_DATE))
      .replace(/\{\{المكان\}\}/g, "فندق الفيصلية");
  };

  const handleSend = async () => {
    const recipientsList = getRecipientsToSend();
    if (recipientsList.length === 0) {
      toast.error("لا يوجد مستلمون");
      return;
    }
    if (!message.trim()) {
      toast.error("الرجاء إدخال نص الرسالة");
      return;
    }

    setSending(true);
    setShowSummary(false);
    setSendProgress({ current: 0, total: recipientsList.length, success: 0, failed: 0 });

    const selectedEvent = events.find(e => e.id === selectedEventId);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < recipientsList.length; i++) {
      const r = recipientsList[i];
      const personalizedMsg = message
        .replace(/\{\{اسم_الضيف\}\}/g, r.name || "عزيزي/عزيزتي")
        .replace(/\{\{اسم_الفعالية\}\}/g, selectedEvent?.title_ar || "")
        .replace(/\{\{التاريخ\}\}/g, "")
        .replace(/\{\{الوقت\}\}/g, "")
        .replace(/\{\{المكان\}\}/g, "");

      const cleanPhone = r.phone.replace(/[^0-9]/g, "");

      if (connectionType === "deeplink") {
        window.open(`https://wa.me/${cleanPhone.startsWith("966") ? cleanPhone : "966" + cleanPhone}?text=${encodeURIComponent(personalizedMsg)}`, "_blank");
        success++;
      } else {
        try {
          const { data, error } = await supabase.functions.invoke("send-whatsapp", {
            body: { phone: r.phone, message: personalizedMsg, recipient_name: r.name, type: "custom_message" },
          });
          if (error || !data?.success) {
            failed++;
          } else {
            success++;
          }
        } catch {
          failed++;
        }
      }
      setSendProgress({ current: i + 1, total: recipientsList.length, success, failed });

      // Small delay between sends
      if (connectionType === "deeplink" && i < recipientsList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setSending(false);
    setShowSummary(true);
    setSendProgress(prev => ({ ...prev, success, failed }));

    if (failed === 0) {
      toast.success(`تم الإرسال بنجاح: ${formatNumber(success)}`);
    } else {
      toast.warning(`تم الإرسال: ${success} نجح، ${failed} فشل`);
    }
  };

  const recipientsList = getRecipientsToSend();
  const method = METHODS[connectionType as keyof typeof METHODS] ?? METHODS.deeplink;

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Panel className="xl:col-span-2" title="إرسال إشعارات واتساب" bodyClassName="space-y-5">
        {/* Select Event */}
        <div className="space-y-2">
          <Label>اختر الفعالية</Label>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger><SelectValue placeholder="اختر فعالية..." /></SelectTrigger>
            <SelectContent>
              {events.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.title_ar}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Recipient mode */}
        <div className="space-y-2">
          <Label>المستلمون</Label>
          <div className="flex flex-wrap gap-2.5">
            {[
              { key: "all", label: "جميع المسجلين" },
              { key: "confirmed", label: "المؤكدون فقط" },
              { key: "pending", label: "لم يؤكدوا" },
              { key: "custom", label: "أرقام مخصصة" },
            ].map(m => (
              <Button key={m.key} variant={recipientMode === m.key ? "soft" : "outline"} size="sm" aria-pressed={recipientMode === m.key} onClick={() => setRecipientMode(m.key)}>
                {m.label}
              </Button>
            ))}
          </div>
          {recipientMode === "custom" ? (
            <Textarea
              placeholder="الصق الأرقام (كل رقم في سطر أو مفصولة بفواصل)"
              value={customPhones}
              onChange={e => setCustomPhones(e.target.value)}
              rows={3}
              dir="ltr"
              className="placeholder:text-end"
            />
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> {recipientsLabel(recipientsList.length)}
            </p>
          )}
        </div>

        {/* Message composer */}
        <div className="space-y-2">
          <Label>نص الرسالة</Label>
          <div className="flex flex-wrap gap-1.5">
            {variableChips.map(chip => (
              <Button key={chip.value} type="button" variant="soft" size="sm" className="h-8 gap-1 px-2.5 text-xs [&_svg]:size-3.5" onClick={() => insertChip(chip.value)}>
                <Plus /> {chip.label}
              </Button>
            ))}
          </div>
          <Textarea
            placeholder="اكتب رسالتك هنا... استخدم المتغيرات أعلاه"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={6}
          />
        </div>
      </Panel>

      <Panel title="طريقة الإرسال" bodyClassName="flex flex-col gap-4">
        {/* Connection method */}
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary"><method.icon className="h-[17px] w-[17px]" /></span>
          <p className="min-w-0 truncate text-sm font-semibold leading-[22px]">{method.label}</p>
        </div>

        {/* Preview */}
        <div className={`flex-1 flex-col gap-2 ${message ? "flex" : "hidden xl:flex"}`}>
          <p className="text-xs font-medium text-muted-foreground">معاينة الرسالة</p>
          <div className="flex-1 whitespace-pre-wrap break-words rounded-xl bg-muted/50 p-4 text-sm leading-6">
            {message ? getPreviewMessage() : <span className="text-muted-foreground">اكتب رسالتك هنا...</span>}
          </div>
        </div>

        {/* Progress */}
        {sending && (
          <div className="space-y-3 rounded-xl bg-muted/50 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">جارٍ الإرسال...</span>
              <span className="text-xs text-muted-foreground">{formatNumber(sendProgress.current)} من {formatNumber(sendProgress.total)}</span>
            </div>
            <Progress value={(sendProgress.current / sendProgress.total) * 100} className="h-2" />
          </div>
        )}

        {/* Summary */}
        {showSummary && !sending && (
          <div className="space-y-2 rounded-xl bg-muted/50 p-4">
            <p className="text-sm font-semibold">ملخص الإرسال</p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="success">نجح: {formatNumber(sendProgress.success)}</StatusBadge>
              {sendProgress.failed > 0 && <StatusBadge tone="danger">فشل: {formatNumber(sendProgress.failed)}</StatusBadge>}
            </div>
          </div>
        )}

        {/* Send button */}
        <Button className="w-full" onClick={handleSend} disabled={sending || recipientsList.length === 0}>
          {connectionType === "deeplink" ? <ExternalLink className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          {sending ? `جارٍ الإرسال... ${formatNumber(sendProgress.current)} من ${formatNumber(sendProgress.total)}` :
           `${connectionType === "deeplink" ? "فتح واتساب" : "إرسال"} (${recipientsLabel(recipientsList.length)})`}
        </Button>
      </Panel>
    </div>
  );
};

export default SendNotification;
