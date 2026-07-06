import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Building2, Calendar, LogIn } from "lucide-react";

interface OrgRow {
  id: string;
  name: string;
  owner_id: string;
  subscription_plan: string;
  is_active: boolean;
  created_at: string;
}

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

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-2xl text-foreground">حسابات المنظمين</h1>
          <p className="text-muted-foreground text-sm mt-1">{orgs.length} منظّم — يمكنك عرض فعاليات أي منظم أو الدخول كحسابه</p>
        </div>

        {orgs.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-12 text-center space-y-3">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">لا يوجد منظمين مسجلين حتى الآن</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-right p-3">اسم المنظمة</th>
                    <th className="text-right p-3">عدد الفعاليات</th>
                    <th className="text-right p-3">الاشتراك</th>
                    <th className="text-right p-3">الحالة</th>
                    <th className="text-right p-3">تاريخ التسجيل</th>
                    <th className="p-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {orgs.map(o => (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{o.name}</td>
                      <td className="p-3">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-muted font-medium">
                          {eventCounts[o.id] || 0}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">{o.subscription_plan}</span>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${o.is_active ? "bg-teal/10 text-teal" : "bg-destructive/10 text-destructive"}`}>
                          {o.is_active ? "نشط" : "معطل"}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString("ar-SA")}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                            <Link to={`/admin/organizers/${o.id}/events`}>
                              <Calendar className="w-3.5 h-3.5" /> الفعاليات
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => handleImpersonate(o)}
                          >
                            <LogIn className="w-3.5 h-3.5" /> دخول
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

export default Organizers;
