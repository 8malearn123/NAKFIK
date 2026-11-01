import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import StatusBadge from "@/components/app/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber, formatPercent } from "@/lib/format";
import { toast } from "sonner";
import {
  Upload, Loader2, AlignCenter, AlignLeft, AlignRight,
  Move, X, Plus, Trash2, Copy,
} from "lucide-react";

export type FieldKey = "guest_name" | "guest_phone" | "guest_email" | "static";

export const FIELD_LABELS: Record<FieldKey, string> = {
  guest_name: "اسم المدعو",
  guest_phone: "جوال المدعو",
  guest_email: "بريد المدعو",
  static: "نص ثابت",
};

export interface OverlayField {
  id: string;
  field: FieldKey;
  staticText?: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  color: string;
  textAlign: "right" | "center" | "left";
  letterSpacing: number;
  prefix: string;
  suffix: string;
  shadow: boolean;
  // خلفية للنص — تغطي ما تحتها من التصميم (مفيدة لتصحيح تاريخ أو نص مطبوع في الصورة)
  bgColor?: string | null;
}

// Backward-compatible: NameOverlay is now { fields: OverlayField[] } but legacy
// single-object shape is auto-migrated by toFields().
export interface NameOverlay {
  fields?: OverlayField[];
  // legacy fields (single overlay)
  xPct?: number; yPct?: number; widthPct?: number;
  fontSize?: number; fontFamily?: string; fontWeight?: number;
  color?: string; textAlign?: "right" | "center" | "left";
  letterSpacing?: number; prefix?: string; suffix?: string; shadow?: boolean;
}

export const DEFAULT_FIELD = (field: FieldKey = "guest_name", yPct = 22): OverlayField => ({
  id: Math.random().toString(36).slice(2, 9),
  field,
  staticText: field === "static" ? "نص" : "",
  xPct: 50, yPct, widthPct: 70,
  fontSize: 32, fontFamily: "Amiri", fontWeight: 700,
  color: "#FFFFFF", textAlign: "center", letterSpacing: 0,
  prefix: "", suffix: "", shadow: true, bgColor: null,
});

export const DEFAULT_OVERLAY: NameOverlay = { fields: [DEFAULT_FIELD("guest_name")] };

export function toFields(o: any): OverlayField[] {
  if (o?.fields && Array.isArray(o.fields) && o.fields.length) return o.fields;
  if (o && typeof o.xPct === "number") {
    return [{
      id: "legacy",
      field: "guest_name",
      staticText: "",
      xPct: o.xPct, yPct: o.yPct, widthPct: o.widthPct,
      fontSize: o.fontSize, fontFamily: o.fontFamily, fontWeight: o.fontWeight,
      color: o.color, textAlign: o.textAlign, letterSpacing: o.letterSpacing,
      prefix: o.prefix || "", suffix: o.suffix || "", shadow: !!o.shadow,
    }];
  }
  return [DEFAULT_FIELD("guest_name")];
}

const FONT_CHOICES = [
  { v: "Amiri", l: "أميري — كلاسيكي" },
  { v: "Cairo", l: "القاهرة — حديث" },
  { v: "Tajawal", l: "تجوّل — أنيق" },
  { v: "Lateef", l: "لطيف — تقليدي" },
  { v: "Reem Kufi", l: "ريم كوفي — كوفي" },
  { v: "Aref Ruqaa", l: "رقعة — مرسوم" },
];

const SAMPLE_VALUES: Record<FieldKey, string> = {
  guest_name: "مهدي عبدالله آل غائب",
  guest_phone: "+966500000000",
  guest_email: "guest@example.com",
  static: "",
};

interface Props {
  templateUrl: string | null;
  overlay: NameOverlay;
  onTemplateChange: (url: string | null) => void;
  onOverlayChange: (o: NameOverlay) => void;
  uploadPathPrefix?: string;
}

