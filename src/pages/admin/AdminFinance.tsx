import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  DollarSign, TrendingUp, CreditCard, Wallet, ArrowUpRight, ArrowDownRight,
  Search, Check, X, Clock, Edit2, Save,
} from "lucide-react";

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
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      completed: { label: "مكتمل", variant: "default" },
      pending: { label: "معلّق", variant: "secondary" },
      failed: { label: "فشل", variant: "destructive" },
      refunded: { label: "مسترد", variant: "outline" },
      processing: { label: "جاري المعالجة", variant: "secondary" },
    };
    const s = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
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
  };

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="font-bold text-2xl text-foreground">المالية والمحاسبة</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "إجمالي المبيعات", value: totalRevenue, icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
            { label: "إجمالي العمولات", value: totalCommission, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
            { label: "تسويات معلّقة", value: pendingPayouts, icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
            { label: "تسويات مكتملة", value: completedPayouts, icon: Wallet, color: "text-teal", bg: "bg-teal/10" },
          ].map(kpi => (
            <div key={kpi.label} className="bg-card rounded-2xl border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <span className="text-2xl font-bold text-foreground">{kpi.value.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ر.س</span></span>
            </div>
          ))}
        </div>

        <Tabs defaultValue="transactions" dir="rtl">
          <TabsList>
            <TabsTrigger value="transactions">المعاملات</TabsTrigger>
            <TabsTrigger value="payouts">التسويات</TabsTrigger>
            <TabsTrigger value="commissions">العمولات</TabsTrigger>
          </TabsList>

          {/* Transactions */}
          <TabsContent value="transactions" className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث بالمرجع..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
            </div>
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-right p-3 text-xs text-muted-foreground font-semibold">التاريخ</th>
                    <th className="text-right p-3 text-xs text-muted-foreground font-semibold">النوع</th>
                    <th className="text-right p-3 text-xs text-muted-foreground font-semibold">المبلغ</th>
                    <th className="text-right p-3 text-xs text-muted-foreground font-semibold">العمولة</th>
                    <th className="text-right p-3 text-xs text-muted-foreground font-semibold">الصافي</th>
                    <th className="text-right p-3 text-xs text-muted-foreground font-semibold">الحالة</th>
                    <th className="text-right p-3 text-xs text-muted-foreground font-semibold">المرجع</th>
                  </tr></thead>
                  <tbody>
                    {transactions.filter(t => !search || t.payment_reference?.includes(search)).map(t => (
                      <tr key={t.id} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="p-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("ar-SA")}</td>
                        <td className="p-3 text-xs font-semibold text-foreground">{txTypeLabel[t.transaction_type] || t.transaction_type}</td>
                        <td className="p-3 text-xs font-bold text-foreground">{Number(t.amount).toLocaleString()} ر.س</td>
                        <td className="p-3 text-xs text-primary">{Number(t.commission_amount || 0).toLocaleString()} ر.س</td>
                        <td className="p-3 text-xs text-teal font-semibold">{Number(t.net_amount || 0).toLocaleString()} ر.س</td>
                        <td className="p-3">{statusBadge(t.status)}</td>
                        <td className="p-3 text-xs text-muted-foreground font-mono">{t.payment_reference || "-"}</td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">لا توجد معاملات بعد</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Payouts */}
          <TabsContent value="payouts" className="space-y-4">
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-right p-3 text-xs text-muted-foreground font-semibold">التاريخ</th>
                    <th className="text-right p-3 text-xs text-muted-foreground font-semibold">الحساب</th>
                    <th className="text-right p-3 text-xs text-muted-foreground font-semibold">المبلغ</th>
                    <th className="text-right p-3 text-xs text-muted-foreground font-semibold">البنك</th>
                    <th className="text-right p-3 text-xs text-muted-foreground font-semibold">IBAN</th>
                    <th className="text-right p-3 text-xs text-muted-foreground font-semibold">الحالة</th>
                    <th className="text-right p-3 text-xs text-muted-foreground font-semibold">إجراء</th>
                  </tr></thead>
                  <tbody>
                    {payouts.map(p => (
                      <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="p-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ar-SA")}</td>
                        <td className="p-3 text-xs font-semibold text-foreground">{p.account_holder_name || "-"}</td>
                        <td className="p-3 text-xs font-bold text-foreground">{Number(p.amount).toLocaleString()} ر.س</td>
                        <td className="p-3 text-xs text-muted-foreground">{p.bank_name || "-"}</td>
                        <td className="p-3 text-xs text-muted-foreground font-mono">{p.iban || "-"}</td>
                        <td className="p-3">{statusBadge(p.status)}</td>
                        <td className="p-3">
                          {p.status === "pending" && (
                            <Button size="sm" className="h-7 text-[10px] bg-green-600 hover:bg-green-700 text-white" onClick={() => markPayoutPaid(p.id)}>
                              <Check className="w-3 h-3 ml-1" /> تم الدفع
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {payouts.length === 0 && (
                      <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">لا توجد تسويات بعد</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Commission Settings */}
          <TabsContent value="commissions" className="space-y-4">
            <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
              <h2 className="font-bold text-foreground">نسب العمولات</h2>
              <p className="text-xs text-muted-foreground">تعديل نسبة العمولة التي تحصل عليها المنصة من كل عملية</p>
              <div className="space-y-3">
                {commissions.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-muted/30 rounded-xl p-4">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{categoryLabel[c.category] || c.category}</p>
                      <p className="text-xs text-muted-foreground">الحد الأدنى: {c.min_amount} ر.س</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingCommission === c.id ? (
                        <>
                          <Input type="number" value={editRate} onChange={e => setEditRate(e.target.value)} className="w-20 h-8 text-xs" min={0} max={100} />
                          <span className="text-xs text-muted-foreground">%</span>
                          <Button size="sm" className="h-8" onClick={() => saveCommission(c.id)}><Save className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingCommission(null)}><X className="w-3 h-3" /></Button>
                        </>
                      ) : (
                        <>
                          <span className="text-xl font-bold text-primary">{c.rate_percent}%</span>
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => { setEditingCommission(c.id); setEditRate(String(c.rate_percent)); }}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminFinance;
