import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatCard from "@/components/app/StatCard";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, ArrowRight, Check, Copy, CreditCard, Gift, MoreHorizontal,
  Package, Pencil, Plus, Search, Trash2, TrendingUp, Users, X,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

// تمييز العدد بصيغته الصحيحة: 3 أشهر، 12 شهراً، 100 شهر
const countOf = (n: number, one: string, two: string, few: string, many: string) => {
  if (n === 2) return two;
  const tail = n % 100;
  return `${formatNumber(n)} ${tail >= 3 && tail <= 10 ? few : tail >= 11 ? many : one}`;
};
const monthsLabel = (n: number) => countOf(n, "شهر", "شهرين", "أشهر", "شهراً");
const eventsLabel = (n: number) => countOf(n, "فعالية", "فعاليتان", "فعاليات", "فعالية");
const subscribersLabel = (n: number) => countOf(n, "مشترك", "مشتركان", "مشتركين", "مشتركاً");
const featuresLabel = (n: number) => (n === 1 ? "ميزة أخرى" : countOf(n, "ميزة أخرى", "ميزتان أخريان", "ميزات أخرى", "ميزة أخرى"));

const subscriptionStatus: Record<string, { label: string; tone: StatusTone }> = {
  active: { label: "فعال", tone: "success" },
  past_due: { label: "متأخر", tone: "danger" },
  cancelled: { label: "ملغي", tone: "neutral" },
  expired: { label: "منتهي", tone: "neutral" },
  trialing: { label: "تجريبي", tone: "primary" },
};

