import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { Eye, Plus, Search, Users, X } from "lucide-react";

const accountTypeLabels: Record<string, { label: string; tone: StatusTone }> = {
  attendee: { label: "حاضر", tone: "neutral" },
  organizer: { label: "منظّم", tone: "primary" },
  venue_owner: { label: "صاحب مكان", tone: "success" },
};

// تمييز العدد بصيغته الصحيحة: 3 مستخدمين، 11 مستخدماً، 200 مستخدم
const usersLabel = (n: number) => {
  if (n === 2) return "مستخدمين";
  const tail = n % 100;
  return `${formatNumber(n)} ${tail >= 3 && tail <= 10 ? "مستخدمين" : tail >= 11 ? "مستخدماً" : "مستخدم"}`;
};

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  account_type: string;
  created_at: string | null;
}

const AllUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, account_type, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      setUsers((data || []) as UserRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const counts = users.reduce((acc, u) => {
    acc[u.account_type] = (acc[u.account_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filtered = users
    .filter(u => {
      if (typeFilter !== "all" && u.account_type !== typeFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (u.full_name?.toLowerCase().includes(q)) || (u.email?.toLowerCase().includes(q)) || (u.phone?.includes(q));
    })
    .sort((a, b) => {
      if (sortBy === "name") return (a.full_name || "").localeCompare(b.full_name || "", "ar");
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortBy === "oldest" ? da - db : db - da;
    });

  const tabs = [
    { key: "all", label: "الكل", count: users.length },
    { key: "attendee", label: "الحاضرون", count: counts.attendee || 0 },
    { key: "organizer", label: "المنظّمون", count: counts.organizer || 0 },
    { key: "venue_owner", label: "أصحاب الأماكن", count: counts.venue_owner || 0 },
  ];

  const handleImpersonate = (user: UserRow) => {
    startImpersonation({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      account_type: user.account_type,
    });

    toast.success(`تم الدخول كـ ${user.full_name || user.email}`);

    if (user.account_type === "organizer") {
      navigate("/dashboard");
    } else if (user.account_type === "venue_owner") {
      navigate("/venue");
    } else {
      navigate("/my-tickets");
    }
  };

  const resetFilters = () => { setSearch(""); setTypeFilter("all"); };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="جميع المستخدمين"
          description={loading ? undefined : `${formatNumber(filtered.length)} من ${usersLabel(users.length)}`}
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <Tabs value={typeFilter} onValueChange={setTypeFilter} className="max-w-full">
            <TabsList className="max-w-full justify-start overflow-x-auto [scrollbar-width:none]">
              {tabs.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                  {t.label}
                  <span className="text-xs font-normal text-muted-foreground">{formatNumber(t.count)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:ms-auto sm:w-64">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو البريد..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="ps-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-10 w-auto min-w-[150px] gap-2 font-medium"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث تسجيلاً</SelectItem>
              <SelectItem value="oldest">الأقدم تسجيلاً</SelectItem>
              <SelectItem value="name">حسب الاسم</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="h-96 animate-pulse rounded-2xl bg-card shadow-soft" />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={Users}
              title="لا يوجد مستخدمون مطابقون للبحث"
              action={
                users.length === 0 ? (
                  <Button asChild><Link to="/admin/users/invite"><Plus className="h-4 w-4" /> دعوة حساب</Link></Button>
                ) : (
                  <Button variant="outline" onClick={resetFilters}><X className="h-4 w-4" /> إعادة تعيين</Button>
                )
              }
            />
          </div>
        ) : (
          <Panel flush>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">الاسم</TableHead>
                  <TableHead>البريد</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>التسجيل</TableHead>
                  <TableHead className="pe-6"><span className="sr-only">إجراءات</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const typeInfo = accountTypeLabels[u.account_type] || { label: u.account_type, tone: "neutral" as const };
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="ps-6">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-secondary text-sm font-bold text-primary">
                            {u.full_name?.charAt(0) || "؟"}
                          </span>
                          <span className="whitespace-nowrap font-semibold">{u.full_name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {u.email ? <bdi dir="ltr">{u.email}</bdi> : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {u.phone ? <bdi dir="ltr">{u.phone}</bdi> : "—"}
                      </TableCell>
                      <TableCell><StatusBadge tone={typeInfo.tone}>{typeInfo.label}</StatusBadge></TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {u.created_at ? formatDate(u.created_at) : "—"}
                      </TableCell>
                      <TableCell className="pe-6 text-end">
                        <Button size="sm" variant="outline" onClick={() => handleImpersonate(u)}>
                          <Eye className="h-4 w-4" /> الدخول كهذا الحساب
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Panel>
        )}
      </div>
    </AdminLayout>
  );
};

export default AllUsers;
