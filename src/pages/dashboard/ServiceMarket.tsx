import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Calendar, CheckCircle2, ClipboardList, Plus, ShoppingBag } from "lucide-react";
import { formatDate, formatNumber } from "@/lib/format";

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

const labels: Record<string, { label: string; tone: StatusTone }> = {
  new: { label: "جديد", tone: "primary" },
  in_review: { label: "قيد المراجعة", tone: "warning" },
  assigned: { label: "تم الإحالة", tone: "success" },
  closed: { label: "مغلق", tone: "neutral" },
  cancelled: { label: "ملغي", tone: "neutral" },
};

const ServiceMarket = () => {
  const { user, profile } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    setLoading(false);
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

  const newRequest = <Button onClick={() => setRequestOpen(true)}><Plus className="w-4 h-4" /> طلب خدمة جديدة</Button>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="سوق الخدمات"
          description="احجز خدمات نكفيك مباشرة، أو أرسل طلب خدمة مخصص"
          actions={newRequest}
        />

        <Tabs defaultValue="services">
          <TabsList>
            <TabsTrigger value="services" className="gap-1.5">
              خدمات نكفيك
              {!loading && <span className="text-xs font-normal text-muted-foreground">{formatNumber(services.length)}</span>}
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-1.5">
              طلب خدمة مخصص
              {!loading && <span className="text-xs font-normal text-muted-foreground">{formatNumber(requests.length)}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-6">
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />)}
              </div>
            ) : services.length === 0 ? (
              <div className="rounded-2xl bg-card shadow-soft">
                <EmptyState icon={ShoppingBag} title="لا توجد خدمات معروضة حالياً" action={newRequest} />
              </div>
            ) : (
              <div dir="rtl" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {services.map((s) => (
                  <article key={s.id} className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-soft">
                    <div className="relative flex h-[76px] items-center justify-between bg-secondary px-5">
                      {s.image_url && <img src={s.image_url} alt={s.name} className="absolute inset-0 h-full w-full object-cover" />}
                      <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-white/85 text-primary">
                        <ShoppingBag className="h-5 w-5" />
                      </span>
                      {s.is_featured && <StatusBadge tone="primary" className="relative bg-white">مميزة</StatusBadge>}
                    </div>
                    <div className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-4">
                      <div>
                        <h3 className="truncate text-base font-bold leading-6">{s.name}</h3>
                        {s.category && <p className="text-xs leading-[18px] text-muted-foreground">{s.category}</p>}
                      </div>
                      {s.description && <p className="line-clamp-2 text-[13px] leading-5 text-muted-foreground">{s.description}</p>}
                      {Array.isArray(s.features) && s.features.length > 0 && (
                        <ul className="space-y-1 text-[13px] leading-5 text-muted-foreground">
                          {s.features.slice(0, 3).map((f: string, i: number) => (
                            <li key={i} className="flex items-center gap-2">
                              <CheckCircle2 className="h-[15px] w-[15px] flex-none text-primary" />
                              <span className="truncate">{f}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                        {s.starting_price ? (
                          <div className="min-w-0">
                            {/* وحدة السعر عبارة وصفية مثل «يبدأ من»، والعملة تظهر مع المبلغ */}
                            <p className="text-xs leading-[18px] text-muted-foreground">{s.price_unit && s.price_unit !== "ر.س" ? s.price_unit : "يبدأ من"}</p>
                            <p className="text-base font-bold leading-6">{formatNumber(s.starting_price)} <span className="text-xs font-semibold text-muted-foreground">ر.س</span></p>
                          </div>
                        ) : <span />}
                        <Button size="sm" variant="soft" onClick={() => openBooking(s)}>
                          <Calendar className="w-4 h-4" /> احجز الآن
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="mt-6">
            <Panel title="طلباتي">
              {requests.length === 0 ? (
                <EmptyState icon={ClipboardList} title="لا توجد طلبات بعد" action={newRequest} />
              ) : (
                <div className="divide-y divide-border">
                  {requests.map((r) => {
                    const status = labels[r.status];
                    return (
                      <div key={r.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                        <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary"><ClipboardList className="h-[17px] w-[17px]" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-[22px]">{r.title}</p>
                          <p className="text-xs leading-[18px] text-muted-foreground">
                            {[r.service_provider_categories?.name_ar, r.city, r.event_date && formatDate(r.event_date)].filter(Boolean).join("، ")}
                          </p>
                          <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">{r.description}</p>
                        </div>
                        {status && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </TabsContent>
        </Tabs>

        {/* Booking Dialog */}
        <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
          <DialogContent dir="rtl" className="max-h-[90vh] w-[calc(100%-1.5rem)] rounded-2xl max-w-lg overflow-y-auto">
            <DialogHeader className="pe-6 text-start">
              <DialogTitle>حجز: {activeService?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>الاسم *</Label><Input value={bookingForm.customer_name} onChange={(e) => setBookingForm({ ...bookingForm, customer_name: e.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>الجوال *</Label><Input dir="ltr" placeholder="+9665xxxxxxxx" value={bookingForm.customer_phone} onChange={(e) => setBookingForm({ ...bookingForm, customer_phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>البريد</Label><Input dir="ltr" type="email" value={bookingForm.customer_email} onChange={(e) => setBookingForm({ ...bookingForm, customer_email: e.target.value })} /></div>
                <div className="space-y-2"><Label>تاريخ الفعالية</Label><Input type="date" value={bookingForm.event_date} onChange={(e) => setBookingForm({ ...bookingForm, event_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>المدينة</Label><Input value={bookingForm.city} onChange={(e) => setBookingForm({ ...bookingForm, city: e.target.value })} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>عدد الحضور المتوقع</Label><Input type="number" value={bookingForm.attendees_count} onChange={(e) => setBookingForm({ ...bookingForm, attendees_count: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>تفاصيل إضافية</Label><Textarea rows={3} value={bookingForm.notes} onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })} /></div>
              <Button onClick={submitBooking} className="w-full">إرسال طلب الحجز</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Custom Request Dialog */}
        <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
          <DialogContent dir="rtl" className="max-h-[90vh] w-[calc(100%-1.5rem)] rounded-2xl max-w-lg overflow-y-auto">
            <DialogHeader className="pe-6 text-start"><DialogTitle>طلب خدمة مخصص</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الفئة *</Label>
                <Select value={requestForm.category_id} onValueChange={(v) => setRequestForm({ ...requestForm, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>عنوان الطلب *</Label><Input value={requestForm.title} onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })} /></div>
              <div className="space-y-2"><Label>الوصف *</Label><Textarea rows={4} value={requestForm.description} onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>تاريخ الفعالية</Label><Input type="date" value={requestForm.event_date} onChange={(e) => setRequestForm({ ...requestForm, event_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>المدينة</Label><Input value={requestForm.city} onChange={(e) => setRequestForm({ ...requestForm, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>الميزانية (ر.س)</Label><Input type="number" value={requestForm.budget} onChange={(e) => setRequestForm({ ...requestForm, budget: e.target.value })} /></div>
                <div className="space-y-2"><Label>جوال التواصل</Label><Input dir="ltr" placeholder="+9665xxxxxxxx" value={requestForm.contact_phone} onChange={(e) => setRequestForm({ ...requestForm, contact_phone: e.target.value })} /></div>
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
