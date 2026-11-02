import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, ArrowRight, Check, FileText, Lock, Plus, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { Link } from "react-router-dom";
import { getMissingOrgFields, isOrgReady } from "@/lib/orgCompleteness";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const steps = [
  "المعلومات الأساسية",
  "الوصف والصورة",
  "الجلسات والمتحدثين",
  "التذاكر",
  "الإعدادات",
  "مراجعة وإرسال",
];

const CATEGORIES = [
  { value: "conference", label: "مؤتمر" },
  { value: "workshop", label: "ورشة عمل" },
  { value: "seminar", label: "ندوة" },
  { value: "meetup", label: "لقاء" },
  { value: "other", label: "أخرى" },
];

interface FieldProps {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

const Field = ({ label, hint, className, children }: FieldProps) => (
  <div className={cn("space-y-2", className)}>
    <Label>{label}</Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

interface SegmentedProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

const Segmented = ({ value, onChange, options }: SegmentedProps) => (
  <Tabs value={value} onValueChange={onChange}>
    <TabsList className="grid h-10 w-full grid-cols-2">
      {options.map((o) => <TabsTrigger key={o.value} value={o.value} className="px-2">{o.label}</TabsTrigger>)}
    </TabsList>
  </Tabs>
);

const DROPZONE = "block cursor-pointer rounded-xl border border-dashed border-input bg-card text-center transition-colors hover:bg-secondary/50";

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
        <div className="space-y-6">
          <PageHeader
            title="يجب إكمال ملف المؤسسة أولاً"
            description="لإنشاء فعالية رسمية على نكفيك تيكت، يجب أن يكون ملف مؤسستك كاملاً ومفعّلاً. الرجاء استكمال البيانات التالية ثم العودة لإنشاء الفعالية."
            actions={<Button asChild><Link to="/dashboard/settings">إكمال بيانات المؤسسة</Link></Button>}
          />
          {organization?.is_active === false && (
            <div className="flex items-start gap-3 rounded-2xl bg-[#FDF3E3] p-4 text-sm text-[#9A5F12]">
              <ShieldCheck className="mt-0.5 h-5 w-5 flex-none" />
              <p className="font-semibold">حسابك قيد المراجعة من قِبل فريق نكفيك للتفعيل الرسمي.</p>
            </div>
          )}
          {missing.length > 0 && (
            <Panel title="الحقول المطلوبة">
              <ul className="grid gap-x-6 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
                {missing.map(m => (
                  <li key={m.key as string} className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-none text-[#B42F24]" />
                    {m.label}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </DashboardLayout>
    );
  }

  const namedSessions = sessions.filter(s => s.titleAr);
  const namedTickets = tickets.filter(t => t.nameAr);
  const reviewRows: [string, string][] = [
    ["العنوان", titleAr || "—"],
    ["التصنيف", CATEGORIES.find(c => c.value === category)?.label || category],
    ["النوع", eventType === "public" ? "عامة" : "خاصة"],
    ["التاريخ", startDate ? formatDateTime(startDate) : "—"],
    ["المكان", isOnline ? "أونلاين" : venueName || "—"],
    ["الحد الأقصى", maxAttendees ? formatNumber(parseInt(maxAttendees) || 0) : "—"],
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="إنشاء فعالية جديدة" description="أكمل الخطوات التالية لإنشاء فعاليتك" />

        {/* Step Indicator */}
        <nav aria-label="خطوات إنشاء الفعالية" className="rounded-2xl bg-card px-5 py-4 shadow-soft sm:px-6">
          <ol className="flex items-center">
            {steps.map((label, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <li key={label} className={cn("flex min-w-0 items-center", i < steps.length - 1 && "flex-auto")}>
                  <button
                    type="button"
                    onClick={() => i < step && setStep(i)}
                    aria-label={label}
                    aria-current={current ? "step" : undefined}
                    className={cn("flex flex-none items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", done ? "cursor-pointer" : "cursor-default")}
                  >
                    <span
                      className={cn(
                        "grid h-8 w-8 flex-none place-items-center rounded-full text-[13px] font-bold transition-colors",
                        current ? "bg-primary text-primary-foreground" : done ? "bg-secondary text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-4 w-4" strokeWidth={2.6} /> : i + 1}
                    </span>
                    <span className={cn("hidden whitespace-nowrap text-[13px] min-[1360px]:inline", current ? "font-bold text-foreground" : done ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}>
                      {label}
                    </span>
                  </button>
                  {i < steps.length - 1 && <span className={cn("mx-2 h-0.5 min-w-2 flex-1 rounded-full transition-colors min-[1360px]:mx-3", done ? "bg-primary" : "bg-[#EFEDF2]")} />}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 flex items-baseline justify-between gap-3 min-[1360px]:hidden">
            <span className="truncate text-sm font-bold">{steps[step]}</span>
            <span className="flex-none text-xs text-muted-foreground">الخطوة {step + 1} من {steps.length}</span>
          </p>
        </nav>

        {/* Step Content */}
        {step === 0 && (
          <Panel title="المعلومات الأساسية" bodyClassName="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="عنوان الفعالية (عربي) *">
                <Input placeholder="مثال: مؤتمر التقنية 2026" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
              </Field>
              <Field label="عنوان الفعالية (إنجليزي)">
                <Input placeholder="e.g. Tech Conference 2026" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} dir="ltr" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="التصنيف">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="نوع الفعالية">
                <Segmented
                  value={eventType}
                  onChange={(v) => setEventType(v as "public" | "private")}
                  options={[{ value: "public", label: "عامة" }, { value: "private", label: "خاصة" }]}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="تاريخ البداية *">
                <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} dir="ltr" />
              </Field>
              <Field label="تاريخ النهاية">
                <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} dir="ltr" />
              </Field>
            </div>
            <div className="flex items-center gap-2.5 pt-1">
              <Switch id="isOnline" checked={isOnline} onCheckedChange={setIsOnline} />
              <Label htmlFor="isOnline" className="cursor-pointer">فعالية أونلاين</Label>
            </div>
            {!isOnline && (
              <Field label="مكان الفعالية">
                <Input placeholder="مثال: فندق الفيصلية — الرياض" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
              </Field>
            )}
          </Panel>
        )}

        {step === 1 && (
          <Panel title="الوصف والصورة" bodyClassName="space-y-4">
            <div className="space-y-2">
              <Label>وصف الفعالية (عربي) *</Label>
              <Textarea placeholder="اكتب وصفاً مفصلاً للفعالية..." rows={6} value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} />
              {descriptionAr.trim() === "" && <p className="text-xs text-destructive">الوصف حقل إجباري</p>}
            </div>
            <div className="space-y-2">
              <Label>صورة الغلاف *</Label>
              <label className={cn(DROPZONE, "p-8")}>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                {coverFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{coverFile.name}</p>
                    <p className="text-xs text-muted-foreground">اضغط لتغيير الصورة</p>
                  </div>
                ) : (
                  <>
                    <span className="mx-auto mb-3 grid h-9 w-9 place-items-center rounded-[10px] bg-secondary text-primary"><Upload className="h-[18px] w-[18px]" /></span>
                    <p className="text-sm font-medium">اسحب الصورة هنا أو اضغط للاختيار</p>
                    <p className="mt-1 text-xs text-muted-foreground"><bdi dir="ltr">PNG, JPG</bdi> — حد أقصى <bdi dir="ltr">5MB</bdi></p>
                  </>
                )}
              </label>
              {!coverFile && <p className="text-xs text-destructive">صورة الغلاف حقل إجباري</p>}
            </div>
          </Panel>
        )}

        {step === 2 && (
          <Panel
            title="الجلسات والمتحدثين"
            bodyClassName="space-y-4"
            actions={<Button variant="outline" size="sm" onClick={addSession}><Plus className="h-4 w-4" /> إضافة جلسة</Button>}
          >
            {sessions.map((session, idx) => (
              <div key={session.id} className="space-y-4 rounded-xl bg-muted/50 p-4">
                <div className="flex h-8 items-center justify-between">
                  <span className="text-sm font-semibold">جلسة {idx + 1}</span>
                  {sessions.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="حذف الجلسة" onClick={() => removeSession(session.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="عنوان الجلسة">
                    <Input placeholder="عنوان الجلسة" value={session.titleAr} onChange={(e) => updateSession(session.id, "titleAr", e.target.value)} />
                  </Field>
                  <Field label="اسم المتحدث">
                    <Input placeholder="اسم المتحدث" value={session.speakerName} onChange={(e) => updateSession(session.id, "speakerName", e.target.value)} />
                  </Field>
                  <Field label="وقت البداية">
                    <Input type="time" value={session.startTime} onChange={(e) => updateSession(session.id, "startTime", e.target.value)} dir="ltr" />
                  </Field>
                  <Field label="وقت النهاية">
                    <Input type="time" value={session.endTime} onChange={(e) => updateSession(session.id, "endTime", e.target.value)} dir="ltr" />
                  </Field>
                </div>
                <Field label="القاعة / المكان">
                  <Input placeholder="مثال: القاعة الرئيسية" value={session.location} onChange={(e) => updateSession(session.id, "location", e.target.value)} />
                </Field>
              </div>
            ))}
          </Panel>
        )}

        {step === 3 && (
          <Panel
            title="التذاكر"
            bodyClassName="space-y-4"
            actions={<Button variant="outline" size="sm" onClick={addTicket}><Plus className="h-4 w-4" /> إضافة تذكرة</Button>}
          >
            {tickets.map((ticket, idx) => (
              <div key={ticket.id} className="divide-y divide-border rounded-xl bg-muted/50 px-4 [&>*]:py-4">
                <div className="space-y-4">
                  <div className="flex h-8 items-center justify-between">
                    <span className="text-sm font-semibold">تذكرة {idx + 1}</span>
                    {tickets.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="حذف التذكرة" onClick={() => removeTicket(ticket.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Field label="اسم التذكرة">
                      <Input placeholder="تذكرة عامة" value={ticket.nameAr} onChange={(e) => updateTicket(ticket.id, "nameAr", e.target.value)} />
                    </Field>
                    <Field label="تسمية الفئة *">
                      <Input placeholder="VIP، مدعو، عام، شرف..." value={ticket.tierLabel} onChange={(e) => updateTicket(ticket.id, "tierLabel", e.target.value)} />
                    </Field>
                    <Field label="الكمية">
                      <Input type="number" placeholder="100" value={ticket.quantity} onChange={(e) => updateTicket(ticket.id, "quantity", e.target.value)} dir="ltr" />
                    </Field>
                    <Field label="السعر (ر.س) — اتركه 0 للمجانية">
                      <Input type="number" placeholder="0.00" value={ticket.price} onChange={(e) => updateTicket(ticket.id, "price", e.target.value)} dir="ltr" />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="الإتاحة">
                      <Segmented
                        value={ticket.isForSale ? "sale" : "display"}
                        onChange={(v) => updateTicket(ticket.id, "isForSale", v === "sale")}
                        options={[{ value: "sale", label: "متاحة للحجز" }, { value: "display", label: "للعرض فقط" }]}
                      />
                    </Field>
                    <Field label="الظهور">
                      <Segmented
                        value={ticket.visibility}
                        onChange={(v) => updateTicket(ticket.id, "visibility", v)}
                        options={[{ value: "public", label: "عامة" }, { value: "private", label: "خاصة (دعوة)" }]}
                      />
                    </Field>
                  </div>
                </div>

                {/* Description + attachments shown to attendees on RSVP confirm */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="وصف إضافي للمدعو (اختياري)" hint="يظهر للمدعو في صفحة تأكيد الدعوة">
                    <Textarea
                      rows={3}
                      placeholder="مثال: الموقع الدقيق، تعليمات الدخول، رقم المنسق، تفاصيل المواقف..."
                      value={ticket.description}
                      onChange={(e) => updateTicket(ticket.id, "description", e.target.value)}
                    />
                  </Field>
                  <div className="space-y-2">
                    <Label>ملفات وصور مرفقة (اختياري)</Label>
                    <label className={cn(DROPZONE, "p-4")}>
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => handleTicketAttachmentUpload(ticket.id, e.target.files)}
                      />
                      <Upload className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">ملف الفعالية، خريطة المواقف، تفاصيل الموقع...</p>
                    </label>
                    {ticket.attachments.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {ticket.attachments.map((att) => (
                          <div key={att.id} className="relative rounded-lg bg-card p-2">
                            {att.type === "image" ? (
                              <img src={att.url} alt={att.name} className="h-16 w-full rounded-md object-cover" />
                            ) : (
                              <div className="flex h-16 w-full items-center justify-center gap-1.5 rounded-md bg-muted text-xs text-muted-foreground">
                                <FileText className="h-4 w-4" /> ملف
                              </div>
                            )}
                            <p className="mt-1 truncate text-xs" title={att.name}>{att.name}</p>
                            <button
                              type="button"
                              onClick={() => removeTicketAttachment(ticket.id, att.id)}
                              aria-label="حذف المرفق"
                              className="absolute end-1 top-1 grid h-6 w-6 place-items-center rounded-md bg-destructive text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Badge customization (mandatory per ticket) */}
                <div className="space-y-4">
                  <p className="text-sm font-semibold">تصميم بطاقة الحضور (إجباري)</p>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2.5 rounded-lg bg-card px-3 py-2 text-xs text-muted-foreground">
                        {organization?.logo_url ? (
                          <img src={organization.logo_url} alt="" className="h-6 max-w-[60px] rounded bg-white object-contain p-0.5" />
                        ) : (
                          <span className="h-6 w-6 rounded bg-muted" />
                        )}
                        <span>سيتم استخدام شعار حسابك تلقائياً على البطاقة</span>
                      </div>
                      <Field label="رمز البطاقة (اختياري)" hint="إيموجي أو حروف قصيرة (≤ 4)">
                        <Input
                          value={ticket.badgeSymbol}
                          onChange={(e) => updateTicket(ticket.id, "badgeSymbol", e.target.value.slice(0, 4))}
                          placeholder="مثال: ⭐ أو VIP"
                          maxLength={4}
                          className="text-center"
                        />
                      </Field>
                      <Field label="لون البطاقة *">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {organization?.brand_color && (
                            <button
                              type="button"
                              onClick={() => updateTicket(ticket.id, "badgeColor", organization.brand_color!)}
                              title="لون الشعار"
                              className="flex items-center gap-1.5 rounded-lg text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <span
                                className={cn("h-8 w-8 rounded-lg transition-shadow", ticket.badgeColor === organization.brand_color && "ring-2 ring-primary ring-offset-2")}
                                style={{ background: organization.brand_color }}
                              />
                              شعار
                            </button>
                          )}
                          {PRESET_BADGE_COLORS.map(c => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => updateTicket(ticket.id, "badgeColor", c.value)}
                              className={cn("h-8 w-8 rounded-lg transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", ticket.badgeColor === c.value && "ring-2 ring-primary ring-offset-2")}
                              style={{ background: c.value }}
                              title={c.name}
                            />
                          ))}
                          <input
                            type="color"
                            value={ticket.badgeColor || "#492C5A"}
                            onChange={(e) => updateTicket(ticket.id, "badgeColor", e.target.value)}
                            aria-label="لون مخصص"
                            className="h-8 w-8 cursor-pointer rounded-lg border border-input bg-card p-0.5"
                          />
                        </div>
                      </Field>
                    </div>
                    <div className="flex items-center justify-center rounded-xl bg-card p-4 sm:p-6">
                      <div className="w-full max-w-xs rounded-xl p-4 text-center text-white" style={{ background: ticket.badgeColor || "#492C5A" }}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          {organization?.logo_url
                            ? <img src={organization.logo_url} alt="" className="h-6 max-w-[60px] rounded bg-white object-contain p-0.5" />
                            : <span className="text-xs opacity-80">{organization?.name || "شعار الجهة"}</span>}
                          <div className="flex items-center gap-1.5">
                            {ticket.badgeSymbol && (
                              <span className="rounded-full bg-white/20 px-2 py-0.5 text-sm font-bold">{ticket.badgeSymbol}</span>
                            )}
                            <span className="rounded-full bg-brand-gold px-2 py-0.5 text-xs font-bold text-foreground">{ticket.tierLabel || "—"}</span>
                          </div>
                        </div>
                        <p className="text-sm font-bold">معاينة بطاقة {ticket.nameAr || "التذكرة"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {ticket.visibility === "private" && (
                  <div className="space-y-4">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Lock className="h-3.5 w-3.5 flex-none" /> هذه الفئة لن تظهر في صفحة الفعالية العامة. ترسل للمدعوين فقط.
                    </p>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-card p-3">
                      <div className="min-w-0">
                        <Label htmlFor={`companions-${ticket.id}`} className="cursor-pointer font-semibold">السماح بدعوة مرافقين</Label>
                        <p className="mt-1 text-xs text-muted-foreground">يقدر المدعو يشارك رابط دعوة مع مرافقيه</p>
                      </div>
                      <Switch
                        id={`companions-${ticket.id}`}
                        checked={ticket.allowCompanions}
                        onCheckedChange={(checked) => updateTicket(ticket.id, "allowCompanions", checked)}
                      />
                    </div>
                    {ticket.allowCompanions && (
                      <Field label="الحد الأقصى لعدد المرافقين لكل مدعو" hint="سيُسأل المدعو بعد التأكيد كم مرافق يبي يدعي.">
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          placeholder="مثال: 2"
                          value={ticket.maxCompanions}
                          onChange={(e) => updateTicket(ticket.id, "maxCompanions", e.target.value)}
                          dir="ltr"
                        />
                      </Field>
                    )}
                  </div>
                )}
              </div>
            ))}
          </Panel>
        )}

        {step === 4 && (
          <Panel title="الإعدادات">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="آخر موعد للتسجيل">
                <Input type="datetime-local" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} dir="ltr" />
              </Field>
              <Field label="الحد الأقصى للحضور">
                <Input type="number" placeholder="100" value={maxAttendees} onChange={(e) => setMaxAttendees(e.target.value)} dir="ltr" />
              </Field>
            </div>
          </Panel>
        )}

        {step === 5 && (
          <Panel title="مراجعة وإرسال" bodyClassName="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4">
              <h3 className="mb-3 text-sm font-semibold">المعلومات الأساسية</h3>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                {reviewRows.map(([term, value]) => (
                  <div key={term} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{term}</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl bg-muted/50 p-4">
                <h3 className="mb-2 text-sm font-semibold">الجلسات ({formatNumber(namedSessions.length)})</h3>
                {namedSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد جلسات</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {namedSessions.map((s, i) => (
                      <li key={i} className="py-2 first:pt-0 last:pb-0">
                        <p className="truncate text-sm font-semibold">{s.titleAr}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.speakerName || "بدون متحدث"}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl bg-muted/50 p-4">
                <h3 className="mb-2 text-sm font-semibold">التذاكر ({formatNumber(namedTickets.length)})</h3>
                <ul className="divide-y divide-border">
                  {namedTickets.map((t, i) => (
                    <li key={i} className="py-2 first:pt-0 last:pb-0">
                      <p className="truncate text-sm font-semibold">{t.nameAr}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {(parseFloat(t.price) || 0) === 0 ? "مجانية" : `${formatNumber(parseFloat(t.price))} ر.س`}، الكمية: {formatNumber(parseInt(t.quantity) || 100)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {eventType === "public" && (
              <div className="flex items-start gap-3 rounded-xl bg-[#FDF3E3] p-4 text-[#9A5F12]">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-none" />
                <div className="text-sm">
                  <p className="font-semibold">ملاحظة: الفعاليات العامة تحتاج موافقة مدير النظام قبل النشر</p>
                  <p className="mt-0.5 text-xs">سيتم إرسال الفعالية للمراجعة بعد الإرسال</p>
                </div>
              </div>
            )}
          </Panel>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ArrowRight className="h-4 w-4" /> السابق
          </Button>
          {step < 5 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canGoNext()}>
              التالي <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "جارٍ الإرسال..." : eventType === "public" ? "إرسال للمراجعة" : "نشر الفعالية"}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreateEvent;
