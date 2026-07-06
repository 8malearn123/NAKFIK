import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload, ImageIcon, Loader2, AlignCenter, AlignLeft, AlignRight,
  Move, Type, X, Plus, Trash2, Copy,
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
  prefix: "", suffix: "", shadow: true,
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
          <div className="border-2 border-dashed border-primary/40 rounded-2xl p-8 text-center cursor-pointer hover:bg-primary/5 transition bg-gradient-to-br from-primary/5 to-transparent">
            {uploading ? (
              <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto text-primary mb-3" />
                <p className="font-bold text-sm">ارفع تصميم الدعوة الخاص فيك</p>
                <p className="text-xs text-muted-foreground mt-1">PNG / JPG — حتى 8 ميجا — يفضّل عمودي عالي الدقة</p>
              </>
            )}
          </div>
        </label>
      ) : (
        <>
          {/* Stage */}
          <div className="rounded-2xl overflow-hidden border-2 border-border bg-muted/30 relative select-none">
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
                        borderRadius: 4,
                      }}
                    >
                      {f.prefix && <span>{f.prefix} </span>}
                      {sampleOf(f)}
                      {f.suffix && <span> {f.suffix}</span>}
                    </div>
                    {isSel && (
                      <div
                        className="absolute w-4 h-4 rounded-full bg-primary border-2 border-white shadow-lg pointer-events-none"
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
            <div className="bg-foreground/5 border-t border-border px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Move className="w-3 h-3" /> اختر حقلاً ثم اسحب لتحديد موضعه على التصميم
            </div>
          </div>

          {/* Field tabs */}
          <div className="rounded-xl border-2 border-border p-2 bg-card">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-bold">الحقول على التصميم ({fields.length})</Label>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={duplicateSelected}>
                  <Copy className="w-3 h-3 ml-1" /> نسخ
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={removeSelected}>
                  <Trash2 className="w-3 h-3 ml-1" /> حذف
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {fields.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedId(f.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border transition ${
                    f.id === selectedId
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:border-primary/50"
                  }`}
                >
                  {f.field === "static" ? (f.staticText || "نص ثابت") : FIELD_LABELS[f.field]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {(["guest_name", "guest_phone", "guest_email", "static"] as FieldKey[]).map((k) => (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={() => addField(k)}
                >
                  <Plus className="w-3 h-3 ml-1" /> {FIELD_LABELS[k]}
                </Button>
              ))}
            </div>
          </div>

          {/* Selected field controls */}
          {selected && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex items-center justify-between bg-primary/10 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-[10px]">المحدد</Badge>
                  <span className="text-xs font-bold">
                    {selected.field === "static" ? (selected.staticText || "نص ثابت") : FIELD_LABELS[selected.field]}
                  </span>
                </div>
                <select
                  value={selected.field}
                  onChange={(e) => updateSelected({ field: e.target.value as FieldKey })}
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {(["guest_name", "guest_phone", "guest_email", "static"] as FieldKey[]).map((k) => (
                    <option key={k} value={k}>{FIELD_LABELS[k]}</option>
                  ))}
                </select>
              </div>

              {selected.field === "static" && (
                <div className="col-span-2">
                  <Label className="text-xs">النص الثابت</Label>
                  <Input
                    value={selected.staticText || ""}
                    onChange={(e) => updateSelected({ staticText: e.target.value })}
                    placeholder="مثلاً: قاعة الماسة"
                    className="h-9 mt-1"
                  />
                </div>
              )}

              <div className="col-span-2">
                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                  <Type className="w-3.5 h-3.5" /> الخط
                </Label>
                <select
                  value={selected.fontFamily}
                  onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {FONT_CHOICES.map((f) => (
                    <option key={f.v} value={f.v} style={{ fontFamily: f.v }}>{f.l}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">حجم الخط: {selected.fontSize}px</Label>
                <Slider
                  value={[selected.fontSize]} min={12} max={80} step={1}
                  onValueChange={([v]) => updateSelected({ fontSize: v })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-xs">سُمك الخط: {selected.fontWeight}</Label>
                <Slider
                  value={[selected.fontWeight]} min={300} max={900} step={100}
                  onValueChange={([v]) => updateSelected({ fontWeight: v })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-xs">عرض المربع: {selected.widthPct}%</Label>
                <Slider
                  value={[selected.widthPct]} min={20} max={100} step={1}
                  onValueChange={([v]) => updateSelected({ widthPct: v })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-xs">تباعد الحروف: {selected.letterSpacing}px</Label>
                <Slider
                  value={[selected.letterSpacing]} min={-2} max={10} step={0.5}
                  onValueChange={([v]) => updateSelected({ letterSpacing: v })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-xs">اللون</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={selected.color}
                    onChange={(e) => updateSelected({ color: e.target.value })}
                    className="h-9 w-14 p-1 cursor-pointer"
                  />
                  <Input
                    value={selected.color}
                    onChange={(e) => updateSelected({ color: e.target.value })}
                    className="h-9 flex-1 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">المحاذاة</Label>
                <div className="flex gap-1">
                  {([
                    { v: "right", I: AlignRight },
                    { v: "center", I: AlignCenter },
                    { v: "left", I: AlignLeft },
                  ] as const).map(({ v, I }) => (
                    <Button
                      key={v} type="button" size="sm"
                      variant={selected.textAlign === v ? "default" : "outline"}
                      className="flex-1 h-9"
                      onClick={() => updateSelected({ textAlign: v })}
                    >
                      <I className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs">بادئة</Label>
                <Input
                  value={selected.prefix}
                  onChange={(e) => updateSelected({ prefix: e.target.value })}
                  placeholder="الأستاذ /"
                  className="h-9 mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">لاحقة</Label>
                <Input
                  value={selected.suffix}
                  onChange={(e) => updateSelected({ suffix: e.target.value })}
                  placeholder="حفظه الله"
                  className="h-9 mt-1"
                />
              </div>

              <div className="col-span-2 flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2">
                <Label className="text-xs">ظل خفيف (يحسّن القراءة على الخلفيات)</Label>
                <Switch
                  checked={selected.shadow}
                  onCheckedChange={(v) => updateSelected({ shadow: v })}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button" size="sm" variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onTemplateChange(null)}
            >
              <X className="w-3.5 h-3.5 ml-1" /> إزالة التصميم
            </Button>
            <label className="flex-1">
              <input
                type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
              <Button type="button" variant="outline" size="sm" className="w-full" disabled={uploading} asChild>
                <span>
                  {uploading ? <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 ml-1" />}
                  استبدال التصميم
                </span>
              </Button>
            </label>
          </div>
        </>
      )}
    </div>
  );
}
