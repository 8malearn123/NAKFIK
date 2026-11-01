import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
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
  Image as ImageIcon, Palette,
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

  const tagline = "تظهر للحاضرين بعد تسجيل الدخول للفعالية";
  const modeTile = "flex flex-col rounded-xl bg-muted/50 p-5 text-start transition-colors hover:bg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <Link to="/dashboard/events" className="inline-flex items-center gap-1.5 text-[13px] font-semibold leading-5 text-primary">
            <ArrowRight className="h-4 w-4" /> العودة لفعالياتي
          </Link>
          <PageHeader
            title="البطاقات الخاصة"
            description={eventTitle ? `${eventTitle}، ${tagline}` : tagline}
            actions={!showForm && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" /> إضافة بطاقة
              </Button>
            )}
          />
        </div>

        {showForm && (
          <Panel
            title={editingId ? "تعديل البطاقة" : "بطاقة جديدة"}
            bodyClassName="space-y-4"
            actions={
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={resetForm} aria-label="إغلاق">
                <X className="h-4 w-4" />
              </Button>
            }
          >
            {/* اختيار طريقة التصميم — نفس تجربة الدعوات الخاصة */}
            {!mode ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">كيف تريد تجهيز البطاقة؟</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, use_custom_template: false }));
                      setMode("nakfeek");
                    }}
                    className={modeTile}
                  >
                    <span className="mb-3 grid h-9 w-9 place-items-center rounded-[10px] bg-secondary text-primary">
                      <Palette className="h-[18px] w-[18px]" />
                    </span>
                    <span className="mb-1 block text-[15px] font-bold leading-6">خيارات نكفيك</span>
                    <span className="block text-[13px] leading-5 text-muted-foreground">
                      اختر من قوالب جاهزة احترافية حسب الصفة (متحدث، راعي، ضيف شرف...)، ألوان وخطوط وإطارات مُعدّة مسبقاً مع تخصيص كامل.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, use_custom_template: true }));
                      setMode("custom");
                    }}
                    className={modeTile}
                  >
                    <span className="mb-3 grid h-9 w-9 place-items-center rounded-[10px] bg-secondary text-primary">
                      <ImageIcon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="mb-1 block text-[15px] font-bold leading-6">تصميمي الخاص</span>
                    <span className="block text-[13px] leading-5 text-muted-foreground">
                      ارفع تصميم البطاقة الجاهز، وحدّد موضع الاسم ليُكتب تلقائياً على البطاقة.
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Tabs defaultValue="basic" key={mode}>
                  <TabsList>
                    <TabsTrigger value="basic">الأساسيات</TabsTrigger>
                    {mode === "nakfeek" ? (
                      <TabsTrigger value="design" className="gap-1.5"><Palette className="h-3.5 w-3.5" /> التصميم</TabsTrigger>
                    ) : (
                      <TabsTrigger value="custom" className="gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> تصميمي</TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="basic" className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="card-name">الاسم *</Label>
                      <Input
                        id="card-name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="مثال: د. محمد العتيبي"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>التصنيف / الصفة</Label>
                      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
                        {ROLE_PRESETS.map((r) => {
                          const t = TEMPLATES.find((x) => x.key === r.template)!;
                          const active = form.role_label === r.label;
                          return (
                            <button
                              key={r.label}
                              type="button"
                              aria-pressed={active}
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  role_label: r.label,
                                  // اختيار الصفة يقترح قالباً مناسباً (في وضع خيارات نكفيك فقط)
                                  design: mode === "nakfeek" ? { ...f.design, ...designFromTemplate(r.template) } : f.design,
                                }))
                              }
                              className={`flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                active ? "bg-secondary font-bold text-primary ring-2 ring-primary" : "bg-muted/50 hover:bg-secondary"
                              }`}
                            >
                              <span className="flex h-4 w-8 overflow-hidden rounded">
                                <span className="w-1/2" style={{ background: t.theme_color }} />
                                <span className="w-1/2" style={{ background: t.accent_color }} />
                              </span>
                              {r.label}
                            </button>
                          );
                        })}
                      </div>
                      {mode === "nakfeek" && (
                        <p className="text-xs text-muted-foreground">
                          اختيار الصفة يطبّق قالباً مقترحاً، تقدر تغيّره بالكامل من تبويب التصميم.
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="card-description">الوصف</Label>
                      <Textarea
                        id="card-description"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="نبذة قصيرة، خبرات، أو موضوع المداخلة..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>الصورة الشخصية</Label>
                      <div className="flex flex-wrap items-center gap-3">
                        {form.image_url ? (
                          <img src={form.image_url} alt="" className="h-20 w-20 rounded-xl object-cover" />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted/50">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <Button asChild variant="soft" size="sm">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                            />
                            <Upload className="h-4 w-4" /> {uploading ? "جارٍ الرفع..." : "رفع صورة"}
                          </label>
                        </Button>
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
                      <div className="rounded-xl bg-muted/50 p-4">
                        <Label className="text-sm font-bold">تصميمي الخاص</Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          ارفع تصميم البطاقة الجاهز وحدّد موضع الاسم، يُطبع على البطاقة تلقائياً.
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

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="card-active"
                      checked={form.is_active}
                      onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                    />
                    <Label htmlFor="card-active" className="text-sm">نشطة (تظهر للحاضرين)</Label>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <Button onClick={handleSubmit} disabled={saving || uploading}>
                      {saving ? "جارٍ الحفظ..." : editingId ? "تحديث" : "إضافة"}
                    </Button>
                    <Button variant="outline" onClick={resetForm}>إلغاء</Button>
                    {!editingId && (
                      <Button variant="ghost" onClick={() => setMode(null)}><ArrowRight className="h-4 w-4" /> رجوع</Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </Panel>
        )}

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />
            ))
          ) : cards.length === 0 ? (
            <div className="col-span-full rounded-2xl bg-card shadow-soft">
              <EmptyState
                icon={IdCard}
                title="لا توجد بطاقات"
                description="أضف أول بطاقة (متحدث، راعي، ضيف شرف...)"
                action={!showForm ? <Button variant="soft" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> إضافة بطاقة</Button> : undefined}
              />
            </div>
          ) : (
            cards.map((card) => (
              <article key={card.id} className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-soft">
                <div className={`flex-1 p-4 ${card.is_active ? "" : "opacity-60"}`}>
                  <FeaturedCardArt card={card} />
                </div>
                <div className="flex items-center gap-2 border-t border-border px-4 py-3">
                  <Switch checked={card.is_active} onCheckedChange={() => toggleActive(card)} aria-label="نشطة (تظهر للحاضرين)" />
                  <span className="text-xs text-muted-foreground">{card.is_active ? "نشطة" : "متوقفة"}</span>
                  <Button variant="soft" size="sm" className="ms-auto" onClick={() => handleEdit(card)}>
                    <Pencil className="h-4 w-4" /> تعديل
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(card.id)}
                    aria-label="حذف البطاقة"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EventFeaturedCards;
