import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatCard from "@/components/app/StatCard";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { toast } from "sonner";
import {
  Check, Clock, CreditCard, DollarSign, Edit2, Save, Search, TrendingUp, Wallet, X,
} from "lucide-react";

// مبالغ محاسبية: تبقى الكسور ظاهرة حتى تتطابق العمولة والصافي مع المبلغ
const money = (value: number) => `${formatNumber(value)} ر.س`;

const AdminFinance = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingCommission, setEditingCommission] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");

  useEffect(() => {
    const load = async () => {
      const [{ data: tx }, { data: po }, { data: cs }] = await Promise.all([
        supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("payouts").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("commission_settings").select("*").order("category"),
      ]);
      setTransactions(tx || []);
      setPayouts(po || []);
      setCommissions(cs || []);
      setLoading(false);
    };
    load();
  }, []);

  const totalRevenue = transactions.filter(t => t.status === "completed" && t.transaction_type === "ticket_sale").reduce((s, t) => s + Number(t.amount), 0);
  const totalCommission = transactions.filter(t => t.status === "completed").reduce((s, t) => s + Number(t.commission_amount || 0), 0);
  const pendingPayouts = payouts.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
  const completedPayouts = payouts.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);

  const markPayoutPaid = async (id: string) => {
    const { error } = await supabase.from("payouts").update({
      status: "completed" as any, processed_at: new Date().toISOString()
    } as any).eq("id", id);
    if (error) { toast.error("خطأ في تحديث التسوية"); return; }
    setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: "completed", processed_at: new Date().toISOString() } : p));
    toast.success("تم تحديث حالة التسوية");
  };

  const saveCommission = async (id: string) => {
    const rate = parseFloat(editRate);
    if (isNaN(rate) || rate < 0 || rate > 100) { toast.error("نسبة غير صحيحة"); return; }
    const { error } = await supabase.from("commission_settings").update({ rate_percent: rate } as any).eq("id", id);
    if (error) { toast.error("خطأ"); return; }
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, rate_percent: rate } : c));
    setEditingCommission(null);
    toast.success("تم تحديث نسبة العمولة");
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; tone: StatusTone }> = {
      completed: { label: "مكتمل", tone: "success" },
      pending: { label: "معلّق", tone: "warning" },
      failed: { label: "فشل", tone: "danger" },
      refunded: { label: "مسترد", tone: "neutral" },
      processing: { label: "جاري المعالجة", tone: "primary" },
    };
    const s = map[status] || { label: status, tone: "neutral" as const };
    return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
  };

  const txTypeLabel: Record<string, string> = {
    ticket_sale: "بيع تذكرة",
    ticket_refund: "استرداد تذكرة",
    subscription_payment: "دفع اشتراك",
    payout: "تسوية",
    commission: "عمولة",
    deposit: "عربون",
  };

  const categoryLabel: Record<string, string> = {
    ticket_sale: "مبيعات التذاكر",
    reservation_deposit: "عربون الحجوزات",
    subscription: "الاشتراكات",
    tickets: "مبيعات التذاكر",
    subscriptions: "الاشتراكات",
    services: "الخدمات",
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <PageHeader title="المالية والمحاسبة" />
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-[130px] animate-pulse rounded-2xl bg-card shadow-soft" />)}
          </div>
          <div className="h-80 animate-pulse rounded-2xl bg-card shadow-soft" />
        </div>
      </AdminLayout>
    );
  }

  const visibleTransactions = transactions.filter(t => !search || t.payment_reference?.includes(search));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader title="المالية والمحاسبة" />

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "إجمالي المبيعات", value: totalRevenue, icon: DollarSign },
            { label: "إجمالي العمولات", value: totalCommission, icon: TrendingUp },
            { label: "تسويات معلّقة", value: pendingPayouts, icon: Clock },
            { label: "تسويات مكتملة", value: completedPayouts, icon: Wallet },
          ].map(kpi => <StatCard key={kpi.label} label={kpi.label} value={formatNumber(kpi.value)} unit="ر.س" icon={kpi.icon} />)}
        </div>

        <Tabs defaultValue="transactions">
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="transactions">المعاملات</TabsTrigger>
            <TabsTrigger value="payouts">التسويات</TabsTrigger>
            <TabsTrigger value="commissions">العمولات</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-6 space-y-6">
            <div className="flex flex-wrap gap-2.5">
              <div className="relative w-full sm:w-80">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="بحث بالمرجع..." value={search} onChange={e => setSearch(e.target.value)} className="ps-10" />
              </div>
            </div>
            <Panel flush>
              {transactions.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="لا توجد معاملات بعد"
                  action={<Button asChild size="sm" variant="outline"><Link to="/admin/events">عرض جميع الفعاليات</Link></Button>}
                />
              ) : visibleTransactions.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="لا توجد معاملات مطابقة"
                  action={<Button size="sm" variant="outline" onClick={() => setSearch("")}>مسح البحث</Button>}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-6">النوع</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>العمولة</TableHead>
                      <TableHead>الصافي</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead className="pe-6">المرجع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleTransactions.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap ps-6 font-semibold">{txTypeLabel[t.transaction_type] || t.transaction_type}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                        <TableCell className="whitespace-nowrap font-semibold">{money(Number(t.amount))}</TableCell>
                        <TableCell className="whitespace-nowrap">{money(Number(t.commission_amount || 0))}</TableCell>
                        <TableCell className="whitespace-nowrap">{money(Number(t.net_amount || 0))}</TableCell>
                        <TableCell>{statusBadge(t.status)}</TableCell>
                        <TableCell className="pe-6 text-xs text-muted-foreground">
                          {t.payment_reference ? <bdi dir="ltr" className="font-mono">{t.payment_reference}</bdi> : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </TabsContent>

          <TabsContent value="payouts" className="mt-6">
            <Panel flush>
              {payouts.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="لا توجد تسويات بعد"
                  action={<Button asChild size="sm" variant="outline"><Link to="/admin/organizers">عرض المنظمين</Link></Button>}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-6">الحساب</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>البنك</TableHead>
                      <TableHead><bdi dir="ltr">IBAN</bdi></TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead className="pe-6">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="whitespace-nowrap ps-6 font-semibold">{p.account_holder_name || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                        <TableCell className="whitespace-nowrap font-semibold">{money(Number(p.amount))}</TableCell>
                        <TableCell className="whitespace-nowrap">{p.bank_name || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.iban ? <bdi dir="ltr" className="font-mono">{p.iban}</bdi> : "—"}
                        </TableCell>
                        <TableCell>{statusBadge(p.status)}</TableCell>
                        <TableCell className="pe-6">
                          {p.status === "pending" && (
                            <Button size="sm" variant="soft" onClick={() => markPayoutPaid(p.id)}>
                              <Check className="h-4 w-4" /> تم الدفع
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </TabsContent>

          <TabsContent value="commissions" className="mt-6">
            <Panel title="نسب العمولات" description="تعديل نسبة العمولة التي تحصل عليها المنصة من كل عملية">
              {commissions.length === 0 ? (
                <EmptyState icon={TrendingUp} title="لا توجد نسب عمولات بعد" />
              ) : (
              <div className="space-y-3">
                {commissions.map(c => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-[22px]">{categoryLabel[c.category] || c.category}</p>
                      <p className="text-xs leading-[18px] text-muted-foreground">الحد الأدنى: {money(Number(c.min_amount || 0))}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingCommission === c.id ? (
                        <>
                          <Input type="number" aria-label="نسبة العمولة" value={editRate} onChange={e => setEditRate(e.target.value)} className="h-9 w-20" min={0} max={100} />
                          <span className="text-sm text-muted-foreground">%</span>
                          <Button size="icon" className="h-9 w-9" aria-label="حفظ" onClick={() => saveCommission(c.id)}><Save className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="إلغاء" onClick={() => setEditingCommission(null)}><X className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <>
                          <span className="text-xl font-bold leading-8">{formatPercent(c.rate_percent)}</span>
                          <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="تعديل" onClick={() => { setEditingCommission(c.id); setEditRate(String(c.rate_percent)); }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              )}
            </Panel>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminFinance;
