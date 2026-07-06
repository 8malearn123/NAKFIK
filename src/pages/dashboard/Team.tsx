import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Users, Plus, Trash2, Shield, Phone, Mail, User, X } from "lucide-react";

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl text-foreground">إدارة الفريق</h1>
            <p className="text-muted-foreground text-sm mt-1">إضافة وإدارة أعضاء فريقك وصلاحياتهم</p>
          </div>
          <Button onClick={() => setShowAdd(!showAdd)} className="gap-2 rounded-full">
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAdd ? "إلغاء" : "إضافة عضو"}
          </Button>
        </div>

        {showAdd && (
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
            <p className="font-semibold">إضافة عضو جديد</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">الاسم الكامل *</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="مثال: أحمد محمد" className="pr-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">رقم الجوال *</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+9665XXXXXXXX" dir="ltr" className="pr-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">البريد الإلكتروني (اختياري)</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" dir="ltr" className="pr-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الدور الأساسي</Label>
                <select
                  value={role}
                  onChange={e => onRoleChange(e.target.value as keyof typeof ROLE_PRESETS)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background h-10"
                >
                  {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">الصلاحيات المخصصة</Label>
                <button
                  type="button"
                  onClick={() => setPermissions(ROLE_PRESETS[role] || [])}
                  className="text-xs text-primary hover:underline"
                >
                  استعادة افتراضي الدور
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {PERMISSIONS.map(p => (
                  <label
                    key={p.key}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      permissions.includes(p.key) ? "border-primary/40 bg-primary/5" : "border-border/50 hover:bg-muted/30"
                    }`}
                  >
                    <Checkbox
                      checked={permissions.includes(p.key)}
                      onCheckedChange={() => togglePerm(p.key)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{p.label}</p>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { resetForm(); setShowAdd(false); }}>إلغاء</Button>
              <Button onClick={handleAdd} disabled={saving} className="gap-2">
                <Plus className="w-4 h-4" />
                {saving ? "جاري الإضافة..." : "إضافة العضو"}
              </Button>
            </div>
          </div>
        )}

        {members.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="font-semibold text-lg">لا يوجد أعضاء في الفريق</h3>
            <p className="text-muted-foreground text-sm">أضف أعضاء لمساعدتك في إدارة الفعاليات</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="divide-y divide-border/50">
              {members.map(m => (
                <div key={m.id} className="flex items-start justify-between p-4 hover:bg-muted/30 transition-colors gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {(m.full_name || m.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{m.full_name || "بدون اسم"}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        {m.phone && <span className="flex items-center gap-1" dir="ltr"><Phone className="w-3 h-3" />{m.phone}</span>}
                        {m.email && <span className="flex items-center gap-1" dir="ltr"><Mail className="w-3 h-3" />{m.email}</span>}
                        <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{roleLabels[m.role] || m.role}</span>
                        {m.invite_status === "pending" && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">دعوة معلّقة</span>
                        )}
                      </div>
                      {m.permissions && m.permissions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {m.permissions.map(pk => {
                            const p = PERMISSIONS.find(x => x.key === pk);
                            return (
                              <span key={pk} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {p?.label || pk}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)} className="text-destructive hover:text-destructive shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Team;
