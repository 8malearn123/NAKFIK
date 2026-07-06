import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Send, MessageSquare, Phone, Users, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
      .replace(/\{\{التاريخ\}\}/g, "١٥ مايو ٢٠٢٦")
      .replace(/\{\{الوقت\}\}/g, "٠٧:٠٠ م")
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
      toast.success(`تم الإرسال: ${success} رسالة بنجاح ✅`);
    } else {
      toast.warning(`تم الإرسال: ${success} نجح، ${failed} فشل`);
    }
  };

  const recipientsList = getRecipientsToSend();

  return (
    <div className="space-y-6">
      {/* Connection method */}
      <div className="bg-card rounded-2xl border border-border/50 p-4">
        <p className="text-sm text-muted-foreground">
          طريقة الإرسال:{" "}
          <span className="font-semibold text-foreground">
            {connectionType === "nakfeek" ? "نكفيك" :
             connectionType === "rest_api" ? "REST API خارجي" :
             connectionType === "qr_gateway" ? "QR Gateway" :
             "هيبرلينك (يدوي)"}
          </span>
        </p>
      </div>

      {/* Select Event */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          إرسال إشعارات واتساب
        </h3>

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
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all", label: "جميع المسجلين" },
              { key: "confirmed", label: "المؤكدون فقط" },
              { key: "pending", label: "لم يؤكدوا" },
              { key: "custom", label: "أرقام مخصصة" },
            ].map(m => (
              <Button key={m.key} variant={recipientMode === m.key ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setRecipientMode(m.key)}>
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
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5 inline" /> {recipientsList.length} مستلم
            </p>
          )}
        </div>

        {/* Message composer */}
        <div className="space-y-2">
          <Label>نص الرسالة</Label>
          <div className="flex gap-1.5 flex-wrap mb-2">
            {variableChips.map(chip => (
              <button key={chip.value} type="button" onClick={() => insertChip(chip.value)} className="text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1 hover:bg-primary/20 transition-colors font-semibold">
                + {chip.label}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="اكتب رسالتك هنا... استخدم المتغيرات أعلاه"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
          />
        </div>

        {/* Preview */}
        {message && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">معاينة الرسالة</Label>
            <div className="bg-muted/50 rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap border border-border/30">
              {getPreviewMessage()}
            </div>
          </div>
        )}

        {/* Progress */}
        {sending && (
          <div className="space-y-3 bg-muted/30 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground font-semibold">جارٍ الإرسال...</span>
              <span className="text-muted-foreground">{sendProgress.current}/{sendProgress.total}</span>
            </div>
            <Progress value={(sendProgress.current / sendProgress.total) * 100} className="h-2" />
          </div>
        )}

        {/* Summary */}
        {showSummary && !sending && (
          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
            <h4 className="font-semibold text-foreground text-sm">ملخص الإرسال</h4>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-teal"><CheckCircle className="w-4 h-4" /> نجح: {sendProgress.success}</span>
              {sendProgress.failed > 0 && (
                <span className="flex items-center gap-1 text-destructive"><XCircle className="w-4 h-4" /> فشل: {sendProgress.failed}</span>
              )}
            </div>
          </div>
        )}

        {/* Send button */}
        <Button className="rounded-full" onClick={handleSend} disabled={sending || recipientsList.length === 0}>
          {connectionType === "deeplink" ? <ExternalLink className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          {sending ? `جارٍ الإرسال... ${sendProgress.current}/${sendProgress.total}` :
           `${connectionType === "deeplink" ? "فتح واتساب" : "إرسال"} (${recipientsList.length} مستلم)`}
        </Button>
      </div>
    </div>
  );
};

export default SendNotification;
