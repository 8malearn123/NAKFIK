import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatusBadge from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Users, Plus, Trash2, X } from "lucide-react";

const roleLabels: Record<string, string> = {
  admin: "مدير",
  event_manager: "مدير فعاليات",
  checkin_staff: "طاقم تسجيل الحضور",
  reporter: "مراجع التقارير",
};

const PERMISSIONS: { key: string; label: string; desc: string }[] = [
  { key: "events.manage", label: "إدارة الفعاليات", desc: "إنشاء وتعديل وحذف الفعاليات" },
  { key: "events.publish", label: "نشر الفعاليات", desc: "نشر أو إلغاء نشر الفعاليات" },
  { key: "tickets.manage", label: "إدارة التذاكر", desc: "إدارة أنواع التذاكر والأسعار" },
  { key: "checkin", label: "تسجيل الحضور", desc: "مسح QR وتسجيل دخول الحاضرين" },
  { key: "guests.manage", label: "إدارة الضيوف", desc: "إضافة وتعديل قوائم الضيوف" },
  { key: "reports.view", label: "عرض التقارير", desc: "الاطلاع على التقارير والإحصائيات" },
  { key: "team.manage", label: "إدارة الفريق", desc: "إضافة وحذف أعضاء الفريق" },
  { key: "settings.manage", label: "إدارة الإعدادات", desc: "تعديل إعدادات الجهة" },
];

const ROLE_PRESETS: Record<string, string[]> = {
  admin: PERMISSIONS.map(p => p.key),
  event_manager: ["events.manage", "events.publish", "tickets.manage", "guests.manage", "reports.view"],
  checkin_staff: ["checkin"],
  reporter: ["reports.view"],
};

interface Member {
  id: string;
  user_id: string | null;
  role: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  permissions?: string[] | null;
  invite_status?: string | null;
  joined_at: string | null;
}

