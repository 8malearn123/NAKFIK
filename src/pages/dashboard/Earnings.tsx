import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { DollarSign, TrendingUp, Wallet, CreditCard, ArrowDownRight, Clock } from "lucide-react";

const OrganizerEarnings = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // البيانات البنكية المسجلة مسبقاً في ملف المنظمة — تُسحب تلقائياً عند طلب التسوية
  const [orgBank, setOrgBank] = useState<{ bank_name: string | null; iban: string | null; bank_account_holder: string | null } | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: tx }, { data: po }, { data: org }] = await Promise.all([
        supabase.from("transactions").select("*").eq("account_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("payouts").select("*").eq("account_id", user.id).order("created_at", { ascending: false }),
        supabase.from("organizations").select("bank_name, iban, bank_account_holder").eq("owner_id", user.id).maybeSingle(),
      ]);
      setTransactions(tx || []);
      setPayouts(po || []);
      setOrgBank((org as any) || null);
      setLoading(false);
    };
    load();
  }, [user]);

  const bankComplete = !!(orgBank?.bank_name && orgBank?.iban && orgBank?.bank_account_holder);

  const totalEarnings = transactions.filter(t => t.status === "completed" && t.transaction_type === "ticket_sale").reduce((s, t) => s + Number(t.net_amount || 0), 0);
  const pendingBalance = totalEarnings - payouts.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
  const totalPaid = payouts.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);

  const requestPayout = async () => {
    if (!user || pendingBalance <= 0) return;
    // البيانات البنكية تُسحب تلقائياً من ملف المنظمة المسجل منذ إنشاء الحساب
    if (!bankComplete) {
      toast.error("أكمل بياناتك البنكية في إعدادات المنظمة أولاً");
      return;
    }
    setRequesting(true);
    const { error } = await supabase.from("payouts").insert({
      account_id: user.id,
      account_type: "organizer",
      amount: pendingBalance,
      bank_name: orgBank!.bank_name,
      iban: orgBank!.iban,
      account_holder_name: orgBank!.bank_account_holder,
      status: "pending" as any,
    } as any);
    setRequesting(false);
    if (error) { toast.error("خطأ في طلب التسوية"); return; }
    toast.success("تم إرسال طلب التسوية بنجاح — ستحوَّل إلى حسابك البنكي المسجل");
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
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">الرصيد المتاح للتسوية</p>
                <p className="text-3xl font-extrabold text-primary">{pendingBalance.toLocaleString()} <span className="text-sm font-normal">ر.س</span></p>
              </div>

              {bankComplete ? (
                <div className="rounded-xl border p-4 space-y-1.5 text-sm">
                  <p className="text-xs font-bold text-muted-foreground mb-2">
                    سيتم التحويل إلى حسابك البنكي المسجل في ملف المنظمة:
                  </p>
                  <p><span className="text-muted-foreground text-xs">البنك:</span> <span className="font-bold">{orgBank!.bank_name}</span></p>
                  <p><span className="text-muted-foreground text-xs">IBAN:</span> <span className="font-mono text-xs" dir="ltr">{orgBank!.iban}</span></p>
                  <p><span className="text-muted-foreground text-xs">صاحب الحساب:</span> <span className="font-bold">{orgBank!.bank_account_holder}</span></p>
                  <p className="text-[11px] text-muted-foreground pt-1 border-t mt-2">
                    لتعديل البيانات البنكية: <a href="/dashboard/settings" className="text-primary underline">إعدادات المنظمة</a>
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-500/10 border border-amber-400/40 text-amber-800 p-4 text-xs leading-relaxed">
                  ⚠️ لا توجد بيانات بنكية مسجلة في ملف منظمتك بعد.
                  أضف اسم البنك والآيبان وصاحب الحساب من{" "}
                  <a href="/dashboard/settings" className="font-bold underline">إعدادات المنظمة</a>{" "}
                  ثم ارجع لطلب التسوية.
                </div>
              )}

              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={requestPayout}
                disabled={requesting || pendingBalance <= 0 || !bankComplete}
              >
                {requesting ? "جاري الإرسال..." : "طلب تسوية"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default OrganizerEarnings;
