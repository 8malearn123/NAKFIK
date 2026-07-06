import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
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
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-cairo flex items-center gap-2"><Award className="w-7 h-7 text-primary" /> الشهادات</h1>
            <p className="text-sm text-muted-foreground mt-1">صمّم شهادات احترافية وأصدرها لمستلميك مع رابط تحقق فريد لكل واحدة</p>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4 ml-1" /> شهادة جديدة</Button>
        </div>

        {loading ? <p className="text-muted-foreground">جاري التحميل...</p> : items.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-2xl">
            <Award className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">لا توجد شهادات بعد</p>
            <Button className="mt-4" onClick={openNew}><Sparkles className="w-4 h-4 ml-1" /> ابدأ بقالب جاهز</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((c) => (
              <div key={c.id} className="rounded-2xl border overflow-hidden bg-card hover:shadow-lg transition">
                <div className="aspect-[1.414/1] relative" style={{ background: `linear-gradient(160deg, ${c.theme_color}, ${c.theme_color}dd)`, color: c.text_color, fontFamily: c.heading_font }}>
                  <div className="absolute inset-3 border" style={{ borderColor: c.accent_color }} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <p className="text-[10px] tracking-widest opacity-80" style={{ color: c.accent_color }}>CERTIFICATE</p>
                    <p className="text-lg font-bold mt-1">{c.title}</p>
                    <div className="h-px w-16 bg-current opacity-50 my-2" style={{ background: c.accent_color }} />
                    <p className="text-[10px] opacity-70">{c.issuer_name}</p>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <p className="font-semibold text-sm truncate">{c.title}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="w-3 h-3 ml-1" /> تعديل</Button>
                    <Button size="sm" variant="outline" onClick={() => openRecipients(c)}><Users className="w-3 h-3 ml-1" /> المستلمون</Button>
                    <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Editor */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl" className="max-w-5xl max-h-[92vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "تعديل الشهادة" : "شهادة جديدة"}</DialogTitle></DialogHeader>
            <Tabs defaultValue="content">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="content"><FileText className="w-3 h-3 ml-1" /> المحتوى</TabsTrigger>
                <TabsTrigger value="design"><Sparkles className="w-3 h-3 ml-1" /> التصميم</TabsTrigger>
              </TabsList>
              <TabsContent value="content" className="space-y-3 mt-4">
                <div><Label>عنوان الشهادة *</Label><Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>العنوان الفرعي</Label><Input value={form.subtitle || ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="CERTIFICATE OF ATTENDANCE" /></div>
                <div><Label>نص الشهادة</Label><Textarea rows={5} value={form.body_text || ""} onChange={(e) => setForm({ ...form, body_text: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>الجهة المُصدِرة</Label><Input value={form.issuer_name || ""} onChange={(e) => setForm({ ...form, issuer_name: e.target.value })} /></div>
                  <div><Label>اسم الموقّع</Label><Input value={form.signature_name || ""} onChange={(e) => setForm({ ...form, signature_name: e.target.value })} /></div>
                </div>
                <div><Label>المسمّى الوظيفي للموقّع</Label><Input value={form.signature_title || ""} onChange={(e) => setForm({ ...form, signature_title: e.target.value })} /></div>
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
            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button onClick={save}>{editing ? "حفظ التعديلات" : "إنشاء الشهادة"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Recipients */}
        <Dialog open={recipientsOpen} onOpenChange={setRecipientsOpen}>
          <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>مستلمو شهادة — {activeCert?.title}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-muted/30 rounded-xl p-3 mb-3">
              <Input placeholder="اسم المستلم *" value={newR.recipient_name} onChange={(e) => setNewR({ ...newR, recipient_name: e.target.value })} />
              <Input dir="ltr" placeholder="البريد (اختياري)" value={newR.recipient_email} onChange={(e) => setNewR({ ...newR, recipient_email: e.target.value })} />
              <Button onClick={addRecipient}><Send className="w-4 h-4 ml-1" /> إضافة وإصدار</Button>
            </div>
            {recipients.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">لا يوجد مستلمون بعد</p>
            ) : (
              <div className="space-y-2">
                {recipients.map((r) => {
                  const url = `${window.location.origin}/certificate/${r.verification_token}`;
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                      <QRCodeSVG value={url} size={56} />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{r.recipient_name}</p>
                        {r.recipient_email && <p className="text-xs text-muted-foreground">{r.recipient_email}</p>}
                        <a href={url} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline">{url}</a>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(url); toast.success("تم النسخ"); }}>نسخ</Button>
                      <Button size="sm" variant="ghost" onClick={() => removeRecipient(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
