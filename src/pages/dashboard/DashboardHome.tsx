import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Users, Ticket, DollarSign, TrendingUp, ArrowUpLeft, Clock, AlertCircle, Mail } from "lucide-react";
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

const statusLabels: Record<string, { label: string; className: string }> = {
  active: { label: "نشطة", className: "bg-teal/10 text-teal" },
  closed: { label: "مغلقة", className: "bg-muted text-muted-foreground" },
  draft: { label: "مسودة", className: "bg-muted text-muted-foreground" },
  pending_review: { label: "قيد المراجعة", className: "bg-amber-100 text-amber-700" },
  published: { label: "منشورة", className: "bg-teal/10 text-teal" },
  approved: { label: "معتمدة", className: "bg-teal/10 text-teal" },
  rejected: { label: "مرفوضة", className: "bg-destructive/10 text-destructive" },
  completed: { label: "منتهية", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "ملغاة", className: "bg-muted text-muted-foreground" },
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
        { icon: Calendar, label: "إجمالي الفعاليات", value: stats.totalEvents.toString(), color: "bg-primary/10 text-primary" },
        { icon: Users, label: "إجمالي المسجلين", value: stats.totalRegistrations.toLocaleString("ar-SA"), color: "bg-teal/10 text-teal" },
        { icon: Ticket, label: "التذاكر المباعة", value: stats.totalTicketsSold.toLocaleString("ar-SA"), color: "bg-accent/10 text-accent" },
        { icon: DollarSign, label: "الإيرادات", value: `${stats.totalRevenue.toLocaleString("ar-SA")} ر.س`, color: "bg-gold/10 text-gold" },
      ]
    : [
        // المرحلة الأولى: نفس البطاقات بدلالات الدعوات الخاصة
        { icon: Mail, label: "إجمالي المناسبات الخاصة", value: stats.totalEvents.toString(), color: "bg-primary/10 text-primary" },
        { icon: Users, label: "إجمالي المدعوين", value: stats.totalRegistrations.toLocaleString("ar-SA"), color: "bg-teal/10 text-teal" },
        { icon: Ticket, label: "تأكيدات الحضور", value: stats.totalTicketsSold.toLocaleString("ar-SA"), color: "bg-accent/10 text-accent" },
        { icon: Users, label: "الحضور الفعلي (دخلوا)", value: stats.totalRevenue.toLocaleString("ar-SA"), color: "bg-gold/10 text-gold" },
      ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-bold text-2xl text-foreground">مرحباً، {profile?.full_name || "منظّم"} 👋</h1>
            <p className="text-muted-foreground text-sm">إليك نظرة عامة على فعالياتك</p>
          </div>
          {canPublic ? (
            <Button className="rounded-full" asChild disabled={!isOrgReady(organization as any)}>
              <Link to={isOrgReady(organization as any) ? "/dashboard/events/create" : "/dashboard/settings"}>
                <Calendar className="w-4 h-4" />
                {isOrgReady(organization as any) ? "إنشاء فعالية جديدة" : "أكمل ملف المؤسسة"}
              </Link>
            </Button>
          ) : (
            // باقة الدعوات الخاصة — لا يظهر أي زر لإنشاء فعاليات عامة
            <Button className="rounded-full" asChild>
              <Link to="/dashboard/invitations">
                <Mail className="w-4 h-4" /> دعوة خاصة جديدة
              </Link>
            </Button>
          )}
        </div>

        {!isOrgReady(organization as any) && (
          <div className="bg-brand-brick/5 border border-brand-brick/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-brand-brick mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-bold text-foreground mb-1">ملف مؤسستك غير مكتمل</p>
              <p className="text-muted-foreground mb-2">
                {organization?.is_active === false
                  ? "حسابك قيد المراجعة من فريق نكفيك. أكمل بياناتك ليتم تفعيله رسمياً وتتمكن من إنشاء الفعاليات."
                  : `يجب إكمال ${getMissingOrgFields(organization as any).length} حقل قبل إنشاء أي فعالية رسمية.`}
              </p>
              <Link to="/dashboard/settings" className="text-brand-brick font-bold underline">
                إكمال البيانات الآن ←
              </Link>
            </div>
          </div>
        )}

        {/* Subscription Usage — حصص الفعاليات العامة (المرحلة الثانية) */}
        {canPublic && <SubscriptionUsageCard />}

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-card rounded-2xl p-5 border border-border/50 hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="font-bold text-2xl text-foreground mb-1">{loading ? "..." : stat.value}</div>
              <div className="text-muted-foreground text-xs">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Action Items — مهام الفعاليات العامة (المرحلة الثانية) */}
        {canPublic && <ActionItems />}

        {/* Upcoming Events */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-5 border border-border/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground">{canPublic ? "الفعاليات القادمة" : "مناسباتك الخاصة القادمة"}</h3>
            <Link to={canPublic ? "/dashboard/events" : "/dashboard/invitations"} className="text-primary text-xs font-semibold hover:underline">
              عرض الكل
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-muted/50 rounded-xl h-16" />
              ))}
            </div>
          ) : events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => {
                const status = statusLabels[event.status] || statusLabels.draft;
                return (
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-foreground truncate">{event.title_ar}</h4>
                      <p className="text-muted-foreground text-xs">
                        {new Date(event.start_date).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${status.className}`}>
                          {status.label}
                        </span>
                        {canPublic && (
                          <span className="text-muted-foreground text-[10px]">{event.current_attendees_count} مسجّل</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">{canPublic ? "لا توجد فعاليات بعد" : "لا توجد مناسبات خاصة بعد"}</p>
              {canPublic ? (
                <Button className="rounded-full mt-3" size="sm" asChild>
                  <Link to="/dashboard/events/create">إنشاء فعالية</Link>
                </Button>
              ) : (
                <Button className="rounded-full mt-3" size="sm" asChild>
                  <Link to="/dashboard/invitations">أنشئ أول دعوة خاصة</Link>
                </Button>
              )}
            </div>
          )}
        </motion.div>

        {/* Recent Activity — نشاط تسجيلات الفعاليات العامة (المرحلة الثانية) */}
        {canPublic && <RecentActivity />}

        {!organization && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <p className="text-amber-800 font-semibold">لم يتم العثور على منظمة مرتبطة بحسابك</p>
            <p className="text-amber-600 text-sm mt-1">يرجى التواصل مع الدعم الفني</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardHome;
