import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { ArrowRight, Building2, Calendar, Eye, LogIn, Plus } from "lucide-react";

const statusLabels: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: "مسودة", tone: "neutral" },
  pending_review: { label: "قيد المراجعة", tone: "warning" },
  approved: { label: "معتمدة", tone: "success" },
  published: { label: "منشورة", tone: "success" },
  rejected: { label: "مرفوضة", tone: "danger" },
  completed: { label: "منتهية", tone: "neutral" },
  cancelled: { label: "ملغاة", tone: "neutral" },
};

// تمييز العدد بصيغته الصحيحة: 3 فعاليات، 11 فعالية
const eventsLabel = (n: number) => {
  if (n === 2) return "فعاليتان";
  const tail = n % 100;
  return `${formatNumber(n)} ${tail >= 3 && tail <= 10 ? "فعاليات" : "فعالية"}`;
};

interface OrgInfo {
  id: string;
  name: string;
  owner_id: string;
  is_active: boolean;
  subscription_plan: string;
}

interface EventRow {
  id: string;
  title_ar: string;
  status: string;
  start_date: string;
  venue_name: string | null;
  is_online: boolean;
  current_attendees_count: number;
  max_attendees: number | null;
}

const OrganizerEvents = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { startImpersonation } = useImpersonation();
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [{ data: orgData }, { data: evData }] = await Promise.all([
        supabase
          .from("organizations")
          .select("id, name, owner_id, is_active, subscription_plan")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("events")
          .select("id, title_ar, status, start_date, venue_name, is_online, current_attendees_count, max_attendees")
          .eq("organization_id", id)
          .order("created_at", { ascending: false }),
      ]);
      setOrg(orgData as OrgInfo | null);
      setEvents((evData || []) as EventRow[]);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleImpersonate = async () => {
    if (!org?.owner_id) return;
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
          <div className="h-14 w-72 max-w-full animate-pulse rounded-2xl bg-card shadow-soft" />
          <div className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />
        </div>
      </AdminLayout>
    );
  }

  if (!org) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <PageHeader title="حسابات المنظمين" />
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={Building2}
              title="المنظم غير موجود"
              action={<Button asChild variant="outline"><Link to="/admin/organizers">عودة لقائمة المنظمين</Link></Button>}
            />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title={org.name}
          description={
            <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <StatusBadge tone={org.is_active ? "success" : "danger"}>{org.is_active ? "نشط" : "معطل"}</StatusBadge>
              <span>
                <bdi dir="ltr">{org.subscription_plan}</bdi>، {eventsLabel(events.length)}
              </span>
            </span>
          }
          actions={
            <>
              <Button asChild variant="outline">
                <Link to="/admin/organizers"><ArrowRight className="h-4 w-4" /> عودة للمنظمين</Link>
              </Button>
              <Button onClick={handleImpersonate}><LogIn className="h-4 w-4" /> الدخول كهذا المنظم</Button>
            </>
          }
        />

        {events.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={Calendar}
              title="لا توجد فعاليات لهذا المنظم"
              action={<Button asChild variant="outline"><Link to="/admin/events/create"><Plus className="h-4 w-4" /> إنشاء فعالية</Link></Button>}
            />
          </div>
        ) : (
          <Panel flush>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">الفعالية</TableHead>
                  <TableHead>الموعد</TableHead>
                  <TableHead>المكان</TableHead>
                  <TableHead>الحضور</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="pe-6"><span className="sr-only">إجراءات</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => {
                  const status = statusLabels[e.status] || statusLabels.draft;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap ps-6 font-semibold sm:whitespace-normal">{e.title_ar}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(e.start_date)}</TableCell>
                      <TableCell className="whitespace-nowrap">{e.is_online ? "أونلاين" : (e.venue_name || "غير محدد")}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatNumber(e.current_attendees_count)}
                        {e.max_attendees ? ` من ${formatNumber(e.max_attendees)}` : "، بلا حد أقصى"}
                      </TableCell>
                      <TableCell><StatusBadge tone={status.tone}>{status.label}</StatusBadge></TableCell>
                      <TableCell className="pe-6 text-end">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/events/${e.id}`}><Eye className="h-4 w-4" /> عرض</Link>
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

export default OrganizerEvents;
