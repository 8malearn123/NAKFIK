// فريق الفعالية: الراعي الأساسي يضيف موظفيه بالبريد ويحدد دور كل واحد —
// كل دور له صلاحيات محددة ولا يحصل الموظف على أكثر من المطلوب لدوره.
import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Check, Plus, Users, Trash2, ShieldCheck, ScanLine, ClipboardList, BarChart3 } from "lucide-react";

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

// العدد مع معدوده بالصيغة الصحيحة: عضو واحد، عضوان، 3 أعضاء، 11 عضواً، 100 عضو
const memberCount = (n: number) => {
  const tens = n % 100;
  if (n === 1) return "عضو واحد";
  if (n === 2) return "عضوان";
  if (tens >= 3 && tens <= 10) return `${formatNumber(n)} أعضاء`;
  if (tens >= 11) return `${formatNumber(n)} عضواً`;
  return `${formatNumber(n)} عضو`;
};

const EventStaff = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [eventTitle, setEventTitle] = useState("");
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("checkin");
  const [adding, setAdding] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

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

  const tagline = "كل موظف يحصل على صلاحيات دوره فقط، لا أكثر";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <Link to="/dashboard/events" className="inline-flex items-center gap-1.5 text-[13px] font-semibold leading-5 text-primary">
            <ArrowRight className="h-4 w-4" /> العودة لفعالياتي
          </Link>
          <PageHeader title="فريق الفعالية" description={eventTitle ? `${eventTitle}، ${tagline}` : tagline} />
        </div>

        {tableMissing && (
          <div className="flex items-start gap-3 rounded-2xl bg-[#FDF3E3] p-4 text-sm leading-relaxed text-[#9A5F12]">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p>شغّل ملف <bdi dir="ltr">nakfik_invitation_v2.sql</bdi> في Supabase لتفعيل فريق الفعالية، بعدها ارجع لهذه الصفحة.</p>
          </div>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-3">
          {/* قائمة الفريق */}
          <div className="min-w-0 space-y-4 xl:col-span-2">
            <Panel flush title="أعضاء الفريق" description={loading || staff.length === 0 ? undefined : memberCount(staff.length)}>
              {loading ? (
                <div className="space-y-3 px-6 pb-6">
                  {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />)}
                </div>
              ) : staff.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="لا يوجد موظفون بعد"
                  description="أضف أول موظف ليظهر هنا مع دوره وصلاحياته"
                  action={<Button variant="soft" size="sm" onClick={() => emailRef.current?.focus()}><Plus className="h-4 w-4" /> إضافة موظف</Button>}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-6">الموظف</TableHead>
                      <TableHead className="hidden sm:table-cell">الدور</TableHead>
                      <TableHead className="pe-6"><span className="sr-only">إزالة</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((s) => {
                      const r = ROLES[s.role] || ROLES.checkin;
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="whitespace-nowrap ps-6">
                            <p className="font-semibold leading-[22px]">{s.profile?.full_name || "مستخدم"}</p>
                            <p className="text-xs leading-[18px] text-muted-foreground"><bdi dir="ltr">{s.profile?.email || s.user_id}</bdi></p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs sm:hidden"><r.Icon className="h-3.5 w-3.5 text-primary" /> {r.label}</p>
                          </TableCell>
                          <TableCell className="hidden whitespace-nowrap sm:table-cell">
                            <span className="inline-flex items-center gap-2"><r.Icon className="h-4 w-4 text-primary" /> {r.label}</span>
                          </TableCell>
                          <TableCell className="pe-6 text-end">
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => removeStaff(s.id)} aria-label="إزالة من الفريق">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Panel>
            <p className="text-xs leading-5 text-muted-foreground">
              ملاحظة: موظف "تسجيل الدخول" يُعيَّن على بوابة محددة من صفحة تعيين البوابات، وجميع عمليات مسحه تُسجل على بوابته تلقائياً.
            </p>
          </div>

          {/* إضافة موظف */}
          <Panel title="إضافة موظف" bodyClassName="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="staff-email">البريد الإلكتروني للموظف (حسابه في نكفيك)</Label>
              <Input ref={emailRef} id="staff-email" dir="ltr" placeholder="staff@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>الدور والصلاحيات</Label>
              <div className="space-y-2.5">
                {Object.entries(ROLES).map(([k, r]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={role === k}
                    onClick={() => setRole(k)}
                    className={`block w-full rounded-xl p-3 text-start transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      role === k ? "bg-secondary ring-2 ring-primary" : "bg-muted/50 hover:bg-secondary"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <r.Icon className="h-4 w-4 text-primary" /> {r.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{r.desc}</span>
                    <span className="mt-1.5 block space-y-0.5">
                      {r.perms.map((p) => (
                        <span key={p} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Check className="h-3.5 w-3.5 flex-none text-primary" /> {p}
                        </span>
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={addStaff} disabled={adding} className="w-full">
              {adding ? "جارٍ الإضافة..." : "إضافة للفريق"}
            </Button>
          </Panel>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EventStaff;
