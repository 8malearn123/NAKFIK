import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, ShoppingBag, Calendar, Sparkles, CheckCircle2 } from "lucide-react";

const requestSchema = z.object({
  title: z.string().trim().min(3, "العنوان قصير").max(120),
  description: z.string().trim().min(10, "الوصف قصير").max(2000),
  category_id: z.string().uuid("اختر الفئة"),
  event_date: z.string().optional(),
  city: z.string().max(80).optional(),
  budget: z.number().nonnegative().optional(),
  contact_phone: z.string().regex(/^\+?\d{8,15}$/, "رقم غير صحيح").optional().or(z.literal("")),
});

const bookingSchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z.string().trim().regex(/^\+?\d{8,15}$/, "رقم غير صحيح"),
  customer_email: z.string().email().max(160).optional().or(z.literal("")),
  event_date: z.string().optional(),
  city: z.string().max(80).optional(),
  attendees_count: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

const labels: Record<string, string> = {
  new: "جديد", in_review: "قيد المراجعة", assigned: "تم الإحالة", closed: "مغلق", cancelled: "ملغي",
};

const ServiceMarket = () => {
  const { user, profile } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [activeService, setActiveService] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState({
    customer_name: "", customer_phone: "", customer_email: "",
    event_date: "", city: "", attendees_count: "", notes: "",
  });

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    title: "", description: "", category_id: "",
    event_date: "", city: "", budget: "", contact_phone: "",
  });

  const load = async () => {
    const [svc, cats, reqs] = await Promise.all([
      supabase.from("featured_services").select("*").eq("is_active", true)
        .order("is_featured", { ascending: false }).order("display_order"),
      supabase.from("service_provider_categories").select("id,name_ar").eq("is_active", true).order("display_order"),
      supabase.from("service_requests").select("*, service_provider_categories(name_ar)").order("created_at", { ascending: false }),
    ]);
    setServices(svc.data || []);
    setCategories(cats.data || []);
    setRequests(reqs.data || []);
  };

  useEffect(() => { document.title = "سوق الخدمات | نكفيك"; load(); }, []);

  const openBooking = (s: any) => {
    setActiveService(s);
    setBookingForm({
      customer_name: profile?.full_name || "",
      customer_phone: profile?.phone || "",
      customer_email: profile?.email || "",
      event_date: "", city: "", attendees_count: "", notes: "",
    });
    setBookingOpen(true);
  };

  const submitBooking = async () => {
    const data = {
      ...bookingForm,
      attendees_count: bookingForm.attendees_count ? Number(bookingForm.attendees_count) : undefined,
    };
    const parsed = bookingSchema.safeParse(data);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const payload: any = {
      service_id: activeService.id,
      customer_id: user?.id ?? null,
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      customer_email: parsed.data.customer_email || null,
      event_date: parsed.data.event_date || null,
      city: parsed.data.city || null,
      attendees_count: parsed.data.attendees_count ?? null,
      notes: parsed.data.notes || null,
      status: "new",
    };
    const { error } = await supabase.from("service_bookings").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("تم استلام طلب الحجز! سنتواصل معك قريباً");
    setBookingOpen(false);
  };

  const submitRequest = async () => {
    const data = {
      ...requestForm,
      budget: requestForm.budget ? Number(requestForm.budget) : undefined,
    };
    const parsed = requestSchema.safeParse(data);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const payload: any = {
      organizer_id: user!.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category_id: parsed.data.category_id,
      event_date: parsed.data.event_date || null,
      city: parsed.data.city || null,
      budget: parsed.data.budget ?? null,
      contact_phone: parsed.data.contact_phone || null,
      status: "new",
    };
    const { error } = await supabase.from("service_requests").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("تم إرسال طلبك إلى فريق نكفيك");
    setRequestOpen(false);
    setRequestForm({ title: "", description: "", category_id: "", event_date: "", city: "", budget: "", contact_phone: "" });
    load();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl text-primary flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" /> سوق الخدمات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">احجز خدمات نكفيك مباشرة، أو أرسل طلب خدمة مخصص</p>
        </div>

        <Tabs defaultValue="services">
          <TabsList>
            <TabsTrigger value="services"><Sparkles className="w-4 h-4 ml-1" /> خدمات نكفيك</TabsTrigger>
            <TabsTrigger value="custom">طلب خدمة مخصص</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-4">
            {services.length === 0 ? (
              <p className="text-center text-muted-foreground p-8 bg-card border rounded-2xl">
                لا توجد خدمات معروضة حالياً
              </p>
            ) : (
              <div dir="rtl" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((s) => (
                  <div key={s.id} className="bg-card border rounded-2xl overflow-hidden flex flex-col hover:shadow-lg transition">
                    <div className="relative h-40 bg-gradient-to-br from-primary/20 to-accent/20">
                      {s.image_url ? (
                        <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-12 h-12 text-primary/40" />
                        </div>
                      )}
                      {s.is_featured && (
                        <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
                          <Sparkles className="w-3 h-3 ml-1" /> مميزة
                        </Badge>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col gap-2">
                      <div>
                        <h3 className="font-bold">{s.name}</h3>
                        {s.category && <p className="text-xs text-muted-foreground">{s.category}</p>}
                      </div>
                      {s.description && <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>}
                      {Array.isArray(s.features) && s.features.length > 0 && (
                        <ul className="text-xs space-y-1 mt-1">
                          {s.features.slice(0, 3).map((f: string, i: number) => (
                            <li key={i} className="flex items-center gap-1 text-muted-foreground">
                              <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                              <span className="truncate">{f}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-3">
                        {s.starting_price ? (
                          <div>
                            <p className="text-[10px] text-muted-foreground">{s.price_unit || "يبدأ من"}</p>
                            <p className="font-bold text-primary">{s.starting_price} <span className="text-xs">ر.س</span></p>
                          </div>
                        ) : <span />}
                        <Button size="sm" onClick={() => openBooking(s)}>
                          <Calendar className="w-4 h-4 ml-1" /> احجز الآن
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setRequestOpen(true)}>
                <Plus className="w-4 h-4 ml-1" /> طلب خدمة جديدة
              </Button>
            </div>
            <h2 className="font-bold">طلباتي</h2>
            <div className="grid gap-3">
              {requests.length === 0 && <p className="text-center text-muted-foreground p-8 bg-card border rounded-2xl">لا توجد طلبات بعد</p>}
              {requests.map((r) => (
                <div key={r.id} className="bg-card border rounded-2xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-bold">{r.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {r.service_provider_categories?.name_ar}
                        {r.city && ` • ${r.city}`}
                        {r.event_date && ` • ${new Date(r.event_date).toLocaleDateString("ar-SA")}`}
                      </p>
                    </div>
                    <Badge>{labels[r.status]}</Badge>
                  </div>
                  <p className="text-sm">{r.description}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Booking Dialog */}
        <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
          <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>حجز: {activeService?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>الاسم *</Label><Input value={bookingForm.customer_name} onChange={(e) => setBookingForm({ ...bookingForm, customer_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>الجوال *</Label><Input dir="ltr" placeholder="+9665xxxxxxxx" value={bookingForm.customer_phone} onChange={(e) => setBookingForm({ ...bookingForm, customer_phone: e.target.value })} /></div>
                <div><Label>البريد</Label><Input dir="ltr" type="email" value={bookingForm.customer_email} onChange={(e) => setBookingForm({ ...bookingForm, customer_email: e.target.value })} /></div>
                <div><Label>تاريخ الفعالية</Label><Input type="date" value={bookingForm.event_date} onChange={(e) => setBookingForm({ ...bookingForm, event_date: e.target.value })} /></div>
                <div><Label>المدينة</Label><Input value={bookingForm.city} onChange={(e) => setBookingForm({ ...bookingForm, city: e.target.value })} /></div>
                <div><Label>عدد الحضور المتوقع</Label><Input type="number" value={bookingForm.attendees_count} onChange={(e) => setBookingForm({ ...bookingForm, attendees_count: e.target.value })} /></div>
              </div>
              <div><Label>تفاصيل إضافية</Label><Textarea rows={3} value={bookingForm.notes} onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })} /></div>
              <Button onClick={submitBooking} className="w-full">إرسال طلب الحجز</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Custom Request Dialog */}
        <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
          <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>طلب خدمة مخصص</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>الفئة *</Label>
                <Select value={requestForm.category_id} onValueChange={(v) => setRequestForm({ ...requestForm, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>عنوان الطلب *</Label><Input value={requestForm.title} onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })} /></div>
              <div><Label>الوصف *</Label><Textarea rows={4} value={requestForm.description} onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>تاريخ الفعالية</Label><Input type="date" value={requestForm.event_date} onChange={(e) => setRequestForm({ ...requestForm, event_date: e.target.value })} /></div>
                <div><Label>المدينة</Label><Input value={requestForm.city} onChange={(e) => setRequestForm({ ...requestForm, city: e.target.value })} /></div>
                <div><Label>الميزانية (ر.س)</Label><Input type="number" value={requestForm.budget} onChange={(e) => setRequestForm({ ...requestForm, budget: e.target.value })} /></div>
                <div><Label>جوال التواصل</Label><Input dir="ltr" placeholder="+9665xxxxxxxx" value={requestForm.contact_phone} onChange={(e) => setRequestForm({ ...requestForm, contact_phone: e.target.value })} /></div>
              </div>
              <Button onClick={submitRequest} className="w-full">إرسال الطلب</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};
export default ServiceMarket;
