import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, Search, Eye, Mail, Phone, Shield } from "lucide-react";

const accountTypeLabels: Record<string, { label: string; cls: string }> = {
  attendee: { label: "حاضر", cls: "bg-blue-100 text-blue-700" },
  organizer: { label: "منظّم", cls: "bg-primary/10 text-primary" },
  venue_owner: { label: "صاحب مكان", cls: "bg-teal/10 text-teal" },
};

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  account_type: string;
  created_at: string | null;
}

const AllUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, account_type, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      setUsers((data || []) as UserRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const counts = users.reduce((acc, u) => {
    acc[u.account_type] = (acc[u.account_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filtered = users
    .filter(u => {
      if (typeFilter !== "all" && u.account_type !== typeFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (u.full_name?.toLowerCase().includes(q)) || (u.email?.toLowerCase().includes(q)) || (u.phone?.includes(q));
    })
    .sort((a, b) => {
      if (sortBy === "name") return (a.full_name || "").localeCompare(b.full_name || "", "ar");
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortBy === "oldest" ? da - db : db - da;
    });

  const tabs = [
    { key: "all", label: "الكل", count: users.length },
    { key: "attendee", label: "الحاضرون", count: counts.attendee || 0 },
    { key: "organizer", label: "المنظّمون", count: counts.organizer || 0 },
    { key: "venue_owner", label: "أصحاب الأماكن", count: counts.venue_owner || 0 },
  ];

  const handleImpersonate = (user: UserRow) => {
    startImpersonation({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      account_type: user.account_type,
    });

    toast.success(`تم الدخول كـ ${user.full_name || user.email}`);

    if (user.account_type === "organizer") {
      navigate("/dashboard");
    } else if (user.account_type === "venue_owner") {
      navigate("/venue");
    } else {
      navigate("/my-tickets");
    }
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
            <h1 className="font-bold text-2xl text-foreground">جميع المستخدمين</h1>
            <p className="text-muted-foreground text-sm mt-1">{filtered.length} من أصل {users.length} مستخدم</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="border rounded-lg px-3 h-10 text-sm bg-background"
            >
              <option value="newest">الأحدث تسجيلاً</option>
              <option value="oldest">الأقدم تسجيلاً</option>
              <option value="name">حسب الاسم</option>
            </select>
            <div className="relative w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو البريد..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className={`px-4 h-9 rounded-full text-sm font-medium transition-colors border ${
                typeFilter === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {t.label}
              <span className={`mr-2 text-xs ${typeFilter === t.key ? "opacity-90" : "opacity-60"}`}>({t.count})</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">لا يوجد مستخدمين مطابقين للبحث</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-right p-3">الاسم</th>
                    <th className="text-right p-3">البريد</th>
                    <th className="text-right p-3">الهاتف</th>
                    <th className="text-right p-3">النوع</th>
                    <th className="text-right p-3">التسجيل</th>
                    <th className="p-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map(u => {
                    const typeInfo = accountTypeLabels[u.account_type] || { label: u.account_type, cls: "bg-muted text-muted-foreground" };
                    return (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {u.full_name?.charAt(0) || "؟"}
                            </div>
                            {u.full_name || "—"}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground" dir="ltr">{u.email || "—"}</td>
                        <td className="p-3 text-muted-foreground" dir="ltr">{u.phone || "—"}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${typeInfo.cls}`}>
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString("ar-SA") : "—"}</td>
                        <td className="p-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleImpersonate(u)}
                            className="gap-1.5 text-xs h-8"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            الدخول كهذا الحساب
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AllUsers;
