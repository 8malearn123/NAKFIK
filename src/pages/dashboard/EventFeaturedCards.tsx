import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowRight, Plus, Trash2, Upload, Pencil, X, IdCard,
  Image as ImageIcon, Palette, Sparkles,
} from "lucide-react";
import DesignStudio from "@/components/design/DesignStudio";
import CustomTemplateDesigner, { DEFAULT_OVERLAY, type NameOverlay } from "@/components/design/CustomTemplateDesigner";
import { TEMPLATES } from "@/components/design/templates";
import FeaturedCardArt, { type FeaturedCardData } from "@/components/FeaturedCardArt";

interface FeaturedCard extends FeaturedCardData {
  id: string;
  event_id: string;
  display_order: number;
  is_active: boolean;
}

// كل صفة لها قالب تصميم مقترح — اختيار الصفة يطبّق القالب مباشرة (مثل أنواع المناسبات في الدعوات)
const ROLE_PRESETS: { label: string; template: string }[] = [
  { label: "متحدث رئيسي", template: "classic-gold" },
  { label: "متحدث", template: "navy-executive" },
  { label: "راعي", template: "midnight-luxe" },
  { label: "ضيف شرف", template: "royal-purple" },
  { label: "مقدم", template: "modern-bold" },
  { label: "منظم", template: "minimal-mono" },
  { label: "أخرى", template: "desert-sand" },
];

const designFromTemplate = (key: string) => {
  const t = TEMPLATES.find((x) => x.key === key) || TEMPLATES[0];
  return {
    template_key: t.key,
    theme_color: t.theme_color,
    accent_color: t.accent_color,
    background_color: t.background_color,
    text_color: t.text_color,
    heading_font: t.heading_font,
    body_font: t.body_font,
    layout_style: t.layout_style,
    ornament_style: t.ornament_style,
  } as any;
};

const EMPTY_FORM = {
  name: "",
  role_label: "متحدث",
  description: "",
  image_url: "",
  is_active: true,
  design: designFromTemplate("navy-executive"),
  use_custom_template: false,
  custom_template_url: "",
  name_overlay: DEFAULT_OVERLAY as NameOverlay,
};

