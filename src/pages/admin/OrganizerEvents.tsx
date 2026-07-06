import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight, Calendar, Eye, LogIn, MapPin, Users } from "lucide-react";

const statusLabels: Record<string, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
  pending_review: { label: "قيد المراجعة", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "معتمدة", cls: "bg-teal/10 text-teal" },
  published: { label: "منشورة", cls: "bg-teal/10 text-teal" },
  rejected: { label: "مرفوضة", cls: "bg-destructive/10 text-destructive" },
  completed: { label: "منتهية", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "ملغاة", cls: "bg-muted text-muted-foreground" },
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
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!org) {
    return (
      <AdminLayout>
        <div className="text-center py-20 space-y-3">
          <p className="text-muted-foreground">المنظم غير موجود</p>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/admin/organizers">عودة لقائمة المنظمين</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Link
          to="/admin/organizers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="w-4 h-4" />
          عودة للمنظمين
        </Link>

        <div className="bg-card rounded-2xl border border-border/50 p-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-bold text-2xl text-foreground">{org.name}</h1>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {org.subscription_plan}
              </span>
              <span className={`px-2.5 py-1 rounded-full font-medium ${org.is_active ? "bg-teal/10 text-teal" : "bg-destructive/10 text-destructive"}`}>
                {org.is_active ? "نشط" : "معطل"}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                {events.length} فعالية
              </span>
            </div>
          </div>
          <Button onClick={handleImpersonate} className="rounded-full">
            <LogIn className="w-4 h-4" />
            الدخول كهذا المنظم
          </Button>
        </div>

        {events.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-12 text-center space-y-3">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">لا توجد فعاليات لهذا المنظم</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(e => {
              const status = statusLabels[e.status] || statusLabels.draft;
              return (
                <div key={e.id} className="bg-card rounded-2xl border border-border/50 p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground">{e.title_ar}</h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(e.start_date).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {e.is_online ? "أونلاين" : (e.venue_name || "غير محدد")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {e.current_attendees_count}/{e.max_attendees || "∞"}
                        </span>
                      </div>
                      <span className={`inline-block mt-2 text-[11px] font-semibold rounded-full px-3 py-1 ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>
                    <Button asChild size="sm" variant="outline" className="rounded-full">
                      <Link to={`/events/${e.id}`}>
                        <Eye className="w-4 h-4" /> عرض
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default OrganizerEvents;
