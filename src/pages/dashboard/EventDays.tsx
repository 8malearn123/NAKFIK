import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ArrowRight, CalendarDays, DoorOpen, Loader2, Plus, Save, Trash2, Users, Wand2, X,
} from "lucide-react";

// أيام الفعالية — لكل يوم: فريق مستقل، بوابات مستقلة، وتجهيزات يومية.
// الحضور والمسح يُوسمان باليوم فتصير التقارير يومية أو إجمالية.

interface Day {
  id: string;
  day_number: number;
  day_date: string;
  title: string | null;
  notes: string | null;
}

interface Gate { id: string; name_ar: string; checkpoint_type: string; event_day_id: string | null; }
interface StaffRow { id: string; event_day_id: string; user_id: string; role: string; }
interface Candidate { id: string; name: string; }

const ROLE_LABELS: Record<string, string> = {
  gate_staff: "موظف بوابات",
  organizer: "منظم",
  supervisor: "مشرف",
};

const DAY_NAMES = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر"];

const EventDays = () => {
  const { eventId } = useParams();
  const { organization } = useAuth();
  const [event, setEvent] = useState<{ title_ar: string; start_date: string; end_date: string | null } | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSql, setNeedsSql] = useState(false);
  const [savingDay, setSavingDay] = useState<string | null>(null);

  useEffect(() => { document.title = "أيام الفعالية | نكفيك"; }, []);

  const load = useCallback(async () => {
    if (!eventId) return;
    const [{ data: evt }, daysRes, { data: cps }] = await Promise.all([
      supabase.from("events").select("title_ar, start_date, end_date").eq("id", eventId).single(),
      supabase.from("event_days" as any).select("*").eq("event_id", eventId).order("day_number"),
      supabase.from("checkpoints").select("id, name_ar, checkpoint_type, event_day_id").eq("event_id", eventId).order("display_order"),
    ]);
    setEvent(evt as any);
    if (daysRes.error) {
      setNeedsSql(true);
      setLoading(false);
      return;
    }
    const dayList = (daysRes.data as any as Day[]) || [];
    setDays(dayList);
    setGates(((cps as any) || []) as Gate[]);

    if (dayList.length) {
      const { data: st } = await supabase
        .from("event_day_staff" as any)
        .select("*")
        .in("event_day_id", dayList.map(d => d.id));
      setStaff(((st as any) || []) as StaffRow[]);
    } else {
      setStaff([]);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  // مرشحو الفريق: أعضاء المؤسسة + المالك
  useEffect(() => {
    if (!organization) return;
    (async () => {
      const { data: members } = await supabase
        .from("team_members").select("user_id").eq("organization_id", organization.id);
      const ids = new Set<string>(((members as any) || []).map((m: any) => m.user_id));
      ids.add((organization as any).owner_id);
      if (!ids.size) return;
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", [...ids]);
      setCandidates(((profs as any) || []).map((p: any) => ({ id: p.id, name: p.full_name || p.email || "عضو" })));
    })();
  }, [organization]);

  const nameOf = (id: string) => candidates.find(c => c.id === id)?.name || "عضو";

  // توليد الأيام تلقائياً من مدة الفعالية
  const generateDays = async () => {
    if (!event || !eventId) return;
    const start = new Date(event.start_date);
    const end = new Date(event.end_date || event.start_date);
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const list: { event_id: string; day_number: number; day_date: string; title: string }[] = [];
    let n = 1;
    while (cur.getTime() <= endDay.getTime() && n <= 30) {
      list.push({
        event_id: eventId,
        day_number: n,
        day_date: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`,
        title: `اليوم ${DAY_NAMES[n - 1] || n}`,
      });
      cur.setDate(cur.getDate() + 1);
      n++;
    }
    const existing = new Set(days.map(d => d.day_number));
    const fresh = list.filter(d => !existing.has(d.day_number));
    if (!fresh.length) { toast.info("الأيام مولدة مسبقاً"); return; }
    const { error } = await supabase.from("event_days" as any).insert(fresh as any);
    if (error) return toast.error(error.message);
    toast.success(`أُنشئ ${fresh.length} يوم`);
    load();
  };

  const addDay = async () => {
    if (!eventId) return;
    const maxN = Math.max(0, ...days.map(d => d.day_number));
    const lastDate = days.length ? new Date(days[days.length - 1].day_date) : new Date(event?.start_date || Date.now());
    lastDate.setDate(lastDate.getDate() + (days.length ? 1 : 0));
    const { error } = await supabase.from("event_days" as any).insert({
      event_id: eventId,
      day_number: maxN + 1,
      day_date: lastDate.toISOString().slice(0, 10),
      title: `اليوم ${DAY_NAMES[maxN] || maxN + 1}`,
    } as any);
    if (error) return toast.error(error.message);
    load();
  };

  const updateDayLocal = (id: string, patch: Partial<Day>) =>
    setDays(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)));

  const saveDay = async (d: Day) => {
    setSavingDay(d.id);
    const { error } = await supabase
      .from("event_days" as any)
      .update({ title: d.title, notes: d.notes, day_date: d.day_date } as any)
      .eq("id", d.id);
    setSavingDay(null);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ اليوم");
  };

  const removeDay = async (d: Day) => {
    if (!confirm(`حذف «${d.title || `اليوم ${d.day_number}`}»؟ ستُفك بواباته وفريقه.`)) return;
    const { error } = await supabase.from("event_days" as any).delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    load();
  };

  const addStaff = async (dayId: string, userId: string, role: string) => {
    if (!userId) return;
    const { error } = await supabase.from("event_day_staff" as any).insert({
      event_day_id: dayId, user_id: userId, role,
    } as any);
    if (error) return toast.error(error.message.includes("duplicate") ? "معيَّن في هذا اليوم مسبقاً" : error.message);
    load();
  };

  const removeStaff = async (rowId: string) => {
    await supabase.from("event_day_staff" as any).delete().eq("id", rowId);
    load();
  };

  const setGateDay = async (gateId: string, dayId: string | null) => {
    const { error } = await supabase.from("checkpoints").update({ event_day_id: dayId } as any).eq("id", gateId);
    if (error) return toast.error(error.message);
    setGates(prev => prev.map(g => (g.id === gateId ? { ...g, event_day_id: dayId } : g)));
  };

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2 -mr-2">
              <Link to="/dashboard/events"><ArrowRight className="w-4 h-4" /> العودة لفعالياتي</Link>
            </Button>
            <h1 className="font-bold text-2xl text-foreground flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-primary" /> أيام الفعالية
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {event?.title_ar} — لكل يوم فريقه وبواباته وتجهيزاته، وحضوره يُسجل مستقلاً
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full" onClick={generateDays} disabled={needsSql}>
              <Wand2 className="w-4 h-4" /> توليد الأيام من مدة الفعالية
            </Button>
            <Button className="rounded-full" onClick={addDay} disabled={needsSql}>
              <Plus className="w-4 h-4" /> إضافة يوم
            </Button>
          </div>
        </div>

        {needsSql ? (
          <div className="bg-amber-500/10 border border-amber-400/40 text-amber-800 rounded-2xl p-6 text-sm">
            ⚠️ ميزة الأيام المتعددة تحتاج تنفيذ ملف SQL الخاص بها (event_days) في قاعدة البيانات أولاً.
          </div>
        ) : days.length === 0 ? (
          <div className="bg-card rounded-2xl border p-12 text-center">
            <CalendarDays className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              لا توجد أيام بعد — اضغط "توليد الأيام من مدة الفعالية" وسننشئها تلقائياً من تاريخ البداية للنهاية
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {days.map(d => {
              const dayGates = gates.filter(g => g.event_day_id === d.id);
              const freeGates = gates.filter(g => !g.event_day_id);
              const dayStaff = staff.filter(s => s.event_day_id === d.id);
              return (
                <div key={d.id} className="bg-card border rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="w-10 h-10 rounded-full bg-primary/10 text-primary font-extrabold flex items-center justify-center">
                        {d.day_number}
                      </span>
                      <Input
                        value={d.title || ""}
                        onChange={e => updateDayLocal(d.id, { title: e.target.value })}
                        className="h-9 w-44 font-bold"
                        placeholder={`اليوم ${d.day_number}`}
                      />
                      <Input
                        type="date"
                        value={d.day_date}
                        onChange={e => updateDayLocal(d.id, { day_date: e.target.value })}
                        className="h-9 w-40"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => saveDay(d)} disabled={savingDay === d.id}>
                        {savingDay === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} حفظ
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={() => removeDay(d)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* فريق اليوم */}
                    <div className="border rounded-xl p-3">
                      <p className="text-xs font-bold mb-2 flex items-center gap-1"><Users className="w-3.5 h-3.5 text-primary" /> فريق اليوم</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {dayStaff.length === 0 && <span className="text-[11px] text-muted-foreground">لم يُعيَّن أحد بعد</span>}
                        {dayStaff.map(s => (
                          <span key={s.id} className="inline-flex items-center gap-1 text-[11px] font-bold bg-primary/10 text-primary rounded-full px-2.5 py-1">
                            {nameOf(s.user_id)} · {ROLE_LABELS[s.role] || s.role}
                            <button type="button" onClick={() => removeStaff(s.id)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                      <AddStaffRow candidates={candidates} onAdd={(uid, role) => addStaff(d.id, uid, role)} />
                    </div>

                    {/* بوابات اليوم */}
                    <div className="border rounded-xl p-3">
                      <p className="text-xs font-bold mb-2 flex items-center gap-1"><DoorOpen className="w-3.5 h-3.5 text-primary" /> بوابات اليوم</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {dayGates.length === 0 && <span className="text-[11px] text-muted-foreground">لا بوابات لهذا اليوم — البوابات غير المخصصة تعمل في كل الأيام</span>}
                        {dayGates.map(g => (
                          <span key={g.id} className="inline-flex items-center gap-1 text-[11px] font-bold bg-teal/10 text-teal-700 rounded-full px-2.5 py-1">
                            {g.name_ar} · {g.checkpoint_type === "exit" ? "خروج" : "دخول"}
                            <button type="button" onClick={() => setGateDay(g.id, null)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                      {freeGates.length > 0 && (
                        <select
                          defaultValue=""
                          onChange={e => { if (e.target.value) { setGateDay(e.target.value, d.id); e.target.value = ""; } }}
                          className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
                        >
                          <option value="">+ إسناد بوابة لهذا اليوم</option>
                          {freeGates.map(g => <option key={g.id} value={g.id}>{g.name_ar}</option>)}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* التجهيزات اليومية */}
                  <div>
                    <p className="text-xs font-bold mb-1">التجهيزات اليومية</p>
                    <Textarea
                      rows={2}
                      value={d.notes || ""}
                      onChange={e => updateDayLocal(d.id, { notes: e.target.value })}
                      placeholder="تجهيز القاعة الرئيسية، فريق الضيافة، تشغيل الشاشات..."
                      className="text-sm"
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-[11px] text-muted-foreground">
              البوابات غير المسندة لأي يوم تظهر في كل الأيام. عمليات المسح تُسجل على اليوم المختار في شاشة تسجيل الحضور.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const AddStaffRow = ({ candidates, onAdd }: { candidates: Candidate[]; onAdd: (uid: string, role: string) => void }) => {
  const [uid, setUid] = useState("");
  const [role, setRole] = useState("gate_staff");
  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      <select value={uid} onChange={e => setUid(e.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs min-w-[140px]">
        <option value="">— اختر عضواً —</option>
        {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={role} onChange={e => setRole(e.target.value)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs">
        {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => { onAdd(uid, role); setUid(""); }} disabled={!uid}>
        <Plus className="w-3 h-3" /> إضافة
      </Button>
    </div>
  );
};

export default EventDays;
