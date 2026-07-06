import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Plus, Trash2, Shield, Phone, Mail, User, X, ShieldCheck } from "lucide-react";

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

  if (loading) {
    return <AdminLayout><div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-destructive/30 border-t-destructive rounded-full animate-spin" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-destructive" /> فريق إدارة النظام</h1>
            <p className="text-muted-foreground text-sm mt-1">إضافة مستخدمين للحساب الأساسي وتحديد صلاحياتهم</p>
          </div>
          <Button onClick={() => setShowAdd(!showAdd)} variant="destructive" className="gap-2 rounded-full">
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAdd ? "إلغاء" : "إضافة عضو"}
          </Button>
        </div>

        {showAdd && (
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
            <p className="font-semibold">عضو إدارة جديد</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">الاسم الكامل *</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="مثال: سارة محمد" className="pr-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">رقم الجوال</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+9665XXXXXXXX" dir="ltr" className="pr-9" />
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" dir="ltr" className="pr-9" />
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">قالب الصلاحيات</Label>
                <select value={preset} onChange={e => onPreset(e.target.value as any)} className="w-full border rounded-md px-3 py-2 text-sm bg-background h-10">
                  {Object.entries(PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-border/50">
              <Label className="text-sm font-semibold">الصلاحيات التفصيلية</Label>
              <div className="grid sm:grid-cols-2 gap-2">
                {PERMISSIONS.map(p => (
                  <label key={p.key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${permissions.includes(p.key) ? "border-destructive/40 bg-destructive/5" : "border-border/50 hover:bg-muted/30"}`}>
                    <Checkbox checked={permissions.includes(p.key)} onCheckedChange={() => togglePerm(p.key)} className="mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{p.label}</p>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { reset(); setShowAdd(false); }}>إلغاء</Button>
              <Button onClick={handleAdd} disabled={saving} variant="destructive" className="gap-2">
                <Plus className="w-4 h-4" /> {saving ? "جاري الإضافة..." : "إضافة العضو"}
              </Button>
            </div>
          </div>
        )}

        {members.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="font-semibold text-lg">لا يوجد أعضاء بعد</h3>
            <p className="text-muted-foreground text-sm">أضف مستخدمين لمساعدتك في إدارة المنصة</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/50">
            {members.map(m => (
              <div key={m.id} className="flex items-start justify-between p-4 hover:bg-muted/30 gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-bold text-sm shrink-0">
                    {(m.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{m.full_name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      {m.phone && <span className="flex items-center gap-1" dir="ltr"><Phone className="w-3 h-3" />{m.phone}</span>}
                      {m.email && <span className="flex items-center gap-1" dir="ltr"><Mail className="w-3 h-3" />{m.email}</span>}
                      {m.invite_status === "pending" && <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">دعوة معلّقة</span>}
                    </div>
                    {m.permissions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.permissions.map(pk => {
                          const p = PERMISSIONS.find(x => x.key === pk);
                          return <span key={pk} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"><Shield className="inline w-2.5 h-2.5 ml-1" />{p?.label || pk}</span>;
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(m.id)} className="text-destructive hover:text-destructive shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminTeam;
