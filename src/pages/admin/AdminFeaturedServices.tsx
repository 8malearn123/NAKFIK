import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { CalendarCheck, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";

const empty = {
  name: "", description: "", category: "", image_url: "",
  starting_price: "", duration: "", features: "",
  is_active: true, is_featured: false,
};

const bookingLabels: Record<string, string> = {
  new: "جديد", contacted: "تم التواصل", confirmed: "مؤكد", completed: "مكتمل", cancelled: "ملغي",
};
const bookingTones: Record<string, StatusTone> = {
  new: "warning", contacted: "primary", confirmed: "success", completed: "neutral", cancelled: "danger",
};

// تمييز العدد بصيغته الصحيحة: 3 ضيوف، 40 ضيفاً، 100 ضيف
const guestsLabel = (n: number) => {
  if (n === 2) return "ضيفان";
  const tail = n % 100;
  return `${formatNumber(n)} ${tail >= 3 && tail <= 10 ? "ضيوف" : tail >= 11 ? "ضيفاً" : "ضيف"}`;
};

const AdminFeaturedServices = () => {
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    setLoading(false);
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
        <PageHeader
          title="خدمات نكفيك والحجوزات"
          actions={<Button onClick={openNew}><Plus className="h-4 w-4" /> إضافة خدمة</Button>}
        />

        <Tabs defaultValue="services">
          <TabsList>
            <TabsTrigger value="services">الخدمات المعروضة</TabsTrigger>
            <TabsTrigger value="bookings" className="gap-1.5">
              الحجوزات
              <span className="text-xs font-normal text-muted-foreground">{formatNumber(bookings.length)}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-6">
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-card shadow-soft" />)}
              </div>
            ) : services.length === 0 ? (
              <div className="rounded-2xl bg-card shadow-soft">
                <EmptyState
                  icon={Sparkles}
                  title="لا توجد خدمات"
                  action={<Button onClick={openNew}><Plus className="h-4 w-4" /> إضافة خدمة</Button>}
                />
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {services.map((s) => (
                  <article key={s.id} className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-soft">
                    {s.image_url && <img src={s.image_url} alt={s.name} className="h-32 w-full object-cover" />}
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <div className="flex items-center gap-3">
                        {!s.image_url && (
                          <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
                            <Sparkles className="h-[18px] w-[18px]" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-bold leading-6">{s.name}</h3>
                          {s.category && <p className="truncate text-xs leading-[18px] text-muted-foreground">{s.category}</p>}
                        </div>
                        <Switch checked={s.is_active} onCheckedChange={() => toggle(s)} aria-label={`تفعيل ${s.name}`} />
                      </div>
                      {s.description && <p className="line-clamp-2 text-[13px] leading-5 text-muted-foreground">{s.description}</p>}
                      <div className="mt-auto space-y-4">
                        {(s.starting_price || s.is_featured) && (
                          <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-2">
                            <span className="text-[13px] font-semibold">
                              {s.starting_price ? `يبدأ من ${formatMoney(s.starting_price)}` : ""}
                            </span>
                            {s.is_featured && <StatusBadge tone="primary">مميزة</StatusBadge>}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="soft" className="flex-1" onClick={() => openEdit(s)}>
                            <Pencil className="h-[15px] w-[15px]" /> تعديل
                          </Button>
                          <Button size="icon" variant="outline" aria-label="حذف" className="h-9 w-9 flex-none text-destructive hover:text-destructive" onClick={() => remove(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="mt-6">
            {bookings.length === 0 ? (
              <div className="rounded-2xl bg-card shadow-soft">
                <EmptyState icon={CalendarCheck} title="لا توجد حجوزات" />
              </div>
            ) : (
              <Panel flush>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-6">الخدمة</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>الفعالية</TableHead>
                      <TableHead className="pe-6">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b) => {
                      const details = [
                        b.event_date && formatDate(b.event_date),
                        b.city,
                        b.attendees_count && guestsLabel(b.attendees_count),
                      ].filter(Boolean).join("، ");
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="ps-6">
                            <p className="whitespace-nowrap font-semibold leading-[22px]">{b.featured_services?.name}</p>
                            <p className="whitespace-nowrap text-xs leading-[18px] text-muted-foreground">{formatDate(b.created_at)}</p>
                          </TableCell>
                          <TableCell>
                            <p className="whitespace-nowrap leading-[22px]">{b.customer_name}</p>
                            <p className="whitespace-nowrap text-xs leading-[18px] text-muted-foreground"><bdi dir="ltr">{b.customer_phone}</bdi></p>
                          </TableCell>
                          <TableCell>
                            <div className="w-60 sm:w-auto">
                              <p className="leading-[22px]">{details || "—"}</p>
                              {b.notes && <p className="text-xs leading-[18px] text-muted-foreground">{b.notes}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="pe-6">
                            <Select value={b.status} onValueChange={(v) => updateBooking(b.id, v)}>
                              <SelectTrigger aria-label="الحالة" className="-ms-1.5 h-9 w-auto gap-1.5 border-0 bg-transparent px-1.5 hover:bg-muted">
                                <SelectValue>
                                  <StatusBadge tone={bookingTones[b.status] || "neutral"}>{bookingLabels[b.status] || b.status}</StatusBadge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.keys(bookingLabels).map(s => <SelectItem key={s} value={s}>{bookingLabels[s]}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Panel>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl" className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "تعديل خدمة" : "إضافة خدمة"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>اسم الخدمة *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>الفئة</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="مثال: تنظيم فعاليات" /></div>
              </div>
              <div className="space-y-2"><Label>الوصف</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="space-y-2"><Label>رابط الصورة</Label><Input dir="ltr" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>السعر يبدأ من (ر.س)</Label><Input type="number" value={form.starting_price} onChange={(e) => setForm({ ...form, starting_price: e.target.value })} /></div>
                <div className="space-y-2"><Label>المدة</Label><Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="مثال: يوم واحد" /></div>
              </div>
              <div className="space-y-2">
                <Label>المميزات (سطر لكل ميزة)</Label>
                <Textarea rows={4} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
                  <Label>مفعّلة</Label>
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} aria-label="مفعّلة" />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
                  <Label>مميزة (تظهر في الأعلى)</Label>
                  <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} aria-label="مميزة" />
                </div>
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
export default AdminFeaturedServices;
