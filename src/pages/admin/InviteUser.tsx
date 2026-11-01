import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";

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

  const isOrganizer = form.account_type === "organizer";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="دعوة حساب جديد"
          description={
            <>
              إرسال رابط دعوة (<bdi dir="ltr">Magic Link</bdi>) لمستخدم جديد. سيستلم بريداً فيه رابط لإنشاء كلمة المرور وتفعيل الحساب.
            </>
          }
        />

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel className="xl:col-span-2">
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>نوع الحساب *</Label>
                  <Select value={form.account_type} onValueChange={(v) => setForm({ ...form, account_type: v as typeof form.account_type })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="organizer">منظّم فعاليات</SelectItem>
                      <SelectItem value="attendee">حاضر</SelectItem>
                      <SelectItem value="venue_owner">صاحب مكان</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الاسم الكامل *</Label>
                  <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="محمد أحمد" />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني *</Label>
                  <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} dir="ltr" type="email" placeholder="user@example.com" />
                </div>
                <div className={isOrganizer ? "space-y-2" : "space-y-2 sm:col-span-2"}>
                  <Label>رقم الجوال * <span className="text-xs font-normal text-muted-foreground">(لتفعيل إشعارات الواتساب)</span></Label>
                  <Input
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    dir="ltr"
                    type="tel"
                    placeholder="+966512345678"
                    className={form.phone && !phoneValid ? "!border-destructive" : ""}
                  />
                  <p className="text-xs leading-[18px] text-muted-foreground">
                    الصيغة المطلوبة: <bdi dir="ltr">+9665XXXXXXXX</bdi>، إلزامي لإرسال التذاكر والتنبيهات عبر الواتساب
                  </p>
                </div>
                {isOrganizer && (
                  <div className="space-y-2">
                    <Label>اسم المنظمة *</Label>
                    <Input value={form.org_name} onChange={e => setForm({ ...form, org_name: e.target.value })} placeholder="شركة الفعاليات المتميزة" />
                    <p className="text-xs leading-[18px] text-muted-foreground">سيتم إنشاء منظمة بهذا الاسم وربطها بالحساب</p>
                  </div>
                )}
              </div>

              <Button onClick={handleSend} disabled={sending}>
                <Send className="h-4 w-4" />
                {sending ? "جارٍ الإرسال..." : "إرسال رابط الدعوة"}
              </Button>
            </div>
          </Panel>

          <div className="flex items-start gap-3 self-start rounded-2xl bg-card p-6 shadow-soft">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
              <Mail className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-[22px]">المستخدم سيتلقى بريداً فيه رابط لإنشاء كلمة المرور.</p>
              <p className="mt-1 text-[13px] leading-5 text-muted-foreground">بعد التفعيل سيدخل بحسابه ويستطيع استخدامه مباشرة.</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default InviteUser;
