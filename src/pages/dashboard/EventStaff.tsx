// فريق الفعالية: الراعي الأساسي يضيف موظفيه بالبريد ويحدد دور كل واحد —
// كل دور له صلاحيات محددة ولا يحصل الموظف على أكثر من المطلوب لدوره.
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Users, Trash2, ShieldCheck, ScanLine, ClipboardList, BarChart3 } from "lucide-react";

interface StaffRow {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: { full_name: string | null; email: string | null };
}

// الأدوار وصلاحياتها — محددة وواضحة، بلا صلاحيات زائدة
const ROLES: Record<string, { label: string; Icon: typeof Users; desc: string; perms: string[] }> = {
  manager: {
    label: "مدير الفعالية",
    Icon: ShieldCheck,
    desc: "إدارة كاملة لهذه الفعالية فقط",
    perms: ["إدارة الأيام والبوابات", "تسجيل الدخول والمسح", "قوائم الحضور", "التقارير"],
  },
  checkin: {
    label: "موظف تسجيل دخول",
    Icon: ScanLine,
    desc: "المسح عند البوابة المعيّنة له فقط",
    perms: ["مسح التذاكر والدعوات عند بوابته"],
  },
  attendance: {
    label: "مشرف حضور",
    Icon: ClipboardList,
    desc: "متابعة قوائم الحضور فقط",
    perms: ["عرض قوائم الدخول والخروج ومدة البقاء"],
  },
  reports: {
    label: "محلل تقارير",
    Icon: BarChart3,
    desc: "الاطلاع على تقارير الفعالية فقط",
    perms: ["عرض إحصائيات وتقارير الفعالية"],
  },
};

const SQL_HINT = "شغّل ملف nakfik_invitation_v2.sql في Supabase لتفعيل فريق الفعالية";

const EventStaff = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [eventTitle, setEventTitle] = useState("");
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("checkin");
  const [adding, setAdding] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  const load = async () => {
    if (!eventId) return;
    const [{ data: ev }, res] = await Promise.all([
      supabase.from("events").select("title_ar").eq("id", eventId).maybeSingle(),
      (supabase as any).from("event_staff").select("*").eq("event_id", eventId).order("created_at"),
    ]);
    setEventTitle(ev?.title_ar || "");
    if (res.error) {
      setTableMissing(true);
      setLoading(false);
      return;
    }
    const rows = (res.data || []) as StaffRow[];
    // جلب أسماء وبريد الموظفين
    if (rows.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", rows.map((r) => r.user_id));
      rows.forEach((r) => {
        const p = (profs || []).find((x: any) => x.id === r.user_id);
        r.profile = p ? { full_name: p.full_name, email: (p as any).email } : undefined;
      });
    }
    setStaff(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const addStaff = async () => {
    if (!eventId || !email.trim()) return toast.error("أدخل بريد الموظف");
    setAdding(true);
    // البحث عن المستخدم بالبريد عبر دالة آمنة
    const { data: uid, error: findErr } = await (supabase as any).rpc("find_user_id_by_email", { p_email: email.trim() });
    if (findErr) {
      setAdding(false);
      return toast.error(findErr.message.includes("function") ? SQL_HINT : "تعذّر البحث عن المستخدم");
    }
    if (!uid) {
      setAdding(false);
      return toast.error("لا يوجد حساب مسجل بهذا البريد — اطلب من الموظف إنشاء حساب أولاً");
    }
    const { data: me } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("event_staff").insert({
      event_id: eventId,
      user_id: uid,
      role,
      created_by: me.user?.id,
    });
    setAdding(false);
    if (error) {
      if (error.message.includes("duplicate")) return toast.error("هذا الموظف مضاف مسبقاً لهذه الفعالية");
      return toast.error(error.message.includes("event_staff") ? SQL_HINT : "تعذّرت الإضافة");
    }
    toast.success(`تمت إضافة الموظف بدور ${ROLES[role].label}`);
    setEmail("");
    load();
  };

  const removeStaff = async (id: string) => {
    if (!confirm("إزالة هذا الموظف من فريق الفعالية؟")) return;
    const { error } = await (supabase as any).from("event_staff").delete().eq("id", id);
    if (error) return toast.error("تعذّرت الإزالة");
    setStaff(staff.filter((s) => s.id !== id));
    toast.success("تمت الإزالة");
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/events"><ArrowRight className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="font-bold text-2xl text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> فريق الفعالية
            </h1>
            <p className="text-muted-foreground text-sm">
              {eventTitle && <>فعالية: <span className="font-semibold text-foreground">{eventTitle}</span> · </>}
              كل موظف يحصل على صلاحيات دوره فقط — لا أكثر
            </p>
          </div>
        </div>

        {tableMissing && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-400/40 text-amber-800 p-4 text-sm leading-relaxed">
            ⚠️ {SQL_HINT} — بعدها ارجع لهذه الصفحة.
          </div>
        )}

        {/* إضافة موظف */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-4">
          <h2 className="font-bold text-foreground">إضافة موظف</h2>
          <div className="space-y-1.5">
            <Label>البريد الإلكتروني للموظف (حسابه في نكفيك)</Label>
            <Input dir="ltr" placeholder="staff@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>الدور والصلاحيات</Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {Object.entries(ROLES).map(([k, r]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setRole(k)}
                  className={`rounded-xl border-2 p-3 text-right transition ${
                    role === k ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="font-bold text-sm flex items-center gap-1.5">
                    <r.Icon className="w-4 h-4 text-primary" /> {r.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{r.desc}</p>
                  <ul className="mt-1.5 space-y-0.5">
                    {r.perms.map((p) => (
                      <li key={p} className="text-[10px] text-muted-foreground">✓ {p}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>
          <Button onClick={addStaff} disabled={adding} className="w-full">
            {adding ? "جارٍ الإضافة..." : "إضافة للفريق"}
          </Button>
        </div>

        {/* قائمة الفريق */}
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <h2 className="font-bold text-foreground text-sm">أعضاء الفريق ({staff.length})</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">جاري التحميل...</div>
          ) : staff.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">لا يوجد موظفون بعد — أضف أول موظف أعلاه</div>
          ) : (
            staff.map((s) => {
              const r = ROLES[s.role] || ROLES.checkin;
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {(s.profile?.full_name || "م").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{s.profile?.full_name || "مستخدم"}</p>
                    <p className="text-[11px] text-muted-foreground truncate" dir="ltr">{s.profile?.email || s.user_id}</p>
                  </div>
                  <span className="text-[11px] font-bold bg-primary/10 text-primary rounded-full px-2.5 py-1 flex items-center gap-1">
                    <r.Icon className="w-3 h-3" /> {r.label}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeStaff(s.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          ملاحظة: موظف "تسجيل الدخول" يُعيَّن على بوابة محددة من صفحة تعيين البوابات، وجميع عمليات مسحه تُسجل على بوابته تلقائياً.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default EventStaff;
