import { useEffect, useState } from "react";
import { AlertCircle, Calendar, DollarSign, Mail, Ticket, UserCheck, Users } from "lucide-react";
import { usePlanScope } from "@/hooks/usePlanScope";
import { getMissingOrgFields, isOrgReady } from "@/lib/orgCompleteness";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { supabase } from "@/integrations/supabase/client";
import SubscriptionUsageCard from "@/components/dashboard/SubscriptionUsageCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import ActionItems from "@/components/dashboard/ActionItems";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatCard from "@/components/app/StatCard";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { daysLeftLabel, formatDate, formatMoney, formatNumber } from "@/lib/format";

const statusLabels: Record<string, { label: string; tone: StatusTone }> = {
  active: { label: "نشطة", tone: "success" },
  closed: { label: "مغلقة", tone: "neutral" },
  draft: { label: "مسودة", tone: "neutral" },
  pending_review: { label: "قيد المراجعة", tone: "warning" },
  published: { label: "منشورة", tone: "success" },
  approved: { label: "معتمدة", tone: "success" },
  rejected: { label: "مرفوضة", tone: "danger" },
  completed: { label: "منتهية", tone: "neutral" },
  cancelled: { label: "ملغاة", tone: "neutral" },
};

interface EventRow {
  id: string;
  title_ar: string;
  start_date: string;
  status: string;
  current_attendees_count: number;
}

interface Stats {
  totalEvents: number;
  totalRegistrations: number;
  totalTicketsSold: number;
  totalRevenue: number;
}

