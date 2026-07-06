// Reusable design editor: templates → layout → ornament → colors → fonts → bg image.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronDown, Sparkles, Layout, Frame, Type, Palette as PaletteIcon, Image as ImageIcon, Upload, Loader2, X, Check } from "lucide-react";
import { TEMPLATES, FONTS, LAYOUTS, ORNAMENTS, type DesignTemplate } from "./templates";
import DesignPreview, { type DesignValue } from "./DesignPreview";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
};

export default function DesignStudio({
  value, onChange, mode = "invitation",
  previewTitle, previewSubtitle, previewBody, previewFooter, previewGuestName,
  bucket = "event-covers", uploadPathPrefix = "designs",
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

  const handleUpload = async (file: File) => {
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
      onChange({ background_image_url: data.publicUrl });
      toast.success("تم رفع الصورة");
    } catch (e: any) {
      toast.error(e.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* Left: controls */}
      <div className="space-y-5">
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="templates"><Sparkles className="w-3.5 h-3.5 ml-1" /> القوالب</TabsTrigger>
            <TabsTrigger value="layout"><Layout className="w-3.5 h-3.5 ml-1" /> التخطيط</TabsTrigger>
            <TabsTrigger value="colors"><PaletteIcon className="w-3.5 h-3.5 ml-1" /> الألوان</TabsTrigger>
            <TabsTrigger value="media"><ImageIcon className="w-3.5 h-3.5 ml-1" /> الوسائط</TabsTrigger>
          </TabsList>

          {/* Templates */}
          <TabsContent value="templates" className="mt-4">
            <p className="text-xs text-muted-foreground mb-3">ابدأ بقالب جاهز ثم خصّصه — كل قالب يطبّق الألوان والخطوط والتخطيط والزخرفة دفعة واحدة.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TEMPLATES.map((t) => {
                const active = value.template_key === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className={`relative rounded-xl overflow-hidden border-2 transition group ${active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"}`}
                  >
                    <div className="aspect-[3/4] relative" style={{ background: `linear-gradient(160deg, ${t.theme_color}, ${t.theme_color}dd)` }}>
                      <div className="absolute inset-3 border" style={{ borderColor: t.accent_color + "aa" }} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2" style={{ color: t.text_color, fontFamily: t.heading_font }}>
                        <div className="h-px w-8 mb-1.5" style={{ background: t.accent_color }} />
                        <p className="text-[10px] tracking-widest opacity-80" style={{ color: t.accent_color }}>INVITATION</p>
                        <p className="text-sm font-bold mt-1">دعوة</p>
                        <div className="h-px w-8 mt-1.5" style={{ background: t.accent_color }} />
                      </div>
                      {active && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-card">
                      <p className="text-[11px] font-semibold truncate">{t.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* Layout + Ornament */}
          <TabsContent value="layout" className="mt-4 space-y-5">
            <div>
              <Label className="mb-2 block">نمط التخطيط</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => onChange({ layout_style: l.key })}
                    className={`p-3 rounded-lg border-2 text-right transition ${value.layout_style === l.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  >
                    <LayoutIcon name={l.key} />
                    <p className="text-xs font-semibold mt-2">{l.label}</p>
                    <p className="text-[10px] text-muted-foreground">{l.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">الزخرفة</Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {ORNAMENTS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => onChange({ ornament_style: o.key })}
                    className={`px-2 py-2 rounded-lg border text-xs transition ${value.ornament_style === o.key ? "border-primary bg-primary/5 font-semibold" : "border-border hover:border-primary/40"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label><Type className="w-3 h-3 inline ml-1" /> خط العناوين</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm mt-1" value={value.heading_font} onChange={(e) => onChange({ heading_font: e.target.value })}>
                  {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <Label><Type className="w-3 h-3 inline ml-1" /> خط النصوص</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm mt-1" value={value.body_font} onChange={(e) => onChange({ body_font: e.target.value })}>
                  {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>
          </TabsContent>

          {/* Colors */}
          <TabsContent value="colors" className="mt-4 space-y-3">
            <ColorRow label="اللون الأساسي" value={value.theme_color} onChange={(v) => onChange({ theme_color: v })} />
            <ColorRow label="لون التمييز (الذهبي / الإطار)" value={value.accent_color} onChange={(v) => onChange({ accent_color: v })} />
            <button type="button" onClick={() => setAdvanced(!advanced)} className="text-xs text-primary flex items-center gap-1">
              <ChevronDown className={`w-3 h-3 transition ${advanced ? "rotate-180" : ""}`} /> خيارات متقدمة
            </button>
            {advanced && (
              <div className="space-y-3 pt-2 border-t">
                <ColorRow label="لون الخلفية (للقوالب الفاتحة)" value={value.background_color || "#FFFFFF"} onChange={(v) => onChange({ background_color: v })} />
                <ColorRow label="لون النص الأساسي" value={value.text_color} onChange={(v) => onChange({ text_color: v })} />
              </div>
            )}
            {/* Quick palette suggestions */}
            <div className="pt-3">
              <Label className="text-xs">اقتراحات سريعة</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {QUICK_PALETTES.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onChange({ theme_color: p[0], accent_color: p[1] })}
                    className="flex h-8 rounded-md overflow-hidden border hover:scale-105 transition"
                    title={`${p[0]} + ${p[1]}`}
                  >
                    <span className="w-8" style={{ background: p[0] }} />
                    <span className="w-8" style={{ background: p[1] }} />
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Media */}
          <TabsContent value="media" className="mt-4 space-y-3">
            <Label>صورة الخلفية</Label>
            <div className="flex gap-3 items-start">
              {value.background_image_url ? (
                <div className="relative w-28 h-28 rounded-lg overflow-hidden border shrink-0 group">
                  <img src={value.background_image_url} alt="bg" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => onChange({ background_image_url: null })} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              ) : (
                <label className={`w-28 h-28 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer shrink-0 transition ${uploading ? "opacity-50 pointer-events-none" : "hover:border-primary hover:bg-primary/5"}`}>
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                  <span className="text-[10px] text-muted-foreground mt-1">{uploading ? "جاري الرفع" : "ارفع صورة"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
                </label>
              )}
              <div className="flex-1 space-y-1">
                <Input dir="ltr" value={value.background_image_url || ""} onChange={(e) => onChange({ background_image_url: e.target.value })} placeholder="أو الصق رابط https://..." className="text-xs" />
                <p className="text-[11px] text-muted-foreground">سيتم وضع طبقة لون شفافة فوق الصورة لضمان قراءة النص.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right: live preview */}
      <div className="lg:sticky lg:top-4 self-start">
        <p className="text-xs text-muted-foreground mb-2 text-center">معاينة مباشرة</p>
        <DesignPreview
          design={value}
          title={previewTitle}
          subtitle={previewSubtitle}
          body={previewBody}
          footer={previewFooter}
          guestName={previewGuestName}
          mode={mode}
        />
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 items-center mt-1">
        <Input type="color" className="w-14 h-10 p-1 cursor-pointer" value={value} onChange={(e) => onChange(e.target.value)} />
        <Input dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
      </div>
    </div>
  );
}

function LayoutIcon({ name }: { name: string }) {
  const cls = "w-full h-12 rounded border";
  if (name === "classic") return (
    <div className={`${cls} bg-muted flex flex-col items-center justify-center gap-1`}>
      <div className="h-px w-8 bg-foreground/40" />
      <div className="h-1.5 w-10 bg-foreground/70 rounded" />
      <div className="h-px w-8 bg-foreground/40" />
    </div>
  );
  if (name === "framed") return (
    <div className={`${cls} bg-muted p-1.5`}>
      <div className="w-full h-full border border-foreground/40 flex items-center justify-center">
        <div className="h-1.5 w-6 bg-foreground/70 rounded" />
      </div>
    </div>
  );
  if (name === "split") return (
    <div className={`${cls} bg-muted overflow-hidden flex flex-col`}>
      <div className="h-1/2 bg-foreground/70 flex items-center justify-center"><div className="h-1 w-6 bg-background rounded" /></div>
      <div className="flex-1 flex items-center justify-center"><div className="h-1 w-6 bg-foreground/40 rounded" /></div>
    </div>
  );
  return (
    <div className={`${cls} bg-background flex items-center justify-center`}>
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
