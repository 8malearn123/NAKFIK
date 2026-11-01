import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";
import { toast } from "sonner";
import { LifeBuoy } from "lucide-react";

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
const tones: Record<string, StatusTone> = {
  new: "warning", in_review: "primary", assigned: "success", closed: "neutral", cancelled: "danger",
};

const AdminServiceRequests = () => {
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("service_requests").select("*").order("created_at", { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
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
        <PageHeader title="طلبات سوق الخدمات" />

        {loading ? (
          <div className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState icon={LifeBuoy} title="لا توجد طلبات" />
          </div>
        ) : (
          <Panel flush>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">الطلب</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المدينة</TableHead>
                  <TableHead>الميزانية</TableHead>
                  <TableHead>الجوال</TableHead>
                  <TableHead className="pe-6">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="ps-6">
                      <div className="w-60 sm:w-auto">
                        <p className="font-semibold leading-[22px]">{r.title}</p>
                        <p className="whitespace-pre-line text-xs leading-[18px] text-muted-foreground">{r.description}</p>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.city || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.budget ? formatMoney(r.budget) : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {r.contact_phone ? <bdi dir="ltr">{r.contact_phone}</bdi> : "—"}
                    </TableCell>
                    <TableCell className="pe-6">
                      <Select value={r.status} onValueChange={(v) => update(r.id, v)}>
                        <SelectTrigger aria-label="الحالة" className="-ms-1.5 h-9 w-auto gap-1.5 border-0 bg-transparent px-1.5 hover:bg-muted">
                          <SelectValue>
                            <StatusBadge tone={tones[r.status] || "neutral"}>{labels[r.status] || r.status}</StatusBadge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map(s => <SelectItem key={s} value={s}>{labels[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        )}
      </div>
    </AdminLayout>
  );
};
export default AdminServiceRequests;