const Team = () => {
  const { organization } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<keyof typeof ROLE_PRESETS>("event_manager");
  const [permissions, setPermissions] = useState<string[]>(ROLE_PRESETS.event_manager);

  useEffect(() => {
    if (!organization) return;
    loadMembers();
  }, [organization]);

  const loadMembers = async () => {
    if (!organization) return;
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .eq("organization_id", organization.id)
      .order("joined_at", { ascending: false });
    setMembers((data || []) as Member[]);
    setLoading(false);
  };

  const onRoleChange = (r: keyof typeof ROLE_PRESETS) => {
    setRole(r);
    setPermissions(ROLE_PRESETS[r] || []);
  };

  const togglePerm = (key: string) => {
    setPermissions(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key]);
  };

  const resetForm = () => {
    setFullName(""); setEmail(""); setPhone("");
    setRole("event_manager");
    setPermissions(ROLE_PRESETS.event_manager);
  };

  const handleAdd = async () => {
    if (!organization) return;
    if (!fullName.trim()) { toast.error("الاسم مطلوب"); return; }
    if (!phone.trim() || !/^\+9665\d{8}$/.test(phone.trim())) {
      toast.error("رقم الجوال يجب أن يكون بصيغة +9665XXXXXXXX");
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("البريد الإلكتروني غير صحيح");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("team_members").insert({
      organization_id: organization.id,
      full_name: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim(),
      role: role as any,
      permissions,
      invite_status: "pending",
    } as any);
    setSaving(false);
    if (error) { toast.error("تعذّر إضافة العضو: " + error.message); return; }
    toast.success("تم إضافة العضو بنجاح");
    resetForm();
    setShowAdd(false);
    loadMembers();
  };

  const removeMember = async (id: string) => {
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) { toast.error("حدث خطأ أثناء الحذف"); return; }
    setMembers(members.filter(m => m.id !== id));
    toast.success("تم حذف العضو");
  };

  const header = (actions?: React.ReactNode) => (
    <PageHeader title="إدارة الفريق" description="إضافة وإدارة أعضاء فريقك وصلاحياتهم" actions={actions} />
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {header()}
          <div className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {header(
          <Button onClick={() => setShowAdd(!showAdd)} variant={showAdd ? "outline" : "default"}>
            {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAdd ? "إلغاء" : "إضافة عضو"}
          </Button>,
        )}

        {showAdd && (
          <Panel title="إضافة عضو جديد" bodyClassName="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="member-name">الاسم الكامل *</Label>
                <Input id="member-name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="مثال: أحمد محمد" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="member-phone">رقم الجوال *</Label>
                <Input id="member-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+9665XXXXXXXX" dir="ltr" className="text-end" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="member-email">البريد الإلكتروني (اختياري)</Label>
                <Input id="member-email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" dir="ltr" className="text-end" />
              </div>
              <div className="space-y-1.5">
                <Label>الدور الأساسي</Label>
                <Select value={role} onValueChange={v => onRoleChange(v as keyof typeof ROLE_PRESETS)}>
                  <SelectTrigger aria-label="الدور الأساسي"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">الصلاحيات المخصصة</p>
                <Button type="button" variant="ghost" size="sm" className="text-primary" onClick={() => setPermissions(ROLE_PRESETS[role] || [])}>
                  استعادة افتراضي الدور
                </Button>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {PERMISSIONS.map(p => (
                  <label
                    key={p.key}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-colors",
                      permissions.includes(p.key) ? "bg-secondary" : "bg-muted/50 hover:bg-muted",
                    )}
                  >
                    <Checkbox checked={permissions.includes(p.key)} onCheckedChange={() => togglePerm(p.key)} className="mt-0.5" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-5">{p.label}</span>
                      <span className="block text-xs leading-[18px] text-muted-foreground">{p.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Button onClick={handleAdd} disabled={saving}>
                <Plus className="h-4 w-4" />
                {saving ? "جاري الإضافة..." : "إضافة العضو"}
              </Button>
              <Button variant="outline" onClick={() => { resetForm(); setShowAdd(false); }}>إلغاء</Button>
            </div>
          </Panel>
        )}

        {members.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={Users}
              title="لا يوجد أعضاء في الفريق"
              description="أضف أعضاء لمساعدتك في إدارة الفعاليات"
              action={!showAdd ? <Button variant="soft" size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> إضافة عضو</Button> : undefined}
            />
          </div>
        ) : (
          <Panel title="أعضاء الفريق" flush>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">العضو</TableHead>
                  <TableHead>رقم الجوال</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الصلاحيات</TableHead>
                  <TableHead className="pe-6"><span className="sr-only">إجراءات</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="ps-6">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-secondary text-sm font-bold text-primary">
                          {(m.full_name || m.email || "?").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="whitespace-nowrap font-semibold leading-[22px]">{m.full_name || "بدون اسم"}</p>
                            {m.invite_status === "pending" && <StatusBadge tone="warning">دعوة معلّقة</StatusBadge>}
                          </div>
                          {m.email && <p className="text-xs leading-[18px] text-muted-foreground"><bdi dir="ltr">{m.email}</bdi></p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{m.phone ? <bdi dir="ltr">{m.phone}</bdi> : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{roleLabels[m.role] || m.role}</TableCell>
                    <TableCell>
                      {m.permissions && m.permissions.length > 0 ? (
                        <div className="flex min-w-[200px] flex-wrap gap-1">
                          {m.permissions.map(pk => {
                            const p = PERMISSIONS.find(x => x.key === pk);
                            return (
                              <span key={pk} className="whitespace-nowrap rounded-md bg-muted px-2 py-0.5 text-xs leading-[18px] text-muted-foreground">
                                {p?.label || pk}
                              </span>
                            );
                          })}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="pe-6 text-end">
                      <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)} className="h-9 w-9 text-destructive hover:text-destructive" aria-label="حذف العضو">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Team;
