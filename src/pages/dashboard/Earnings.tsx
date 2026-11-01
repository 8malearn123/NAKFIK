import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatCard from "@/components/app/StatCard";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AlertCircle, CreditCard, Plus, Receipt, TrendingUp, Wallet } from "lucide-react";
import { formatDate, formatNumber } from "@/lib/format";

// مبالغ مالية بكسورها كما هي، بلا تقريب إلى أقرب ريال
const money = (value: unknown) => `${formatNumber(Number(value || 0))} ر.س`;

const payoutStatus: Record<string, { label: string; tone: StatusTone }> = {
  completed: { label: "مكتمل", tone: "success" },
  pending: { label: "معلّق", tone: "warning" },
  processing: { label: "جاري المعالجة", tone: "primary" },
  failed: { label: "فشل", tone: "danger" },
};

const OrganizerEarnings = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // البيانات البنكية المسجلة مسبقاً في ملف المنظمة — تُسحب تلقائياً عند طلب التسوية
  const [orgBank, setOrgBank] = useState<{ bank_name: string | null; iban: string | null; bank_account_holder: string | null } | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [tab, setTab] = useState("transactions");

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

  const header = <PageHeader title="الأرباح والتسويات" />;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {header}
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-card shadow-soft" />)}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {header}

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <StatCard label="إجمالي الأرباح" value={formatNumber(totalEarnings)} unit="ر.س" icon={TrendingUp} />
          <StatCard label="الرصيد المتاح" value={formatNumber(pendingBalance)} unit="ر.س" icon={Wallet} />
          <StatCard label="تم تحويله" value={formatNumber(totalPaid)} unit="ر.س" icon={CreditCard} />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="transactions">المعاملات</TabsTrigger>
            <TabsTrigger value="payouts">التسويات</TabsTrigger>
            <TabsTrigger value="request">طلب تسوية</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-0">
            <Panel flush>
              {transactions.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="لا توجد معاملات بعد"
                  action={<Button asChild size="sm"><Link to="/dashboard/events/create"><Plus className="h-4 w-4" /> إنشاء فعالية</Link></Button>}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-6">النوع</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>العمولة</TableHead>
                      <TableHead className="pe-6">الصافي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="ps-6">
                          <p className="whitespace-nowrap font-semibold leading-[22px]">{txTypeLabel[t.transaction_type] || t.transaction_type}</p>
                          <p className="whitespace-nowrap text-xs leading-[18px] text-muted-foreground">{t.description_ar || "—"}</p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(t.created_at)}</TableCell>
                        <TableCell className="whitespace-nowrap">{money(t.amount)}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{money(t.commission_amount)}</TableCell>
                        <TableCell className="whitespace-nowrap pe-6 font-semibold">{money(t.net_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </TabsContent>

          <TabsContent value="payouts" className="mt-0">
            <Panel flush>
              {payouts.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="لا توجد تسويات بعد"
                  action={<Button size="sm" onClick={() => setTab("request")}>طلب تسوية</Button>}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-6">المبلغ</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>البنك</TableHead>
                      <TableHead className="pe-6">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map(p => {
                      const status = payoutStatus[p.status] || { label: p.status, tone: "neutral" as StatusTone };
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="whitespace-nowrap ps-6 font-semibold">{money(p.amount)}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(p.created_at)}</TableCell>
                          <TableCell className="whitespace-nowrap">{p.bank_name || "—"}</TableCell>
                          <TableCell className="pe-6"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </TabsContent>

          <TabsContent value="request" className="mt-0">
            <Panel title="طلب تسوية جديدة" bodyClassName="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="flex flex-col justify-center rounded-xl bg-muted/50 p-5">
                  <p className="text-sm font-medium text-muted-foreground">الرصيد المتاح للتسوية</p>
                  <p className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-[32px] font-bold leading-10">{formatNumber(pendingBalance)}</span>
                    <span className="text-sm font-semibold text-muted-foreground">ر.س</span>
                  </p>
                </div>

                {bankComplete ? (
                  <div className="rounded-xl bg-muted/50 p-5">
                    <p className="mb-3 text-[13px] font-semibold leading-5">سيتم التحويل إلى حسابك البنكي المسجل في ملف المنظمة</p>
                    <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                      <div className="min-w-0">
                        <dt className="text-xs text-muted-foreground">البنك</dt>
                        <dd className="mt-0.5 truncate text-sm font-semibold">{orgBank!.bank_name}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-muted-foreground">صاحب الحساب</dt>
                        <dd className="mt-0.5 truncate text-sm font-semibold">{orgBank!.bank_account_holder}</dd>
                      </div>
                      <div className="min-w-0 sm:col-span-2">
                        <dt className="text-xs text-muted-foreground"><bdi dir="ltr">IBAN</bdi></dt>
                        <dd className="mt-0.5 break-all text-sm font-semibold"><bdi dir="ltr">{orgBank!.iban}</bdi></dd>
                      </div>
                    </dl>
                    <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                      لتعديل البيانات البنكية: <Link to="/dashboard/settings" className="font-semibold text-primary">إعدادات المنظمة</Link>
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl bg-[#FDF3E3] p-5 text-[13px] leading-6 text-[#9A5F12]">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-none" />
                    <p>
                      لا توجد بيانات بنكية مسجلة في ملف منظمتك بعد.
                      أضف اسم البنك والآيبان وصاحب الحساب من{" "}
                      <Link to="/dashboard/settings" className="font-bold underline">إعدادات المنظمة</Link>{" "}
                      ثم ارجع لطلب التسوية.
                    </p>
                  </div>
                )}
              </div>

              <Button onClick={requestPayout} disabled={requesting || pendingBalance <= 0 || !bankComplete}>
                {requesting ? "جاري الإرسال..." : "طلب تسوية"}
              </Button>
            </Panel>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default OrganizerEarnings;
