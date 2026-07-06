import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";

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
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const { data } = await supabase.from("partner_brands").select("*").order("display_order");
    setItems((data as any) || []);
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
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-primary">شركاء الخصومات</h1>
          <Button onClick={openNew}><Plus className="w-4 h-4 ml-1" /> إضافة شريك</Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.length === 0 && <p className="col-span-full text-center text-muted-foreground p-8">لا يوجد شركاء بعد</p>}
          {items.map((b) => (
            <div key={b.id} className="bg-card border rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-3">
                {b.logo_url && <img src={b.logo_url} alt={b.name} className="w-12 h-12 rounded-lg object-cover" />}
                <div className="flex-1">
                  <h3 className="font-bold">{b.name}</h3>
                  {b.category && <p className="text-xs text-muted-foreground">{b.category}</p>}
                </div>
                <Switch checked={b.is_active} onCheckedChange={() => toggle(b)} />
              </div>
              {b.description && <p className="text-sm text-muted-foreground line-clamp-2">{b.description}</p>}
              <div className="bg-muted rounded-lg p-2 text-center">
                <span className="font-mono font-bold text-primary">{b.discount_code}</span>
                <span className="text-xs text-muted-foreground mr-2">
                  {b.discount_type === "percent" ? `${b.discount_value}%` : `${b.discount_value} ر.س`}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(b)}><Edit className="w-3 h-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => remove(b.id)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingId ? "تعديل شريك" : "إضافة شريك"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>الاسم *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>الفئة</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="مثال: مطاعم، فنادق" /></div>
              <div><Label>رابط الشعار</Label><Input dir="ltr" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></div>
              <div><Label>الوصف</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>كود الخصم *</Label><Input dir="ltr" value={form.discount_code} onChange={(e) => setForm({ ...form, discount_code: e.target.value.toUpperCase() })} /></div>
                <div>
                  <Label>النوع</Label>
                  <Select value={form.discount_type} onValueChange={(v: any) => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">نسبة %</SelectItem>
                      <SelectItem value="fixed">ر.س</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>القيمة</Label><Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} /></div>
              </div>
              <div><Label>الشروط</Label><Textarea rows={2} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></div>
              <div><Label>رابط الموقع</Label><Input dir="ltr" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} /></div>
              <div><Label>تاريخ الانتهاء</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
              <Button onClick={save} className="w-full">حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};
export default AdminPartnerBrands;
