import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";

const empty = {
  name: "", description: "", category: "", image_url: "",
  starting_price: "", duration: "", features: "",
  is_active: true, is_featured: false,
};

const bookingLabels: Record<string, string> = {
  new: "جديد", contacted: "تم التواصل", confirmed: "مؤكد", completed: "مكتمل", cancelled: "ملغي",
};

const AdminFeaturedServices = () => {
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [s, b] = await Promise.all([
      supabase.from("featured_services").select("*").order("display_order"),
      supabase.from("service_bookings").select("*, featured_services(name)").order("created_at", { ascending: false }),
    ]);
    setServices(s.data || []);
    setBookings(b.data || []);
  };

  useEffect(() => { document.title = "خدمات نكفيك | الأدمن"; load(); }, []);

  const openNew = () => { setForm(empty); setEditingId(null); setOpen(true); };
  const openEdit = (s: any) => {
    setForm({
      name: s.name, description: s.description || "", category: s.category || "",
      image_url: s.image_url || "", starting_price: s.starting_price ?? "",
      duration: s.duration || "",
      features: Array.isArray(s.features) ? s.features.join("\n") : "",
      is_active: s.is_active, is_featured: s.is_featured,
    });
    setEditingId(s.id); setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("الاسم مطلوب");
    const payload: any = {
      ...form,
      description: form.description || null,
      category: form.category || null,
      image_url: form.image_url || null,
      duration: form.duration || null,
      starting_price: form.starting_price ? Number(form.starting_price) : null,
      features: form.features ? form.features.split("\n").map(s => s.trim()).filter(Boolean) : [],
    };
    const { error } = editingId
      ? await supabase.from("featured_services").update(payload).eq("id", editingId)
      : await supabase.from("featured_services").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
    setOpen(false); load();
  };

  const toggle = async (s: any) => {
    await supabase.from("featured_services").update({ is_active: !s.is_active } as any).eq("id", s.id);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("حذف الخدمة؟")) return;
    await supabase.from("featured_services").delete().eq("id", id);
    load();
  };
  const updateBooking = async (id: string, status: string) => {
    await supabase.from("service_bookings").update({ status } as any).eq("id", id);
    toast.success("تم التحديث");
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="font-display text-2xl text-primary">خدمات نكفيك والحجوزات</h1>

        <Tabs defaultValue="services">
          <TabsList>
            <TabsTrigger value="services">الخدمات المعروضة</TabsTrigger>
            <TabsTrigger value="bookings">الحجوزات ({bookings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openNew}><Plus className="w-4 h-4 ml-1" /> إضافة خدمة</Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.length === 0 && <p className="col-span-full text-center text-muted-foreground p-8">لا يوجد خدمات</p>}
              {services.map((s) => (
                <div key={s.id} className="bg-card border rounded-2xl overflow-hidden">
                  {s.image_url && <img src={s.image_url} alt={s.name} className="w-full h-32 object-cover" />}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold">{s.name}</h3>
                        {s.category && <p className="text-xs text-muted-foreground">{s.category}</p>}
                      </div>
                      <Switch checked={s.is_active} onCheckedChange={() => toggle(s)} />
                    </div>
                    {s.starting_price && <Badge variant="secondary">يبدأ من {s.starting_price} ر.س</Badge>}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(s)}><Edit className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(s.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-3">
            {bookings.length === 0 && <p className="text-center text-muted-foreground p-8">لا توجد حجوزات</p>}
            {bookings.map((b) => (
              <div key={b.id} className="bg-card border rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-bold">{b.featured_services?.name}</h3>
                    <p className="text-sm">{b.customer_name} • <span dir="ltr">{b.customer_phone}</span></p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleDateString("ar-SA")}
                      {b.event_date && ` • فعالية: ${new Date(b.event_date).toLocaleDateString("ar-SA")}`}
                      {b.city && ` • ${b.city}`}
                      {b.attendees_count && ` • ${b.attendees_count} ضيف`}
                    </p>
                  </div>
                  <Badge>{bookingLabels[b.status]}</Badge>
                </div>
                {b.notes && <p className="text-sm">{b.notes}</p>}
                <Select value={b.status} onValueChange={(v) => updateBooking(b.id, v)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(bookingLabels).map(s => <SelectItem key={s} value={s}>{bookingLabels[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "تعديل خدمة" : "إضافة خدمة"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>اسم الخدمة *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>الفئة</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="مثال: تنظيم فعاليات" /></div>
              <div><Label>الوصف</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>رابط الصورة</Label><Input dir="ltr" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>السعر يبدأ من (ر.س)</Label><Input type="number" value={form.starting_price} onChange={(e) => setForm({ ...form, starting_price: e.target.value })} /></div>
                <div><Label>المدة</Label><Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="مثال: يوم واحد" /></div>
              </div>
              <div>
                <Label>المميزات (سطر لكل ميزة)</Label>
                <Textarea rows={4} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>مفعّلة</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                <Label>مميزة (تظهر في الأعلى)</Label>
              </div>
              <Button onClick={save} className="w-full">حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};
export default AdminFeaturedServices;
