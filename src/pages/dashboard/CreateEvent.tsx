import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileText, Image, Users, Ticket, Settings, CheckCircle,
  ArrowLeft, ArrowRight, Plus, Trash2, Upload, AlertCircle, ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getMissingOrgFields, isOrgReady } from "@/lib/orgCompleteness";

const steps = [
  { icon: FileText, label: "المعلومات الأساسية" },
  { icon: Image, label: "الوصف والصورة" },
  { icon: Users, label: "الجلسات والمتحدثين" },
  { icon: Ticket, label: "التذاكر" },
  { icon: Settings, label: "الإعدادات" },
  { icon: CheckCircle, label: "مراجعة وإرسال" },
];

interface SessionItem {
  id: string;
  titleAr: string;
  speakerName: string;
  startTime: string;
  endTime: string;
  location: string;
}

interface TicketAttachment {
  id: string;
  name: string;
  url: string;
  type: "image" | "file";
}

interface TicketItem {
  id: string;
  nameAr: string;
  tierLabel: string; // category label controlled by organizer (replaces old type dropdown + badgeTierLabel)
  price: string;
  quantity: string;
  isForSale: boolean;
  visibility: "public" | "private";
  description: string;
  attachments: TicketAttachment[];
  badgeColor: string;
  badgeLogoUrl: string;
  badgeSymbol: string;
  allowCompanions: boolean;
  maxCompanions: string;
}

const PRESET_BADGE_COLORS = [
  { name: "بنفسجي", value: "#492C5A" },
  { name: "أحمر", value: "#A03C4A" },
  { name: "ذهبي", value: "#CC8E3D" },
  { name: "تركواز", value: "#006962" },
  { name: "أزرق", value: "#1E40AF" },
  { name: "أسود", value: "#1F2937" },
];

