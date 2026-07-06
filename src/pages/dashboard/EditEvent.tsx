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
import { ArrowRight, Save, Eye, Trash2, AlertCircle, Upload, Loader2 } from "lucide-react";

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
      setLoading(false);
    })();
  }, [eventId, navigate]);

  const willRequireReview = eventType === "public" && currentStatus !== "draft";

  const handleSave = async () => {
    if (!titleAr.trim() || !startDate) { toast.error("العنوان وتاريخ البداية إلزامية"); return; }
    if (!eventId || !organization) return;
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

      const newStatus = willRequireReview ? "pending_review" : currentStatus;

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
      if (willRequireReview) {
        toast.success("تم حفظ التعديلات وإرسال الفعالية لمراجعة إدارة نكفيك تيكت");
      } else {
        toast.success("تم حفظ التعديلات بنجاح");
      }
      navigate("/dashboard/events");
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

        {willRequireReview && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-200">سيتم إعادة المراجعة</p>
              <p className="text-amber-700 dark:text-amber-300/90 text-xs mt-0.5">
                أي تعديل على فعالية عامة سيُعيدها إلى حالة "قيد المراجعة" من قبل إدارة نكفيك تيكت قبل النشر مجدداً.
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
              <img src={coverUrl} alt="cover" className="w-full max-w-md rounded-xl border border-border/50" />
            )}
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-border cursor-pointer hover:bg-muted/30 w-fit">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{coverFile ? coverFile.name : "اختر صورة جديدة"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>

        <div className="sticky bottom-4 bg-card border border-border/50 rounded-2xl p-4 flex items-center justify-between gap-2 shadow-lg">
          <p className="text-xs text-muted-foreground">
            {willRequireReview ? "ستُرسل الفعالية لمراجعة إدارة نكفيك تيكت بعد الحفظ." : "ستُحفظ التعديلات مباشرة."}
          </p>
          <Button onClick={handleSave} disabled={saving} className="rounded-full gap-2">
            <Save className="w-4 h-4" />
            {saving ? "جاري الحفظ..." : willRequireReview ? "حفظ وإرسال للمراجعة" : "حفظ التعديلات"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EditEvent;
