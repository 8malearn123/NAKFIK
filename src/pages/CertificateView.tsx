import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DesignPreview from "@/components/design/DesignPreview";
import { CheckCircle2, XCircle, Calendar, Award } from "lucide-react";

export default function CertificateView() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState<any>(null);
  const [cert, setCert] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) { setLoading(false); return; }
      const { data: r } = await supabase.from("certificate_design_recipients" as any).select("*").eq("verification_token", token).maybeSingle();
      if (!r) { setLoading(false); return; }
      setRecipient(r);
      const { data: c } = await supabase.from("certificate_designs" as any).select("*").eq("id", (r as any).certificate_design_id).maybeSingle();
      setCert(c);
      setLoading(false);
    };
    load();
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-cairo">جاري التحقق...</div>;
  if (!recipient || !cert) return (
    <div className="min-h-screen flex items-center justify-center p-6 font-cairo">
      <div className="text-center">
        <XCircle className="w-14 h-14 text-destructive mx-auto mb-3" />
        <h1 className="font-bold text-xl">شهادة غير صالحة</h1>
        <p className="text-muted-foreground text-sm mt-2">رابط التحقق غير صحيح أو قد تكون الشهادة محذوفة</p>
      </div>
    </div>
  );

  const body = (cert.body_text || "").replace("[اسم المستلم]", recipient.recipient_name);

  return (
    <div dir="rtl" className="min-h-screen bg-muted/30 py-8 px-4 font-cairo">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 font-bold">
            <CheckCircle2 className="w-5 h-5" /> شهادة موثّقة
          </div>
        </div>

        <DesignPreview
          mode="certificate"
          design={{
            theme_color: cert.theme_color,
            accent_color: cert.accent_color,
            background_color: cert.background_color,
            text_color: cert.text_color,
            heading_font: cert.heading_font,
            body_font: cert.body_font,
            layout_style: cert.layout_style,
            ornament_style: cert.ornament_style,
            background_image_url: cert.background_image_url,
          }}
          title={cert.title}
          subtitle={cert.subtitle || undefined}
          body={body}
          guestName={recipient.recipient_name}
          footer={cert.signature_name ? `${cert.signature_name}${cert.signature_title ? " · " + cert.signature_title : ""}` : cert.issuer_name}
          qrValue={typeof window !== "undefined" ? window.location.href : ""}
        />

        <div className="bg-card rounded-2xl p-5 border space-y-2 text-sm">
          <h3 className="font-bold flex items-center gap-2"><Award className="w-4 h-4" /> تفاصيل التحقق</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <p><span className="text-muted-foreground">المستلم:</span> {recipient.recipient_name}</p>
            <p><span className="text-muted-foreground">الجهة المُصدِرة:</span> {cert.issuer_name}</p>
            <p className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(recipient.issued_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}</p>
            <p className="font-mono text-[10px] text-muted-foreground truncate">رمز التحقق: {recipient.verification_token}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
