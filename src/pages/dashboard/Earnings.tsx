import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { DollarSign, TrendingUp, Wallet, CreditCard, ArrowDownRight, Clock } from "lucide-react";

const OrganizerEarnings = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankForm, setBankForm] = useState({ bank_name: "", iban: "", holder_name: "" });
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: tx }, { data: po }] = await Promise.all([
        supabase.from("transactions").select("*").eq("account_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("payouts").select("*").eq("account_id", user.id).order("created_at", { ascending: false }),
      ]);
      setTransactions(tx || []);
      setPayouts(po || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const totalEarnings = transactions.filter(t => t.status === "completed" && t.transaction_type === "ticket_sale").reduce((s, t) => s + Number(t.net_amount || 0), 0);
  const pendingBalance = totalEarnings - payouts.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
  const totalPaid = payouts.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);

  const requestPayout = async () => {
    if (!user || pendingBalance <= 0) return;
    if (!bankForm.bank_name || !bankForm.iban || !bankForm.holder_name) {
      toast.error("يرجى ملء بيانات الحساب البنكي");
      return;
    }
    setRequesting(true);
    const { error } = await supabase.from("payouts").insert({
      account_id: user.id,
      account_type: "organizer",
      amount: pendingBalance,
      bank_name: bankForm.bank_name,
      iban: bankForm.iban,
      account_holder_name: bankForm.holder_name,
      status: "pending" as any,
    } as any);
    setRequesting(false);
    if (error) { toast.error("خطأ في طلب التسوية"); return; }
    toast.success("تم إرسال طلب التسوية بنجاح");
  };

  const txTypeLabel: Record<string, string> = {
    ticket_sale: "بيع تذكرة",
    ticket_refund: "استرداد",
    commission: "عمولة",
    payout: "تسوية",
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="font-bold text-2xl text-foreground">الأرباح والتسويات</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "إجمالي الأرباح", value: totalEarnings, icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
            { label: "الرصيد المتاح", value: pendingBalance, icon: Wallet, color: "text-primary", bg: "bg-primary/10" },
            { label: "تم تحويله", value: totalPaid, icon: CreditCard, color: "text-teal", bg: "bg-teal/10" },
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
            <TabsTrigger value="request">طلب تسوية</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-right p-3 text-xs text-muted-foreground font-semibold">التاريخ</th>
                  <th className="text-right p-3 text-xs text-muted-foreground font-semibold">النوع</th>
                  <th className="text-right p-3 text-xs text-muted-foreground font-semibold">المبلغ</th>
                  <th className="text-right p-3 text-xs text-muted-foreground font-semibold">العمولة</th>
                  <th className="text-right p-3 text-xs text-muted-foreground font-semibold">الصافي</th>
                  <th className="text-right p-3 text-xs text-muted-foreground font-semibold">الوصف</th>
                </tr></thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id} className="border-b border-border/30">
                      <td className="p-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("ar-SA")}</td>
                      <td className="p-3 text-xs font-semibold">{txTypeLabel[t.transaction_type] || t.transaction_type}</td>
                      <td className="p-3 text-xs font-bold">{Number(t.amount).toLocaleString()} ر.س</td>
                      <td className="p-3 text-xs text-destructive">{Number(t.commission_amount || 0).toLocaleString()} ر.س</td>
                      <td className="p-3 text-xs font-bold text-green-600">{Number(t.net_amount || 0).toLocaleString()} ر.س</td>
                      <td className="p-3 text-xs text-muted-foreground">{t.description_ar || "-"}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">لا توجد معاملات بعد</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="payouts">
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-right p-3 text-xs text-muted-foreground font-semibold">التاريخ</th>
                  <th className="text-right p-3 text-xs text-muted-foreground font-semibold">المبلغ</th>
                  <th className="text-right p-3 text-xs text-muted-foreground font-semibold">البنك</th>
                  <th className="text-right p-3 text-xs text-muted-foreground font-semibold">الحالة</th>
                </tr></thead>
                <tbody>
                  {payouts.map(p => (
                    <tr key={p.id} className="border-b border-border/30">
                      <td className="p-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ar-SA")}</td>
                      <td className="p-3 text-xs font-bold">{Number(p.amount).toLocaleString()} ر.س</td>
                      <td className="p-3 text-xs">{p.bank_name || "-"}</td>
                      <td className="p-3"><Badge variant={p.status === "completed" ? "default" : "secondary"} className="text-[10px]">{p.status === "completed" ? "مكتمل" : p.status === "pending" ? "معلّق" : p.status}</Badge></td>
                    </tr>
                  ))}
                  {payouts.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-muted-foreground">لا توجد تسويات بعد</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="request">
            <div className="bg-card rounded-2xl border border-border/50 p-6 max-w-md space-y-4">
              <h2 className="font-bold text-foreground">طلب تسوية جديدة</h2>
              <p className="text-xs text-muted-foreground">الرصيد المتاح: <span className="font-bold text-primary">{pendingBalance.toLocaleString()} ر.س</span></p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">اسم البنك</Label>
                  <Input value={bankForm.bank_name} onChange={e => setBankForm({ ...bankForm, bank_name: e.target.value })} placeholder="مثال: الراجحي" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">IBAN</Label>
                  <Input value={bankForm.iban} onChange={e => setBankForm({ ...bankForm, iban: e.target.value })} placeholder="SA..." dir="ltr" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">اسم صاحب الحساب</Label>
                  <Input value={bankForm.holder_name} onChange={e => setBankForm({ ...bankForm, holder_name: e.target.value })} />
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90" onClick={requestPayout} disabled={requesting || pendingBalance <= 0}>
                  {requesting ? "جاري الإرسال..." : "طلب تسوية"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default OrganizerEarnings;
