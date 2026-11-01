import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney, formatPercent } from "@/lib/format";
import { toast } from "sonner";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";

interface Brand {
  id: string; name: string; logo_url: string | null; description: string | null;
  category: string | null; discount_code: string;
  discount_type: "percent" | "fixed"; discount_value: number;
  terms: string | null; website_url: string | null;
  expires_at: string | null; is_active: boolean;
}

const empty = {
  name: "", logo_url: "", description: "", category: "",
  discount_code: "", discount_type: "percent" as "percent" | "fixed",
  discount_value: 10, terms: "", website_url: "", expires_at: "",
};

const AdminPartnerBrands = () => {
  const [items, setItems] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const { data } = await supabase.from("partner_brands").select("*").order("display_order");
    setItems((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { document.title = "شركاء الخصومات | الأدمن"; load(); }, []);

  const openNew = () => { setForm(empty); setEditingId(null); setOpen(true); };
  const openEdit = (b: Brand) => {
    setForm({
      name: b.name, logo_url: b.logo_url || "", description: b.description || "",
      category: b.category || "", discount_code: b.discount_code,
      discount_type: b.discount_type, discount_value: b.discount_value,
      terms: b.terms || "", website_url: b.website_url || "",
      expires_at: b.expires_at ? b.expires_at.slice(0, 10) : "",
    });
    setEditingId(b.id);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.discount_code.trim()) return toast.error("الاسم وكود الخصم مطلوبان");
    const payload: any = {
      ...form,
      logo_url: form.logo_url || null,
      description: form.description || null,
      category: form.category || null,
      terms: form.terms || null,
      website_url: form.website_url || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    const { error } = editingId
      ? await supabase.from("partner_brands").update(payload).eq("id", editingId)
      : await supabase.from("partner_brands").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
    setOpen(false); load();
  };

  const toggle = async (b: Brand) => {
    await supabase.from("partner_brands").update({ is_active: !b.is_active } as any).eq("id", b.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف الشريك؟")) return;
    await supabase.from("partner_brands").delete().eq("id", id);
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="شركاء الخصومات"
          actions={<Button onClick={openNew}><Plus className="h-4 w-4" /> إضافة شريك</Button>}
        />

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-60 animate-pulse rounded-2xl bg-card shadow-soft" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={Tag}
              title="لا يوجد شركاء بعد"
              action={<Button onClick={openNew}><Plus className="h-4 w-4" /> إضافة شريك</Button>}
            />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((b) => (
              <article key={b.id} className="flex min-w-0 flex-col gap-3 rounded-2xl bg-card p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={b.name} className="h-9 w-9 flex-none rounded-[10px] object-cover" />
                  ) : (
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
                      <Tag className="h-[18px] w-[18px]" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold leading-6">{b.name}</h3>
                    {b.category && <p className="truncate text-xs leading-[18px] text-muted-foreground">{b.category}</p>}
                  </div>
                  <Switch checked={b.is_active} onCheckedChange={() => toggle(b)} aria-label={`تفعيل ${b.name}`} />
                </div>
                {b.description && <p className="line-clamp-2 text-[13px] leading-5 text-muted-foreground">{b.description}</p>}
                <div className="mt-auto space-y-4">
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-2.5">
                    <bdi dir="ltr" className="truncate font-mono text-sm font-bold text-primary">{b.discount_code}</bdi>
                    <span className="flex-none text-[13px] font-semibold text-muted-foreground">
                      {b.discount_type === "percent" ? formatPercent(b.discount_value) : formatMoney(b.discount_value)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="soft" className="flex-1" onClick={() => openEdit(b)}>
                      <Pencil className="h-[15px] w-[15px]" /> تعديل
                    </Button>
                    <Button size="icon" variant="outline" aria-label="حذف" className="h-9 w-9 flex-none text-destructive hover:text-destructive" onClick={() => remove(b.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingId ? "تعديل شريك" : "إضافة شريك"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>الاسم *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>الفئة</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="مثال: مطاعم، فنادق" /></div>
              </div>
              <div className="space-y-2"><Label>رابط الشعار</Label><Input dir="ltr" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></div>
              <div className="space-y-2"><Label>الوصف</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="col-span-2 space-y-2 sm:col-span-1"><Label>كود الخصم *</Label><Input dir="ltr" value={form.discount_code} onChange={(e) => setForm({ ...form, discount_code: e.target.value.toUpperCase() })} /></div>
                <div className="space-y-2">
                  <Label>النوع</Label>
                  <Select value={form.discount_type} onValueChange={(v: any) => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">نسبة %</SelectItem>
                      <SelectItem value="fixed">ر.س</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>القيمة</Label><Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} /></div>
              </div>
              <div className="space-y-2"><Label>الشروط</Label><Textarea rows={2} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>رابط الموقع</Label><Input dir="ltr" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} /></div>
                <div className="space-y-2"><Label>تاريخ الانتهاء</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row">
              <Button onClick={save}>حفظ</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};
export default AdminPartnerBrands;
