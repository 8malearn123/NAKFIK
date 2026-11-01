import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, ChevronLeft, Info, Plus, Search } from "lucide-react";

interface OrgRow {
  id: string;
  name: string;
  owner_id: string;
}

const AdminCreateEvent = () => {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, name, owner_id")
        .eq("is_active", true)
        .order("name");
      setOrgs((data || []) as OrgRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = orgs.filter(o => !search || o.name.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = async (org: OrgRow) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, account_type")
      .eq("id", org.owner_id)
      .maybeSingle();
    if (!profile) { toast.error("تعذر تحميل ملف المنظم"); return; }
    startImpersonation({
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      account_type: profile.account_type,
    });
    toast.success(`الإنشاء باسم: ${org.name}`);
    navigate("/dashboard/events/create");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader title="إنشاء فعالية لمنظم" description="اختر المنظم الذي ستُنسب إليه الفعالية، ثم سيتم نقلك لنموذج الإنشاء." />

        <Panel bodyClassName="space-y-5">
          <div className="max-w-md space-y-2">
            <Label htmlFor="org-search">ابحث عن منظم</Label>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="org-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="اسم المنظم..." className="ps-10" />
            </div>
          </div>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map(i => <div key={i} className="h-[72px] animate-pulse rounded-xl bg-muted/60" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={search ? "لا يوجد منظمون مطابقون" : "لا يوجد منظمون بعد"}
              action={search ? (
                <Button size="sm" variant="outline" onClick={() => setSearch("")}>مسح البحث</Button>
              ) : (
                <Button asChild size="sm"><Link to="/admin/users/invite"><Plus className="h-4 w-4" /> دعوة حساب</Link></Button>
              )}
            />
          ) : (
            <div className="grid max-h-[400px] gap-3 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(o => (
                <button
                  key={o.id}
                  onClick={() => handleSelect(o)}
                  className="flex min-w-0 items-center gap-3 rounded-xl bg-muted/50 p-4 text-start transition-colors hover:bg-muted"
                >
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
                    <Building2 className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold leading-[22px]">{o.name}</span>
                    <span className="block text-xs leading-[18px] text-muted-foreground">إنشاء بهذا الاسم</span>
                  </span>
                  <ChevronLeft className="h-4 w-4 flex-none text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          <p className="flex items-start gap-2 text-xs leading-[18px] text-muted-foreground">
            <Info className="mt-px h-3.5 w-3.5 flex-none" />
            سيتم تفعيل وضع "الدخول كحساب" مؤقتاً لإنشاء الفعالية. يمكنك الخروج منه من الشريط العلوي بعد الانتهاء.
          </p>
        </Panel>
      </div>
    </AdminLayout>
  );
};

export default AdminCreateEvent;