const DashboardHome = () => {
  const { effectiveProfile: profile, effectiveOrganization: organization } = useEffectiveUser();
  const { canPublic } = usePlanScope();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [stats, setStats] = useState<Stats>({ totalEvents: 0, totalRegistrations: 0, totalTicketsSold: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      if (canPublic) {
        // المرحلة الثانية: إحصائيات الفعاليات العامة
        const { data: evts } = await supabase
          .from("events")
          .select("id, title_ar, start_date, status, current_attendees_count")
          .eq("organization_id", organization.id)
          .order("start_date", { ascending: true })
          .limit(5);

        const eventsList = (evts || []) as EventRow[];
        setEvents(eventsList);

        const totalEvents = eventsList.length;
        const totalRegistrations = eventsList.reduce((sum, e) => sum + (e.current_attendees_count || 0), 0);

        setStats({
          totalEvents,
          totalRegistrations,
          totalTicketsSold: totalRegistrations,
          totalRevenue: 0, // TODO: calculate from registrations
        });
      } else {
        // المرحلة الأولى: نفس البطاقات تُحسب من الدعوات الخاصة فقط
        const { data: invs } = await supabase
          .from("private_invitations")
          .select("id, title, event_date, status")
          .eq("organization_id", organization.id)
          .order("event_date", { ascending: false });

        const invList = (invs || []) as any[];
        // أقرب المناسبات للعرض في القائمة
        const upcoming = [...invList]
          .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
          .filter((i) => i.status !== "cancelled")
          .slice(0, 5);
        setEvents(upcoming.map((i) => ({
          id: i.id,
          title_ar: i.title,
          start_date: i.event_date,
          status: i.status,
          current_attendees_count: 0,
        })));

        let totalGuests = 0, confirmed = 0, checkedIn = 0;
        if (invList.length) {
          const { data: guests } = await supabase
            .from("private_invitation_guests")
            .select("invitation_id, rsvp_status, checked_in_at")
            .in("invitation_id", invList.map((i) => i.id));
          const gl = guests || [];
          totalGuests = gl.length;
          confirmed = gl.filter((g: any) => g.rsvp_status === "confirmed").length;
          checkedIn = gl.filter((g: any) => g.checked_in_at).length;
        }
        setStats({
          totalEvents: invList.length,
          totalRegistrations: totalGuests,
          totalTicketsSold: confirmed,
          totalRevenue: checkedIn,
        });
      }
      setLoading(false);
    };
    load();
  }, [organization, canPublic]);

  const statsCards = canPublic
    ? [
        { icon: Calendar, label: "إجمالي الفعاليات", value: formatNumber(stats.totalEvents) },
        { icon: Users, label: "إجمالي المسجلين", value: formatNumber(stats.totalRegistrations) },
        { icon: Ticket, label: "التذاكر المباعة", value: formatNumber(stats.totalTicketsSold) },
        { icon: DollarSign, label: "الإيرادات", value: formatMoney(stats.totalRevenue) },
      ]
    : [
        // المرحلة الأولى: نفس البطاقات بدلالات الدعوات الخاصة
        { icon: Mail, label: "المناسبات الخاصة", value: formatNumber(stats.totalEvents) },
        { icon: Users, label: "إجمالي المدعوين", value: formatNumber(stats.totalRegistrations) },
        { icon: UserCheck, label: "تأكيدات الحضور", value: formatNumber(stats.totalTicketsSold) },
        { icon: Ticket, label: "الحضور الفعلي", value: formatNumber(stats.totalRevenue) },
      ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title={`مرحباً، ${profile?.full_name || "منظّم"}`}
          description={canPublic ? "إليك نظرة عامة على فعالياتك" : "إليك نظرة عامة على مناسباتك"}
          actions={
            canPublic ? (
              <Button asChild>
                <Link to={isOrgReady(organization as any) ? "/dashboard/events/create" : "/dashboard/settings"}>
                  <Calendar className="w-4 h-4" />
                  {isOrgReady(organization as any) ? "إنشاء فعالية جديدة" : "أكمل ملف المؤسسة"}
                </Link>
              </Button>
            ) : (
              // باقة الدعوات الخاصة: لا يظهر أي زر لإنشاء فعاليات عامة
              <Button asChild>
                <Link to="/dashboard/invitations"><Mail className="w-4 h-4" /> دعوة خاصة جديدة</Link>
              </Button>
            )
          }
        />

        {organization && !isOrgReady(organization as any) && (
          <div className="flex items-start gap-3 rounded-2xl bg-[#FBECEA] p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#B42F24]" />
            <div className="flex-1 text-sm">
              <p className="mb-0.5 font-bold">ملف مؤسستك غير مكتمل</p>
              <p className="text-muted-foreground">
                {organization?.is_active === false
                  ? "حسابك قيد المراجعة من فريق نكفيك. أكمل بياناتك ليتم تفعيله رسمياً وتتمكن من إنشاء الفعاليات."
                  : `يجب إكمال ${getMissingOrgFields(organization as any).length} حقل قبل إنشاء أي فعالية رسمية.`}
              </p>
            </div>
            <Button asChild variant="outline" size="sm"><Link to="/dashboard/settings">أكمل البيانات</Link></Button>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {statsCards.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={loading ? "…" : stat.value} icon={stat.icon} />
          ))}
        </div>

        {/* حصص الباقة ومهام الفعاليات العامة (المرحلة الثانية) */}
        {canPublic && <SubscriptionUsageCard />}
        {canPublic && <ActionItems />}

        <Panel
          title={canPublic ? "الفعاليات القادمة" : "مناسباتك الخاصة القادمة"}
          actions={<Link to={canPublic ? "/dashboard/events" : "/dashboard/invitations"} className="text-[13px] font-semibold leading-5 text-primary">عرض الكل</Link>}
        >
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />)}
            </div>
          ) : events.length > 0 ? (
            <div className="divide-y divide-border">
              {events.map((event) => {
                const status = statusLabels[event.status] || statusLabels.draft;
                return (
                  <div key={event.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-[10px] bg-secondary text-primary"><Calendar className="h-[18px] w-[18px]" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-[22px]">{event.title_ar}</p>
                      <p className="text-xs leading-[18px] text-muted-foreground">
                        {formatDate(event.start_date)}، {daysLeftLabel(event.start_date)}
                        {canPublic && `، ${formatNumber(event.current_attendees_count)} مسجّل`}
                      </p>
                    </div>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title={canPublic ? "لا توجد فعاليات بعد" : "لا توجد مناسبات خاصة بعد"}
              action={
                <Button asChild size="sm">
                  <Link to={canPublic ? "/dashboard/events/create" : "/dashboard/invitations"}>{canPublic ? "إنشاء فعالية" : "أنشئ أول دعوة خاصة"}</Link>
                </Button>
              }
            />
          )}
        </Panel>

        {/* نشاط تسجيلات الفعاليات العامة (المرحلة الثانية) */}
        {canPublic && <RecentActivity />}

        {!organization && (
          <div className="rounded-2xl bg-[#FDF3E3] p-6 text-center">
            <p className="font-semibold text-[#9A5F12]">لم يتم العثور على منظمة مرتبطة بحسابك</p>
            <p className="mt-1 text-sm text-muted-foreground">يرجى التواصل مع الدعم الفني</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardHome;