export default function CustomTemplateDesigner({
  templateUrl, overlay,
  onTemplateChange, onOverlayChange, uploadPathPrefix = "invitations",
}: Props) {
  const [uploading, setUploading] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);

  const fields = toFields(overlay);
  const [selectedId, setSelectedId] = useState<string>(fields[0]?.id || "");
  const selected = fields.find((f) => f.id === selectedId) || fields[0];

  useEffect(() => {
    if (!templateUrl) { setNaturalAspect(null); return; }
    const img = new Image();
    img.onload = () => setNaturalAspect(img.naturalWidth / img.naturalHeight);
    img.src = templateUrl;
  }, [templateUrl]);

  useEffect(() => {
    if (!fields.find((f) => f.id === selectedId) && fields[0]) {
      setSelectedId(fields[0].id);
    }
  }, [fields, selectedId]);

  const setFields = (next: OverlayField[]) => onOverlayChange({ fields: next });
  const updateSelected = (patch: Partial<OverlayField>) => {
    if (!selected) return;
    setFields(fields.map((f) => (f.id === selected.id ? { ...f, ...patch } : f)));
  };

  const addField = (field: FieldKey) => {
    const f = DEFAULT_FIELD(field, 30 + fields.length * 10);
    setFields([...fields, f]);
    setSelectedId(f.id);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const copy = { ...selected, id: Math.random().toString(36).slice(2, 9), yPct: Math.min(95, selected.yPct + 8) };
    setFields([...fields, copy]);
    setSelectedId(copy.id);
  };

  const removeSelected = () => {
    if (!selected || fields.length <= 1) {
      toast.error("يجب الإبقاء على حقل واحد على الأقل");
      return;
    }
    setFields(fields.filter((f) => f.id !== selected.id));
  };

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("الملف يجب أن يكون صورة (PNG / JPG)");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("حجم الصورة يجب ألا يتجاوز 8 ميجابايت");
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("لم يتم العثور على المستخدم");
      const ext = file.name.split(".").pop() || "png";
      const path = `${uploadPathPrefix}/${user.id}/custom-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("event-covers").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("event-covers").getPublicUrl(path);
      onTemplateChange(publicUrl);
      toast.success("تم رفع التصميم");
    } catch (e: any) {
      toast.error(e.message || "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const updateFromPointer = (clientX: number, clientY: number) => {
    const el = stageRef.current;
    if (!el || !selected) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    updateSelected({
      xPct: Math.max(0, Math.min(100, x)),
      yPct: Math.max(0, Math.min(100, y)),
    });
  };

  const sampleOf = (f: OverlayField) =>
    f.field === "static" ? (f.staticText || "نص") : SAMPLE_VALUES[f.field];

  return (
    <div className="space-y-4">
      {!templateUrl ? (
        <label className="block">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
          <div className="cursor-pointer rounded-xl border border-dashed border-input bg-muted/50 p-8 text-center transition-colors hover:bg-muted">
            {uploading ? (
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            ) : (
              <>
                <span className="mx-auto grid h-9 w-9 place-items-center rounded-[10px] bg-secondary text-primary"><Upload className="h-[17px] w-[17px]" /></span>
                <p className="mt-3 text-sm font-semibold">ارفع تصميم الدعوة الخاص فيك</p>
                <p className="mt-0.5 text-xs leading-[18px] text-muted-foreground">PNG / JPG — حتى 8 ميجا — يفضّل عمودي عالي الدقة</p>
              </>
            )}
          </div>
        </label>
      ) : (
        <>
          {/* Stage */}
          <div className="relative select-none overflow-hidden rounded-xl bg-muted/50">
            <div
              ref={stageRef}
              className="relative w-full mx-auto"
              style={{
                maxWidth: 420,
                aspectRatio: naturalAspect ? `${naturalAspect}` : "9 / 16",
                backgroundImage: `url(${templateUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              onPointerDown={(e) => {
                draggingRef.current = true;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                updateFromPointer(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (draggingRef.current) updateFromPointer(e.clientX, e.clientY);
              }}
              onPointerUp={() => { draggingRef.current = false; }}
            >
              {fields.map((f) => {
                const isSel = f.id === selectedId;
                return (
                  <div key={f.id}>
                    <div
                      className="absolute pointer-events-auto cursor-pointer"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedId(f.id);
                        draggingRef.current = true;
                        (e.target as HTMLElement).setPointerCapture(e.pointerId);
                      }}
                      style={{
                        left: `${f.xPct}%`,
                        top: `${f.yPct}%`,
                        width: `${f.widthPct}%`,
                        transform: "translate(-50%, -50%)",
                        textAlign: f.textAlign,
                        color: f.color,
                        fontFamily: `'${f.fontFamily}', serif`,
                        fontSize: `${f.fontSize}px`,
                        fontWeight: f.fontWeight,
                        letterSpacing: `${f.letterSpacing}px`,
                        lineHeight: 1.25,
                        textShadow: f.shadow
                          ? "0 2px 12px rgba(0,0,0,0.55), 0 0 4px rgba(0,0,0,0.4)"
                          : "none",
                        direction: "rtl",
                        outline: isSel ? "2px dashed hsl(var(--primary))" : "none",
                        outlineOffset: 4,
                        borderRadius: f.bgColor ? 8 : 4,
                        background: f.bgColor || "transparent",
                        padding: f.bgColor ? "0.3em 0.5em" : undefined,
                      }}
                    >
                      {f.prefix && <span>{f.prefix} </span>}
                      {sampleOf(f)}
                      {f.suffix && <span> {f.suffix}</span>}
                    </div>
                    {isSel && (
                      <div
                        className="pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white bg-primary"
                        style={{
                          left: `${f.xPct}%`,
                          top: `${f.yPct}%`,
                          transform: "translate(-50%, -50%)",
                          opacity: 0.8,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2.5 text-xs leading-[18px] text-muted-foreground">
              <Move className="h-3.5 w-3.5 flex-none" /> اختر حقلاً ثم اسحب لتحديد موضعه على التصميم
            </div>
          </div>

          {/* Field tabs */}
          <div className="space-y-3 rounded-xl bg-muted/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold leading-[22px]">الحقول على التصميم ({formatNumber(fields.length)})</h3>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={duplicateSelected}>
                  <Copy className="h-4 w-4" /> نسخ
                </Button>
                <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={removeSelected}>
                  <Trash2 className="h-4 w-4" /> حذف
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {fields.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={f.id === selectedId}
                  onClick={() => setSelectedId(f.id)}
                  className={`h-8 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                    f.id === selectedId
                      ? "bg-secondary text-primary ring-1 ring-inset ring-primary"
                      : "bg-card hover:bg-secondary"
                  }`}
                >
                  {f.field === "static" ? (f.staticText || "نص ثابت") : FIELD_LABELS[f.field]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(["guest_name", "guest_phone", "guest_email", "static"] as FieldKey[]).map((k) => (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addField(k)}
                >
                  <Plus className="h-4 w-4" /> {FIELD_LABELS[k]}
                </Button>
              ))}
            </div>
          </div>

          {/* Selected field controls */}
          {selected && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-3 sm:col-span-2">
                <div className="flex min-w-0 items-center gap-2">
                  <StatusBadge tone="primary">المحدد</StatusBadge>
                  <span className="truncate text-sm font-semibold">
                    {selected.field === "static" ? (selected.staticText || "نص ثابت") : FIELD_LABELS[selected.field]}
                  </span>
                </div>
                <Select value={selected.field} onValueChange={(v) => updateSelected({ field: v as FieldKey })}>
                  <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["guest_name", "guest_phone", "guest_email", "static"] as FieldKey[]).map((k) => (
                      <SelectItem key={k} value={k}>{FIELD_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selected.field === "static" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>النص الثابت</Label>
                  <Input
                    value={selected.staticText || ""}
                    onChange={(e) => updateSelected({ staticText: e.target.value })}
                    placeholder="مثلاً: قاعة الماسة"
                  />
                </div>
              )}

              <div className="space-y-1.5 sm:col-span-2">
                <Label>الخط</Label>
                <Select value={selected.fontFamily} onValueChange={(v) => updateSelected({ fontFamily: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_CHOICES.map((f) => (
                      <SelectItem key={f.v} value={f.v} style={{ fontFamily: f.v }}>{f.l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SliderField label="حجم الخط" value={`${formatNumber(selected.fontSize ?? 0)}px`}>
                <Slider
                  dir="rtl"
                  value={[selected.fontSize]} min={12} max={80} step={1}
                  onValueChange={([v]) => updateSelected({ fontSize: v })}
                />
              </SliderField>

              <SliderField label="سُمك الخط" value={formatNumber(selected.fontWeight ?? 0)}>
                <Slider
                  dir="rtl"
                  value={[selected.fontWeight]} min={300} max={900} step={100}
                  onValueChange={([v]) => updateSelected({ fontWeight: v })}
                />
              </SliderField>

              <SliderField label="عرض المربع" value={formatPercent(selected.widthPct)}>
                <Slider
                  dir="rtl"
                  value={[selected.widthPct]} min={20} max={100} step={1}
                  onValueChange={([v]) => updateSelected({ widthPct: v })}
                />
              </SliderField>

              <SliderField label="تباعد الحروف" value={`${formatNumber(selected.letterSpacing ?? 0)}px`}>
                <Slider
                  dir="rtl"
                  value={[selected.letterSpacing]} min={-2} max={10} step={0.5}
                  onValueChange={([v]) => updateSelected({ letterSpacing: v })}
                />
              </SliderField>

              <div className="space-y-1.5">
                <Label>اللون</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={selected.color}
                    onChange={(e) => updateSelected({ color: e.target.value })}
                    className="h-10 w-14 flex-none cursor-pointer p-1"
                  />
                  <Input
                    dir="ltr"
                    value={selected.color}
                    onChange={(e) => updateSelected({ color: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>المحاذاة</Label>
                <div className="flex gap-2">
                  {([
                    { v: "right", I: AlignRight },
                    { v: "center", I: AlignCenter },
                    { v: "left", I: AlignLeft },
                  ] as const).map(({ v, I }) => (
                    <Button
                      key={v} type="button"
                      aria-pressed={selected.textAlign === v}
                      variant={selected.textAlign === v ? "soft" : "outline"}
                      className="flex-1 px-0"
                      onClick={() => updateSelected({ textAlign: v })}
                    >
                      <I className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>خلفية النص</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={selected.bgColor || "#1d1849"}
                    onChange={(e) => updateSelected({ bgColor: e.target.value })}
                    className="h-10 w-14 flex-none cursor-pointer p-1"
                  />
                  <Input
                    dir="ltr"
                    value={selected.bgColor || ""}
                    onChange={(e) => updateSelected({ bgColor: e.target.value || null })}
                    placeholder="بدون خلفية"
                  />
                  {selected.bgColor && (
                    <Button type="button" variant="ghost" onClick={() => updateSelected({ bgColor: null })}>
                      إزالة
                    </Button>
                  )}
                </div>
                <p className="text-xs leading-[18px] text-muted-foreground">تغطي ما تحتها من التصميم (مثلاً لتصحيح تاريخ مطبوع في الصورة)</p>
              </div>

              <div className="space-y-1.5">
                <Label>بادئة</Label>
                <Input
                  value={selected.prefix}
                  onChange={(e) => updateSelected({ prefix: e.target.value })}
                  placeholder="الأستاذ /"
                />
              </div>

              <div className="space-y-1.5">
                <Label>لاحقة</Label>
                <Input
                  value={selected.suffix}
                  onChange={(e) => updateSelected({ suffix: e.target.value })}
                  placeholder="حفظه الله"
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 p-4 sm:col-span-2">
                <Label className="leading-5">ظل خفيف (يحسّن القراءة على الخلفيات)</Label>
                <Switch
                  checked={selected.shadow}
                  onCheckedChange={(v) => updateSelected({ shadow: v })}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-border pt-4">
            <label className="flex-1">
              <input
                type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
              <Button type="button" variant="outline" className="w-full" disabled={uploading} asChild>
                <span>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  استبدال التصميم
                </span>
              </Button>
            </label>
            <Button
              type="button" variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onTemplateChange(null)}
            >
              <X className="h-4 w-4" /> إزالة التصميم
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function SliderField({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <bdi dir="ltr" className="text-xs text-muted-foreground">{value}</bdi>
      </div>
      {children}
    </div>
  );
}
