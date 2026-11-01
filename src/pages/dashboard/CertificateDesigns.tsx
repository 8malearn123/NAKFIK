import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Award, Plus, Pencil, Trash2, Users, Sparkles, FileText, Send } from "lucide-react";
import DesignStudio from "@/components/design/DesignStudio";
import { QRCodeSVG } from "qrcode.react";

interface Cert {
  id: string;
  organization_id: string;
  title: string;
  subtitle: string | null;
  body_text: string | null;
  issuer_name: string | null;
  signature_name: string | null;
  signature_title: string | null;
  template_key: string;
  layout_style: string;
  ornament_style: string;
  theme_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  heading_font: string;
  body_font: string;
  background_image_url: string | null;
  logo_url: string | null;
  status: string;
}

interface Recipient {
  id: string;
  recipient_name: string;
  recipient_email: string | null;
  verification_token: string;
  issued_at: string;
}

const emptyCert: Partial<Cert> = {
  title: "شهادة حضور",
  subtitle: "CERTIFICATE OF ATTENDANCE",
  body_text: "نشهد بأن السيد/السيدة\n[اسم المستلم]\nقد حضر فعاليتنا بنجاح، شاكرين له حضوره ومشاركته الفاعلة.",
  issuer_name: "مؤسسة نكفيك",
  signature_name: "المدير التنفيذي",
  signature_title: "التوقيع",
  template_key: "classic-gold",
  layout_style: "framed",
  ornament_style: "art-deco",
  theme_color: "#0F1B3D",
  accent_color: "#C9A84C",
  background_color: "#FAF6EC",
  text_color: "#FFFFFF",
  heading_font: "Amiri",
  body_font: "Cairo",
  background_image_url: null,
  logo_url: null,
  status: "draft",
};

