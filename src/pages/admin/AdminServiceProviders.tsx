import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Provider {
  id: string;
  business_name: string;
  contact_name: string;
  phone: string;
  email: string | null;
  city: string | null;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  category_id: string | null;
  created_at: string;
}

const statusLabel: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};

const AdminServiceProviders = () => {
  const [items, setItems] = useState<Provider[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const load = async () => {
    let q = supabase.from("service_providers").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setItems((data as any) || []);
  };

  useEffect(() => { document.title = "مزودو الخدمات | الأدمن"; load(); }, [filter]);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("service_providers")
      .update({ status, reviewed_at: new Date().toISOString() } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم التحديث");
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-display text-2xl text-primary">مزودو الخدمات</h1>
          <div className="flex gap-2">
            {(["all", "pending", "approved", "rejected"] as const).map(s => (
              <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
                {s === "all" ? "الكل" : statusLabel[s]}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {items.length === 0 && <p className="text-center text-muted-foreground p-8">لا يوجد طلبات</p>}
          {items.map((p) => (
            <div key={p.id} className="bg-card border rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-bold">{p.business_name}</h3>
                  <p className="text-sm text-muted-foreground">{p.contact_name} • {p.phone}</p>
                  {p.city && <p className="text-xs text-muted-foreground">{p.city}</p>}
                </div>
                <Badge variant={p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                  {statusLabel[p.status]}
                </Badge>
              </div>
              {p.description && <p className="text-sm">{p.description}</p>}
              {p.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => setStatus(p.id, "approved")}>قبول</Button>
                  <Button size="sm" variant="destructive" onClick={() => setStatus(p.id, "rejected")}>رفض</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};
export default AdminServiceProviders;
