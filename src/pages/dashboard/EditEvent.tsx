import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, Check, Circle, Eye, Lock, Save, Send as SendIcon, Trash2, Upload } from "lucide-react";
import { computeEventReadiness, READINESS_THRESHOLD } from "@/lib/eventHealth";
import { formatPercent } from "@/lib/format";

const CATEGORIES = [
  { value: "conference", label: "مؤتمر" },
  { value: "workshop", label: "ورشة عمل" },
  { value: "seminar", label: "ندوة" },
  { value: "meetup", label: "لقاء" },
  { value: "other", label: "أخرى" },
];

const EditEvent = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { organization } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [category, setCategory] = useState("conference");
  const [eventType, setEventType] = useState<"public" | "private">("public");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venueName, setVenueName] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [maxAttendees, setMaxAttendees] = useState("");
  const [currentStatus, setCurrentStatus] = useState<string>("draft");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [ticketsCount, setTicketsCount] = useState(0);

  const toLocalInput = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
      if (error || !data) { toast.error("تعذّر تحميل الفعالية"); navigate("/dashboard/events"); return; }
      setTitleAr(data.title_ar || "");
      setTitleEn(data.title_en || "");
      setDescriptionAr(data.description_ar || "");
      setCategory(data.category || "conference");
      setEventType((data.type as any) || "public");
      setStartDate(toLocalInput(data.start_date));
      setEndDate(toLocalInput(data.end_date));
      setVenueName(data.venue_name || "");
      setIsOnline(!!data.is_online);
      setMaxAttendees(data.max_attendees ? String(data.max_attendees) : "");
      setCurrentStatus(data.status);
      setCoverUrl(data.cover_image_url);
      const { count } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId);
      setTicketsCount(count || 0);
      setLoading(false);
    })();
  }, [eventId, navigate]);

  // جاهزية الفعالية للمراجعة — محسوبة حيّاً من قيم النموذج الحالية
  const readiness = computeEventReadiness({
    title: titleAr,
    description: descriptionAr,
    coverImage: coverFile ? "pending" : coverUrl,
    hasLocation: isOnline || !!venueName.trim(),
    startDate: startDate || null,
    ticketsCount,
  });

  // "save" = حفظ فقط (تبقى مسودة قابلة للتعديل) — "submit" = حفظ وإرسال للمراجعة
  const handleSave = async (mode: "save" | "submit") => {
    if (!titleAr.trim() || !startDate) { toast.error("العنوان وتاريخ البداية إلزامية"); return; }
    if (!eventId || !organization) return;
    if (mode === "submit" && !readiness.ready) {
      toast.error(
        `لا يمكن الإرسال — اكتمال البيانات ${formatPercent(readiness.score)} (المطلوب ${formatPercent(READINESS_THRESHOLD)}).\nالناقص: ${readiness.missing.map(m => m.missingLabel).join("، ")}`
      );
      return;
    }
    setSaving(true);
    try {
      let newCoverUrl = coverUrl;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `${organization.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("event-covers").upload(path, coverFile);
        if (!upErr) {
          newCoverUrl = supabase.storage.from("event-covers").getPublicUrl(path).data.publicUrl;
        }
      }

      // الحفظ فقط: الفعالية العامة ترجع/تبقى مسودة حتى يرسلها المنظم بنفسه
      const newStatus =
        eventType !== "public" ? currentStatus :
        mode === "submit" ? "pending_review" : "draft";

      const { error } = await supabase.from("events").update({
        title_ar: titleAr,
        title_en: titleEn || null,
        description_ar: descriptionAr || null,
        category,
        type: eventType,
        start_date: new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        venue_name: isOnline ? null : (venueName || null),
        is_online: isOnline,
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        cover_image_url: newCoverUrl,
        status: newStatus,
        rejection_reason: null,
      } as any).eq("id", eventId);

      if (error) throw error;
      if (mode === "submit") {
        toast.success("تم حفظ التعديلات وإرسال الفعالية لمراجعة إدارة نكفيك تيكت");
        navigate("/dashboard/events");
      } else {
        setCurrentStatus(newStatus);
        setCoverUrl(newCoverUrl);
        setCoverFile(null);
        toast.success(
          eventType === "public"
            ? "تم الحفظ كمسودة — أرسلها للمراجعة متى ما جهزت"
            : "تم حفظ التعديلات بنجاح"
        );
      }
    } catch (e: any) {
      toast.error("فشل الحفظ: " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("هل أنت متأكد من حذف هذه الفعالية؟ هذا الإجراء لا يمكن التراجع عنه.")) return;
    const { error } = await supabase.from("events").delete().eq("id", eventId!);
    if (error) { toast.error("فشل الحذف"); return; }
    toast.success("تم حذف الفعالية");
    navigate("/dashboard/events");
  };

  const header = (actions?: React.ReactNode) => (
    <PageHeader title="تعديل الفعالية" description="عدّل بيانات الفعالية، احذفها، أو اعرضها كما يراها الجمهور" actions={actions} />
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {header()}
          <div className="grid items-start gap-6 xl:grid-cols-3">
            <div className="h-[520px] animate-pulse rounded-2xl bg-card shadow-soft xl:col-span-2" />
            <div className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {header(
          <>
            <Button variant="ghost" asChild>
              <Link to="/dashboard/events"><ArrowRight className="h-4 w-4" /> العودة لفعالياتي</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/events/${eventId}`} target="_blank"><Eye className="h-4 w-4" /> عرض</Link>
            </Button>
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" /> حذف
            </Button>
          </>,
        )}

        {eventType === "public" && currentStatus !== "draft" && (
          <div className="flex items-start gap-3 rounded-2xl bg-[#FDF3E3] p-4 text-[#9A5F12]">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-none" />
            <div className="text-sm">
              <p className="font-bold">تنبيه: حفظ التعديلات يعيدها مسودة</p>
              <p className="mt-0.5 text-[13px] leading-5">
                حفظ تعديلات على فعالية عامة منشورة يعيدها "مسودة" غير معروضة للجمهور حتى ترسلها للمراجعة وتُعتمد مجدداً.
              </p>
            </div>
          </div>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-3">
          <Panel title="المعلومات الأساسية" className="xl:col-span-2" bodyClassName="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>عنوان الفعالية (عربي) *</Label>
                <Input value={titleAr} onChange={e => setTitleAr(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>عنوان الفعالية (إنجليزي)</Label>
                <Input value={titleEn} onChange={e => setTitleEn(e.target.value)} dir="ltr" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>نوع الفعالية</Label>
                <Tabs value={eventType} onValueChange={(v) => setEventType(v as "public" | "private")}>
                  <TabsList className="grid h-10 w-full grid-cols-2">
                    <TabsTrigger value="public">عامة</TabsTrigger>
                    <TabsTrigger value="private">خاصة</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>تاريخ البداية *</Label>
                <Input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>تاريخ النهاية</Label>
                <Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} dir="ltr" />
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <Switch id="online" checked={isOnline} onCheckedChange={setIsOnline} />
              <Label htmlFor="online" className="cursor-pointer">فعالية أونلاين</Label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {!isOnline && (
                <div className="space-y-2">
                  <Label>اسم المكان</Label>
                  <Input value={venueName} onChange={e => setVenueName(e.target.value)} placeholder="مثال: قاعة الأمير سلطان" />
                </div>
              )}
              <div className="space-y-2">
                <Label>الحد الأقصى للحضور</Label>
                <Input type="number" value={maxAttendees} onChange={e => setMaxAttendees(e.target.value)} dir="ltr" placeholder="100" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={descriptionAr} onChange={e => setDescriptionAr(e.target.value)} rows={5} placeholder="وصف مختصر عن الفعالية..." />
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel title="صورة الغلاف" bodyClassName="space-y-3">
              {coverUrl && !coverFile && (
                <div className="relative">
                  <img src={coverUrl} alt="cover" className="w-full rounded-xl" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute end-2 top-2 h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => setCoverUrl(null)}
                    title="حذف صورة الغلاف"
                    aria-label="حذف صورة الغلاف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <label className="block cursor-pointer rounded-xl border border-dashed border-input bg-card p-6 text-center transition-colors hover:bg-secondary/50">
                <span className="mx-auto mb-2.5 grid h-9 w-9 place-items-center rounded-[10px] bg-secondary text-primary"><Upload className="h-[18px] w-[18px]" /></span>
                <span className="block truncate text-sm font-medium">{coverFile ? coverFile.name : "اختر صورة جديدة"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
              </label>
              {coverFile && (
                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setCoverFile(null)}>
                  <Trash2 className="h-3.5 w-3.5" /> إلغاء الصورة المختارة
                </Button>
              )}
              {!coverUrl && !coverFile && (
                <p className="text-xs leading-5 text-muted-foreground">لا توجد صورة غلاف — احفظ التعديلات لتأكيد الحذف، أو اختر صورة جديدة.</p>
              )}
            </Panel>

            {eventType === "public" && (
              <Panel title="اكتمال البيانات" actions={<span className="text-sm font-bold leading-6">{readiness.score}%</span>}>
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#EFEDF2]">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${readiness.score}%` }} />
                </div>
                <ul className="space-y-2 text-[13px] leading-5">
                  {readiness.items.map((item) => (
                    <li key={item.key} className={`flex items-center gap-2 ${item.done ? "" : "text-muted-foreground"}`}>
                      {item.done ? <Check className="h-4 w-4 flex-none text-primary" strokeWidth={2.6} /> : <Circle className="h-4 w-4 flex-none opacity-40" />}
                      {item.label}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>

        <div className="z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-soft sm:sticky sm:bottom-4">
          <p className="min-w-0 flex-1 basis-64 text-xs leading-5 text-muted-foreground">
            {eventType === "public"
              ? `"حفظ" يبقيها مسودة تعدّلها متى شئت — و"إرسال للمراجعة" يقدمها لإدارة نكفيك تيكت (اكتمال البيانات: ${formatPercent(readiness.score)})`
              : "ستُحفظ التعديلات مباشرة."}
          </p>
          <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
            {eventType === "public" && (
              <Button
                onClick={() => handleSave("submit")}
                disabled={saving || !readiness.ready}
                className="flex-1 sm:flex-none"
                title={readiness.ready ? undefined : `أكمل البيانات أولاً — الاكتمال ${formatPercent(readiness.score)} والمطلوب ${formatPercent(READINESS_THRESHOLD)}: ${readiness.missing.map(m => m.missingLabel).join("، ")}`}
              >
                {readiness.ready ? <SendIcon className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                حفظ وإرسال للمراجعة
              </Button>
            )}
            <Button
              onClick={() => handleSave("save")}
              disabled={saving}
              variant={eventType === "public" ? "outline" : "default"}
              className="flex-1 sm:flex-none"
            >
              <Save className="h-4 w-4" />
              {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EditEvent;
