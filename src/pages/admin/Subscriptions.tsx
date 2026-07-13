import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Users, TrendingUp, Search, Edit2, Save, X, Plus,
  Check, ToggleLeft, ToggleRight, Package, Trash2, Gift, Copy,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface PlanEdit {
  name_ar: string;
  name_en: string;
  description_ar: string;
  price: number;
  max_events: number | null;
  validity_months: number;
  max_attendees_per_event: number | null;
  max_total_attendees: number | null;
  whatsapp_quota: number | null;
  features: string[];
  badge_color: string;
  display_order: number;
  allow_duplicate_event: boolean;
}

const emptyEdit: PlanEdit = {
  name_ar: "", name_en: "", description_ar: "",
  price: 0, max_events: 1, validity_months: 1,
  max_attendees_per_event: null, max_total_attendees: null,
  whatsapp_quota: null, features: [], badge_color: "", display_order: 0,
  allow_duplicate_event: true,
};

const Subscriptions = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editData, setEditData] = useState<PlanEdit>(emptyEdit);
  const [newFeature, setNewFeature] = useState("");

  const reload = async () => {
    const [{ data: pl }, { data: subs }] = await Promise.all([
      supabase.from("subscription_plans").select("*").order("display_order"),
      supabase.from("account_subscriptions").select("*").order("created_at", { ascending: false }),
    ]);
    setPlans(pl || []);
    setSubscriptions(subs || []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const activeSubs = subscriptions.filter(s => s.status === "active");
  const totalRevenue = activeSubs.reduce((sum, s) => sum + Number(s.amount || 0), 0);

  // ===== منح باقة لمنظّم =====
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantOrgs, setGrantOrgs] = useState<any[]>([]);
  const [grantOrgId, setGrantOrgId] = useState("");
  const [grantPlanId, setGrantPlanId] = useState("");
  const [grantMonths, setGrantMonths] = useState(1);
  const [granting, setGranting] = useState(false);

  const openGrant = async () => {
    setGrantOpen(true);
    if (grantOrgs.length === 0) {
      const { data } = await supabase
        .from("organizations")
        .select("id, name, owner_id")
        .order("name");
      setGrantOrgs(data || []);
    }
  };

  const handleGrant = async () => {
    const org = grantOrgs.find(o => o.id === grantOrgId);
    const plan = plans.find(p => p.id === grantPlanId);
    if (!org || !plan) {
      toast.error("اختر المنظّم والباقة أولاً");
      return;
    }
    setGranting(true);
    try {
      const months = grantMonths || plan.validity_months || 1;
      const start = new Date();
      const end = new Date(start);
      end.setMonth(end.getMonth() + months);

      // إلغاء أي اشتراك نشط سابق حتى لا تتزاحم الاشتراكات
      await supabase
        .from("account_subscriptions")
        .update({ status: "cancelled", cancelled_at: start.toISOString() } as any)
        .eq("account_id", org.owner_id)
        .eq("status", "active");

      const { error } = await supabase.from("account_subscriptions").insert({
        account_id: org.owner_id,
        account_type: "organizer",
        plan_id: plan.id,
        status: "active",
        billing_cycle: "monthly",
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString(),
        expires_at: end.toISOString(),
        amount: 0, // منحة إدارية — لا تُحتسب في الإيرادات
        currency: "SAR",
        events_quota: plan.max_events ?? 0, // 0 = بلا حد
        events_used: 0,
      } as any);
      if (error) throw error;

      toast.success(`تم منح باقة «${plan.name_ar}» لـ«${org.name}» لمدة ${months} شهر`);
      setGrantOpen(false);
      setGrantOrgId("");
      setGrantPlanId("");
      setGrantMonths(1);
      reload();
    } catch {
      toast.error("تعذر منح الباقة، حاول مرة أخرى");
    } finally {
      setGranting(false);
    }
  };

  const togglePlanActive = async (planId: string, currentState: boolean) => {
    const { error } = await supabase.from("subscription_plans").update({ is_active: !currentState } as any).eq("id", planId);
    if (error) { toast.error("خطأ في تحديث الخطة"); return; }
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, is_active: !currentState } : p));
    toast.success(!currentState ? "تم تفعيل الخطة" : "تم إيقاف الخطة");
  };

  const startCreate = () => {
    setCreating(true);
    setEditingPlan(null);
    setEditData({ ...emptyEdit, display_order: plans.length });
    setNewFeature("");
  };

  const startEdit = (plan: any) => {
    setCreating(false);
    setEditingPlan(plan.id);
    setEditData({
      name_ar: plan.name_ar || "",
      name_en: plan.name_en || "",
      description_ar: plan.description_ar || "",
      price: plan.price || plan.price_per_event || 0,
      max_events: plan.max_events ?? 1,
      validity_months: plan.validity_months || 1,
      max_attendees_per_event: plan.max_attendees_per_event,
      max_total_attendees: plan.max_total_attendees,
      whatsapp_quota: plan.whatsapp_quota,
      features: Array.isArray(plan.features) ? plan.features : [],
      badge_color: plan.badge_color || "",
      display_order: plan.display_order || 0,
      allow_duplicate_event: plan.allow_duplicate_event ?? true,
    });
    setNewFeature("");
  };

  const cancelEdit = () => { setEditingPlan(null); setCreating(false); };

  const buildPayload = () => ({
    name_ar: editData.name_ar,
    name_en: editData.name_en || null,
    description_ar: editData.description_ar || null,
    target_type: "organizer",
    price: editData.price,
    price_monthly: 0,
    price_yearly: 0,
    price_per_event: editData.price,
    max_events: editData.max_events,
    validity_months: editData.validity_months,
    max_attendees_per_event: editData.max_attendees_per_event,
    max_total_attendees: editData.max_total_attendees,
    whatsapp_quota: editData.whatsapp_quota,
    features: editData.features,
    badge_color: editData.badge_color || null,
    display_order: editData.display_order,
    allow_duplicate_event: editData.allow_duplicate_event,
  });

  const savePlan = async () => {
    if (!editData.name_ar.trim()) { toast.error("اسم الخطة مطلوب"); return; }
    const payload = buildPayload() as any;

    if (creating) {
      let { data, error } = await supabase.from("subscription_plans").insert(payload).select().single();
      // توافقية: إذا لم يُنفَّذ ملف SQL الخاص بحقل نسخ الفعالية بعد، نحفظ بدونه
      if (error?.message?.includes("allow_duplicate_event")) {
        delete payload.allow_duplicate_event;
        ({ data, error } = await supabase.from("subscription_plans").insert(payload).select().single());
        if (!error) toast.info("حُفظت الخطة بدون خيار نسخ الفعالية — نفّذ ملف SQL الخاص به أولاً");
      }
      if (error) { toast.error("خطأ في إنشاء الخطة: " + error.message); return; }
      setPlans(prev => [...prev, data].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      toast.success("تم إنشاء الخطة بنجاح");
    } else if (editingPlan) {
      let { error } = await supabase.from("subscription_plans").update(payload).eq("id", editingPlan);
      if (error?.message?.includes("allow_duplicate_event")) {
        delete payload.allow_duplicate_event;
        ({ error } = await supabase.from("subscription_plans").update(payload).eq("id", editingPlan));
        if (!error) toast.info("حُفظت الخطة بدون خيار نسخ الفعالية — نفّذ ملف SQL الخاص به أولاً");
      }
      if (error) { toast.error("خطأ في الحفظ"); return; }
      setPlans(prev => prev.map(p => p.id === editingPlan ? { ...p, ...payload } : p)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      toast.success("تم تحديث الخطة");
    }
    cancelEdit();
  };

  const deletePlan = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الخطة؟")) return;
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    if (error) { toast.error("لا يمكن حذف الخطة - قد تكون مرتبطة باشتراكات"); return; }
    setPlans(prev => prev.filter(p => p.id !== id));
    toast.success("تم حذف الخطة");
  };

  const moveOrder = async (plan: any, dir: -1 | 1) => {
    const sorted = [...plans].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const idx = sorted.findIndex(p => p.id === plan.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx], b = sorted[swapIdx];
    const newAOrder = b.display_order || 0;
    const newBOrder = a.display_order || 0;
    await Promise.all([
      supabase.from("subscription_plans").update({ display_order: newAOrder } as any).eq("id", a.id),
      supabase.from("subscription_plans").update({ display_order: newBOrder } as any).eq("id", b.id),
    ]);
    setPlans(prev => prev.map(p => {
      if (p.id === a.id) return { ...p, display_order: newAOrder };
      if (p.id === b.id) return { ...p, display_order: newBOrder };
      return p;
    }).sort((x, y) => (x.display_order || 0) - (y.display_order || 0)));
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setEditData(d => ({ ...d, features: [...d.features, newFeature.trim()] }));
    setNewFeature("");
  };

  const removeFeature = (index: number) => {
    setEditData(d => ({ ...d, features: d.features.filter((_, i) => i !== index) }));
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "فعال", variant: "default" },
      past_due: { label: "متأخر", variant: "destructive" },
      cancelled: { label: "ملغي", variant: "outline" },
      expired: { label: "منتهي", variant: "secondary" },
      trialing: { label: "تجريبي", variant: "secondary" },
    };
    const s = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
  };

  const numOrNull = (v: string) => { const n = parseInt(v); return isNaN(n) ? null : n; };

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div></AdminLayout>;

  const isFormOpen = creating || !!editingPlan;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-2xl text-foreground">إدارة الاشتراكات</h1>
          {!isFormOpen && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={openGrant}>
                <Gift className="w-4 h-4 ml-2" /> منح باقة لمنظّم
              </Button>
              <Button onClick={startCreate} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 ml-2" /> إضافة خطة جديدة
              </Button>
            </div>
          )}
        </div>

        {/* نافذة منح باقة */}
        <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
          <DialogContent dir="rtl" className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                منح باقة لمنظّم
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">المنظّم</label>
                <Select value={grantOrgId} onValueChange={setGrantOrgId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="اختر المنظّم" />
                  </SelectTrigger>
                  <SelectContent>
                    {grantOrgs.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">الباقة</label>
                <Select
                  value={grantPlanId}
                  onValueChange={(v) => {
                    setGrantPlanId(v);
                    const p = plans.find(pl => pl.id === v);
                    if (p?.validity_months) setGrantMonths(p.validity_months);
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="اختر الباقة" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.filter(p => p.is_active).map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name_ar} — {p.max_events ? `${p.max_events} فعاليات` : "فعاليات غير محدودة"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">المدة (بالأشهر)</label>
                <Input
                  type="number"
                  min={1}
                  max={36}
                  value={grantMonths}
                  onChange={(e) => setGrantMonths(Math.max(1, Number(e.target.value)))}
                  className="rounded-xl"
                />
              </div>
              <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-xl p-3">
                ستُمنح الباقة مجاناً (منحة إدارية لا تُحتسب في الإيرادات)، وسيُلغى أي اشتراك نشط سابق لهذا المنظّم.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button className="rounded-full flex-1" onClick={handleGrant} disabled={granting}>
                {granting ? "جارٍ المنح..." : "منح الباقة"}
              </Button>
              <Button variant="ghost" className="rounded-full" onClick={() => setGrantOpen(false)}>
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "إجمالي الخطط", value: plans.length, icon: Package, color: "text-primary", bg: "bg-primary/10", suffix: "خطة" },
            { label: "خطط مفعلة", value: plans.filter(p => p.is_active).length, icon: Check, color: "text-green-600", bg: "bg-green-100", suffix: "خطة" },
            { label: "اشتراكات فعالة", value: activeSubs.length, icon: Users, color: "text-teal", bg: "bg-teal/10", suffix: "مشترك" },
            { label: "إجمالي الإيرادات", value: Math.round(totalRevenue), icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-100", suffix: "ر.س" },
          ].map(kpi => (
            <div key={kpi.label} className="bg-card rounded-2xl border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <span className="text-2xl font-bold text-foreground">{kpi.value.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{kpi.suffix}</span></span>
            </div>
          ))}
        </div>

        {/* Create/Edit Form */}
        {isFormOpen && (
          <div className="bg-card rounded-2xl border-2 border-primary/50 p-5 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-foreground">{creating ? "إنشاء خطة جديدة" : "تعديل الخطة"}</h3>
              <div className="flex gap-2">
                <Button size="sm" onClick={savePlan}><Save className="w-3 h-3 ml-1" /> {creating ? "إنشاء" : "حفظ"}</Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="w-3 h-3" /></Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground font-semibold mb-1 block">اسم الخطة (عربي) *</label>
                  <Input value={editData.name_ar} onChange={e => setEditData(d => ({ ...d, name_ar: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-semibold mb-1 block">اسم الخطة (إنجليزي)</label>
                  <Input value={editData.name_en} onChange={e => setEditData(d => ({ ...d, name_en: e.target.value }))} className="h-9 text-sm" dir="ltr" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-semibold mb-1 block">الوصف</label>
                  <Textarea value={editData.description_ar} onChange={e => setEditData(d => ({ ...d, description_ar: e.target.value }))} className="text-sm min-h-[60px]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold mb-1 block">لون الشارة</label>
                    <Input value={editData.badge_color} onChange={e => setEditData(d => ({ ...d, badge_color: e.target.value }))} className="h-9 text-sm" dir="ltr" placeholder="#7c3aed" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold mb-1 block">ترتيب العرض</label>
                    <Input type="number" value={editData.display_order} onChange={e => setEditData(d => ({ ...d, display_order: parseInt(e.target.value) || 0 }))} className="h-9 text-sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold mb-1 block">السعر (ر.س)</label>
                    <Input type="number" value={editData.price} onChange={e => setEditData(d => ({ ...d, price: Number(e.target.value) }))} className="h-9 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold mb-1 block">عدد الفعاليات</label>
                    <Input type="number" value={editData.max_events ?? ""} onChange={e => setEditData(d => ({ ...d, max_events: numOrNull(e.target.value) }))} className="h-9 text-sm" placeholder="غير محدود" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold mb-1 block">المدة (أشهر)</label>
                    <Input type="number" min={1} value={editData.validity_months} onChange={e => setEditData(d => ({ ...d, validity_months: parseInt(e.target.value) || 1 }))} className="h-9 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold mb-1 block">حضور / فعالية</label>
                    <Input type="number" value={editData.max_attendees_per_event ?? ""} onChange={e => setEditData(d => ({ ...d, max_attendees_per_event: numOrNull(e.target.value) }))} className="h-9 text-sm" placeholder="∞" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold mb-1 block">إجمالي الحضور</label>
                    <Input type="number" value={editData.max_total_attendees ?? ""} onChange={e => setEditData(d => ({ ...d, max_total_attendees: numOrNull(e.target.value) }))} className="h-9 text-sm" placeholder="∞" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold mb-1 block">واتساب</label>
                    <Input type="number" value={editData.whatsapp_quota ?? ""} onChange={e => setEditData(d => ({ ...d, whatsapp_quota: numOrNull(e.target.value) }))} className="h-9 text-sm" placeholder="0" />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Copy className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">نسخ الفعالية</p>
                      <p className="text-[11px] text-muted-foreground">السماح للمنظّم بنسخ فعالياته في هذه الباقة</p>
                    </div>
                  </div>
                  <Switch
                    checked={editData.allow_duplicate_event}
                    onCheckedChange={(v) => setEditData(d => ({ ...d, allow_duplicate_event: v }))}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground font-semibold mb-1 block">المميزات</label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {editData.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-2 py-1">
                        <Check className="w-3 h-3 text-teal shrink-0" />
                        <span className="text-xs flex-1">{f}</span>
                        <button onClick={() => removeFeature(i)} className="text-destructive hover:text-destructive/80">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input value={newFeature} onChange={e => setNewFeature(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addFeature())}
                      placeholder="أضف ميزة جديدة..." className="h-8 text-xs flex-1" />
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addFeature}><Plus className="w-3 h-3" /></Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="plans" dir="rtl">
          <TabsList>
            <TabsTrigger value="plans">الخطط المتاحة</TabsTrigger>
            <TabsTrigger value="active">الاشتراكات الفعالة</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan, idx) => {
                const features = Array.isArray(plan.features) ? plan.features : [];
                const subsCount = subscriptions.filter(s => s.plan_id === plan.id && s.status === "active").length;
                const price = plan.price ?? plan.price_per_event ?? 0;

                return (
                  <div key={plan.id} className={`bg-card rounded-2xl border-2 p-5 space-y-4 transition-all ${
                    plan.is_active ? "border-border/50" : "border-destructive/30 opacity-70"
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground">{plan.name_ar}</h3>
                        {plan.description_ar && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.description_ar}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button onClick={() => togglePlanActive(plan.id, plan.is_active)} className="text-muted-foreground hover:text-foreground">
                          {plan.is_active ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                        <div className="flex gap-1">
                          <button onClick={() => moveOrder(plan, -1)} disabled={idx === 0} className="text-xs px-1.5 py-0.5 rounded bg-muted/50 hover:bg-muted disabled:opacity-30">→</button>
                          <button onClick={() => moveOrder(plan, 1)} disabled={idx === plans.length - 1} className="text-xs px-1.5 py-0.5 rounded bg-muted/50 hover:bg-muted disabled:opacity-30">←</button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-foreground">{price === 0 ? "مجاناً" : `${Number(price).toLocaleString()}`}</span>
                      {price > 0 && <span className="text-xs text-muted-foreground">ر.س</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-muted/30 rounded-lg p-2">
                        <span className="text-muted-foreground">الفعاليات</span>
                        <p className="font-bold text-foreground">{plan.max_events ?? "∞"}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2">
                        <span className="text-muted-foreground">المدة</span>
                        <p className="font-bold text-foreground">{plan.validity_months || 1} شهر</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2">
                        <span className="text-muted-foreground">حضور/فعالية</span>
                        <p className="font-bold text-foreground">{plan.max_attendees_per_event ?? "∞"}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2">
                        <span className="text-muted-foreground">إجمالي الحضور</span>
                        <p className="font-bold text-foreground">{plan.max_total_attendees ?? "∞"}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2">
                        <span className="text-muted-foreground">نسخ الفعالية</span>
                        <p className={`font-bold ${(plan.allow_duplicate_event ?? true) ? "text-teal" : "text-destructive"}`}>
                          {(plan.allow_duplicate_event ?? true) ? "مسموح" : "غير مسموح"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {features.slice(0, 3).map((f: string, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-teal shrink-0" />
                          <span className="line-clamp-1">{f}</span>
                        </div>
                      ))}
                      {features.length > 3 && <p className="text-[10px] text-muted-foreground">+{features.length - 3} ميزة أخرى</p>}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <span className="text-xs text-muted-foreground">
                        <Users className="w-3 h-3 inline ml-1" />{subsCount}
                      </span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => startEdit(plan)}>
                          <Edit2 className="w-3 h-3 ml-1" />تعديل
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive hover:text-destructive" onClick={() => deletePlan(plan.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {plans.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  لا توجد خطط بعد. اضغط "إضافة خطة جديدة" للبدء.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
            </div>
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-right p-3 text-xs text-muted-foreground font-semibold">الحساب</th>
                      <th className="text-right p-3 text-xs text-muted-foreground font-semibold">الخطة</th>
                      <th className="text-right p-3 text-xs text-muted-foreground font-semibold">المبلغ</th>
                      <th className="text-right p-3 text-xs text-muted-foreground font-semibold">تاريخ البدء</th>
                      <th className="text-right p-3 text-xs text-muted-foreground font-semibold">تاريخ الانتهاء</th>
                      <th className="text-right p-3 text-xs text-muted-foreground font-semibold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.filter(s => !search || s.account_id?.includes(search)).map(sub => {
                      const plan = plans.find(p => p.id === sub.plan_id);
                      return (
                        <tr key={sub.id} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="p-3 text-xs font-mono text-muted-foreground">{sub.account_id?.slice(0, 8)}...</td>
                          <td className="p-3 text-xs font-semibold text-foreground">{plan?.name_ar || "-"}</td>
                          <td className="p-3 text-xs font-bold text-foreground">{Number(sub.amount).toLocaleString()} ر.س</td>
                          <td className="p-3 text-xs text-muted-foreground">{new Date(sub.current_period_start).toLocaleDateString("ar-SA")}</td>
                          <td className="p-3 text-xs text-muted-foreground">{new Date(sub.current_period_end).toLocaleDateString("ar-SA")}</td>
                          <td className="p-3">{statusBadge(sub.status)}</td>
                        </tr>
                      );
                    })}
                    {subscriptions.length === 0 && (
                      <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">لا توجد اشتراكات بعد</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Subscriptions;