const Field = ({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) => (
  <div className={cn("space-y-2", className)}>
    <Label>{label}</Label>
    {children}
  </div>
);

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

      toast.success(`تم منح باقة «${plan.name_ar}» لـ«${org.name}» لمدة ${monthsLabel(months)}`);
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
    const s = subscriptionStatus[status] || { label: status, tone: "neutral" as const };
    return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
  };

  const numOrNull = (v: string) => { const n = parseInt(v); return isNaN(n) ? null : n; };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <PageHeader title="إدارة الاشتراكات" />
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-[126px] animate-pulse rounded-2xl bg-card shadow-soft" />)}
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-96 animate-pulse rounded-2xl bg-card shadow-soft" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const isFormOpen = creating || !!editingPlan;
  const visibleSubs = subscriptions.filter(s => !search || s.account_id?.includes(search));
  // نحجز سطري الوصف في كل البطاقات حتى تبقى صفوفها متحاذية
  const anyDescription = plans.some(p => p.description_ar);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="إدارة الاشتراكات"
          actions={
            <>
              <Button variant="outline" onClick={openGrant}><Gift className="h-4 w-4" /> منح باقة لمنظّم</Button>
              <Button onClick={startCreate}><Plus className="h-4 w-4" /> إضافة خطة جديدة</Button>
            </>
          }
        />

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="إجمالي الخطط" value={formatNumber(plans.length)} icon={Package} />
          <StatCard label="خطط مفعلة" value={formatNumber(plans.filter(p => p.is_active).length)} icon={Check} />
          <StatCard label="اشتراكات فعالة" value={formatNumber(activeSubs.length)} icon={Users} />
          <StatCard label="إجمالي الإيرادات" value={formatNumber(Math.round(totalRevenue))} unit="ر.س" icon={TrendingUp} />
        </div>

        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans">الخطط المتاحة</TabsTrigger>
            <TabsTrigger value="active">الاشتراكات الفعالة</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="mt-6">
            {plans.length === 0 ? (
              <div className="rounded-2xl bg-card shadow-soft">
                <EmptyState
                  icon={Package}
                  title="لا توجد خطط بعد"
                  action={<Button onClick={startCreate}><Plus className="h-4 w-4" /> إضافة خطة جديدة</Button>}
                />
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan, idx) => {
                  const features = Array.isArray(plan.features) ? plan.features : [];
                  const subsCount = subscriptions.filter(s => s.plan_id === plan.id && s.status === "active").length;
                  const price = plan.price ?? plan.price_per_event ?? 0;
                  const canDuplicate = plan.allow_duplicate_event ?? true;
                  const limit = (value: number | null | undefined) => (value == null ? "غير محدود" : formatNumber(value));
                  const specs: [string, string][] = [
                    ["الفعاليات", limit(plan.max_events)],
                    ["المدة", monthsLabel(plan.validity_months || 1)],
                    ["حضور / فعالية", limit(plan.max_attendees_per_event)],
                    ["إجمالي الحضور", limit(plan.max_total_attendees)],
                  ];

                  return (
                    <article key={plan.id} className={`flex min-w-0 flex-col gap-4 rounded-2xl bg-card p-5 shadow-soft ${plan.is_active ? "" : "opacity-70"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold leading-6">{plan.name_ar}</h3>
                          {anyDescription && <p className="mt-0.5 line-clamp-2 min-h-10 text-[13px] leading-5 text-muted-foreground">{plan.description_ar}</p>}
                        </div>
                        <Switch checked={!!plan.is_active} onCheckedChange={() => togglePlanActive(plan.id, plan.is_active)} aria-label={`تفعيل ${plan.name_ar}`} />
                      </div>

                      <div className="flex items-baseline justify-between gap-3">
                        <p className="flex items-baseline gap-1">
                          <span className="text-[32px] font-bold leading-10">{price === 0 ? "مجاناً" : formatNumber(Number(price))}</span>
                          {price > 0 && <span className="text-sm font-semibold text-muted-foreground">ر.س</span>}
                        </p>
                        <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" /> {subscribersLabel(subsCount)}
                        </span>
                      </div>

                      <dl className="space-y-2 rounded-xl bg-muted/50 p-4 text-[13px] leading-5">
                        {specs.map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between gap-3">
                            <dt className="text-muted-foreground">{label}</dt>
                            <dd className="font-semibold">{value}</dd>
                          </div>
                        ))}
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-muted-foreground">نسخ الفعالية</dt>
                          <dd><StatusBadge tone={canDuplicate ? "success" : "danger"}>{canDuplicate ? "مسموح" : "غير مسموح"}</StatusBadge></dd>
                        </div>
                      </dl>

                      {features.length > 0 && (
                        <div className="space-y-1.5">
                          {features.slice(0, 3).map((f: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-[13px] leading-5 text-muted-foreground">
                              <Check className="h-3.5 w-3.5 flex-none text-primary" />
                              <span className="line-clamp-1">{f}</span>
                            </div>
                          ))}
                          {features.length > 3 && <p className="text-xs text-muted-foreground">و{featuresLabel(features.length - 3)}</p>}
                        </div>
                      )}

                      <div className="mt-auto flex items-center gap-2 pt-1">
                        <Button size="sm" variant="soft" className="flex-1" onClick={() => startEdit(plan)}>
                          <Pencil className="h-[15px] w-[15px]" /> تعديل
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="outline" className="h-9 w-9 flex-none" aria-label="المزيد"><MoreHorizontal className="h-[18px] w-[18px]" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem disabled={idx === 0} onClick={() => moveOrder(plan, -1)}><ArrowRight className="h-4 w-4" /> تقديم في الترتيب</DropdownMenuItem>
                            <DropdownMenuItem disabled={idx === plans.length - 1} onClick={() => moveOrder(plan, 1)}><ArrowLeft className="h-4 w-4" /> تأخير في الترتيب</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deletePlan(plan.id)}><Trash2 className="h-4 w-4" /> حذف</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-6 space-y-6">
            <div className="flex flex-wrap gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="ps-10" />
              </div>
            </div>

            {visibleSubs.length === 0 ? (
              <div className="rounded-2xl bg-card shadow-soft">
                <EmptyState
                  icon={CreditCard}
                  title={subscriptions.length === 0 ? "لا توجد اشتراكات بعد" : "لا توجد اشتراكات مطابقة للبحث"}
                  action={
                    subscriptions.length === 0 ? (
                      <Button onClick={openGrant}><Gift className="h-4 w-4" /> منح باقة لمنظّم</Button>
                    ) : (
                      <Button variant="outline" onClick={() => setSearch("")}><X className="h-4 w-4" /> إعادة تعيين</Button>
                    )
                  }
                />
              </div>
            ) : (
              <Panel flush>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-6">الحساب</TableHead>
                      <TableHead>الخطة</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>تاريخ البدء</TableHead>
                      <TableHead>تاريخ الانتهاء</TableHead>
                      <TableHead className="pe-6">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleSubs.map((sub) => {
                      const plan = plans.find(p => p.id === sub.plan_id);
                      return (
                        <TableRow key={sub.id}>
                          <TableCell className="whitespace-nowrap ps-6 text-muted-foreground">
                            <bdi dir="ltr" className="font-mono text-xs">{sub.account_id?.slice(0, 8)}...</bdi>
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-semibold">{plan?.name_ar || "-"}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatMoney(Number(sub.amount))}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(sub.current_period_start)}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(sub.current_period_end)}</TableCell>
                          <TableCell className="pe-6">{statusBadge(sub.status)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Panel>
            )}
          </TabsContent>
        </Tabs>

        {/* نافذة منح باقة */}
        <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle>منح باقة لمنظّم</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Field label="المنظّم">
                <Select value={grantOrgId} onValueChange={setGrantOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المنظّم" />
                  </SelectTrigger>
                  <SelectContent>
                    {grantOrgs.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="الباقة">
                <Select
                  value={grantPlanId}
                  onValueChange={(v) => {
                    setGrantPlanId(v);
                    const p = plans.find(pl => pl.id === v);
                    if (p?.validity_months) setGrantMonths(p.validity_months);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الباقة" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.filter(p => p.is_active).map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name_ar}، {p.max_events ? eventsLabel(p.max_events) : "فعاليات غير محدودة"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="المدة (بالأشهر)">
                <Input
                  type="number"
                  min={1}
                  max={36}
                  value={grantMonths}
                  onChange={(e) => setGrantMonths(Math.max(1, Number(e.target.value)))}
                />
              </Field>
              <p className="rounded-xl bg-muted/50 p-3 text-xs leading-[18px] text-muted-foreground">
                ستُمنح الباقة مجاناً (منحة إدارية لا تُحتسب في الإيرادات)، وسيُلغى أي اشتراك نشط سابق لهذا المنظّم.
              </p>
            </div>
            <DialogFooter className="flex-col sm:flex-row">
              <Button onClick={handleGrant} disabled={granting}>
                {granting ? "جارٍ المنح..." : "منح الباقة"}
              </Button>
              <Button variant="outline" onClick={() => setGrantOpen(false)}>إلغاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* نافذة إنشاء الخطة وتعديلها */}
        <Dialog open={isFormOpen} onOpenChange={(next) => { if (!next) cancelEdit(); }}>
          <DialogContent dir="rtl" className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{creating ? "إنشاء خطة جديدة" : "تعديل الخطة"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="اسم الخطة (عربي) *">
                  <Input value={editData.name_ar} onChange={e => setEditData(d => ({ ...d, name_ar: e.target.value }))} />
                </Field>
                <Field label="اسم الخطة (إنجليزي)">
                  <Input value={editData.name_en} onChange={e => setEditData(d => ({ ...d, name_en: e.target.value }))} dir="ltr" />
                </Field>
              </div>

              <Field label="الوصف">
                <Textarea rows={2} value={editData.description_ar} onChange={e => setEditData(d => ({ ...d, description_ar: e.target.value }))} />
              </Field>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label="السعر (ر.س)">
                  <Input type="number" value={editData.price} onChange={e => setEditData(d => ({ ...d, price: Number(e.target.value) }))} />
                </Field>
                <Field label="عدد الفعاليات">
                  <Input type="number" value={editData.max_events ?? ""} onChange={e => setEditData(d => ({ ...d, max_events: numOrNull(e.target.value) }))} placeholder="غير محدود" />
                </Field>
                <Field label="المدة (أشهر)">
                  <Input type="number" min={1} value={editData.validity_months} onChange={e => setEditData(d => ({ ...d, validity_months: parseInt(e.target.value) || 1 }))} />
                </Field>
                <Field label="حضور / فعالية">
                  <Input type="number" value={editData.max_attendees_per_event ?? ""} onChange={e => setEditData(d => ({ ...d, max_attendees_per_event: numOrNull(e.target.value) }))} placeholder="غير محدود" />
                </Field>
                <Field label="إجمالي الحضور">
                  <Input type="number" value={editData.max_total_attendees ?? ""} onChange={e => setEditData(d => ({ ...d, max_total_attendees: numOrNull(e.target.value) }))} placeholder="غير محدود" />
                </Field>
                <Field label="واتساب">
                  <Input type="number" value={editData.whatsapp_quota ?? ""} onChange={e => setEditData(d => ({ ...d, whatsapp_quota: numOrNull(e.target.value) }))} placeholder="0" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="لون الشارة">
                  <Input value={editData.badge_color} onChange={e => setEditData(d => ({ ...d, badge_color: e.target.value }))} dir="ltr" placeholder="#7c3aed" />
                </Field>
                <Field label="ترتيب العرض">
                  <Input type="number" value={editData.display_order} onChange={e => setEditData(d => ({ ...d, display_order: parseInt(e.target.value) || 0 }))} />
                </Field>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
                    <Copy className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-[22px]">نسخ الفعالية</p>
                    <p className="text-xs leading-[18px] text-muted-foreground">السماح للمنظّم بنسخ فعالياته في هذه الباقة</p>
                  </div>
                </div>
                <Switch
                  checked={editData.allow_duplicate_event}
                  onCheckedChange={(v) => setEditData(d => ({ ...d, allow_duplicate_event: v }))}
                  aria-label="نسخ الفعالية"
                />
              </div>

              <Field label="المميزات">
                {editData.features.length > 0 && (
                  <div className="space-y-1.5">
                    {editData.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-1.5">
                        <Check className="h-3.5 w-3.5 flex-none text-primary" />
                        <span className="flex-1 text-[13px] leading-5">{f}</span>
                        <button type="button" aria-label="حذف الميزة" onClick={() => removeFeature(i)} className="text-destructive hover:text-destructive/80">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newFeature}
                    onChange={e => setNewFeature(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addFeature())}
                    placeholder="أضف ميزة جديدة..."
                    className="flex-1"
                  />
                  <Button size="icon" variant="outline" aria-label="إضافة ميزة" className="flex-none" onClick={addFeature}><Plus className="h-4 w-4" /></Button>
                </div>
              </Field>
            </div>

            <DialogFooter className="flex-col sm:flex-row">
              <Button onClick={savePlan}>{creating ? "إنشاء" : "حفظ"}</Button>
              <Button variant="outline" onClick={cancelEdit}>إلغاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Subscriptions;
