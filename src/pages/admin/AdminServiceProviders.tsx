import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Check, Store, X } from "lucide-react";

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

const statusTone: Record<string, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const AdminServiceProviders = () => {
  const [items, setItems] = useState<Provider[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    let q = supabase.from("service_providers").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setItems((data as any) || []);
    setLoading(false);
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
        <PageHeader title="مزودو الخدمات" />

        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            {(["all", "pending", "approved", "rejected"] as const).map((s) => (
              <TabsTrigger key={s} value={s}>{s === "all" ? "الكل" : statusLabel[s]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={Store}
              title="لا توجد طلبات"
              action={filter !== "all" ? <Button variant="outline" onClick={() => setFilter("all")}>عرض الكل</Button> : undefined}
            />
          </div>
        ) : (
          <Panel flush>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">المزود</TableHead>
                  <TableHead>المسؤول</TableHead>
                  <TableHead>المدينة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="pe-6"><span className="sr-only">إجراءات</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="ps-6">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
                          <Store className="h-[18px] w-[18px]" />
                        </span>
                        <div className="w-60 sm:w-auto">
                          <p className="font-semibold leading-[22px]">{p.business_name}</p>
                          {p.description && <p className="text-xs leading-[18px] text-muted-foreground">{p.description}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p className="leading-[22px]">{p.contact_name}</p>
                      <p className="text-xs leading-[18px] text-muted-foreground"><bdi dir="ltr">{p.phone}</bdi></p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{p.city || "—"}</TableCell>
                    <TableCell><StatusBadge tone={statusTone[p.status]}>{statusLabel[p.status]}</StatusBadge></TableCell>
                    <TableCell className="pe-6">
                      {p.status === "pending" && (
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="soft" onClick={() => setStatus(p.id, "approved")}>
                            <Check className="h-4 w-4" /> قبول
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setStatus(p.id, "rejected")}>
                            <X className="h-4 w-4" /> رفض
                          </Button>
                        </div>
                      )}
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
export default AdminServiceProviders;
