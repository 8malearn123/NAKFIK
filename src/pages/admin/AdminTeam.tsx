import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatusBadge from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Users } from "lucide-react";

const PERMISSIONS: { key: string; label: string; desc: string }[] = [
  { key: "events.review", label: "مراجعة الفعاليات", desc: "اعتماد ورفض الفعاليات الجديدة" },
  { key: "events.manage", label: "إدارة جميع الفعاليات", desc: "تعديل وحذف فعاليات أي منظم" },
  { key: "users.manage", label: "إدارة المستخدمين", desc: "عرض وتعديل وحذف الحسابات" },
  { key: "users.invite", label: "دعوة مستخدمين", desc: "إرسال دعوات لحسابات جديدة" },
  { key: "organizers.manage", label: "إدارة المنظمين", desc: "تفعيل وتعليق حسابات المنظمين" },
  { key: "subscriptions.manage", label: "إدارة الاشتراكات", desc: "تعديل الباقات وتفعيل الاشتراكات" },
  { key: "finance.view", label: "الاطلاع على المالية", desc: "عرض الإيرادات والعمولات" },
  { key: "finance.manage", label: "إدارة المالية", desc: "تنفيذ التسويات وإدارة المدفوعات" },
  { key: "analytics.view", label: "تحليلات المنصة", desc: "عرض الإحصائيات والتقارير" },
  { key: "announcements.manage", label: "إدارة الإعلانات", desc: "نشر الإعلانات والتنبيهات" },
  { key: "team.manage", label: "إدارة الفريق", desc: "إضافة وحذف أعضاء الإدارة" },
];

const PRESETS: Record<string, { label: string; perms: string[] }> = {
  full: { label: "مدير عام (كل الصلاحيات)", perms: PERMISSIONS.map(p => p.key) },
  ops: { label: "تشغيل ودعم", perms: ["events.review", "events.manage", "users.manage", "organizers.manage"] },
  finance: { label: "محاسب", perms: ["finance.view", "finance.manage", "subscriptions.manage", "analytics.view"] },
  reviewer: { label: "مراجع فعاليات", perms: ["events.review"] },
};

interface Member {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  permissions: string[];
  invite_status: string;
  created_at: string;
}

const AdminTeam = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preset, setPreset] = useState<keyof typeof PRESETS>("ops");
  const [permissions, setPermissions] = useState<string[]>(PRESETS.ops.perms);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from("admin_team_members" as any).select("*").order("created_at", { ascending: false });
    setMembers((data || []) as any);
    setLoading(false);
  };

  const onPreset = (p: keyof typeof PRESETS) => { setPreset(p); setPermissions(PRESETS[p].perms); };
  const togglePerm = (k: string) => setPermissions(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k]);

  const reset = () => {
    setFullName(""); setEmail(""); setPhone("");
    setPreset("ops"); setPermissions(PRESETS.ops.perms);
  };

  const handleAdd = async () => {
    if (!fullName.trim()) { toast.error("الاسم مطلوب"); return; }
    if (phone && !/^\+9665\d{8}$/.test(phone.trim())) { toast.error("رقم الجوال يجب أن يكون بصيغة +9665XXXXXXXX"); return; }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) { toast.error("البريد الإلكتروني غير صحيح"); return; }
    if (permissions.length === 0) { toast.error("اختر صلاحية واحدة على الأقل"); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("admin_team_members" as any).insert({
      full_name: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      permissions,
      invited_by: user?.id || null,
    } as any);
    setSaving(false);
    if (error) { toast.error("تعذّر الإضافة: " + error.message); return; }
    toast.success("تمت إضافة العضو بنجاح");
    reset(); setShowAdd(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا العضو؟")) return;
    const { error } = await supabase.from("admin_team_members" as any).delete().eq("id", id);
    if (error) { toast.error("فشل الحذف"); return; }
    setMembers(m => m.filter(x => x.id !== id));
    toast.success("تم الحذف");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="فريق إدارة النظام"
          description="إضافة مستخدمين للحساب الأساسي وتحديد صلاحياتهم"
          actions={<Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> إضافة عضو</Button>}
        />

        {loading ? (
          <div className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />
        ) : members.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={Users}
              title="لا يوجد أعضاء بعد"
              description="أضف مستخدمين لمساعدتك في إدارة المنصة"
              action={<Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> إضافة عضو</Button>}
            />
          </div>
        ) : (
          <Panel flush>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">العضو</TableHead>
                  <TableHead>الجوال</TableHead>
                  <TableHead>الصلاحيات</TableHead>
                  <TableHead className="pe-6"><span className="sr-only">إجراءات</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="ps-6">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-secondary text-sm font-bold text-primary">
                          {(m.full_name || "?").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="whitespace-nowrap font-semibold leading-[22px]">{m.full_name}</p>
                            {m.invite_status === "pending" && <StatusBadge tone="warning">دعوة معلّقة</StatusBadge>}
                          </div>
                          {m.email && <p className="text-xs leading-[18px] text-muted-foreground"><bdi dir="ltr">{m.email}</bdi></p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {m.phone ? <bdi dir="ltr">{m.phone}</bdi> : "—"}
                    </TableCell>
                    <TableCell>
                      {m.permissions?.length > 0 ? (
                        <div className="flex w-72 flex-wrap gap-1.5 sm:w-auto">
                          {m.permissions.map((pk) => {
                            const p = PERMISSIONS.find(x => x.key === pk);
                            return (
                              <span key={pk} className="inline-flex h-6 items-center whitespace-nowrap rounded-full bg-muted px-2.5 text-xs text-muted-foreground">
                                {p?.label || pk}
                              </span>
                            );
                          })}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="pe-6 text-end">
                      <Button variant="ghost" size="icon" aria-label="حذف" onClick={() => remove(m.id)} className="h-9 w-9 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        )}

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent dir="rtl" className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>عضو إدارة جديد</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>الاسم الكامل *</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="مثال: سارة محمد" />
                </div>
                <div className="space-y-2">
                  <Label>رقم الجوال</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+9665XXXXXXXX" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>قالب الصلاحيات</Label>
                  <Select value={preset} onValueChange={(v) => onPreset(v as keyof typeof PRESETS)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRESETS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>الصلاحيات التفصيلية</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PERMISSIONS.map((p) => {
                    const selected = permissions.includes(p.key);
                    return (
                      <label
                        key={p.key}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-colors ${selected ? "bg-secondary" : "bg-muted/50 hover:bg-muted"}`}
                      >
                        <Checkbox checked={selected} onCheckedChange={() => togglePerm(p.key)} className="mt-0.5" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold leading-[22px]">{p.label}</span>
                          <span className="block text-xs leading-[18px] text-muted-foreground">{p.desc}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row">
              <Button onClick={handleAdd} disabled={saving}>
                <Plus className="h-4 w-4" /> {saving ? "جاري الإضافة..." : "إضافة العضو"}
              </Button>
              <Button variant="outline" onClick={() => { reset(); setShowAdd(false); }}>إلغاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminTeam;
