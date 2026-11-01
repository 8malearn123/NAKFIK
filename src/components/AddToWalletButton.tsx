import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet } from "lucide-react";

// زر "أضف إلى Apple Wallet" — يطلب ملف .pkpass من الخادم لتذكرة محددة.
// كل فعالية تنزل كبطاقة مستقلة في المحفظة بهويتها وتصنيف حاملها.

const AddToWalletButton = ({ registrationId }: { registrationId: string }) => {
  const [loading, setLoading] = useState(false);

  const addToWallet = async () => {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { toast.error("سجّل الدخول أولاً"); return; }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/apple-wallet-pass`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ registration_id: registrationId }),
      });

      if (!res.ok) {
        let code = "";
        try { code = (await res.json())?.error || ""; } catch { /* ignore */ }
        if (code === "wallet_not_configured" || res.status === 501 || res.status === 404) {
          toast.info("بطاقات Apple Wallet ستتوفر قريباً — بانتظار تفعيل شهادة Apple للمنصة");
        } else {
          toast.error("تعذر إنشاء بطاقة المحفظة، حاول مرة أخرى");
        }
        return;
      }

      const blob = await res.blob();
      const dl = URL.createObjectURL(new Blob([blob], { type: "application/vnd.apple.pkpass" }));
      const a = document.createElement("a");
      a.href = dl;
      a.download = `nakfeek-${registrationId}.pkpass`;
      a.click();
      URL.revokeObjectURL(dl);
    } catch {
      toast.error("تعذر إنشاء بطاقة المحفظة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={addToWallet}
      disabled={loading}
      title="أضف هذه الفعالية بطاقةً مستقلة في Apple Wallet"
    >
      {loading ? <Loader2 className="animate-spin" /> : <Wallet />}
      <bdi dir="ltr">Apple Wallet</bdi>
    </Button>
  );
};

export default AddToWalletButton;