export default function CertificateDesigns() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [items, setItems] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cert | null>(null);
  const [form, setForm] = useState<Partial<Cert>>(emptyCert);
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const [activeCert, setActiveCert] = useState<Cert | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newR, setNewR] = useState({ recipient_name: "", recipient_email: "" });

  useEffect(() => { if (user) loadOrg(); }, [user]);
  useEffect(() => { if (orgId) load(); }, [orgId]);

  const loadOrg = async () => {
    const { data } = await supabase.from("organizations").select("id").eq("owner_id", user!.id).maybeSingle();
    setOrgId(data?.id || null);
  };
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("certificate_designs" as any).select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  };

  const openNew = () => { setEditing(null); setForm(emptyCert); setOpen(true); };
  const openEdit = (c: Cert) => { setEditing(c); setForm(c); setOpen(true); };

  const save = async () => {
    if (!orgId || !form.title) return toast.error("العنوان مطلوب");
    const payload: any = { ...form, organization_id: orgId };
    delete payload.id;
    if (editing) {
      const { error } = await supabase.from("certificate_designs" as any).update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("certificate_designs" as any).insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("تم الحفظ");
    setOpen(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("حذف الشهادة؟")) return;
    await supabase.from("certificate_designs" as any).delete().eq("id", id);
    load();
  };

  const openRecipients = async (c: Cert) => {
    setActiveCert(c);
    setRecipientsOpen(true);
    const { data } = await supabase.from("certificate_design_recipients" as any).select("*").eq("certificate_design_id", c.id).order("created_at", { ascending: false });
    setRecipients((data as any) || []);
  };

  const addRecipient = async () => {
    if (!activeCert || !newR.recipient_name.trim()) return;
    const { error } = await supabase.from("certificate_design_recipients" as any).insert({
      certificate_design_id: activeCert.id,
      recipient_name: newR.recipient_name.trim(),
      recipient_email: newR.recipient_email.trim() || null,
    });
    if (error) return toast.error(error.message);
    setNewR({ recipient_name: "", recipient_email: "" });
    openRecipients(activeCert);
  };

  const removeRecipient = async (id: string) => {
    await supabase.from("certificate_design_recipients" as any).delete().eq("id", id);
    if (activeCert) openRecipients(activeCert);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="الشهادات"
          description="صمّم شهادات احترافية وأصدرها لمستلميك مع رابط تحقق فريد لكل واحدة"
          actions={<Button onClick={openNew}><Plus className="h-4 w-4" /> شهادة جديدة</Button>}
        />

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={Award}
              title="لا توجد شهادات بعد"
              action={<Button variant="soft" size="sm" onClick={openNew}><Sparkles className="h-4 w-4" /> ابدأ بقالب جاهز</Button>}
            />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((c) => (
              <article key={c.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-card shadow-soft">
                {/* معاينة الشهادة بألوان تصميمها */}
                <div className="relative aspect-[1.414/1]" style={{ background: c.theme_color, color: c.text_color, fontFamily: c.heading_font }}>
                  <div className="absolute inset-3 border" style={{ borderColor: c.accent_color }} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    <p className="text-xs opacity-80" style={{ color: c.accent_color }}>CERTIFICATE</p>
                    <p className="mt-1 text-lg font-bold">{c.title}</p>
                    <div className="my-2 h-px w-16 opacity-50" style={{ background: c.accent_color }} />
                    <p className="text-xs opacity-70">{c.issuer_name}</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="truncate text-base font-bold leading-6">{c.title}</h3>
                  <div className="mt-auto flex items-center gap-2">
                    <Button size="sm" variant="soft" className="flex-1" onClick={() => openEdit(c)}>
                      <Pencil className="h-[15px] w-[15px]" /> تعديل
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openRecipients(c)}>
                      <Users className="h-[15px] w-[15px]" /> المستلمون
                    </Button>
                    <Button size="icon" variant="outline" aria-label="حذف" className="h-9 w-9 flex-none text-destructive hover:text-destructive" onClick={() => del(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Editor */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl" className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-5xl overflow-y-auto rounded-2xl">
            <DialogHeader className="pe-6 text-start"><DialogTitle>{editing ? "تعديل الشهادة" : "شهادة جديدة"}</DialogTitle></DialogHeader>
            <Tabs defaultValue="content">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="content" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> المحتوى</TabsTrigger>
                <TabsTrigger value="design" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" /> التصميم</TabsTrigger>
              </TabsList>
              <TabsContent value="content" className="mt-4 space-y-4">
                <div className="space-y-1.5"><Label>عنوان الشهادة *</Label><Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>العنوان الفرعي</Label><Input value={form.subtitle || ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="CERTIFICATE OF ATTENDANCE" /></div>
                <div className="space-y-1.5"><Label>نص الشهادة</Label><Textarea rows={5} value={form.body_text || ""} onChange={(e) => setForm({ ...form, body_text: e.target.value })} /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>الجهة المُصدِرة</Label><Input value={form.issuer_name || ""} onChange={(e) => setForm({ ...form, issuer_name: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>اسم الموقّع</Label><Input value={form.signature_name || ""} onChange={(e) => setForm({ ...form, signature_name: e.target.value })} /></div>
                </div>
                <div className="space-y-1.5"><Label>المسمّى الوظيفي للموقّع</Label><Input value={form.signature_title || ""} onChange={(e) => setForm({ ...form, signature_title: e.target.value })} /></div>
              </TabsContent>
              <TabsContent value="design" className="mt-4">
                <DesignStudio
                  mode="certificate"
                  value={{
                    theme_color: form.theme_color || "#0F1B3D",
                    accent_color: form.accent_color || "#C9A84C",
                    background_color: form.background_color || "#FFFFFF",
                    text_color: form.text_color || "#FFFFFF",
                    heading_font: form.heading_font || "Amiri",
                    body_font: form.body_font || "Cairo",
                    layout_style: form.layout_style || "framed",
                    ornament_style: form.ornament_style || "art-deco",
                    background_image_url: form.background_image_url,
                    template_key: form.template_key,
                  }}
                  onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
                  previewTitle={form.title || "شهادة حضور"}
                  previewSubtitle={form.subtitle || "CERTIFICATE"}
                  previewBody={form.body_text || ""}
                  previewFooter={form.issuer_name || ""}
                  previewGuestName="اسم المستلم"
                  uploadPathPrefix="certificates"
                />
              </TabsContent>
            </Tabs>
            <DialogFooter className="flex-col sm:flex-row">
              <Button onClick={save}>{editing ? "حفظ التعديلات" : "إنشاء الشهادة"}</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Recipients */}
        <Dialog open={recipientsOpen} onOpenChange={setRecipientsOpen}>
          <DialogContent dir="rtl" className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto rounded-2xl">
            <DialogHeader className="pe-6 text-start"><DialogTitle>مستلمو شهادة — {activeCert?.title}</DialogTitle></DialogHeader>
            <div className="grid gap-2.5 rounded-xl bg-muted/50 p-3 sm:grid-cols-3">
              <Input placeholder="اسم المستلم *" value={newR.recipient_name} onChange={(e) => setNewR({ ...newR, recipient_name: e.target.value })} />
              <Input dir="ltr" placeholder="البريد (اختياري)" value={newR.recipient_email} onChange={(e) => setNewR({ ...newR, recipient_email: e.target.value })} />
              <Button onClick={addRecipient}><Send className="h-4 w-4" /> إضافة وإصدار</Button>
            </div>
            {recipients.length === 0 ? (
              <EmptyState icon={Users} title="لا يوجد مستلمون بعد" />
            ) : (
              <div className="space-y-2.5">
                {recipients.map((r) => {
                  const url = `${window.location.origin}/certificate/${r.verification_token}`;
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                      <div className="flex-none rounded-lg bg-white p-1.5"><QRCodeSVG value={url} size={56} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-[22px]">{r.recipient_name}</p>
                        {r.recipient_email && <p className="truncate text-xs leading-[18px] text-muted-foreground"><bdi dir="ltr">{r.recipient_email}</bdi></p>}
                        <a href={url} target="_blank" rel="noreferrer" className="block truncate text-xs leading-[18px] text-primary underline"><bdi dir="ltr">{url}</bdi></a>
                      </div>
                      <Button size="sm" variant="ghost" className="flex-none" onClick={() => { navigator.clipboard.writeText(url); toast.success("تم النسخ"); }}>نسخ</Button>
                      <Button size="icon" variant="ghost" aria-label="حذف المستلم" className="h-9 w-9 flex-none text-destructive hover:text-destructive" onClick={() => removeRecipient(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
