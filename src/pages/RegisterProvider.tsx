import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const schema = z.object({
  business_name: z.string().trim().min(2, "اسم النشاط مطلوب").max(120),
  contact_name: z.string().trim().min(2, "الاسم مطلوب").max(120),
  phone: z.string().trim().regex(/^\+?\d{8,15}$/, "رقم الجوال غير صحيح"),
  email: z.string().trim().email("البريد غير صحيح").max(160).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  website_url: z.string().trim().url("رابط غير صحيح").max(200).optional().or(z.literal("")),
  category_id: z.string().uuid("اختر الفئة"),
});

type Category = { id: string; name_ar: string };

const RegisterProvider = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    business_name: "", contact_name: "", phone: "", email: "",
    city: "", description: "", website_url: "", category_id: "",
  });

  useEffect(() => {
    document.title = "تسجيل مزود خدمة | نكفيك تيكت";
    supabase.from("service_provider_categories")
      .select("id,name_ar")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => setCategories(data || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      ...parsed.data,
      email: parsed.data.email || null,
      city: parsed.data.city || null,
      description: parsed.data.description || null,
      website_url: parsed.data.website_url || null,
      user_id: user?.id ?? null,
      status: "pending",
    };
    const { error } = await supabase.from("service_providers").insert(payload);
    setLoading(false);
    if (error) {
      toast.error("تعذر إرسال الطلب: " + error.message);
      return;
    }
    toast.success("تم استلام طلبك! سنقوم بمراجعته قريباً.");
    navigate("/");
  };

  return (
    <div dir="rtl" className="min-h-screen bg-muted/30 font-cairo flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card rounded-3xl shadow-lg border border-border p-6 lg:p-10">
        <div className="text-center mb-8">
          <img src={logo} alt="نكفيك" className="h-14 w-14 mx-auto mb-3" />
          <h1 className="font-display text-2xl text-primary">سجّل كمزود خدمة</h1>
          <p className="text-sm text-muted-foreground mt-1">
            انضم لشبكة مزودي نكفيك واستقبل طلبات منظمي الفعاليات
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>الفئة *</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>اسم النشاط *</Label>
              <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} maxLength={120} />
            </div>
            <div>
              <Label>اسم المسؤول *</Label>
              <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} maxLength={120} />
            </div>
            <div>
              <Label>الجوال *</Label>
              <Input dir="ltr" placeholder="+9665xxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>البريد الإلكتروني</Label>
              <Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>المدينة</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={80} />
            </div>
            <div>
              <Label>الموقع الإلكتروني</Label>
              <Input dir="ltr" placeholder="https://" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>وصف مختصر للخدمات</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "جارٍ الإرسال..." : "إرسال الطلب"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/" className="underline">العودة للرئيسية</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterProvider;
