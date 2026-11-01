import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatNumber } from "@/lib/format";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowRight, CalendarDays, Loader2, Plus, Save, Trash2, Wand2, X,
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

interface Gate { id: string; name_ar: string; checkpoint_type: string; }
interface GateLink { id: string; checkpoint_id: string; event_day_id: string; }
interface StaffRow { id: string; event_day_id: string; user_id: string; role: string; }
interface Candidate { id: string; name: string; }

const ROLE_LABELS: Record<string, string> = {
  gate_staff: "موظف بوابات",
  organizer: "منظم",
  supervisor: "مشرف",
};

// العدد مع معدوده بالصيغة الصحيحة: يوم واحد، يومين، 3 أيام، 11 يوماً، 100 يوم
const dayCount = (n: number) => {
  const tens = n % 100;
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومين";
  if (tens >= 3 && tens <= 10) return `${formatNumber(n)} أيام`;
  if (tens >= 11) return `${formatNumber(n)} يوماً`;
  return `${formatNumber(n)} يوم`;
};

const DAY_NAMES = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر"];

const EventDays = () => {
  const { eventId } = useParams();
  const { organization } = useAuth();
  const [event, setEvent] = useState<{ title_ar: string; start_date: string; end_date: string | null } | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [gateLinks, setGateLinks] = useState<GateLink[]>([]);
  const [linksSupported, setLinksSupported] = useState(true);
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
      supabase.from("checkpoints").select("id, name_ar, checkpoint_type").eq("event_id", eventId).order("display_order"),
    ]);
    setEvent(evt as any);
    if (daysRes.error) {
      setNeedsSql(true);
      setLoading(false);
      return;
    }
    const dayList = (daysRes.data as any as Day[]) || [];
    setDays(dayList);
    const gateList = ((cps as any) || []) as Gate[];
    setGates(gateList);

    // روابط البوابات بالأيام (متعدد-لمتعدد): البوابة تخدم أي عدد من الأيام
    if (gateList.length) {
      const linksRes = await supabase
        .from("checkpoint_days" as any)
        .select("id, checkpoint_id, event_day_id")
        .in("checkpoint_id", gateList.map(g => g.id));
      if (linksRes.error) { setLinksSupported(false); setGateLinks([]); }
      else { setLinksSupported(true); setGateLinks(((linksRes.data as any) || []) as GateLink[]); }
    } else {
      setGateLinks([]);
    }

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
    toast.success(`تم إنشاء ${dayCount(fresh.length)}`);
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

  const linkGate = async (gateId: string, dayId: string) => {
    const { data, error } = await supabase
      .from("checkpoint_days" as any)
      .insert({ checkpoint_id: gateId, event_day_id: dayId } as any)
      .select()
      .single();
    if (error) {
      if (error.message.includes("checkpoint_days")) setLinksSupported(false);
      return toast.error(error.message.includes("duplicate") ? "البوابة مسندة لهذا اليوم مسبقاً" : "نفّذ ملف SQL الخاص بتوزيع البوابات على الأيام أولاً");
    }
    setGateLinks(prev => [...prev, data as any]);
  };

  const unlinkGate = async (linkId: string) => {
    const { error } = await supabase.from("checkpoint_days" as any).delete().eq("id", linkId);
    if (error) return toast.error(error.message);
    setGateLinks(prev => prev.filter(l => l.id !== linkId));
  };

  const tagline = "لكل يوم فريقه وبواباته وتجهيزاته، وحضوره يُسجل مستقلاً";
  const header = (actions?: React.ReactNode) => (
    <div className="space-y-2">
      <Link to="/dashboard/events" className="inline-flex items-center gap-1.5 text-[13px] font-semibold leading-5 text-primary">
        <ArrowRight className="h-4 w-4" /> العودة لفعالياتي
      </Link>
      <PageHeader title="أيام الفعالية" description={event?.title_ar ? `${event.title_ar}، ${tagline}` : tagline} actions={actions} />
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {header()}
          {[1, 2].map(i => <div key={i} className="h-80 animate-pulse rounded-2xl bg-card shadow-soft" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {header(
          <>
            <Button variant="outline" onClick={generateDays} disabled={needsSql}>
              <Wand2 className="h-4 w-4" /> توليد الأيام من مدة الفعالية
            </Button>
            <Button onClick={addDay} disabled={needsSql}>
              <Plus className="h-4 w-4" /> إضافة يوم
            </Button>
          </>,
        )}

        {needsSql ? (
          <div className="flex items-start gap-3 rounded-2xl bg-[#FDF3E3] p-4 text-sm text-[#9A5F12]">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p>ميزة الأيام المتعددة تحتاج تنفيذ ملف SQL الخاص بها (<bdi dir="ltr">event_days</bdi>) في قاعدة البيانات أولاً.</p>
          </div>
        ) : days.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={CalendarDays}
              title="لا توجد أيام بعد"
              description="اضغط «توليد الأيام من مدة الفعالية» وسننشئها تلقائياً من تاريخ البداية للنهاية"
              action={<Button variant="soft" size="sm" onClick={generateDays}><Wand2 className="h-4 w-4" /> توليد الأيام من مدة الفعالية</Button>}
            />
          </div>
        ) : (
          <>
            {days.map(d => {
              // روابط هذا اليوم — وأي بوابة غير مسندة له متاحة للإسناد (حتى لو تخدم أياماً أخرى)
              const dayLinks = gateLinks.filter(l => l.event_day_id === d.id);
              const dayGates = dayLinks
                .map(l => ({ link: l, gate: gates.find(g => g.id === l.checkpoint_id) }))
                .filter(x => x.gate) as { link: GateLink; gate: Gate }[];
              const addableGates = gates.filter(g => !dayLinks.some(l => l.checkpoint_id === g.id));
              const dayStaff = staff.filter(s => s.event_day_id === d.id);
              return (
                <Panel key={d.id} bodyClassName="space-y-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex min-w-0 basis-full items-center gap-2.5 sm:basis-auto">
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-sm font-bold text-primary">
                        {d.day_number}
                      </span>
                      <Input
                        value={d.title || ""}
                        onChange={e => updateDayLocal(d.id, { title: e.target.value })}
                        className="h-9 min-w-0 flex-1 font-semibold sm:w-52 sm:flex-none"
                        placeholder={`اليوم ${d.day_number}`}
                        aria-label="عنوان اليوم"
                      />
                    </div>
                    <Input
                      type="date"
                      value={d.day_date}
                      onChange={e => updateDayLocal(d.id, { day_date: e.target.value })}
                      className="h-9 min-w-0 flex-1 sm:w-44 sm:flex-none"
                      aria-label="تاريخ اليوم"
                    />
                    <div className="flex items-center gap-1.5 sm:ms-auto">
                      <Button size="sm" variant="outline" onClick={() => saveDay(d)} disabled={savingDay === d.id}>
                        {savingDay === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ
                      </Button>
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => removeDay(d)} aria-label="حذف اليوم">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* فريق اليوم */}
                    <div className="space-y-3 rounded-xl bg-muted/50 p-4">
                      <p className="text-sm font-semibold">فريق اليوم</p>
                      <div className="flex flex-wrap gap-2">
                        {dayStaff.length === 0 && <span className="text-xs text-muted-foreground">لم يُعيَّن أحد بعد</span>}
                        {dayStaff.map(s => (
                          <span key={s.id} className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-card pe-1.5 ps-2.5 text-xs font-semibold">
                            {nameOf(s.user_id)}
                            <span className="font-normal text-muted-foreground">{ROLE_LABELS[s.role] || s.role}</span>
                            <button type="button" onClick={() => removeStaff(s.id)} className="text-muted-foreground transition-colors hover:text-destructive" aria-label={`إزالة ${nameOf(s.user_id)}`}><X className="h-3.5 w-3.5" /></button>
                          </span>
                        ))}
                      </div>
                      <AddStaffRow candidates={candidates} onAdd={(uid, role) => addStaff(d.id, uid, role)} />
                    </div>

                    {/* بوابات اليوم */}
                    <div className="space-y-3 rounded-xl bg-muted/50 p-4">
                      <p className="text-sm font-semibold">بوابات اليوم</p>
                      {!linksSupported && (
                        <p className="rounded-lg bg-[#FDF3E3] px-2.5 py-1.5 text-xs text-[#9A5F12]">
                          نفّذ ملف SQL الخاص بتوزيع البوابات على الأيام لتفعيل هذا القسم
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {dayGates.length === 0 && <span className="text-xs text-muted-foreground">لا بوابات مسندة، والبوابات غير المسندة لأي يوم تعمل في كل الأيام</span>}
                        {dayGates.map(({ link, gate }) => (
                          <span key={link.id} className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-card pe-1.5 ps-2.5 text-xs font-semibold">
                            {gate.name_ar}
                            <span className="font-normal text-muted-foreground">{gate.checkpoint_type === "exit" ? "خروج" : "دخول"}</span>
                            <button type="button" onClick={() => unlinkGate(link.id)} className="text-muted-foreground transition-colors hover:text-destructive" title="إزالة من هذا اليوم فقط" aria-label={`إزالة ${gate.name_ar} من هذا اليوم فقط`}><X className="h-3.5 w-3.5" /></button>
                          </span>
                        ))}
                      </div>
                      {linksSupported && addableGates.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground">اضغط للإسناد:</span>
                          {addableGates.map(g => (
                            <Button key={g.id} type="button" size="sm" variant="outline" className="h-7 gap-1 rounded-lg px-2 text-xs" onClick={() => linkGate(g.id, d.id)}>
                              <Plus className="!size-3.5" /> {g.name_ar}
                              <span className="font-normal text-muted-foreground">{g.checkpoint_type === "exit" ? "خروج" : "دخول"}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* التجهيزات اليومية */}
                  <div className="space-y-1.5">
                    <Label htmlFor={`day-notes-${d.id}`}>التجهيزات اليومية</Label>
                    <Textarea
                      id={`day-notes-${d.id}`}
                      rows={2}
                      value={d.notes || ""}
                      onChange={e => updateDayLocal(d.id, { notes: e.target.value })}
                      placeholder="تجهيز القاعة الرئيسية، فريق الضيافة، تشغيل الشاشات..."
                      className="text-sm"
                    />
                  </div>
                </Panel>
              );
            })}
            <p className="text-xs leading-5 text-muted-foreground">
              البوابة الواحدة يمكن إسنادها لعدة أيام معاً، والبوابات غير المسندة لأي يوم تعمل في كل الأيام. عمليات المسح تُسجل على اليوم المختار في شاشة تسجيل الحضور.
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

const AddStaffRow = ({ candidates, onAdd }: { candidates: Candidate[]; onAdd: (uid: string, role: string) => void }) => {
  const [uid, setUid] = useState("");
  const [role, setRole] = useState("gate_staff");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={uid} onValueChange={setUid}>
        <SelectTrigger aria-label="اختر عضواً" className="h-9 min-w-[140px] flex-1"><SelectValue placeholder="اختر عضواً" /></SelectTrigger>
        <SelectContent>{candidates.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={role} onValueChange={setRole}>
        <SelectTrigger aria-label="الدور" className="h-9 w-36"><SelectValue /></SelectTrigger>
        <SelectContent>{Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
      </Select>
      <Button size="sm" variant="outline" onClick={() => { onAdd(uid, role); setUid(""); }} disabled={!uid}>
        <Plus className="h-4 w-4" /> إضافة
      </Button>
    </div>
  );
};

export default EventDays;
