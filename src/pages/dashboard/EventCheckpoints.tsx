import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, DoorOpen, DoorClosed, Layers, MapPin, Save, Activity } from "lucide-react";

interface Checkpoint {
  id: string;
  event_id: string;
  name_ar: string;
  checkpoint_type: string;
  capacity: number;
  color: string;
  is_active: boolean;
  display_order: number;
}

const TYPE_OPTIONS = [
  { v: "entry", l: "دخول", icon: DoorOpen },
  { v: "exit", l: "خروج", icon: DoorClosed },
  { v: "session", l: "جلسة", icon: Layers },
  { v: "section", l: "قسم", icon: MapPin },
];

const COLORS = ["492C5A", "A03C4A", "CC8E3D", "006962", "8B5A8C", "C97B6E", "E0B05E", "4A8B85"];

const EventCheckpoints = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState<{ title_ar: string } | null>(null);
  const [items, setItems] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    const [{ data: evt }, { data: cps }] = await Promise.all([
      supabase.from("events").select("title_ar").eq("id", eventId).single(),
      supabase.from("checkpoints").select("*").eq("event_id", eventId).order("display_order"),
    ]);
    setEvent(evt as any);
    setItems((cps as any) || []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const addRow = () => {
    if (!eventId) return;
    setItems(prev => [...prev, {
      id: `new-${Date.now()}`, event_id: eventId, name_ar: "", checkpoint_type: "entry",
      capacity: 200, color: COLORS[prev.length % COLORS.length], is_active: true, display_order: prev.length,
    }]);
  };

  const update = (i: number, patch: Partial<Checkpoint>) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  };

  const remove = async (i: number) => {
    const it = items[i];
    if (!it.id.startsWith("new-")) {
      const { error } = await supabase.from("checkpoints").delete().eq("id", it.id);
      if (error) { toast.error("تعذّر الحذف"); return; }
    }
    setItems(prev => prev.filter((_, idx) => idx !== i));
    toast.success("تم الحذف");
  };

  const saveAll = async () => {
    if (!eventId) return;
    const invalid = items.find(it => !it.name_ar.trim());
    if (invalid) { toast.error("الاسم مطلوب لكل بوابة"); return; }
    setSaving(true);
    try {
      const toInsert = items.filter(i => i.id.startsWith("new-")).map((i, idx) => ({
        event_id: eventId, name_ar: i.name_ar.trim(), checkpoint_type: i.checkpoint_type,
        capacity: i.capacity || 0, color: i.color, is_active: i.is_active, display_order: idx,
      }));
      const toUpdate = items.filter(i => !i.id.startsWith("new-"));

      if (toInsert.length > 0) {
        const { error } = await supabase.from("checkpoints").insert(toInsert as any);
        if (error) throw error;
      }
      for (const it of toUpdate) {
        const { error } = await supabase.from("checkpoints").update({
          name_ar: it.name_ar.trim(), checkpoint_type: it.checkpoint_type,
          capacity: it.capacity || 0, color: it.color, is_active: it.is_active, display_order: it.display_order,
        } as any).eq("id", it.id);
        if (error) throw error;
      }
      toast.success("تم حفظ كل البوابات ✅");
      load();
    } catch (e: any) {
      toast.error(e.message || "خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-bold text-2xl text-foreground">نقاط الدخول والتتبع</h1>
            <p className="text-sm text-muted-foreground mt-1">{event?.title_ar} — حدّد البوابات والقاعات قبل الفعالية</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full" asChild>
              <Link to={`/dashboard/events/${eventId}/heatmap`}>
                <Activity className="w-4 h-4" /> الخارطة الحرارية
              </Link>
            </Button>
            <Button variant="outline" className="rounded-full" onClick={addRow}>
              <Plus className="w-4 h-4" /> إضافة بوابة
            </Button>
            <Button className="rounded-full" onClick={saveAll} disabled={saving || items.length === 0}>
              <Save className="w-4 h-4" /> {saving ? "جارٍ الحفظ..." : "حفظ الكل"}
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-12 text-center">
            <DoorOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-bold text-foreground mb-1">لا توجد بوابات بعد</h3>
            <p className="text-sm text-muted-foreground mb-4">أضف نقاط الدخول والخروج والقاعات لهذه الفعالية</p>
            <Button className="rounded-full" onClick={addRow}><Plus className="w-4 h-4" /> أضف أول بوابة</Button>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 w-8"></th>
                    <th className="text-right p-3 font-semibold text-foreground">اللون</th>
                    <th className="text-right p-3 font-semibold text-foreground">الاسم</th>
                    <th className="text-right p-3 font-semibold text-foreground">النوع</th>
                    <th className="text-right p-3 font-semibold text-foreground">السعة</th>
                    <th className="text-right p-3 font-semibold text-foreground">مفعّلة</th>
                    <th className="p-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {items.map((it, i) => (
                    <tr key={it.id} className="hover:bg-muted/20">
                      <td className="p-3 text-muted-foreground"><GripVertical className="w-4 h-4" /></td>
                      <td className="p-3">
                        <div className="flex gap-1 flex-wrap max-w-[150px]">
                          {COLORS.map(c => (
                            <button key={c} type="button" onClick={() => update(i, { color: c })}
                              className={`w-5 h-5 rounded-full border-2 transition-all ${it.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                              style={{ background: `#${c}` }} />
                          ))}
                        </div>
                      </td>
                      <td className="p-3 min-w-[180px]">
                        <Input value={it.name_ar} onChange={e => update(i, { name_ar: e.target.value })} placeholder="مثال: البوابة الشمالية" className="h-9" />
                      </td>
                      <td className="p-3">
                        <select value={it.checkpoint_type} onChange={e => update(i, { checkpoint_type: e.target.value })}
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                          {TYPE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                      </td>
                      <td className="p-3 w-24">
                        <Input type="number" min={0} value={it.capacity} onChange={e => update(i, { capacity: parseInt(e.target.value) || 0 })} className="h-9 w-20" />
                      </td>
                      <td className="p-3">
                        <button type="button" onClick={() => update(i, { is_active: !it.is_active })}
                          className={`w-11 h-6 rounded-full transition-colors relative ${it.is_active ? "bg-brand-teal" : "bg-muted"}`}>
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${it.is_active ? "right-0.5" : "right-[22px]"}`} />
                        </button>
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="icon" onClick={() => remove(i)} className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-muted/30 rounded-xl p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">ℹ️ كيف تعمل البوابات؟</p>
          <ul className="list-disc list-inside space-y-1 mr-2">
            <li>كل موظف عند التشيك-إن يختار البوابة من قائمة منسدلة في أعلى الشاشة</li>
            <li>كل عملية مسح تُسجَّل تلقائياً مع البوابة المختارة</li>
            <li>السعة تُستخدم لحساب نسبة الضغط في الخارطة الحرارية</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EventCheckpoints;
