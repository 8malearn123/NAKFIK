import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DoorOpen, Save, Users, Loader2 } from "lucide-react";

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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-2xl text-foreground flex items-center gap-2">
            <DoorOpen className="w-6 h-6 text-primary" /> تعيين البوابات
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            عيّن موظفاً لكل بوابة — الموظف المعيَّن يرى بوابته فقط عند تسجيل الدخول ولا يصل لغيرها
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <label className="text-xs text-muted-foreground block mb-1">اختر الفعالية</label>
          <select
            value={selectedEvent}
            onChange={(e) => loadEvent(e.target.value)}
            className="w-full max-w-md h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="">— اختر فعالية —</option>
            {events.map(e => (
              <option key={e.id} value={e.id}>
                {e.title_ar} — {e.organizations?.name || ""} ({new Date(e.start_date).toLocaleDateString("ar-SA", { dateStyle: "short" })})
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : selectedEvent && gates.length === 0 ? (
          <div className="bg-card rounded-2xl border p-10 text-center text-muted-foreground text-sm">
            لا توجد بوابات لهذه الفعالية — ينشئها المنظم من صفحة بوابات الفعالية أولاً
          </div>
        ) : gates.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="text-right p-3">البوابة</th>
                  <th className="text-right p-3">الحالة</th>
                  <th className="text-right p-3">الموظف المعيَّن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {gates.map(g => (
                  <tr key={g.id} className="hover:bg-muted/20">
                    <td className="p-3 font-bold">{g.name_ar}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${g.is_active ? "bg-green-500/10 text-green-700" : "bg-muted text-muted-foreground"}`}>
                        {g.is_active ? "مفعّلة" : "موقوفة"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <select
                          value={g.assigned_user_id || ""}
                          onChange={(e) => assign(g, e.target.value)}
                          disabled={savingId === g.id}
                          className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold min-w-[220px] disabled:opacity-60"
                        >
                          <option value="">— بدون تعيين —</option>
                          {staff.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        {savingId === g.id && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default GateAssignments;
