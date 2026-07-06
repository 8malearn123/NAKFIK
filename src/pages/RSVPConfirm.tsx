import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Calendar, MapPin, Clock, AlertCircle, XCircle, Download, Share2, FileText, Info, ChevronLeft, Users, Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import logoHorizontal from "@/assets/brand/logo-horizontal.jpg";

type PageState = "loading" | "ready" | "collect_data" | "companions_prompt" | "confirmed" | "already_confirmed" | "invalid" | "cancelled" | "passed" | "companion_form" | "companion_done" | "companions_full";

interface GuestData {
  id: string;
  guest_name: string;
  rsvp_status: string;
  rsvp_token: string;
  ticket_id: string | null;
  extra_data: Record<string, any> | null;
  companions_allowed: number;
  companions_used: number;
}

interface GuestTicket {
  id: string;
  name_ar: string;
  badge_color: string | null;
  badge_logo_url: string | null;
  badge_tier_label: string | null;
}

interface TicketAttachment {
  id: string;
  name: string;
  url: string;
  type: "image" | "file";
}

interface TicketInfo {
  name_ar: string;
  description: string | null;
  attachments: TicketAttachment[] | null;
}

interface EventData {
  title_ar: string;
  start_date: string;
  end_date: string | null;
  venue_name: string | null;
  is_online: boolean;
  cover_image_url: string | null;
}

