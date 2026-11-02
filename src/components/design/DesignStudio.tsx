// Reusable design editor: templates → layout → ornament → colors → fonts → bg image.
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronDown, Sparkles, Layout, Palette as PaletteIcon, Image as ImageIcon, Upload, Loader2, X, Check, SlidersHorizontal } from "lucide-react";
import { TEMPLATES, FONTS, LAYOUTS, ORNAMENTS, FRAMES, CORNERS, BG_STYLES, ALIGNMENTS, DEFAULT_EXTRAS, type DesignTemplate } from "./templates";
import { Slider } from "@/components/ui/slider";
import DesignPreview, { type DesignValue } from "./DesignPreview";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatPercent } from "@/lib/format";
import { toast } from "sonner";

// حالة الخيار المحدد موحدة في كل مربعات الاختيار
const choiceCls = (active: boolean) =>
  `rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${active ? "bg-secondary font-semibold text-primary ring-1 ring-inset ring-primary" : "bg-muted/50 hover:bg-muted"}`;

const STUDIO_TABS = [
  { value: "templates", label: "القوالب", Icon: Sparkles },
  { value: "layout", label: "التخطيط", Icon: Layout },
  { value: "colors", label: "الألوان", Icon: PaletteIcon },
  { value: "custom", label: "تخصيص", Icon: SlidersHorizontal },
  { value: "media", label: "الوسائط", Icon: ImageIcon },
];

type Props = {
  value: DesignValue & { template_key?: string | null };
  onChange: (patch: Partial<DesignValue & { template_key?: string | null }>) => void;
  mode?: "invitation" | "certificate";
  previewTitle: string;
  previewSubtitle?: string;
  previewBody?: string;
  previewFooter?: string;
  previewGuestName?: string;
  bucket?: string;
  uploadPathPrefix?: string;
  // معاينة بديلة (مثل البطاقات الخاصة) بدل معاينة الدعوة الافتراضية
  previewNode?: React.ReactNode;
};