const EventFeaturedCards = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [eventTitle, setEventTitle] = useState("");
  const [cards, setCards] = useState<FeaturedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<null | "nakfeek" | "custom">(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({ ...EMPTY_FORM });

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, design: designFromTemplate("navy-executive") });
    setEditingId(null);
    setMode(null);
    setShowForm(false);
  };

  const load = async () => {
    if (!eventId) return;
    const [{ data: ev }, { data }] = await Promise.all([
      supabase.from("events").select("title_ar").eq("id", eventId).maybeSingle(),
      (supabase as any)
        .from("event_featured_cards")
        .select("*")
        .eq("event_id", eventId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);
    setEventTitle(ev?.title_ar || "");
    setCards((data as FeaturedCard[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleUpload = async (file: File) => {
    if (!eventId) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `featured/${eventId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("event-covers").upload(path, file);
    if (error) {
      toast.error("فشل رفع الصورة");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("event-covers").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!eventId) return;
    if (!form.name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    setSaving(true);
    const base = {
      event_id: eventId,
      name: form.name.trim(),
      role_label: form.role_label || null,
      description: form.description || null,
      image_url: form.image_url || null,
      is_active: form.is_active,
      display_order: editingId ? cards.find((c) => c.id === editingId)?.display_order || 0 : cards.length,
    };
    const withDesign = {
      ...base,
      design: mode === "nakfeek" ? form.design : null,
      use_custom_template: mode === "custom",
      custom_template_url: mode === "custom" ? form.custom_template_url || null : null,
      name_overlay: mode === "custom" ? form.name_overlay : null,
    };

    const run = (payload: any) =>
      editingId
        ? (supabase as any).from("event_featured_cards").update(payload).eq("id", editingId)
        : (supabase as any).from("event_featured_cards").insert(payload);

    let { error } = await run(withDesign);
    if (error) {
      // أعمدة التصميم غير موجودة بعد في قاعدة البيانات — احفظ الأساسيات فقط
      const retry = await run(base);
      if (!retry.error) {
        toast.warning("حُفظت البطاقة بدون التصميم — شغّل ملف nakfik_featured_card_design.sql في Supabase لتفعيل خيارات التصميم");
        error = null as any;
      }
    }
    setSaving(false);
    if (error) {
      toast.error("فشل الحفظ");
    } else {
      toast.success(editingId ? "تم التحديث" : "تمت الإضافة");
      resetForm();
      load();
    }
  };

  const handleEdit = (card: FeaturedCard) => {
    setEditingId(card.id);
    setForm({
      name: card.name,
      role_label: card.role_label || "متحدث",
      description: card.description || "",
      image_url: card.image_url || "",
      is_active: card.is_active,
      design: card.design || designFromTemplate("navy-executive"),
      use_custom_template: !!card.use_custom_template,
      custom_template_url: card.custom_template_url || "",
      name_overlay: (card.name_overlay as NameOverlay) || DEFAULT_OVERLAY,
    });
    setMode(card.use_custom_template ? "custom" : "nakfeek");
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذه البطاقة؟")) return;
    const { error } = await (supabase as any).from("event_featured_cards").delete().eq("id", id);
    if (error) {
      toast.error("فشل الحذف");
    } else {
      toast.success("تم الحذف");
      setCards(cards.filter((c) => c.id !== id));
    }
  };

  const toggleActive = async (card: FeaturedCard) => {
    const { error } = await (supabase as any)
      .from("event_featured_cards")
      .update({ is_active: !card.is_active })
      .eq("id", card.id);
    if (error) {
      toast.error("فشل التحديث");
    } else {
      setCards(cards.map((c) => (c.id === card.id ? { ...c, is_active: !c.is_active } : c)));
    }
  };

  const previewCard: FeaturedCardData = {
    name: form.name || "اسم الشخص",
    role_label: form.role_label,
    description: form.description,
    image_url: form.image_url || null,
    design: form.design,
    use_custom_template: false,
    custom_template_url: null,
    name_overlay: null,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/events">
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-2xl text-foreground flex items-center gap-2">
              <IdCard className="w-6 h-6 text-primary" /> البطاقات الخاصة
            </h1>
            <p className="text-muted-foreground text-sm">
              {eventTitle && <>فعالية: <span className="font-semibold text-foreground">{eventTitle}</span> · </>}
              تظهر للحاضرين بعد تسجيل الدخول للفعالية
            </p>
          </div>
          {!showForm && (
            <Button className="rounded-full" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" /> إضافة بطاقة
            </Button>
          )}
        </div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/60 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground">{editingId ? "تعديل البطاقة" : "بطاقة جديدة"}</h2>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* اختيار طريقة التصميم — نفس تجربة الدعوات الخاصة */}
            {!mode ? (
              <div className="py-4">
                <p className="text-center text-sm text-muted-foreground mb-6">
                  كيف تريد تجهيز البطاقة؟
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, use_custom_template: false }));
                      setMode("nakfeek");
                    }}
                    className="group relative rounded-2xl border-2 border-border hover:border-primary p-6 text-right transition-all hover:-translate-y-1 hover:shadow-elegant bg-gradient-to-br from-primary/5 via-card to-brand-gold/5"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-brand-mauve flex items-center justify-center text-primary-foreground mb-3">
                      <Palette className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold font-cairo text-lg mb-1">خيارات نكفيك</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      اختر من قوالب جاهزة احترافية حسب الصفة (متحدث، راعي، ضيف شرف...) — ألوان وخطوط وإطارات مُعدّة مسبقاً مع تخصيص كامل.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, use_custom_template: true }));
                      setMode("custom");
                    }}
                    className="group relative rounded-2xl border-2 border-border hover:border-brand-gold p-6 text-right transition-all hover:-translate-y-1 hover:shadow-elegant bg-gradient-to-br from-brand-gold/10 via-card to-brand-brick/5"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-gold to-brand-brick flex items-center justify-center text-white mb-3">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold font-cairo text-lg mb-1">تصميمي الخاص</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      ارفع تصميم البطاقة الجاهز، وحدّد موضع الاسم ليُكتب تلقائياً على البطاقة.
                    </p>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Tabs defaultValue="basic" key={mode}>
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="basic">الأساسيات</TabsTrigger>
                    {mode === "nakfeek" ? (
                      <TabsTrigger value="design"><Palette className="w-3 h-3 ml-1" /> التصميم</TabsTrigger>
                    ) : (
                      <TabsTrigger value="custom"><ImageIcon className="w-3 h-3 ml-1" /> تصميمي</TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="space-y-1.5">
                      <Label>الاسم *</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="مثال: د. محمد العتيبي"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>التصنيف / الصفة</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                        {ROLE_PRESETS.map((r) => {
                          const t = TEMPLATES.find((x) => x.key === r.template)!;
                          const active = form.role_label === r.label;
                          return (
                            <button
                              key={r.label}
                              type="button"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  role_label: r.label,
                                  // اختيار الصفة يقترح قالباً مناسباً (في وضع خيارات نكفيك فقط)
                                  design: mode === "nakfeek" ? { ...f.design, ...designFromTemplate(r.template) } : f.design,
                                }))
                              }
                              style={active ? {
                                borderColor: t.theme_color,
                                background: `linear-gradient(135deg, ${t.theme_color}15, ${t.accent_color}20)`,
                              } : undefined}
                              className={`rounded-xl border-2 p-2.5 text-xs flex flex-col items-center gap-1.5 transition-all ${
                                active ? "font-bold scale-[1.03]" : "border-border/60 hover:border-primary/40 bg-card"
                              }`}
                            >
                              <span className="flex h-4 w-8 rounded overflow-hidden border">
                                <span className="w-1/2" style={{ background: t.theme_color }} />
                                <span className="w-1/2" style={{ background: t.accent_color }} />
                              </span>
                              {r.label}
                            </button>
                          );
                        })}
                      </div>
                      {mode === "nakfeek" && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> اختيار الصفة يطبّق قالباً مقترحاً — تقدر تغيّره بالكامل من تبويب التصميم.
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label>الوصف</Label>
                      <Textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="نبذة قصيرة، خبرات، أو موضوع المداخلة..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>الصورة الشخصية</Label>
                      <div className="flex items-center gap-3">
                        {form.image_url ? (
                          <img src={form.image_url} alt="" className="w-20 h-20 rounded-xl object-cover border border-border" />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                          />
                          <span className="inline-flex items-center gap-2 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-2 rounded-full">
                            <Upload className="w-4 h-4" /> {uploading ? "جارٍ الرفع..." : "رفع صورة"}
                          </span>
                        </label>
                        {form.image_url && (
                          <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, image_url: "" })}>
                            إزالة
                          </Button>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {mode === "nakfeek" && (
                    <TabsContent value="design" className="mt-4">
                      <DesignStudio
                        value={form.design}
                        onChange={(patch) => setForm((f) => ({ ...f, design: { ...f.design, ...patch } }))}
                        previewTitle={form.name || "اسم الشخص"}
                        previewSubtitle={form.role_label || ""}
                        previewBody={form.description || ""}
                        uploadPathPrefix={`featured/${eventId}`}
                        previewNode={<FeaturedCardArt card={previewCard} />}
                      />
                    </TabsContent>
                  )}

                  {mode === "custom" && (
                    <TabsContent value="custom" className="mt-4 space-y-3">
                      <div className="bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/30 rounded-2xl p-3">
                        <Label className="text-sm font-bold flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4" /> تصميمي الخاص
                        </Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          ارفع تصميم البطاقة الجاهز وحدّد موضع الاسم — يُطبع على البطاقة تلقائياً.
                        </p>
                      </div>
                      <CustomTemplateDesigner
                        templateUrl={form.custom_template_url || null}
                        overlay={form.name_overlay || DEFAULT_OVERLAY}
                        onTemplateChange={(url) => setForm((f) => ({ ...f, custom_template_url: url || "" }))}
                        onOverlayChange={(o) => setForm((f) => ({ ...f, name_overlay: o }))}
                        uploadPathPrefix={`featured/${eventId}`}
                      />
                    </TabsContent>
                  )}
                </Tabs>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                    />
                    <Label className="text-sm">نشطة (تظهر للحاضرين)</Label>
                  </div>
                  <div className="flex gap-2">
                    {!editingId && (
                      <Button variant="ghost" onClick={() => setMode(null)}>← رجوع</Button>
                    )}
                    <Button variant="outline" onClick={resetForm}>إلغاء</Button>
                    <Button onClick={handleSubmit} disabled={saving || uploading}>
                      {saving ? "جارٍ الحفظ..." : editingId ? "تحديث" : "إضافة"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-card border border-border/50 animate-pulse" />
            ))
          ) : cards.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-card rounded-2xl border border-border/50">
              <IdCard className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground font-semibold">لا توجد بطاقات</p>
              <p className="text-muted-foreground text-sm">أضف أول بطاقة (متحدث، راعي، ضيف شرف...)</p>
            </div>
          ) : (
            cards.map((card) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-card rounded-2xl border overflow-hidden hover:shadow-md transition-all ${
                  card.is_active ? "border-border/60" : "border-dashed border-border/40 opacity-70"
                }`}
              >
                <div className="p-3">
                  <FeaturedCardArt card={card} />
                </div>
                <div className="px-4 pb-3 flex items-center gap-1 border-t border-border/40 pt-2">
                  <Switch checked={card.is_active} onCheckedChange={() => toggleActive(card)} />
                  <Button variant="ghost" size="sm" className="text-xs flex-1" onClick={() => handleEdit(card)}>
                    <Pencil className="w-3.5 h-3.5" /> تعديل
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive"
                    onClick={() => handleDelete(card.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EventFeaturedCards;