const RSVPConfirm = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const companionOf = searchParams.get("companion_of");
  const [state, setState] = useState<PageState>("loading");
  const [guest, setGuest] = useState<GuestData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [guestTicket, setGuestTicket] = useState<GuestTicket | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [companionName, setCompanionName] = useState("");
  const [companionPhone, setCompanionPhone] = useState("");
  const [companionSubmitting, setCompanionSubmitting] = useState(false);
  const [extra, setExtra] = useState({
    company: "",
    job_title: "",
    email: "",
    city: "",
    notes: "",
  });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    if (companionOf) { loadForCompanion(); return; }
    loadGuest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, companionOf]);

  const loadForCompanion = async () => {
    const { data } = await (supabase as any)
      .from("event_guests")
      .select("event_id, ticket_id, companions_allowed, companions_used, events:event_id(title_ar, start_date, venue_name, is_online, cover_image_url, status)")
      .eq("id", companionOf)
      .maybeSingle();
    if (!data) { setState("invalid"); return; }
    setEvent(data.events);
    setEventId(data.event_id);
    if (data.companions_used >= data.companions_allowed) {
      setState("companions_full");
      return;
    }
    setGuest({
      id: companionOf!,
      guest_name: "",
      rsvp_status: "",
      rsvp_token: token!,
      ticket_id: data.ticket_id,
      extra_data: {},
      companions_allowed: data.companions_allowed,
      companions_used: data.companions_used,
    });
    setState("companion_form");
  };

  const submitCompanion = async () => {
    if (!companionName.trim() || !companionPhone.trim() || !eventId) {
      toast.error("الاسم ورقم الجوال مطلوبان");
      return;
    }
    setCompanionSubmitting(true);
    const { error } = await (supabase as any).from("event_guests").insert({
      event_id: eventId,
      ticket_id: guest?.ticket_id || null,
      parent_guest_id: companionOf,
      guest_name: companionName.trim(),
      guest_phone: companionPhone.trim(),
      rsvp_status: "confirmed",
      confirmed_at: new Date().toISOString(),
      imported_by: "00000000-0000-0000-0000-000000000000",
    });
    setCompanionSubmitting(false);
    if (error) {
      toast.error("تعذّر التسجيل، ربما اكتمل العدد");
    } else {
      setState("companion_done");
    }
  };

  const loadGuest = async () => {
    const { data } = await supabase
      .from("event_guests")
      .select("id, guest_name, rsvp_status, rsvp_token, event_id, ticket_id, extra_data, companions_allowed, companions_used, events:event_id(title_ar, start_date, end_date, venue_name, is_online, cover_image_url, status)")
      .eq("rsvp_token", token)
      .maybeSingle();

    if (!data) { setState("invalid"); return; }
    const evt = (data as any).events;
    const ed = ((data as any).extra_data || {}) as Record<string, any>;
    const ca = (data as any).companions_allowed ?? 0;
    const cu = (data as any).companions_used ?? 0;
    setGuest({
      id: (data as any).id,
      guest_name: data.guest_name,
      rsvp_status: data.rsvp_status,
      rsvp_token: data.rsvp_token,
      ticket_id: (data as any).ticket_id || null,
      extra_data: ed,
      companions_allowed: ca,
      companions_used: cu,
    });
    setExtra({
      company: ed.company || "",
      job_title: ed.job_title || "",
      email: ed.email || "",
      city: ed.city || "",
      notes: ed.notes || "",
    });
    setEvent(evt);
    setEventId(data.event_id);

    const { data: ticketRows } = await supabase
      .from("tickets")
      .select("id, name_ar, description, attachments, visibility, badge_color, badge_logo_url, badge_tier_label")
      .eq("event_id", data.event_id)
      .eq("is_active", true);

    const allTickets = (ticketRows || []) as any[];
    const myTicket = allTickets.find(t => t.id === (data as any).ticket_id);
    if (myTicket) {
      setGuestTicket({
        id: myTicket.id,
        name_ar: myTicket.name_ar,
        badge_color: myTicket.badge_color,
        badge_logo_url: myTicket.badge_logo_url,
        badge_tier_label: myTicket.badge_tier_label,
      });
    }

    const visibleTickets = allTickets
      .filter(t => t.description || (Array.isArray(t.attachments) && t.attachments.length > 0))
      .map(t => ({
        name_ar: t.name_ar,
        description: t.description,
        attachments: (t.attachments as TicketAttachment[]) || [],
      }));
    setTickets(visibleTickets);

    if (evt.status === "cancelled") { setState("cancelled"); return; }
    if (new Date(evt.start_date) < new Date()) { setState("passed"); return; }
    if (data.rsvp_status === "confirmed") { setState("already_confirmed"); return; }
    setState("ready");
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-rsvp", { body: { token } });
      if (error) throw error;
      if (data.status === "confirmed" || data.status === "already_confirmed") {
        // Move to data collection step before showing card
        setState("collect_data");
      }
    } catch {
      setState("invalid");
    } finally {
      setConfirming(false);
    }
  };

  const saveExtraData = async (skip = false) => {
    setSavingData(true);
    try {
      const payload = skip ? (guest?.extra_data || {}) : {
        ...(guest?.extra_data || {}),
        ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v && String(v).trim())),
      };
      await supabase
        .from("event_guests")
        .update({ extra_data: payload, data_collected_at: new Date().toISOString() } as any)
        .eq("rsvp_token", token!);
      if (!skip) toast.success("شكراً لك ✨");
      setState("confirmed");
    } catch {
      toast.error("تعذّر الحفظ، حاول مرة ثانية");
    } finally {
      setSavingData(false);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#492C5A",
      });
      const link = document.createElement("a");
      link.download = `invite-${guest?.guest_name || "guest"}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, backgroundColor: "#492C5A" });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "invite.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "بطاقة الدعوة" });
      } else {
        handleDownload();
      }
    } catch { /* user cancelled */ }
  };

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-cairo" dir="rtl">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-cairo p-4" dir="rtl">
        <div className="text-center space-y-4 max-w-md">
          <XCircle className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">الرابط غير صحيح</h1>
          <p className="text-muted-foreground">تواصل مع المنظم للحصول على رابط صحيح</p>
        </div>
      </div>
    );
  }

  if (state === "cancelled") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-cairo p-4" dir="rtl">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-16 h-16 text-accent mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">تم إلغاء هذه الفعالية</h1>
        </div>
      </div>
    );
  }

  if (state === "passed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-cairo p-4" dir="rtl">
        <div className="text-center space-y-4 max-w-md">
          <Clock className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">انتهت هذه الفعالية</h1>
        </div>
      </div>
    );
  }

  if (state === "companions_full") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-cairo p-4" dir="rtl">
        <div className="text-center space-y-3 max-w-md">
          <AlertCircle className="w-14 h-14 text-accent mx-auto" />
          <h1 className="text-xl font-bold text-foreground">اكتمل عدد المرافقين</h1>
          <p className="text-sm text-muted-foreground">تواصل مع المدعو الأصلي للحصول على رابط آخر.</p>
        </div>
      </div>
    );
  }

  if (state === "companion_done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-cairo p-4" dir="rtl">
        <div className="text-center space-y-3 max-w-md">
          <CheckCircle className="w-14 h-14 text-brand-teal mx-auto" />
          <h1 className="text-xl font-bold text-foreground">تم تسجيلك بنجاح 🎉</h1>
          <p className="text-sm text-muted-foreground">سنرسل لك تفاصيل الفعالية قريباً.</p>
          <p className="font-bold text-primary">{event?.title_ar}</p>
        </div>
      </div>
    );
  }

  if (state === "companion_form") {
    return (
      <div className="min-h-screen bg-background font-cairo py-8 px-4" dir="rtl">
        <div className="max-w-md mx-auto bg-card rounded-2xl border border-border/50 p-6 shadow-xl space-y-5">
          <div className="text-center space-y-2">
            <UserPlus className="w-12 h-12 text-primary mx-auto" />
            <h1 className="text-xl font-bold text-foreground">دعوة مرافق</h1>
            <p className="text-sm text-muted-foreground">أنت مدعو كمرافق إلى</p>
            <p className="font-bold text-primary">{event?.title_ar}</p>
          </div>
          <div className="space-y-3 text-right">
            <div className="space-y-1">
              <label className="text-xs font-semibold">الاسم الكامل *</label>
              <Input value={companionName} onChange={(e) => setCompanionName(e.target.value)} placeholder="اكتب اسمك" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">رقم الجوال *</label>
              <Input value={companionPhone} onChange={(e) => setCompanionPhone(e.target.value)} placeholder="+9665XXXXXXXX" dir="ltr" />
            </div>
          </div>
          <Button className="w-full rounded-full" size="lg" disabled={companionSubmitting} onClick={submitCompanion}>
            {companionSubmitting ? "جارٍ التسجيل..." : "تأكيد حضوري ✅"}
          </Button>
        </div>
      </div>
    );
  }

  // Pre-confirm view
  if (state === "ready") {
    return (
      <div className="min-h-screen bg-background font-cairo" dir="rtl">
        <div className="relative h-48 sm:h-64">
          <img src={event?.cover_image_url || logoHorizontal} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
        </div>
        <div className="max-w-lg mx-auto -mt-16 relative z-10 px-4 pb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border/50 p-8 shadow-xl text-center">
            <div className="inline-block px-3 py-1 rounded-full bg-brand-sage/30 text-brand-teal text-xs font-bold mb-4">دعوة خاصة</div>
            <h1 className="text-xl font-bold text-foreground mb-1">مرحباً {guest?.guest_name} 👋</h1>
            <p className="text-muted-foreground text-sm mb-4">أنت مدعو لحضور</p>
            <h2 className="text-2xl font-bold text-primary mb-6">{event?.title_ar}</h2>

            <div className="space-y-3 text-sm text-muted-foreground text-right mb-8">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{new Date(event!.start_date).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{new Date(event!.start_date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{event!.is_online ? "أونلاين" : (event!.venue_name || "غير محدد")}</span>
              </div>
            </div>

            {/* Ticket-level details: location, parking, contact, files... */}
            {tickets.length > 0 && (
              <div className="space-y-3 text-right mb-6">
                {tickets.map((t, i) => (
                  <div key={i} className="bg-muted/40 rounded-xl p-4 space-y-3 border border-border/40">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-brand-teal flex-shrink-0" />
                      <p className="text-sm font-bold text-foreground">{t.name_ar}</p>
                    </div>
                    {t.description && (
                      <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{t.description}</p>
                    )}
                    {t.attachments && t.attachments.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {t.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-background border border-border/50 rounded-lg p-2 hover:border-primary/50 transition-colors block"
                          >
                            {att.type === "image" ? (
                              <img src={att.url} alt={att.name} className="w-full h-20 object-cover rounded" />
                            ) : (
                              <div className="w-full h-20 flex items-center justify-center bg-muted rounded">
                                <FileText className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                            <p className="text-[10px] truncate mt-1 text-foreground" title={att.name}>{att.name}</p>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button onClick={handleConfirm} disabled={confirming} size="lg" className="w-full rounded-full text-lg">
              {confirming ? "جارٍ التأكيد..." : "تأكيد حضوري ✅"}
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Data collection step (after first confirmation)
  if (state === "collect_data") {
    return (
      <div className="min-h-screen bg-background font-cairo py-8 px-4" dir="rtl">
        <div className="max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8 shadow-xl space-y-5">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-sage/30 text-brand-teal">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">تم تأكيد حضورك 🎉</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                معليش، نبي منك مجموعة بيانات بسيطة عشان نخدمك أحسن في الفعالية.
                <br />
                <span className="text-xs">ما يهم تكمّلها كلها — عبّي اللي تعرفه فقط.</span>
              </p>
            </div>

            <div className="space-y-3 text-right">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">الشركة / الجهة</label>
                <Input value={extra.company} onChange={e => setExtra(s => ({ ...s, company: e.target.value }))} placeholder="مثال: شركة نكفيك" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">المسمى الوظيفي</label>
                <Input value={extra.job_title} onChange={e => setExtra(s => ({ ...s, job_title: e.target.value }))} placeholder="مثال: مدير تسويق" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">البريد الإلكتروني</label>
                <Input value={extra.email} onChange={e => setExtra(s => ({ ...s, email: e.target.value }))} placeholder="name@example.com" type="email" dir="ltr" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">المدينة</label>
                <Input value={extra.city} onChange={e => setExtra(s => ({ ...s, city: e.target.value }))} placeholder="مثال: الرياض" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">ملاحظات (متطلبات خاصة، احتياجات…)</label>
                <Textarea value={extra.notes} onChange={e => setExtra(s => ({ ...s, notes: e.target.value }))} rows={3} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="outline" className="rounded-full" disabled={savingData} onClick={() => saveExtraData(true)}>
                تخطي
              </Button>
              <Button className="rounded-full" disabled={savingData} onClick={() => saveExtraData(false)}>
                {savingData ? "جارٍ الحفظ..." : "حفظ ومتابعة"}
                <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Confirmed view — premium downloadable invite card
  const rsvpUrl = `${window.location.origin}/rsvp/${guest?.rsvp_token}`;
  const dateStr = new Date(event!.start_date).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = new Date(event!.start_date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

  // Apply ticket-tier badge colors when available
  const tierColor = guestTicket?.badge_color || "#492C5A";
  const tierLabel = guestTicket?.badge_tier_label || guestTicket?.name_ar;
  const tierLogo = guestTicket?.badge_logo_url;

  // Build a gentle gradient from tier color
  const cardGradient = `linear-gradient(135deg, ${tierColor} 0%, ${tierColor}DD 50%, #A03C4A 100%)`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 font-cairo py-8 px-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-brand-sage/30 text-brand-teal text-xs font-bold mb-2">✓ مؤكد</div>
          <h1 className="text-lg font-bold text-foreground">دعوة خاصة</h1>
          <p className="text-sm text-muted-foreground mt-1">شكراً لتأكيدك الحضور — بحضوركم نحتفي</p>
        </motion.div>

        {/* Downloadable card */}
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: cardGradient,
            aspectRatio: "3/4",
          }}
        >
          {/* Pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 20%, #CC8E3D 0%, transparent 40%), radial-gradient(circle at 80% 80%, #006962 0%, transparent 40%)`,
            }}
          />

          <div className="relative h-full flex flex-col items-center justify-between p-6 text-white">
            {/* Top: brand badges */}
            <div className="w-full flex items-center justify-between gap-3">
              <div className="bg-white/95 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <img src={tierLogo || logoHorizontal} alt="logo" className="h-6 w-auto object-contain" />
              </div>
              {tierLabel && (
                <div className="bg-white/15 backdrop-blur border border-white/30 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide uppercase">
                  {tierLabel}
                </div>
              )}
            </div>

            {/* Middle: name + status */}
            <div className="text-center space-y-3 my-4">
              <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-brand-gold to-transparent" />
              <p className="text-lg font-semibold opacity-90">{guest?.guest_name}</p>
              <h2 className="text-3xl font-display font-extrabold tracking-tight">حضورك مؤكد</h2>
              <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-brand-gold to-transparent" />
            </div>

            {/* Event title */}
            <div className="text-center mb-2">
              <p className="text-xs opacity-70 mb-1">الفعالية</p>
              <p className="text-xl font-bold text-brand-gold">{event?.title_ar}</p>
            </div>

            {/* QR code */}
            <div className="bg-white p-3 rounded-2xl shadow-lg">
              <QRCodeSVG value={rsvpUrl} size={160} level="H" includeMargin={false} fgColor={tierColor} bgColor="#FFFFFF" />
            </div>

            {/* Bottom: date + venue */}
            <div className="w-full grid grid-cols-2 gap-2 text-center text-xs mt-4">
              <div className="bg-white/10 backdrop-blur rounded-xl py-2 px-3 border border-white/20">
                <p className="opacity-70 mb-0.5">التاريخ</p>
                <p className="font-bold">{dateStr}</p>
                <p className="opacity-90">{timeStr}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl py-2 px-3 border border-white/20">
                <p className="opacity-70 mb-0.5">المكان</p>
                <p className="font-bold truncate">{event!.is_online ? "أونلاين" : (event!.venue_name || "—")}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button onClick={handleDownload} disabled={downloading} variant="outline" size="lg" className="rounded-full">
            <Download className="w-4 h-4 ml-2" />
            {downloading ? "..." : "تنزيل"}
          </Button>
          <Button onClick={handleShare} size="lg" className="rounded-full">
            <Share2 className="w-4 h-4 ml-2" />
            مشاركة
          </Button>
        </div>

        {guest && guest.companions_allowed > 0 && (
          <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3 text-right">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">دعوة المرافقين</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              مسموح لك بدعوة <b className="text-foreground">{guest.companions_allowed}</b> مرافق
              {guest.companions_used > 0 && <> · تم تعبئة <b className="text-foreground">{guest.companions_used}</b></>}.
              شارك الرابط مع كل مرافق ليعبّي بياناته (الرابط ينتهي تلقائياً عند اكتمال العدد).
            </p>
            {guest.companions_used < guest.companions_allowed ? (
              <div className="flex gap-2">
                <Input
                  readOnly
                  dir="ltr"
                  value={`${window.location.origin}/rsvp/${guest.rsvp_token}?companion_of=${guest.id}`}
                  className="text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    const url = `${window.location.origin}/rsvp/${guest.rsvp_token}?companion_of=${guest.id}`;
                    navigator.clipboard.writeText(url);
                    toast.success("تم نسخ الرابط");
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    const url = `${window.location.origin}/rsvp/${guest.rsvp_token}?companion_of=${guest.id}`;
                    const msg = `مرحباً 👋، تفضل رابط دعوتك لحضور ${event?.title_ar} كمرافق لي:\n${url}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                  }}
                >
                  <Share2 className="w-3.5 h-3.5" /> واتساب
                </Button>
              </div>
            ) : (
              <p className="text-xs text-brand-teal font-semibold">✓ اكتمل عدد المرافقين</p>
            )}
          </div>
        )}

        <div className="text-center pt-4">
          <CheckCircle className="w-5 h-5 text-brand-teal inline-block ml-1" />
          <span className="text-xs text-muted-foreground">احتفظ بهذه البطاقة وأبرزها عند الحضور</span>
        </div>
      </div>
    </div>
  );
};

export default RSVPConfirm;