export default function DesignStudio({
  value, onChange, mode = "invitation",
  previewTitle, previewSubtitle, previewBody, previewFooter, previewGuestName,
  bucket = "event-covers", uploadPathPrefix = "designs", previewNode,
}: Props) {
  const { user } = useAuth();
  const [advanced, setAdvanced] = useState(false);
  const [uploading, setUploading] = useState(false);

  const applyTemplate = (t: DesignTemplate) => {
    onChange({
      template_key: t.key,
      theme_color: t.theme_color,
      accent_color: t.accent_color,
      background_color: t.background_color,
      text_color: t.text_color,
      heading_font: t.heading_font,
      body_font: t.body_font,
      layout_style: t.layout_style,
      ornament_style: t.ornament_style,
    });
  };

  const handleUpload = async (file: File, field: "background_image_url" | "logo_url" = "background_image_url") => {
    if (!user) return;
    if (!file.type.startsWith("image/")) return toast.error("الرجاء اختيار صورة");
    if (file.size > 5 * 1024 * 1024) return toast.error("الحد الأقصى 5MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${uploadPathPrefix}/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange({ [field]: data.publicUrl } as any);
      toast.success("تم رفع الصورة");
    } catch (e: any) {
      toast.error(e.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* Left: controls */}
      <div className="min-w-0">
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            {STUDIO_TABS.map(({ value: tab, label, Icon }) => (
              <TabsTrigger key={tab} value={tab} className="gap-1.5 px-1 text-[13px] sm:px-2">
                <Icon className="hidden h-3.5 w-3.5 sm:block" /> {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Templates */}
          <TabsContent value="templates" className="mt-4 space-y-3">
            <p className="text-[13px] leading-5 text-muted-foreground">ابدأ بقالب جاهز ثم خصّصه — كل قالب يطبّق الألوان والخطوط والتخطيط والزخرفة دفعة واحدة.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TEMPLATES.map((t) => {
                const active = value.template_key === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => applyTemplate(t)}
                    className={`relative overflow-hidden rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "ring-1 ring-border hover:ring-primary/40"}`}
                  >
                    <div className="relative aspect-[3/4]" style={{ background: `linear-gradient(160deg, ${t.theme_color}, ${t.theme_color}dd)` }}>
                      <div className="absolute inset-3 border" style={{ borderColor: t.accent_color + "aa" }} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center" style={{ color: t.text_color, fontFamily: t.heading_font }}>
                        <div className="mb-1.5 h-px w-8" style={{ background: t.accent_color }} />
                        <p className="text-xs opacity-80" style={{ color: t.accent_color }}>INVITATION</p>
                        <p className="mt-1 text-sm font-bold">دعوة</p>
                        <div className="mt-1.5 h-px w-8" style={{ background: t.accent_color }} />
                      </div>
                      {active && (
                        <div className="absolute start-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <div className="bg-card px-2 py-2">
                      <p className="truncate text-xs font-semibold">{t.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* Layout + Ornament */}
          <TabsContent value="layout" className="mt-4 space-y-5">
            <div className="space-y-2">
              <Label>نمط التخطيط</Label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {LAYOUTS.map((l) => {
                  const active = value.layout_style === l.key;
                  return (
                    <button
                      key={l.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChange({ layout_style: l.key })}
                      className={`${choiceCls(active)} p-3 text-start`}
                    >
                      <LayoutIcon name={l.key} />
                      <p className="mt-2 text-xs font-semibold leading-[18px]">{l.label}</p>
                      <p className="text-xs font-normal leading-[18px] text-muted-foreground">{l.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>الزخرفة</Label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {ORNAMENTS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    aria-pressed={value.ornament_style === o.key}
                    onClick={() => onChange({ ornament_style: o.key })}
                    className={`${choiceCls(value.ornament_style === o.key)} h-10 px-2 text-xs`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>خط العناوين</Label>
                <Select value={value.heading_font} onValueChange={(v) => onChange({ heading_font: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>خط النصوص</Label>
                <Select value={value.body_font} onValueChange={(v) => onChange({ body_font: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Colors */}
          <TabsContent value="colors" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorRow label="اللون الأساسي" value={value.theme_color} onChange={(v) => onChange({ theme_color: v })} />
              <ColorRow label="لون التمييز (الذهبي / الإطار)" value={value.accent_color} onChange={(v) => onChange({ accent_color: v })} />
            </div>
            <button type="button" onClick={() => setAdvanced(!advanced)} className="flex items-center gap-1.5 text-[13px] font-semibold leading-5 text-primary">
              <ChevronDown className={`h-4 w-4 transition-transform ${advanced ? "rotate-180" : ""}`} /> خيارات متقدمة
            </button>
            {advanced && (
              <div className="grid gap-4 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
                <ColorRow label="لون الخلفية (للقوالب الفاتحة)" value={value.background_color || "#FFFFFF"} onChange={(v) => onChange({ background_color: v })} />
                <ColorRow label="لون النص الأساسي" value={value.text_color} onChange={(v) => onChange({ text_color: v })} />
              </div>
            )}
            {/* Quick palette suggestions */}
            <div className="space-y-2">
              <Label>اقتراحات سريعة</Label>
              <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
                {QUICK_PALETTES.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onChange({ theme_color: p[0], accent_color: p[1] })}
                    className="flex h-9 overflow-hidden rounded-lg ring-1 ring-border transition hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title={`${p[0]} + ${p[1]}`}
                  >
                    <span className="flex-1" style={{ background: p[0] }} />
                    <span className="flex-1" style={{ background: p[1] }} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>نمط الخلفية</Label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {BG_STYLES.map((b) => {
                  const active = (value.bg_style || "gradient") === b.key;
                  return (
                    <button key={b.key} type="button" aria-pressed={active} onClick={() => onChange({ bg_style: b.key } as any)}
                      className={`${choiceCls(active)} h-10 px-2 text-xs`}>
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Customize — التخصيص المتقدم */}
          <TabsContent value="custom" className="mt-4 space-y-5">
            <div className="space-y-2">
              <Label>إطار الدعوة</Label>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                {FRAMES.map((fr) => {
                  const active = (value.frame_style || "none") === fr.key;
                  return (
                    <button key={fr.key} type="button" aria-pressed={active} onClick={() => onChange({ frame_style: fr.key } as any)}
                      className={`${choiceCls(active)} p-2 text-center`}>
                      <FramePreview kind={fr.key} accent={value.accent_color} />
                      <p className="mt-1.5 text-xs font-semibold">{fr.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>شكل الزوايا</Label>
                <div className="grid grid-cols-3 gap-2.5">
                  {CORNERS.map((c) => {
                    const active = (value.corner_style || "rounded") === c.key;
                    return (
                      <button key={c.key} type="button" aria-pressed={active} onClick={() => onChange({ corner_style: c.key } as any)}
                        className={`${choiceCls(active)} h-10 px-2 text-xs`}>
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>محاذاة النصوص</Label>
                <div className="grid grid-cols-3 gap-2.5">
                  {ALIGNMENTS.map((a) => {
                    const active = (value.text_align || "center") === a.key;
                    return (
                      <button key={a.key} type="button" aria-pressed={active} onClick={() => onChange({ text_align: a.key } as any)}
                        className={`${choiceCls(active)} h-10 px-2 text-xs`}>
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <SliderRow label="حجم العنوان" value={value.heading_scale ?? 1} min={0.7} max={1.5} step={0.05}
                onChange={(v) => onChange({ heading_scale: v } as any)} />
              <SliderRow label="حجم النصوص" value={value.body_scale ?? 1} min={0.7} max={1.4} step={0.05}
                onChange={(v) => onChange({ body_scale: v } as any)} />
              <SliderRow label="المسافات بين العناصر" value={value.spacing_scale ?? 1} min={0.6} max={1.6} step={0.05}
                onChange={(v) => onChange({ spacing_scale: v } as any)} />
              <SliderRow label="شفافية المحتوى" value={value.content_opacity ?? 1} min={0.5} max={1} step={0.05}
                onChange={(v) => onChange({ content_opacity: v } as any)} />
            </div>

            <button type="button" onClick={() => onChange({ ...DEFAULT_EXTRAS, logo_url: value.logo_url } as any)}
              className="text-[13px] font-semibold leading-5 text-primary">
              إعادة ضبط التخصيص للوضع الافتراضي
            </button>
          </TabsContent>

          {/* Media */}
          <TabsContent value="media" className="mt-4 space-y-5">
            <div className="space-y-2">
              <Label>صورة الخلفية</Label>
              <div className="flex items-start gap-3">
                {value.background_image_url ? (
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-muted/50">
                    <img src={value.background_image_url} alt="bg" className="h-full w-full object-cover" />
                    <button type="button" aria-label="إزالة الصورة" onClick={() => onChange({ background_image_url: null })} className="absolute end-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md bg-foreground/70 text-white transition-colors hover:bg-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className={`flex h-28 w-28 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-input bg-muted/50 transition-colors ${uploading ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}>
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                    <span className="mt-1 text-xs text-muted-foreground">{uploading ? "جاري الرفع" : "ارفع صورة"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
                  </label>
                )}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Input dir="ltr" value={value.background_image_url || ""} onChange={(e) => onChange({ background_image_url: e.target.value })} placeholder="أو الصق رابط https://..." />
                  <p className="text-xs leading-[18px] text-muted-foreground">سيتم وضع طبقة لون شفافة فوق الصورة لضمان قراءة النص.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-5">
              <Label>الشعار أو الختم الخاص</Label>
              <div className="flex items-start gap-3">
                {value.logo_url ? (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted/50">
                    <img src={value.logo_url} alt="logo" className="h-full w-full object-contain" />
                    <button type="button" aria-label="إزالة الشعار" onClick={() => onChange({ logo_url: null } as any)} className="absolute end-1 top-1 grid h-6 w-6 place-items-center rounded-md bg-foreground/70 text-white transition-colors hover:bg-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className={`flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-input bg-muted/50 transition-colors ${uploading ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
                    <span className="mt-1 text-xs text-muted-foreground">شعار</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const fl = e.target.files?.[0]; if (fl) handleUpload(fl, "logo_url"); e.target.value = ""; }} />
                  </label>
                )}
                <p className="min-w-0 flex-1 text-xs leading-[18px] text-muted-foreground">يظهر الشعار أعلى الدعوة — يفضّل صورة بخلفية شفافة (PNG).</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right: live preview */}
      <div className="min-w-0 self-start lg:sticky lg:top-4">
        <p className="mb-2 text-center text-xs text-muted-foreground">معاينة مباشرة</p>
        {previewNode ? previewNode : <DesignPreview
          design={value}
          title={previewTitle}
          subtitle={previewSubtitle}
          body={previewBody}
          footer={previewFooter}
          guestName={previewGuestName}
          mode={mode}
        />}
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input type="color" className="h-10 w-14 flex-none cursor-pointer p-1" value={value} onChange={(e) => onChange(e.target.value)} />
        <Input dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function LayoutIcon({ name }: { name: string }) {
  const cls = "h-12 w-full rounded-md border border-border";
  if (name === "classic") return (
    <div className={`${cls} flex flex-col items-center justify-center gap-1 bg-card`}>
      <div className="h-px w-8 bg-foreground/40" />
      <div className="h-1.5 w-10 bg-foreground/70 rounded" />
      <div className="h-px w-8 bg-foreground/40" />
    </div>
  );
  if (name === "framed") return (
    <div className={`${cls} bg-card p-1.5`}>
      <div className="w-full h-full border border-foreground/40 flex items-center justify-center">
        <div className="h-1.5 w-6 bg-foreground/70 rounded" />
      </div>
    </div>
  );
  if (name === "split") return (
    <div className={`${cls} flex flex-col overflow-hidden bg-card`}>
      <div className="h-1/2 bg-foreground/70 flex items-center justify-center"><div className="h-1 w-6 bg-background rounded" /></div>
      <div className="flex-1 flex items-center justify-center"><div className="h-1 w-6 bg-foreground/40 rounded" /></div>
    </div>
  );
  return (
    <div className={`${cls} flex items-center justify-center bg-card`}>
      <div className="h-1 w-8 bg-foreground/60 rounded" />
    </div>
  );
}

const QUICK_PALETTES: [string, string][] = [
  ["#0F1B3D", "#C9A84C"],
  ["#492C5A", "#CC8E3D"],
  ["#7B2C50", "#E8C5D0"],
  ["#064E3B", "#C9A84C"],
  ["#A03C4A", "#E8B84A"],
  ["#0D0D0D", "#C9A84C"],
  ["#006962", "#7DD3FC"],
  ["#1E3A5F", "#C9A84C"],
];

function SliderRow({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">{formatPercent(Math.round(value * 100))}</span>
      </div>
      <Slider dir="rtl" value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function FramePreview({ kind, accent }: { kind: string; accent: string }) {
  const base = "relative aspect-[3/4] w-full overflow-hidden rounded-md bg-card";
  if (kind === "none") return <div className={base} />;
  if (kind === "simple") return (
    <div className={base}><div className="absolute inset-1 border" style={{ borderColor: accent }} /></div>
  );
  if (kind === "gold") return (
    <div className={base}>
      <div className="absolute inset-1 border-2" style={{ borderColor: "#C9A84C" }} />
      <div className="absolute inset-2 border" style={{ borderColor: "#E8D48B" }} />
    </div>
  );
  if (kind === "silver") return (
    <div className={base}>
      <div className="absolute inset-1 border-2" style={{ borderColor: "#9BA6B2" }} />
      <div className="absolute inset-2 border" style={{ borderColor: "#DDE3EA" }} />
    </div>
  );
  return (
    <div className={base}>
      <div className="absolute inset-0.5 border-2" style={{ borderColor: accent }} />
      <div className="absolute inset-1.5 border" style={{ borderColor: accent + "88" }} />
      <div className="absolute inset-2.5 border" style={{ borderColor: accent + "44" }} />
    </div>
  );
}
