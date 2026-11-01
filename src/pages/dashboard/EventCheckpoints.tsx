import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Plus, Trash2, DoorOpen, DoorClosed, Layers, MapPin, Save, Activity } from "lucide-react";

interface Checkpoint {
  id: string;
  event_id: string;
  name_ar: string;
  checkpoint_type: string;
  capacity: number;
  color: string;
  is_active: boolean;
  display_order: number;
  assigned_user_id?: string | null;
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

  const [staffNames, setStaffNames] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!eventId) return;
    const [{ data: evt }, { data: cps }] = await Promise.all([
      supabase.from("events").select("title_ar").eq("id", eventId).single(),
      supabase.from("checkpoints").select("*").eq("event_id", eventId).order("display_order"),
    ]);
    setEvent(evt as any);
    const list = ((cps as any) || []) as Checkpoint[];
    setItems(list);
    // أسماء الموظفين المعيَّنين (للعرض فقط — التعيين من صلاحيات الإدارة)
    const ids = [...new Set(list.map(c => c.assigned_user_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p.full_name || "موظف معيَّن"; });
      setStaffNames(map);
    }
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
      toast.success("تم حفظ كل البوابات");
      load();
    } catch (e: any) {
      toast.error(e.message || "خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const header = (actions?: React.ReactNode) => (
    <div className="space-y-2">
      <Link to="/dashboard/events" className="inline-flex items-center gap-1.5 text-[13px] font-semibold leading-5 text-primary">
        <ArrowRight className="h-4 w-4" /> العودة لفعالياتي
      </Link>
      <PageHeader
        title="نقاط الدخول والتتبع"
        description={event?.title_ar ? `${event.title_ar}، حدّد البوابات والقاعات قبل الفعالية` : "حدّد البوابات والقاعات قبل الفعالية"}
        actions={actions}
      />
    </div>
  );

  if (loading) return (
    <DashboardLayout>
      <div className="space-y-6">
        {header()}
        <div className="h-80 animate-pulse rounded-2xl bg-card shadow-soft" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {header(
          <>
            <Button variant="outline" asChild>
              <Link to={`/dashboard/events/${eventId}/heatmap`}>
                <Activity className="h-4 w-4" /> الخارطة الحرارية
              </Link>
            </Button>
            <Button variant="outline" onClick={addRow}>
              <Plus className="h-4 w-4" /> إضافة بوابة
            </Button>
            <Button onClick={saveAll} disabled={saving || items.length === 0}>
              <Save className="h-4 w-4" /> {saving ? "جارٍ الحفظ..." : "حفظ الكل"}
            </Button>
          </>,
        )}

        {items.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={DoorOpen}
              title="لا توجد بوابات بعد"
              description="أضف نقاط الدخول والخروج والقاعات لهذه الفعالية"
              action={<Button onClick={addRow}><Plus className="h-4 w-4" /> أضف أول بوابة</Button>}
            />
          </div>
        ) : (
          <Panel flush title="البوابات">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">اللون</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>السعة</TableHead>
                  <TableHead>الموظف المعيَّن</TableHead>
                  <TableHead>مفعّلة</TableHead>
                  <TableHead className="pe-6"><span className="sr-only">حذف</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, i) => (
                  <TableRow key={it.id}>
                    <TableCell className="ps-6">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" aria-label="لون البوابة" className="grid h-9 w-9 place-items-center rounded-lg border border-input bg-card transition-colors hover:bg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <i className="h-4 w-4 rounded-full" style={{ background: `#${it.color}` }} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-auto p-2">
                          <div className="grid grid-cols-4 gap-1">
                            {COLORS.map(c => (
                              <button
                                key={c}
                                type="button"
                                aria-label={`اللون ${c}`}
                                aria-pressed={it.color === c}
                                onClick={() => update(i, { color: c })}
                                className="grid h-9 w-9 place-items-center rounded-lg transition-colors hover:bg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <i className={`h-5 w-5 rounded-full ${it.color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-popover" : ""}`} style={{ background: `#${c}` }} />
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell>
                      <Input value={it.name_ar} onChange={e => update(i, { name_ar: e.target.value })} placeholder="مثال: البوابة الشمالية" className="h-9 w-40 sm:w-56" />
                    </TableCell>
                    <TableCell>
                      <Select value={it.checkpoint_type} onValueChange={v => update(i, { checkpoint_type: v })}>
                        <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TYPE_OPTIONS.map(o => (
                            <SelectItem key={o.v} value={o.v}>
                              <span className="flex items-center gap-2"><o.icon className="h-4 w-4 text-muted-foreground" />{o.l}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={0} value={it.capacity} onChange={e => update(i, { capacity: parseInt(e.target.value) || 0 })} className="h-9 w-24" aria-label="السعة" />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {it.assigned_user_id ? (
                        <span className="font-semibold">{staffNames[it.assigned_user_id] || "موظف معيَّن"}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground" title="تعيين الموظفين من صلاحيات إدارة نكفيك فقط">
                          لم يُعيَّن، من الإدارة
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch checked={it.is_active} onCheckedChange={() => update(i, { is_active: !it.is_active })} aria-label="مفعّلة" />
                    </TableCell>
                    <TableCell className="pe-6 text-end">
                      <Button variant="ghost" size="icon" onClick={() => remove(i)} className="h-9 w-9 text-destructive hover:text-destructive" aria-label="حذف البوابة">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        )}

        <Panel title="كيف تعمل البوابات؟">
          <ul className="list-disc space-y-1.5 ps-5 text-sm text-muted-foreground">
            <li>دورك كمنظم: إنشاء البوابات وتحديد عددها وأسمائها فقط</li>
            <li>كل موظف يتم تعيينه على بوابة محددة مسبقًا، وجميع عمليات المسح تُسجل تلقائيًا على تلك البوابة</li>
            <li>تعيين الموظفين على البوابات من صلاحيات إدارة نكفيك تيكت أو المسؤول المخوَّل فقط</li>
            <li>السعة تُستخدم لحساب نسبة الضغط في الخارطة الحرارية</li>
          </ul>
        </Panel>
      </div>
    </DashboardLayout>
  );
};

export default EventCheckpoints;
