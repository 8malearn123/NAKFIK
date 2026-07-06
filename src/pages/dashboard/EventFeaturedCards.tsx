import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Plus, Trash2, Upload, Pencil, X, IdCard, Image as ImageIcon } from "lucide-react";

interface FeaturedCard {
  id: string;
  event_id: string;
  name: string;
  role_label: string | null;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

const ROLE_PRESETS = ["متحدث رئيسي", "متحدث", "راعي", "ضيف شرف", "مقدم", "منظم", "أخرى"];

const EventFeaturedCards = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [eventTitle, setEventTitle] = useState("");
  const [cards, setCards] = useState<FeaturedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    role_label: "متحدث",
    description: "",
    image_url: "",
    is_active: true,
  });

  const resetForm = () => {
    setForm({ name: "", role_label: "متحدث", description: "", image_url: "", is_active: true });
    setEditingId(null);
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
    const payload = {
      event_id: eventId,
      name: form.name.trim(),
      role_label: form.role_label || null,
      description: form.description || null,
      image_url: form.image_url || null,
      is_active: form.is_active,
      display_order: editingId ? cards.find((c) => c.id === editingId)?.display_order || 0 : cards.length,
    };

    const op = editingId
      ? (supabase as any).from("event_featured_cards").update(payload).eq("id", editingId)
      : (supabase as any).from("event_featured_cards").insert(payload);

    const { error } = await op;
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
    });
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

            <div className="grid sm:grid-cols-2 gap-4">
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
                <select
                  value={form.role_label}
                  onChange={(e) => setForm({ ...form, role_label: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ROLE_PRESETS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
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
              <Label>الصورة</Label>
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

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label className="text-sm">نشطة (تظهر للحاضرين)</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm}>إلغاء</Button>
                <Button onClick={handleSubmit} disabled={saving || uploading}>
                  {saving ? "جارٍ الحفظ..." : editingId ? "تحديث" : "إضافة"}
                </Button>
              </div>
            </div>
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
                {card.image_url ? (
                  <img src={card.image_url} alt={card.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <IdCard className="w-12 h-12 text-primary/40" />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground truncate">{card.name}</h3>
                      {card.role_label && (
                        <span className="inline-block mt-1 text-[11px] font-semibold bg-primary/10 text-primary rounded-full px-2 py-0.5">
                          {card.role_label}
                        </span>
                      )}
                    </div>
                    <Switch checked={card.is_active} onCheckedChange={() => toggleActive(card)} />
                  </div>
                  {card.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{card.description}</p>
                  )}
                  <div className="flex items-center gap-1 pt-1 border-t border-border/40">
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
