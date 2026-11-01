import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { Calendar, Eye, LogIn, Plus, Search } from "lucide-react";

const statusLabels: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: "مسودة", tone: "neutral" },
  pending_review: { label: "قيد المراجعة", tone: "warning" },
  approved: { label: "معتمدة", tone: "success" },
  published: { label: "منشورة", tone: "success" },
  rejected: { label: "مرفوضة", tone: "danger" },
  completed: { label: "منتهية", tone: "neutral" },
  cancelled: { label: "ملغاة", tone: "neutral" },
};

const countOf = (n: number, one: string, two: string, few: string, many: string) => {
  if (n === 1) return one;
  if (n === 2) return two;
  return `${formatNumber(n)} ${n <= 10 ? few : many}`;
};

interface EventRow {
  id: string;
  title_ar: string;
  status: string;
  start_date: string;
  category: string;
  current_attendees_count: number;
  organization_id: string;
  organization?: { id: string; name: string; owner_id: string } | null;
}

const AllEvents = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title_ar, status, start_date, category, current_attendees_count, organization_id, organization:organizations(id, name, owner_id)")
        .order("created_at", { ascending: false })
        .limit(500);

      const transformed = (data || []).map((e: any) => ({
        ...e,
        organization: Array.isArray(e.organization) ? e.organization[0] : e.organization,
      })) as EventRow[];
      setEvents(transformed);
      setLoading(false);
    };
    load();
  }, []);

  const orgs = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach(e => {
      if (e.organization?.id) map.set(e.organization.id, e.organization.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [events]);

  const filtered = events.filter(e => {
    const matchOrg = orgFilter === "all" || e.organization?.id === orgFilter;
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      e.title_ar.toLowerCase().includes(q) ||
      (e.organization?.name || "").toLowerCase().includes(q);
    return matchOrg && matchSearch;
  });

  const handleImpersonateOwner = async (org?: EventRow["organization"]) => {
    if (!org?.owner_id) {
      toast.error("لا يوجد مالك لهذه المنظمة");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, account_type")
      .eq("id", org.owner_id)
      .maybeSingle();
    if (!profile) {
      toast.error("تعذر العثور على ملف المنظم");
      return;
    }
    startImpersonation({
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      account_type: profile.account_type,
    });
    toast.success(`تم الدخول كـ ${profile.full_name || profile.email}`);
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <PageHeader title="جميع الفعاليات" description="…" />
          <div className="h-96 animate-pulse rounded-2xl bg-card shadow-soft" />
        </div>
      </AdminLayout>
    );
  }

  const filtersActive = search.trim() !== "" || orgFilter !== "all";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="جميع الفعاليات"
          description={`${countOf(events.length, "فعالية واحدة", "فعاليتان", "فعاليات", "فعالية")}، ${countOf(orgs.length, "منظّم واحد", "منظّمان", "منظّمين", "منظّماً")}`}
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-80">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث بالعنوان أو اسم المنظم..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="ps-10"
            />
          </div>
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger aria-label="المنظم" className="h-10 w-full gap-2 font-medium sm:w-auto sm:min-w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المنظّمين</SelectItem>
              {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={Calendar}
              title={filtersActive ? "لا توجد فعاليات مطابقة" : "لا توجد فعاليات بعد"}
              action={filtersActive ? (
                <Button size="sm" variant="outline" onClick={() => { setSearch(""); setOrgFilter("all"); }}>مسح الفلاتر</Button>
              ) : (
                <Button asChild size="sm"><Link to="/admin/events/create"><Plus className="h-4 w-4" /> إنشاء فعالية لمنظم</Link></Button>
              )}
            />
          </div>
        ) : (
          <Panel flush>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">الفعالية</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الحضور</TableHead>
                  <TableHead className="pe-6 text-end">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(e => {
                  const status = statusLabels[e.status];
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap ps-6">
                        <p className="font-semibold leading-[22px]">{e.title_ar}</p>
                        {e.organization ? (
                          <Link to={`/admin/organizers/${e.organization.id}/events`} className="text-xs leading-[18px] text-muted-foreground hover:text-primary hover:underline">
                            {e.organization.name}
                          </Link>
                        ) : <p className="text-xs leading-[18px] text-muted-foreground">—</p>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(e.start_date)}</TableCell>
                      <TableCell><StatusBadge tone={status?.tone ?? "neutral"}>{status?.label || e.status}</StatusBadge></TableCell>
                      <TableCell>{formatNumber(e.current_attendees_count)}</TableCell>
                      <TableCell className="pe-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button asChild size="sm" variant="ghost">
                            <Link to={`/events/${e.id}`}><Eye className="h-4 w-4" /> عرض</Link>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleImpersonateOwner(e.organization)}>
                            <LogIn className="h-4 w-4" /> دخول كالمنظم
                          </Button>
                        </div>
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

export default AllEvents;