const CreateEvent = () => {
  const navigate = useNavigate();
  const { user, organization } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [category, setCategory] = useState("conference");
  const [eventType, setEventType] = useState<"public" | "private">("public");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venueName, setVenueName] = useState("");
  const [isOnline, setIsOnline] = useState(false);

  // Step 2
  const [descriptionAr, setDescriptionAr] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // Step 3
  const [sessions, setSessions] = useState<SessionItem[]>([
    { id: "1", titleAr: "", speakerName: "", startTime: "", endTime: "", location: "" },
  ]);

  // Step 4
  const [tickets, setTickets] = useState<TicketItem[]>([
    { id: "1", nameAr: "تذكرة عامة", tierLabel: "ضيف", price: "0", quantity: "100", isForSale: true, visibility: "public", description: "", attachments: [], badgeColor: "#492C5A", badgeLogoUrl: "", badgeSymbol: "", allowCompanions: false, maxCompanions: "0" },
  ]);

  // Step 5
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("100");

  const addSession = () => setSessions([...sessions, { id: Date.now().toString(), titleAr: "", speakerName: "", startTime: "", endTime: "", location: "" }]);
  const removeSession = (id: string) => setSessions(sessions.filter(s => s.id !== id));
  const updateSession = (id: string, field: keyof SessionItem, value: string) => setSessions(sessions.map(s => s.id === id ? { ...s, [field]: value } : s));

  const addTicket = () => setTickets([...tickets, { id: Date.now().toString(), nameAr: "", tierLabel: "", price: "", quantity: "", isForSale: true, visibility: "public", description: "", attachments: [], badgeColor: "#492C5A", badgeLogoUrl: "", badgeSymbol: "", allowCompanions: false, maxCompanions: "0" }]);
  const removeTicket = (id: string) => setTickets(tickets.filter(t => t.id !== id));
  const updateTicket = (id: string, field: keyof TicketItem, value: any) => setTickets(tickets.map(t => t.id === id ? { ...t, [field]: value } : t));

  const handleTicketAttachmentUpload = async (ticketId: string, files: FileList | null) => {
    if (!files || !organization) return;
    const newAttachments: TicketAttachment[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${organization.id}/ticket-attachments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("event-covers").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("event-covers").getPublicUrl(path);
        newAttachments.push({
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          name: file.name,
          url: urlData.publicUrl,
          type: file.type.startsWith("image/") ? "image" : "file",
        });
      } else {
        toast.error(`فشل رفع: ${file.name}`);
      }
    }
    if (newAttachments.length > 0) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) updateTicket(ticketId, "attachments", [...ticket.attachments, ...newAttachments]);
      toast.success(`تم رفع ${newAttachments.length} ملف`);
    }
  };

  const removeTicketAttachment = (ticketId: string, attachmentId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) updateTicket(ticketId, "attachments", ticket.attachments.filter(a => a.id !== attachmentId));
  };

  const handleBadgeLogoUpload = async (ticketId: string, file: File | null) => {
    if (!file || !organization) return;
    const ext = file.name.split(".").pop();
    const path = `${organization.id}/badge-logos/${ticketId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (error) { toast.error("فشل رفع الشعار"); return; }
    const { data } = supabase.storage.from("logos").getPublicUrl(path);
    updateTicket(ticketId, "badgeLogoUrl", data.publicUrl);
    toast.success("تم رفع الشعار");
  };

  const ticketsBadgeValid = () =>
    tickets
      .filter(t => t.nameAr.trim())
      .every(t => t.badgeColor && t.tierLabel.trim());

  const canGoNext = () => {
    if (step === 0) return titleAr.trim() !== "" && startDate !== "";
    if (step === 1) return descriptionAr.trim() !== "" && coverFile !== null;
    if (step === 3) return tickets.some(t => t.nameAr.trim()) && ticketsBadgeValid();
    return true;
  };

  const handleSubmit = async () => {
    if (!user || !organization) {
      toast.error("يرجى تسجيل الدخول أولاً");
      return;
    }
    if (!descriptionAr.trim() || !coverFile) {
      toast.error("الوصف وصورة الغلاف حقول إجبارية");
      setStep(1);
      return;
    }
    if (!ticketsBadgeValid()) {
      toast.error("يجب اختيار لون البطاقة وتسمية الفئة لكل تذكرة");
      setStep(3);
      return;
    }
    setSubmitting(true);
    try {
      // Upload cover image if provided
      let coverImageUrl: string | null = null;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `${organization.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("event-covers").upload(path, coverFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("event-covers").getPublicUrl(path);
          coverImageUrl = urlData.publicUrl;
        }
      }

      // Create event
      const { data: event, error: eventError } = await supabase.from("events").insert({
        organization_id: organization.id,
        title_ar: titleAr,
        title_en: titleEn || null,
        description_ar: descriptionAr || null,
        type: eventType,
        status: eventType === "private" ? "published" : "draft",
        category: category,
        cover_image_url: coverImageUrl,
        venue_name: isOnline ? null : venueName,
        is_online: isOnline,
        start_date: new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        registration_deadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : null,
        max_attendees: parseInt(maxAttendees) || null,
        is_free: tickets.every(t => (parseFloat(t.price) || 0) === 0),
        created_by: user.id,
      } as any).select("id").single();

      if (eventError) throw eventError;

      // Create sessions
      const validSessions = sessions.filter(s => s.titleAr.trim());
      if (validSessions.length > 0 && event) {
        await supabase.from("sessions").insert(
          validSessions.map((s, i) => ({
            event_id: event.id,
            title_ar: s.titleAr,
            speaker_name: s.speakerName || null,
            start_time: s.startTime ? new Date(`${startDate.split("T")[0]}T${s.startTime}`).toISOString() : null,
            end_time: s.endTime ? new Date(`${startDate.split("T")[0]}T${s.endTime}`).toISOString() : null,
            location: s.location || null,
            session_order: i,
          }))
        );
      }

      // Create tickets
      const validTickets = tickets.filter(t => t.nameAr.trim());
      if (validTickets.length > 0 && event) {
        await supabase.from("tickets").insert(
          validTickets.map(t => {
            const priceNum = parseFloat(t.price) || 0;
            return {
              event_id: event.id,
              name_ar: t.nameAr,
              type: priceNum === 0 ? "free" : "paid",
              price: priceNum,
              quantity_total: parseInt(t.quantity) || 100,
              is_for_sale: t.isForSale,
              visibility: t.visibility,
              description: t.description || null,
              attachments: t.attachments as any,
              badge_color: t.badgeColor || null,
              badge_logo_url: null,
              badge_symbol: t.badgeSymbol || null,
              badge_tier_label: t.tierLabel || null,
              allow_companions: t.visibility === "private" ? t.allowCompanions : false,
              max_companions: t.visibility === "private" && t.allowCompanions ? (parseInt(t.maxCompanions) || 0) : 0,
            };
          }) as any
        );
      }

      toast.success("تم إنشاء الفعالية بنجاح!");
      navigate("/dashboard/events");
    } catch (err: any) {
      console.error(err);
      const msg: string = err?.message || "";
      if (msg.includes("QUOTA_EXCEEDED")) {
        toast.error("لقد استنفدت رصيدك من الفعاليات. يرجى الترقية إلى باقة أعلى.");
        setTimeout(() => navigate("/dashboard/subscription"), 1500);
      } else if (msg.includes("SUBSCRIPTION_EXPIRED")) {
        toast.error("انتهت صلاحية باقتك. يرجى التجديد للاستمرار.");
        setTimeout(() => navigate("/dashboard/subscription"), 1500);
      } else if (msg.includes("NO_ACTIVE_SUBSCRIPTION")) {
        toast.error("لا يوجد اشتراك نشط. يرجى الاشتراك في باقة أولاً.");
        setTimeout(() => navigate("/dashboard/subscription"), 1500);
      } else {
        toast.error("حدث خطأ أثناء إنشاء الفعالية");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const orgReady = isOrgReady(organization as any);
  const missing = getMissingOrgFields(organization as any);

  if (!orgReady) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-2xl border border-border/60 p-8 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-brick/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-brand-brick" />
            </div>
            <h1 className="font-bold text-2xl text-foreground">يجب إكمال ملف المؤسسة أولاً</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              لإنشاء فعالية رسمية على نكفيك تيكت، يجب أن يكون ملف مؤسستك كاملاً ومفعّلاً.
              الرجاء استكمال البيانات التالية ثم العودة لإنشاء الفعالية.
            </p>
            {organization?.is_active === false && (
              <div className="bg-brand-gold/10 border border-brand-gold/40 rounded-xl p-3 text-sm text-foreground">
                <ShieldCheck className="w-4 h-4 inline ml-1 text-brand-gold" />
                حسابك قيد المراجعة من قِبل فريق نكفيك للتفعيل الرسمي.
              </div>
            )}
            {missing.length > 0 && (
              <div className="text-right bg-muted/40 rounded-xl p-4">
                <p className="text-xs font-bold text-foreground mb-2">الحقول المطلوبة:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {missing.map(m => (
                    <li key={m.key as string} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-brick" />
                      {m.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link to="/dashboard/settings">
              <Button className="rounded-full w-full" size="lg">إكمال بيانات المؤسسة</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-bold text-2xl text-foreground">إنشاء فعالية جديدة</h1>
          <p className="text-muted-foreground text-sm">أكمل الخطوات التالية لإنشاء فعاليتك</p>
        </div>

        {/* Step Indicator */}
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {steps.map((s, i) => (
              <button key={i} onClick={() => i < step && setStep(i)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-teal/10 text-teal cursor-pointer" : "text-muted-foreground"}`}>
                <s.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-card rounded-2xl border border-border/50 p-6">
            {step === 0 && (
              <div className="space-y-5">
                <h2 className="font-bold text-lg text-foreground mb-4">المعلومات الأساسية</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>عنوان الفعالية (عربي) *</Label>
                    <Input placeholder="مثال: مؤتمر التقنية 2026" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>عنوان الفعالية (إنجليزي)</Label>
                    <Input placeholder="e.g. Tech Conference 2026" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>التصنيف</Label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                      <option value="conference">مؤتمر</option>
                      <option value="workshop">ورشة عمل</option>
                      <option value="seminar">ندوة</option>
                      <option value="meetup">لقاء</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>نوع الفعالية</Label>
                    <div className="flex gap-3">
                      {(["public", "private"] as const).map((t) => (
                        <button key={t} type="button" onClick={() => setEventType(t)} className={`flex-1 h-10 rounded-xl text-sm font-semibold border-2 transition-all ${eventType === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
                          {t === "public" ? "عامة" : "خاصة"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>تاريخ البداية *</Label>
                    <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ النهاية</Label>
                    <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} dir="ltr" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" id="isOnline" checked={isOnline} onChange={(e) => setIsOnline(e.target.checked)} className="rounded" />
                    <Label htmlFor="isOnline" className="cursor-pointer">فعالية أونلاين</Label>
                  </div>
                  {!isOnline && (
                    <div className="space-y-2">
                      <Label>مكان الفعالية</Label>
                      <Input placeholder="مثال: فندق الفيصلية — الرياض" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <h2 className="font-bold text-lg text-foreground mb-4">الوصف والصورة</h2>
                <div className="space-y-2">
                  <Label>وصف الفعالية (عربي) *</Label>
                  <Textarea placeholder="اكتب وصفاً مفصلاً للفعالية..." rows={6} value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} />
                  {descriptionAr.trim() === "" && <p className="text-xs text-destructive">الوصف حقل إجباري</p>}
                </div>
                <div className="space-y-2">
                  <Label>صورة الغلاف *</Label>
                  <label className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer block">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                    {coverFile ? (
                      <div className="space-y-2">
                        <p className="text-sm text-foreground font-semibold">{coverFile.name}</p>
                        <p className="text-xs text-muted-foreground">اضغط لتغيير الصورة</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">اسحب الصورة هنا أو اضغط للاختيار</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG — حد أقصى 5MB</p>
                      </>
                    )}
                  </label>
                  {!coverFile && <p className="text-xs text-destructive">صورة الغلاف حقل إجباري</p>}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg text-foreground">الجلسات والمتحدثين</h2>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={addSession}>
                    <Plus className="w-4 h-4" /> إضافة جلسة
                  </Button>
                </div>
                {sessions.map((session, idx) => (
                  <div key={session.id} className="bg-muted/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">جلسة {idx + 1}</span>
                      {sessions.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeSession(session.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">عنوان الجلسة</Label>
                        <Input placeholder="عنوان الجلسة" value={session.titleAr} onChange={(e) => updateSession(session.id, "titleAr", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">اسم المتحدث</Label>
                        <Input placeholder="اسم المتحدث" value={session.speakerName} onChange={(e) => updateSession(session.id, "speakerName", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">وقت البداية</Label>
                        <Input type="time" value={session.startTime} onChange={(e) => updateSession(session.id, "startTime", e.target.value)} dir="ltr" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">وقت النهاية</Label>
                        <Input type="time" value={session.endTime} onChange={(e) => updateSession(session.id, "endTime", e.target.value)} dir="ltr" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">القاعة / المكان</Label>
                      <Input placeholder="مثال: القاعة الرئيسية" value={session.location} onChange={(e) => updateSession(session.id, "location", e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg text-foreground">التذاكر</h2>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={addTicket}>
                    <Plus className="w-4 h-4" /> إضافة تذكرة
                  </Button>
                </div>
                {tickets.map((ticket, idx) => (
                  <div key={ticket.id} className="bg-muted/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">تذكرة {idx + 1}</span>
                      {tickets.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeTicket(ticket.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">اسم التذكرة</Label>
                        <Input placeholder="تذكرة عامة" value={ticket.nameAr} onChange={(e) => updateTicket(ticket.id, "nameAr", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">تسمية الفئة *</Label>
                        <Input placeholder="VIP، مدعو، عام، شرف..." value={ticket.tierLabel} onChange={(e) => updateTicket(ticket.id, "tierLabel", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">الكمية</Label>
                        <Input type="number" placeholder="100" value={ticket.quantity} onChange={(e) => updateTicket(ticket.id, "quantity", e.target.value)} dir="ltr" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">السعر (ر.س) — اتركه 0 للمجانية</Label>
                      <Input type="number" placeholder="0.00" value={ticket.price} onChange={(e) => updateTicket(ticket.id, "price", e.target.value)} dir="ltr" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
                      <div className="space-y-1">
                        <Label className="text-xs">الإتاحة</Label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => updateTicket(ticket.id, "isForSale", true)} className={`flex-1 h-9 rounded-lg text-xs font-semibold border-2 transition-all ${ticket.isForSale ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
                            متاحة للحجز
                          </button>
                          <button type="button" onClick={() => updateTicket(ticket.id, "isForSale", false)} className={`flex-1 h-9 rounded-lg text-xs font-semibold border-2 transition-all ${!ticket.isForSale ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
                            للعرض فقط
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">الظهور</Label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => updateTicket(ticket.id, "visibility", "public")} className={`flex-1 h-9 rounded-lg text-xs font-semibold border-2 transition-all ${ticket.visibility === "public" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
                            عامة
                          </button>
                          <button type="button" onClick={() => updateTicket(ticket.id, "visibility", "private")} className={`flex-1 h-9 rounded-lg text-xs font-semibold border-2 transition-all ${ticket.visibility === "private" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
                            خاصة (دعوة)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Description + attachments shown to attendees on RSVP confirm */}
                    <div className="pt-2 border-t border-border/50 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">وصف إضافي للمدعو (اختياري)</Label>
                        <Textarea
                          rows={2}
                          placeholder="مثال: الموقع الدقيق، تعليمات الدخول، رقم المنسق، تفاصيل المواقف..."
                          value={ticket.description}
                          onChange={(e) => updateTicket(ticket.id, "description", e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">يظهر للمدعو في صفحة تأكيد الدعوة</p>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">ملفات وصور مرفقة (اختياري)</Label>
                        <label className="border-2 border-dashed border-border rounded-xl p-3 text-center hover:border-primary/50 transition-colors cursor-pointer block">
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf,.doc,.docx"
                            className="hidden"
                            onChange={(e) => handleTicketAttachmentUpload(ticket.id, e.target.files)}
                          />
                          <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                          <p className="text-[11px] text-muted-foreground">ملف الفعالية، خريطة المواقف، تفاصيل الموقع...</p>
                        </label>
                        {ticket.attachments.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                            {ticket.attachments.map((att) => (
                              <div key={att.id} className="relative bg-background rounded-lg border border-border/50 p-2">
                                {att.type === "image" ? (
                                  <img src={att.url} alt={att.name} className="w-full h-16 object-cover rounded" />
                                ) : (
                                  <div className="w-full h-16 flex items-center justify-center bg-muted rounded text-xs text-muted-foreground">
                                    📄 ملف
                                  </div>
                                )}
                                <p className="text-[10px] truncate mt-1 text-foreground" title={att.name}>{att.name}</p>
                                <button
                                  type="button"
                                  onClick={() => removeTicketAttachment(ticket.id, att.id)}
                                  className="absolute -top-1 -left-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Badge customization (mandatory per ticket) */}
                    <div className="pt-3 border-t border-border/50 space-y-3">
                      <Label className="text-xs font-bold text-foreground">🎟️ تصميم بطاقة الحضور (إجباري)</Label>
                      <div className="rounded-lg bg-muted/40 px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
                        {organization?.logo_url ? (
                          <img src={organization.logo_url} alt="" className="h-6 max-w-[60px] object-contain bg-white p-0.5 rounded" />
                        ) : (
                          <span className="w-6 h-6 rounded bg-background border border-border" />
                        )}
                        <span>سيتم استخدام شعار حسابك تلقائياً على البطاقة</span>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">رمز البطاقة (اختياري)</Label>
                        <Input
                          value={ticket.badgeSymbol}
                          onChange={(e) => updateTicket(ticket.id, "badgeSymbol", e.target.value.slice(0, 4))}
                          placeholder="مثال: ⭐ أو VIP"
                          maxLength={4}
                          className="text-center"
                        />
                        <p className="text-[10px] text-muted-foreground">إيموجي أو حروف قصيرة (≤ 4)</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">لون البطاقة *</Label>
                        <div className="flex flex-wrap gap-2 items-center">
                          {organization?.brand_color && (
                            <button
                              type="button"
                              onClick={() => updateTicket(ticket.id, "badgeColor", organization.brand_color!)}
                              className={`w-8 h-8 rounded-full border-2 transition-all relative ${ticket.badgeColor === organization.brand_color ? "border-foreground scale-110" : "border-transparent"}`}
                              style={{ background: organization.brand_color }}
                              title="لون الشعار"
                            >
                              <span className="absolute -top-1 -left-1 text-[8px] bg-brand-gold text-foreground rounded-full px-1">شعار</span>
                            </button>
                          )}
                          {PRESET_BADGE_COLORS.map(c => (
                            <button key={c.value} type="button" onClick={() => updateTicket(ticket.id, "badgeColor", c.value)}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${ticket.badgeColor === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                              style={{ background: c.value }} title={c.name} />
                          ))}
                          <input type="color" value={ticket.badgeColor || "#492C5A"} onChange={(e) => updateTicket(ticket.id, "badgeColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-border" />
                        </div>
                      </div>
                      <div className="rounded-xl p-3 text-white text-center" style={{ background: ticket.badgeColor || "#492C5A" }}>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          {organization?.logo_url
                            ? <img src={organization.logo_url} alt="" className="h-6 max-w-[60px] object-contain bg-white p-0.5 rounded" />
                            : <span className="text-[10px] opacity-80">{organization?.name || "شعار الجهة"}</span>}
                          <div className="flex items-center gap-1">
                            {ticket.badgeSymbol && (
                              <span className="text-sm font-bold bg-white/20 px-2 py-0.5 rounded-full">{ticket.badgeSymbol}</span>
                            )}
                            <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-gold text-foreground">{ticket.tierLabel || "—"}</span>
                          </div>
                        </div>
                        <p className="text-xs font-bold">معاينة بطاقة {ticket.nameAr || "التذكرة"}</p>
                      </div>
                    </div>

                    {ticket.visibility === "private" && (
                      <div className="pt-3 border-t border-border/50 space-y-3">
                        <p className="text-[11px] text-muted-foreground bg-muted/70 rounded-lg p-2">
                          🔒 هذه الفئة لن تظهر في صفحة الفعالية العامة. ترسل للمدعوين فقط.
                        </p>
                        <div className="flex items-center justify-between bg-background rounded-lg border border-border p-3">
                          <div>
                            <Label className="text-xs font-bold">السماح بدعوة مرافقين</Label>
                            <p className="text-[10px] text-muted-foreground">يقدر المدعو يشارك رابط دعوة مع مرافقيه</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={ticket.allowCompanions}
                            onChange={(e) => updateTicket(ticket.id, "allowCompanions", e.target.checked)}
                            className="w-5 h-5 accent-primary"
                          />
                        </div>
                        {ticket.allowCompanions && (
                          <div className="space-y-1">
                            <Label className="text-xs">الحد الأقصى لعدد المرافقين لكل مدعو</Label>
                            <Input
                              type="number"
                              min="1"
                              max="20"
                              placeholder="مثال: 2"
                              value={ticket.maxCompanions}
                              onChange={(e) => updateTicket(ticket.id, "maxCompanions", e.target.value)}
                              dir="ltr"
                            />
                            <p className="text-[10px] text-muted-foreground">سيُسأل المدعو بعد التأكيد كم مرافق يبي يدعي.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <h2 className="font-bold text-lg text-foreground mb-4">الإعدادات</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>آخر موعد للتسجيل</Label>
                    <Input type="datetime-local" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>الحد الأقصى للحضور</Label>
                    <Input type="number" placeholder="100" value={maxAttendees} onChange={(e) => setMaxAttendees(e.target.value)} dir="ltr" />
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5">
                <h2 className="font-bold text-lg text-foreground mb-4">مراجعة وإرسال</h2>
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-xl p-4">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">المعلومات الأساسية</h3>
                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">العنوان:</span> <span className="font-semibold text-foreground">{titleAr || "—"}</span></div>
                      <div><span className="text-muted-foreground">التصنيف:</span> <span className="font-semibold text-foreground">{category}</span></div>
                      <div><span className="text-muted-foreground">النوع:</span> <span className="font-semibold text-foreground">{eventType === "public" ? "عامة" : "خاصة"}</span></div>
                      <div><span className="text-muted-foreground">التاريخ:</span> <span className="font-semibold text-foreground">{startDate ? new Date(startDate).toLocaleDateString("ar-SA") : "—"}</span></div>
                      <div><span className="text-muted-foreground">المكان:</span> <span className="font-semibold text-foreground">{isOnline ? "أونلاين" : venueName || "—"}</span></div>
                      <div><span className="text-muted-foreground">الحد الأقصى:</span> <span className="font-semibold text-foreground">{maxAttendees}</span></div>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">الجلسات ({sessions.filter(s => s.titleAr).length})</h3>
                    {sessions.filter(s => s.titleAr).map((s, i) => (
                      <p key={i} className="text-sm text-foreground">{i + 1}. {s.titleAr} — {s.speakerName || "بدون متحدث"}</p>
                    ))}
                    {sessions.filter(s => s.titleAr).length === 0 && <p className="text-sm text-muted-foreground">لا توجد جلسات</p>}
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">التذاكر ({tickets.filter(t => t.nameAr).length})</h3>
                    {tickets.filter(t => t.nameAr).map((t, i) => (
                      <p key={i} className="text-sm text-foreground">{t.nameAr} — {(parseFloat(t.price)||0) === 0 ? "مجانية" : `${t.price} ر.س`} — الكمية: {t.quantity}</p>
                    ))}
                  </div>

                  {eventType === "public" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                      <p className="text-amber-800 font-semibold">ملاحظة: الفعاليات العامة تحتاج موافقة مدير النظام قبل النشر</p>
                      <p className="text-amber-600 text-xs mt-1">سيتم إرسال الفعالية للمراجعة بعد الإرسال</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" className="rounded-full" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ArrowRight className="w-4 h-4" /> السابق
          </Button>
          {step < 5 ? (
            <Button className="rounded-full" onClick={() => setStep(step + 1)} disabled={!canGoNext()}>
              التالي <ArrowLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button className="rounded-full bg-teal hover:bg-teal/90" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "جارٍ الإرسال..." : eventType === "public" ? "إرسال للمراجعة" : "نشر الفعالية"}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreateEvent;
