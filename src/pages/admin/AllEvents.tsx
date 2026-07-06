import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Calendar, Eye, Search, LogIn, Building2 } from "lucide-react";

const statusLabels: Record<string, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
  pending_review: { label: "قيد المراجعة", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "معتمدة", cls: "bg-teal/10 text-teal" },
  published: { label: "منشورة", cls: "bg-teal/10 text-teal" },
  rejected: { label: "مرفوضة", cls: "bg-destructive/10 text-destructive" },
  completed: { label: "منتهية", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "ملغاة", cls: "bg-muted text-muted-foreground" },
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
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-bold text-2xl text-foreground">جميع الفعاليات</h1>
            <p className="text-muted-foreground text-sm mt-1">{events.length} فعالية — {orgs.length} منظّم</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالعنوان أو اسم المنظم..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <select
            value={orgFilter}
            onChange={e => setOrgFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-input bg-background text-sm min-w-[200px]"
          >
            <option value="all">كل المنظّمين</option>
            {orgs.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-12 text-center space-y-3">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">لا توجد فعاليات مطابقة</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-right p-3">الفعالية</th>
                    <th className="text-right p-3">المنظم</th>
                    <th className="text-right p-3">التاريخ</th>
                    <th className="text-right p-3">الحالة</th>
                    <th className="text-right p-3">الحضور</th>
                    <th className="p-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map(e => (
                    <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{e.title_ar}</td>
                      <td className="p-3">
                        {e.organization ? (
                          <Link
                            to={`/admin/organizers/${e.organization.id}/events`}
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            {e.organization.name}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="p-3 text-muted-foreground" dir="ltr">{new Date(e.start_date).toLocaleDateString("ar-SA")}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusLabels[e.status]?.cls || ""}`}>
                          {statusLabels[e.status]?.label || e.status}
                        </span>
                      </td>
                      <td className="p-3">{e.current_attendees_count}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                            <Link to={`/events/${e.id}`}><Eye className="w-3.5 h-3.5" /> عرض</Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => handleImpersonateOwner(e.organization)}
                          >
                            <LogIn className="w-3.5 h-3.5" /> دخول كالمنظم
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AllEvents;
