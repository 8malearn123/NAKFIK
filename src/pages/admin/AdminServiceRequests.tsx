import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Req {
  id: string; title: string; description: string;
  organizer_id: string; status: string;
  event_date: string | null; budget: number | null; city: string | null;
  contact_phone: string | null; created_at: string;
}

const statuses = ["new", "in_review", "assigned", "closed", "cancelled"];
const labels: Record<string, string> = {
  new: "جديد", in_review: "قيد المراجعة", assigned: "تم الإحالة", closed: "مغلق", cancelled: "ملغي",
};

const AdminServiceRequests = () => {
  const [items, setItems] = useState<Req[]>([]);

  const load = async () => {
    const { data } = await supabase.from("service_requests").select("*").order("created_at", { ascending: false });
    setItems((data as any) || []);
  };

  useEffect(() => { document.title = "طلبات سوق الخدمات | الأدمن"; load(); }, []);

  const update = async (id: string, status: string) => {
    const { error } = await supabase.from("service_requests").update({ status } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم التحديث");
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="font-display text-2xl text-primary">طلبات سوق الخدمات</h1>
        <div className="grid gap-3">
          {items.length === 0 && <p className="text-center text-muted-foreground p-8">لا يوجد طلبات</p>}
          {items.map((r) => (
            <div key={r.id} className="bg-card border rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-bold">{r.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("ar-SA")}
                    {r.city && ` • ${r.city}`}
                    {r.budget && ` • ميزانية: ${r.budget} ر.س`}
                  </p>
                </div>
                <Badge variant="secondary">{labels[r.status]}</Badge>
              </div>
              <p className="text-sm whitespace-pre-line">{r.description}</p>
              {r.contact_phone && <p className="text-xs">جوال: <span dir="ltr">{r.contact_phone}</span></p>}
              <div className="flex items-center gap-2 pt-2">
                <Select value={r.status} onValueChange={(v) => update(r.id, v)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map(s => <SelectItem key={s} value={s}>{labels[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};
export default AdminServiceRequests;
