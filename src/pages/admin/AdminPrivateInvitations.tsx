import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, ExternalLink, Users, Calendar, Trash2 } from "lucide-react";
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
        <div>
          <h1 className="font-display text-2xl text-primary flex items-center gap-2">
            <Mail className="w-6 h-6" /> الدعوات الخاصة
          </h1>
          <p className="text-sm text-muted-foreground mt-1">جميع دعوات المؤسسات الخاصة (مناسبات، VIP، تكريم)</p>
        </div>

        {loading ? (
          <div className="grid gap-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-card border rounded-xl animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground p-12 bg-card border rounded-2xl">لا توجد دعوات خاصة</p>
        ) : (
          <div className="grid gap-3">
            {items.map((inv) => {
              const guests = inv.private_invitation_guests || [];
              const confirmed = guests.filter((g: any) => g.rsvp_status === "confirmed").length;
              return (
                <div key={inv.id} className="bg-card border rounded-2xl p-4 flex items-center gap-4 flex-wrap">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${inv.theme_color}, ${inv.accent_color})` }}
                  >
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold">{inv.title}</h3>
                      <Badge variant={inv.status === "active" ? "default" : "secondary"}>
                        {inv.status === "active" ? "نشطة" : inv.status === "draft" ? "مسودة" : "مغلقة"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
                      <span>{inv.organizations?.name}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(inv.event_date).toLocaleDateString("ar-SA")}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {confirmed}/{guests.length} مؤكد</span>
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove(inv.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPrivateInvitations;
