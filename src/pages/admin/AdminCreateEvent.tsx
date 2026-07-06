import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PlusCircle, Search, Building2 } from "lucide-react";

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
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-bold text-2xl text-foreground flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-primary" /> إنشاء فعالية لمنظم
          </h1>
          <p className="text-muted-foreground text-sm mt-1">اختر المنظم الذي ستُنسب إليه الفعالية، ثم سيتم نقلك لنموذج الإنشاء.</p>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
          <div className="space-y-2">
            <Label>ابحث عن منظم</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="اسم المنظم..." className="pr-10" />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Building2 className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground text-sm">لا يوجد منظمين مطابقين</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filtered.map(o => (
                <button
                  key={o.id}
                  onClick={() => handleSelect(o)}
                  className="w-full text-right bg-muted/40 hover:bg-primary/10 border border-border/50 rounded-xl p-4 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-foreground">{o.name}</span>
                  </div>
                  <span className="text-xs text-primary font-medium">إنشاء بهذا الاسم ←</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-muted/40 rounded-xl border border-border/50 p-4 text-sm text-muted-foreground">
          💡 سيتم تفعيل وضع "الدخول كحساب" مؤقتاً لإنشاء الفعالية. يمكنك الخروج منه من الشريط العلوي بعد الانتهاء.
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCreateEvent;
