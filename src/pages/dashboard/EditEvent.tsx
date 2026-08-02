import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Save, Eye, Trash2, AlertCircle, Upload, Loader2, Send as SendIcon, Lock } from "lucide-react";
import { computeEventReadiness, READINESS_THRESHOLD } from "@/lib/eventHealth";

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
        `لا يمكن الإرسال — اكتمال البيانات ${readiness.score}% (المطلوب ${READINESS_THRESHOLD}%).\nالناقص: ${readiness.missing.map(m => m.missingLabel).join("، ")}`
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

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2 -mr-2">
              <Link to="/dashboard/events"><ArrowRight className="w-4 h-4" /> العودة لفعالياتي</Link>
            </Button>
            <h1 className="font-bold text-2xl text-foreground">تعديل الفعالية</h1>
            <p className="text-muted-foreground text-sm">عدّل بيانات الفعالية، احذفها، أو اعرضها كما يراها الجمهور</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full gap-2" asChild>
              <Link to={`/events/${eventId}`} target="_blank"><Eye className="w-4 h-4" /> عرض</Link>
            </Button>
            <Button variant="destructive" className="rounded-full gap-2" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" /> حذف
            </Button>
          </div>
        </div>

        {eventType === "public" && currentStatus !== "draft" && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-200">تنبيه: حفظ التعديلات يعيدها مسودة</p>
              <p className="text-amber-700 dark:text-amber-300/90 text-xs mt-0.5">
                حفظ تعديلات على فعالية عامة منشورة يعيدها "مسودة" غير معروضة للجمهور حتى ترسلها للمراجعة وتُعتمد مجدداً.
              </p>
            </div>
          </motion.div>
        )}

        <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>عنوان الفعالية (عربي) *</Label>
              <Input value={titleAr} onChange={e => setTitleAr(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>عنوان الفعالية (إنجليزي)</Label>
              <Input value={titleEn} onChange={e => setTitleEn(e.target.value)} dir="ltr" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>التصنيف</Label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
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
                {(["public", "private"] as const).map(t => (
                  <button key={t} type="button" onClick={() => setEventType(t)}
                    className={`flex-1 h-10 rounded-xl text-sm font-semibold border-2 transition-all ${eventType === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
                    {t === "public" ? "عامة" : "خاصة"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>تاريخ البداية *</Label>
              <Input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>تاريخ النهاية</Label>
              <Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} dir="ltr" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="online" checked={isOnline} onChange={e => setIsOnline(e.target.checked)} className="rounded" />
            <Label htmlFor="online" className="cursor-pointer">فعالية أونلاين</Label>
          </div>

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

          <div className="space-y-2">
            <Label>الوصف</Label>
            <Textarea value={descriptionAr} onChange={e => setDescriptionAr(e.target.value)} rows={5} placeholder="وصف مختصر عن الفعالية..." />
          </div>

          <div className="space-y-2">
            <Label>صورة الغلاف</Label>
            {coverUrl && !coverFile && (
              <div className="relative w-full max-w-md">
                <img src={coverUrl} alt="cover" className="w-full rounded-xl border border-border/50" />
                <button
                  type="button"
                  onClick={() => setCoverUrl(null)}
                  className="absolute top-2 end-2 bg-destructive text-destructive-foreground rounded-full p-2 shadow-lg hover:opacity-90 transition"
                  title="حذف صورة الغلاف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-border cursor-pointer hover:bg-muted/30 w-fit">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{coverFile ? coverFile.name : "اختر صورة جديدة"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
              </label>
              {coverFile && (
                <Button type="button" variant="ghost" size="sm" className="text-destructive rounded-full" onClick={() => setCoverFile(null)}>
                  <Trash2 className="w-3.5 h-3.5 ml-1" /> إلغاء الصورة المختارة
                </Button>
              )}
            </div>
            {!coverUrl && !coverFile && (
              <p className="text-[11px] text-muted-foreground">لا توجد صورة غلاف — احفظ التعديلات لتأكيد الحذف، أو اختر صورة جديدة.</p>
            )}
          </div>
        </div>

        <div className="sticky bottom-4 bg-card border border-border/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg flex-wrap">
          <p className="text-xs text-muted-foreground flex-1 min-w-[180px]">
            {eventType === "public"
              ? `"حفظ" يبقيها مسودة تعدّلها متى شئت — و"إرسال للمراجعة" يقدمها لإدارة نكفيك تيكت (اكتمال البيانات: ${readiness.score}%)`
              : "ستُحفظ التعديلات مباشرة."}
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => handleSave("save")}
              disabled={saving}
              variant={eventType === "public" ? "outline" : "default"}
              className="rounded-full gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
            {eventType === "public" && (
              <Button
                onClick={() => handleSave("submit")}
                disabled={saving || !readiness.ready}
                className="rounded-full gap-2 disabled:opacity-60"
                title={readiness.ready ? undefined : `أكمل البيانات أولاً — الاكتمال ${readiness.score}% والمطلوب ${READINESS_THRESHOLD}%: ${readiness.missing.map(m => m.missingLabel).join("، ")}`}
              >
                {readiness.ready ? <SendIcon className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                حفظ وإرسال للمراجعة
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EditEvent;
