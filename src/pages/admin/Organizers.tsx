import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatusBadge from "@/components/app/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { Building2, Calendar, LogIn, Plus } from "lucide-react";

interface OrgRow {
  id: string;
  name: string;
  owner_id: string;
  subscription_plan: string;
  is_active: boolean;
  created_at: string;
}

const HINT = "يمكنك عرض فعاليات أي منظم أو الدخول كحسابه";

// تمييز العدد بصيغته الصحيحة: 3 منظمين، 11 منظماً، 100 منظم
const organizersLabel = (n: number) => {
  if (n === 2) return "منظمان";
  const tail = n % 100;
  return `${formatNumber(n)} ${tail >= 3 && tail <= 10 ? "منظمين" : tail >= 11 ? "منظماً" : "منظم"}`;
};

const Organizers = () => {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, name, owner_id, subscription_plan, is_active, created_at")
        .order("created_at", { ascending: false });
      const orgList = (orgData || []) as OrgRow[];
      setOrgs(orgList);

      // Count events per org
      const { data: evData } = await supabase
        .from("events")
        .select("organization_id");
      const counts: Record<string, number> = {};
      (evData || []).forEach((e: any) => {
        counts[e.organization_id] = (counts[e.organization_id] || 0) + 1;
      });
      setEventCounts(counts);
      setLoading(false);
    };
    load();
  }, []);

  const handleImpersonate = async (org: OrgRow) => {
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="حسابات المنظمين"
          description={orgs.length ? `${organizersLabel(orgs.length)}، ${HINT}` : HINT}
        />

        {loading ? (
          <div className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />
        ) : orgs.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={Building2}
              title="لا يوجد منظمون مسجلون حتى الآن"
              action={<Button asChild><Link to="/admin/users/invite"><Plus className="h-4 w-4" /> دعوة حساب</Link></Button>}
            />
          </div>
        ) : (
          <Panel flush>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">اسم المنظمة</TableHead>
                  <TableHead>عدد الفعاليات</TableHead>
                  <TableHead>الاشتراك</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ التسجيل</TableHead>
                  <TableHead className="pe-6"><span className="sr-only">إجراءات</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="ps-6">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
                          <Building2 className="h-[18px] w-[18px]" />
                        </span>
                        <span className="whitespace-nowrap font-semibold sm:whitespace-normal">{o.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatNumber(eventCounts[o.id] || 0)}</TableCell>
                    <TableCell><bdi dir="ltr">{o.subscription_plan}</bdi></TableCell>
                    <TableCell>
                      <StatusBadge tone={o.is_active ? "success" : "danger"}>{o.is_active ? "نشط" : "معطل"}</StatusBadge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(o.created_at)}</TableCell>
                    <TableCell className="pe-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/admin/organizers/${o.id}/events`}>
                            <Calendar className="h-4 w-4" /> الفعاليات
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleImpersonate(o)}>
                          <LogIn className="h-4 w-4" /> دخول
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        )}
      </div>
    </AdminLayout>
  );
};

export default Organizers;
