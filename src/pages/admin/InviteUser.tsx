import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Send } from "lucide-react";

const InviteUser = () => {
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    account_type: "organizer" as "organizer" | "attendee" | "venue_owner",
    org_name: "",
  });
  const [sending, setSending] = useState(false);

  const phoneValid = /^\+9665\d{8}$/.test(form.phone.trim());
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  const handleSend = async () => {
    if (!form.full_name.trim()) { toast.error("أدخل الاسم الكامل"); return; }
    if (!emailValid) { toast.error("أدخل بريدًا إلكترونيًا صحيحًا"); return; }
    if (!phoneValid) { toast.error("أدخل رقم جوال سعودي بصيغة +9665XXXXXXXX"); return; }
    if (form.account_type === "organizer" && !form.org_name.trim()) { toast.error("أدخل اسم المنظمة"); return; }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("admin-invite-user", { body: form });
    setSending(false);
    if (error || (data as any)?.error) {
      toast.error("فشل إرسال الدعوة: " + (error?.message || (data as any)?.error));
    } else {
      toast.success("تم إرسال رابط الدعوة وربط الجوال لتفعيل إشعارات الواتساب");
      setForm({ email: "", full_name: "", phone: "", account_type: "organizer", org_name: "" });
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-bold text-2xl text-foreground flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-primary" /> دعوة حساب جديد
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إرسال رابط دعوة (Magic Link) لمستخدم جديد. سيستلم بريد فيه رابط لإنشاء كلمة المرور وتفعيل الحساب.</p>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
          <div className="space-y-2">
            <Label>نوع الحساب *</Label>
            <select
              value={form.account_type}
              onChange={e => setForm({ ...form, account_type: e.target.value as any })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="organizer">منظّم فعاليات</option>
              <option value="attendee">حاضر</option>
              <option value="venue_owner">صاحب مكان</option>
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الاسم الكامل *</Label>
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="محمد أحمد" />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني *</Label>
              <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} dir="ltr" type="email" placeholder="user@example.com" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>رقم الجوال * <span className="text-xs text-muted-foreground font-normal">(لتفعيل إشعارات الواتساب)</span></Label>
              <Input
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                dir="ltr"
                type="tel"
                placeholder="+966512345678"
                className={form.phone && !phoneValid ? "border-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground">
                الصيغة المطلوبة: <span dir="ltr" className="font-mono">+9665XXXXXXXX</span> — إلزامي لإرسال التذاكر والتنبيهات عبر الواتساب
              </p>
            </div>
          </div>

          {form.account_type === "organizer" && (
            <div className="space-y-2">
              <Label>اسم المنظمة *</Label>
              <Input value={form.org_name} onChange={e => setForm({ ...form, org_name: e.target.value })} placeholder="شركة الفعاليات المتميزة" />
              <p className="text-xs text-muted-foreground">سيتم إنشاء منظمة بهذا الاسم وربطها بالحساب</p>
            </div>
          )}

          <Button onClick={handleSend} disabled={sending} className="rounded-full">
            <Send className="w-4 h-4" />
            {sending ? "جارٍ الإرسال..." : "إرسال رابط الدعوة"}
          </Button>
        </div>

        <div className="bg-muted/40 rounded-xl border border-border/50 p-4 text-sm text-muted-foreground">
          💡 المستخدم سيتلقى بريداً فيه رابط لإنشاء كلمة المرور. بعد التفعيل سيدخل بحسابه ويستطيع استخدامه مباشرة.
        </div>
      </div>
    </AdminLayout>
  );
};

export default InviteUser;
