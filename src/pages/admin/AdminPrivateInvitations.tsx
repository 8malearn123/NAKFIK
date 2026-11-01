import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatusBadge from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatNumber, percent } from "@/lib/format";
import { Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";

const AdminPrivateInvitations = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("private_invitations")
      .select("*, organizations(name), private_invitation_guests(id, rsvp_status)")
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { document.title = "الدعوات الخاصة | إدارة"; load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("حذف الدعوة نهائياً؟")) return;
    const { error } = await supabase.from("private_invitations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="الدعوات الخاصة"
          description={<>جميع دعوات المؤسسات الخاصة (مناسبات، <bdi dir="ltr">VIP</bdi>، تكريم)</>}
        />

        {loading ? (
          <div className="h-96 animate-pulse rounded-2xl bg-card shadow-soft" />
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState icon={Mail} title="لا توجد دعوات خاصة" />
          </div>
        ) : (
          <Panel flush>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">الدعوة</TableHead>
                  <TableHead>الموعد</TableHead>
                  <TableHead>مؤكدون</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="pe-6"><span className="sr-only">إجراءات</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((inv) => {
                  const guests = inv.private_invitation_guests || [];
                  const confirmed = guests.filter((g: any) => g.rsvp_status === "confirmed").length;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="ps-6">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
                            <Mail className="h-[18px] w-[18px]" />
                          </span>
                          <div className="min-w-0">
                            <p className="whitespace-nowrap font-semibold leading-[22px]">{inv.title}</p>
                            <p className="whitespace-nowrap text-xs leading-[18px] text-muted-foreground">{inv.organizations?.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(inv.event_date)}</TableCell>
                      <TableCell>
                        {guests.length === 0 ? (
                          <span className="whitespace-nowrap text-xs text-muted-foreground">لا يوجد مدعوون بعد</span>
                        ) : (
                          <div className="flex w-40 flex-col gap-1.5">
                            <span className="text-xs leading-[18px] text-muted-foreground">
                              <b className="text-sm font-bold text-foreground">{formatNumber(confirmed)}</b> من {formatNumber(guests.length)}
                            </span>
                            <div className="h-1.5 overflow-hidden rounded-full bg-[#EFEDF2]">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${percent(confirmed, guests.length)}%` }} />
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={inv.status === "active" ? "success" : "neutral"}>
                          {inv.status === "active" ? "نشطة" : inv.status === "draft" ? "مسودة" : "مغلقة"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="pe-6 text-end">
                        <Button size="icon" variant="ghost" aria-label="حذف" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => remove(inv.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Panel>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPrivateInvitations;
