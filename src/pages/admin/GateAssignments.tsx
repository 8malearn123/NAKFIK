import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatusBadge from "@/components/app/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { DoorOpen, Loader2 } from "lucide-react";

// تعيين موظف لكل بوابة — صلاحية إدارية حصراً.
// المنظم ينشئ البوابات ويسميها فقط؛ التعيين يتم من هنا.

interface EventRow {
  id: string;
  title_ar: string;
  start_date: string;
  organization_id: string;
  organizations?: { name: string } | null;
}

interface GateRow {
  id: string;
  name_ar: string;
  checkpoint_type: string;
  is_active: boolean;
  assigned_user_id: string | null;
}

interface StaffOption {
  id: string;
  name: string;
  role: string;
}

// عنصر Select لا يقبل قيمة فارغة، فنستخدم قيمة بديلة تعني "بدون اختيار"
const NONE = "none";

const GateAssignments = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [gates, setGates] = useState<GateRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => { document.title = "تعيين البوابات | نكفيك"; }, []);

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title_ar, start_date, organization_id, organizations(name)")
      .in("status", ["published", "approved", "pending_review"])
      .order("start_date", { ascending: false })
      .limit(100)
      .then(({ data }) => setEvents(((data as any) || []).map((e: any) => ({
        ...e,
        organizations: Array.isArray(e.organizations) ? e.organizations[0] : e.organizations,
      }))));
  }, []);

  const loadEvent = async (eventId: string) => {
    setSelectedEvent(eventId);
    setGates([]);
    setStaff([]);
    if (!eventId) return;
    setLoading(true);

    const ev = events.find(e => e.id === eventId);
    const [{ data: cps }, { data: members }, { data: org }] = await Promise.all([
      supabase.from("checkpoints").select("id, name_ar, checkpoint_type, is_active, assigned_user_id").eq("event_id", eventId).order("display_order"),
      supabase.from("team_members").select("user_id, role").eq("organization_id", ev?.organization_id || ""),
      supabase.from("organizations").select("owner_id").eq("id", ev?.organization_id || "").maybeSingle(),
    ]);
    setGates(((cps as any) || []) as GateRow[]);

    // مرشحو التعيين: فريق المؤسسة + مالكها
    const roleOf: Record<string, string> = {};
    const ids = new Set<string>();
    ((members as any) || []).forEach((m: any) => { ids.add(m.user_id); roleOf[m.user_id] = m.role; });
    if ((org as any)?.owner_id) { ids.add((org as any).owner_id); roleOf[(org as any).owner_id] ||= "owner"; }

    if (ids.size) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", [...ids]);
      const roleLabel: Record<string, string> = {
        owner: "مالك المؤسسة", admin: "مشرف", event_manager: "مدير فعالية",
        checkin_staff: "موظف تسجيل", reporter: "محلل تقارير",
      };
      setStaff(((profs as any) || []).map((p: any) => ({
        id: p.id,
        name: `${p.full_name || p.email || p.id.slice(0, 8)} (${roleLabel[roleOf[p.id]] || roleOf[p.id]})`,
        role: roleOf[p.id],
      })));
    }
    setLoading(false);
  };

  const assign = async (gate: GateRow, userId: string) => {
    setSavingId(gate.id);
    const { error } = await supabase
      .from("checkpoints")
      .update({ assigned_user_id: userId || null } as any)
      .eq("id", gate.id);
    setSavingId(null);
    if (error) {
      toast.error(error.message.includes("ASSIGNMENT_ADMIN_ONLY")
        ? "التعيين من صلاحيات الإدارة فقط"
        : error.message.includes("assigned_user_id")
        ? "نفّذ ملف SQL الخاص بتعيين البوابات أولاً"
        : "تعذر حفظ التعيين");
      return;
    }
    setGates(prev => prev.map(g => g.id === gate.id ? { ...g, assigned_user_id: userId || null } : g));
    toast.success(userId ? "تم تعيين الموظف على البوابة" : "أُلغي تعيين الموظف");
  };

  const selected = events.find(e => e.id === selectedEvent);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader title="تعيين البوابات" description="عيّن موظفاً لكل بوابة، الموظف المعيَّن يرى بوابته فقط عند تسجيل الدخول ولا يصل لغيرها" />

        <div className="flex flex-wrap gap-2.5">
          <Select value={selectedEvent || NONE} onValueChange={(v) => loadEvent(v === NONE ? "" : v)}>
            <SelectTrigger aria-label="اختر الفعالية" className="h-10 w-full max-w-lg gap-2 font-medium"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>اختر فعالية</SelectItem>
              {events.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {[e.title_ar, e.organizations?.name, formatDate(e.start_date)].filter(Boolean).join("، ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-card shadow-soft" />
        ) : !selectedEvent ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState icon={DoorOpen} title="اختر فعالية لعرض بواباتها" description="تظهر هنا بوابات الفعالية والموظف المعيَّن لكل بوابة" />
          </div>
        ) : gates.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={DoorOpen}
              title="لا توجد بوابات لهذه الفعالية"
              description="ينشئها المنظم من صفحة بوابات الفعالية أولاً"
              action={<Button asChild size="sm" variant="outline"><Link to="/admin/events">عرض جميع الفعاليات</Link></Button>}
            />
          </div>
        ) : (
          <Panel
            title={selected?.title_ar}
            description={selected ? [selected.organizations?.name, formatDate(selected.start_date)].filter(Boolean).join("، ") : undefined}
            flush
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">البوابة</TableHead>
                  <TableHead className="hidden sm:table-cell">الحالة</TableHead>
                  <TableHead className="pe-6 sm:w-80">الموظف المعيَّن</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gates.map(g => (
                  <TableRow key={g.id}>
                    <TableCell className="whitespace-nowrap ps-6">
                      <p className="font-semibold leading-[22px]">{g.name_ar}</p>
                      {/* على الهاتف تبقى الحالة تحت الاسم حتى يظهر اختيار الموظف كاملاً */}
                      <StatusBadge tone={g.is_active ? "success" : "neutral"} className="mt-1 sm:hidden">{g.is_active ? "مفعّلة" : "موقوفة"}</StatusBadge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusBadge tone={g.is_active ? "success" : "neutral"}>{g.is_active ? "مفعّلة" : "موقوفة"}</StatusBadge>
                    </TableCell>
                    <TableCell className="pe-6">
                      <div className="flex w-44 items-center gap-2 sm:w-72">
                        <Select value={g.assigned_user_id || NONE} onValueChange={(v) => assign(g, v === NONE ? "" : v)} disabled={savingId === g.id}>
                          <SelectTrigger aria-label={`الموظف المعيَّن على ${g.name_ar}`} className="h-9 gap-2 font-medium"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>بدون تعيين</SelectItem>
                            {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {savingId === g.id && <Loader2 className="h-4 w-4 flex-none animate-spin text-primary" />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        )}
      </div>
    </AdminLayout>
  );
};

export default GateAssignments;
