import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Save, Key, Phone, Wifi, WifiOff, ExternalLink, Link2, Server,
  MessageSquare, CreditCard, TestTube, CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ConnectionType = "rest_api" | "qr_gateway" | "nakfeek" | "deeplink";

const WhatsAppSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);

  const [connectionType, setConnectionType] = useState<ConnectionType>("deeplink");
  const [settings, setSettings] = useState({
    provider_name: "",
    endpoint_url: "",
    auth_method: "bearer" as string,
    auth_value: "",
    body_template: '{"to": "{{phone}}", "message": "{{message}}"}',
    instance_id: "",
    is_active: true,
    is_verified: false,
  });

  const [quota, setQuota] = useState({
    plan_monthly_quota: 0,
    messages_used_this_month: 0,
    credit_balance_sar: 0,
    overage_rate_sar: 0.1,
  });

  const [testPhone, setTestPhone] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: conn } = await supabase
        .from("whatsapp_connections" as any)
        .select("*")
        .eq("account_id", user.id)
        .maybeSingle();

      if (conn) {
        const c = conn as any;
        setConnectionId(c.id);
        setConnectionType(c.connection_type);
        setSettings({
          provider_name: c.provider_name || "",
          endpoint_url: c.endpoint_url || "",
          auth_method: c.auth_method || "bearer",
          auth_value: c.auth_value || "",
          body_template: c.body_template ? JSON.stringify(c.body_template, null, 2) : '{"to": "{{phone}}", "message": "{{message}}"}',
          instance_id: c.instance_id || "",
          is_active: c.is_active ?? true,
          is_verified: c.is_verified ?? false,
        });
        setHasExisting(true);
      }

      const { data: q } = await supabase
        .from("whatsapp_quota" as any)
        .select("*")
        .eq("account_id", user.id)
        .maybeSingle();

      if (q) {
        const qd = q as any;
        setQuota({
          plan_monthly_quota: qd.plan_monthly_quota || 0,
          messages_used_this_month: qd.messages_used_this_month || 0,
          credit_balance_sar: qd.credit_balance_sar || 0,
          overage_rate_sar: qd.overage_rate_sar || 0.1,
        });
      }

      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول أولاً");

      let bodyTemplateJson: any;
      if (connectionType === "rest_api" || connectionType === "qr_gateway") {
        try {
          bodyTemplateJson = JSON.parse(settings.body_template);
        } catch {
          toast.error("قالب الجسم (Body Template) غير صالح JSON");
          setSaving(false);
          return;
        }
      }

      const record: any = {
        account_id: user.id,
        account_type: "organizer",
        connection_type: connectionType,
        provider_name: settings.provider_name || null,
        endpoint_url: settings.endpoint_url || null,
        auth_method: (connectionType === "rest_api" || connectionType === "qr_gateway") ? settings.auth_method : null,
        auth_value: settings.auth_value || null,
        body_template: bodyTemplateJson || { to: "{{phone}}", message: "{{message}}" },
        instance_id: settings.instance_id || null,
        is_active: settings.is_active,
        updated_at: new Date().toISOString(),
      };

      if (hasExisting && connectionId) {
        const { error } = await supabase
          .from("whatsapp_connections" as any)
          .update(record)
          .eq("id", connectionId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("whatsapp_connections" as any)
          .insert(record)
          .select()
          .single();
        if (error) throw error;
        setConnectionId((data as any).id);
        setHasExisting(true);
      }

      toast.success("تم حفظ إعدادات واتساب بنجاح!");
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!connectionId) {
      toast.error("احفظ الإعدادات أولاً");
      return;
    }
    if (!testPhone.trim()) {
      toast.error("أدخل رقم هاتف للاختبار");
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-whatsapp-connection", {
        body: { connection_id: connectionId, test_phone: testPhone },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || "✅ الاتصال يعمل!");
        setSettings(prev => ({ ...prev, is_verified: true }));
      } else {
        toast.error(data?.message || "❌ فشل الاختبار");
      }
    } catch (err: any) {
      toast.error(err.message || "خطأ في الاختبار");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-12 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Method Selection - 3 Radio Cards */}
      <div className="bg-card rounded-2xl border border-border/50 p-6">
        <h3 className="font-bold text-foreground mb-4">طريقة إرسال واتساب</h3>
        <div className="grid gap-3">
          {/* Card 1: External API */}
          <button
            onClick={() => setConnectionType("rest_api")}
            className={`p-4 rounded-xl border-2 text-right transition-all ${
              connectionType === "rest_api" || connectionType === "qr_gateway"
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Server className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground text-sm">ربط واتساب الخاص بك</p>
                <p className="text-xs text-muted-foreground">REST API أو QR Gateway — Twilio, 360dialog, UltraMsg...</p>
              </div>
              {(connectionType === "rest_api" || connectionType === "qr_gateway") && (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              )}
            </div>
          </button>

          {/* Card 2: Nakfeek */}
          <button
            onClick={() => setConnectionType("nakfeek")}
            className={`p-4 rounded-xl border-2 text-right transition-all ${
              connectionType === "nakfeek"
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground text-sm">الإرسال من خلال نكفيك</p>
                <p className="text-xs text-muted-foreground">إرسال مدفوع من رقم نكفيك الرسمي — حصة شهرية حسب الباقة</p>
              </div>
              {connectionType === "nakfeek" && <CheckCircle2 className="w-5 h-5 text-primary" />}
            </div>
          </button>

          {/* Card 3: Deep Link */}
          <button
            onClick={() => setConnectionType("deeplink")}
            className={`p-4 rounded-xl border-2 text-right transition-all ${
              connectionType === "deeplink"
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground text-sm">هيبرلينك فقط (مجاني)</p>
                <p className="text-xs text-muted-foreground">يفتح واتساب مع رسالة جاهزة — ترسل بنفسك يدوياً</p>
              </div>
              {connectionType === "deeplink" && <CheckCircle2 className="w-5 h-5 text-primary" />}
            </div>
          </button>
        </div>
      </div>

      {/* REST API / QR Gateway Config */}
      {(connectionType === "rest_api" || connectionType === "qr_gateway") && (
        <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            إعدادات الاتصال الخارجي
          </h3>

          {/* Sub-type toggle */}
          <div className="flex gap-3">
            <button
              onClick={() => setConnectionType("rest_api")}
              className={`flex-1 p-2.5 rounded-xl text-sm font-semibold transition-all ${
                connectionType === "rest_api" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              REST API
            </button>
            <button
              onClick={() => setConnectionType("qr_gateway")}
              className={`flex-1 p-2.5 rounded-xl text-sm font-semibold transition-all ${
                connectionType === "qr_gateway" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              QR Gateway
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم المزود</Label>
              <Input
                placeholder="مثال: Twilio, UltraMsg, 360dialog"
                value={settings.provider_name}
                onChange={(e) => setSettings({ ...settings, provider_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input
                placeholder="https://api.provider.com/send"
                value={settings.endpoint_url}
                onChange={(e) => setSettings({ ...settings, endpoint_url: e.target.value })}
                dir="ltr"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>طريقة المصادقة</Label>
                <Select value={settings.auth_method} onValueChange={(v) => setSettings({ ...settings, auth_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>مفتاح / توكن المصادقة</Label>
                <Input
                  type="password"
                  placeholder="أدخل المفتاح"
                  value={settings.auth_value}
                  onChange={(e) => setSettings({ ...settings, auth_value: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>

            {connectionType === "qr_gateway" && (
              <div className="space-y-2">
                <Label>Instance ID</Label>
                <Input
                  placeholder="معرف الجلسة من المزود"
                  value={settings.instance_id}
                  onChange={(e) => setSettings({ ...settings, instance_id: e.target.value })}
                  dir="ltr"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Body Template (JSON)</Label>
              <Textarea
                placeholder='{"to": "{{phone}}", "message": "{{message}}"}'
                value={settings.body_template}
                onChange={(e) => setSettings({ ...settings, body_template: e.target.value })}
                rows={4}
                dir="ltr"
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                استخدم {"{{phone}}"} و {"{{message}}"} كمتغيرات. للـ QR Gateway أضف {"{{instance_id}}"}
              </p>
            </div>
          </div>

          {/* Test Connection */}
          <div className="p-4 bg-muted/50 rounded-xl space-y-3">
            <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <TestTube className="w-4 h-4 text-primary" />
              اختبار الاتصال
            </h4>
            <div className="flex gap-3">
              <Input
                placeholder="966XXXXXXXXX"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                dir="ltr"
                className="flex-1"
              />
              <Button
                variant="outline"
                className="rounded-full"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                {testing ? "جارٍ..." : "اختبار"}
              </Button>
            </div>
            {settings.is_verified && (
              <p className="text-xs text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                تم التحقق — الاتصال يعمل
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button className="rounded-full" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </Button>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.is_active}
                onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
              />
              <span className="text-sm text-muted-foreground">تفعيل</span>
            </div>
          </div>
        </div>
      )}

      {/* Nakfeek Method - Quota Display */}
      {connectionType === "nakfeek" && (
        <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-5">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            الإرسال من خلال نكفيك
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-muted/50 rounded-xl text-center">
              <p className="text-2xl font-bold text-foreground">{quota.plan_monthly_quota}</p>
              <p className="text-xs text-muted-foreground">الحصة الشهرية</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-xl text-center">
              <p className="text-2xl font-bold text-foreground">{quota.messages_used_this_month}</p>
              <p className="text-xs text-muted-foreground">المستخدم</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-xl text-center">
              <p className="text-2xl font-bold text-emerald-500">
                {Math.max(0, quota.plan_monthly_quota - quota.messages_used_this_month)}
              </p>
              <p className="text-xs text-muted-foreground">المتبقي</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-xl text-center">
              <p className="text-2xl font-bold text-foreground">{quota.credit_balance_sar} <span className="text-xs">ر.س</span></p>
              <p className="text-xs text-muted-foreground">الرصيد</p>
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 rounded-xl">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              سعر الزيادة: {quota.overage_rate_sar} ر.س / رسالة بعد انتهاء الحصة الشهرية
            </p>
          </div>

          <Button className="rounded-full" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? "جارٍ الحفظ..." : "تفعيل هذه الطريقة"}
          </Button>
        </div>
      )}

      {/* Deeplink - No Setup */}
      {connectionType === "deeplink" && (
        <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Link2 className="w-4 h-4 text-amber-500" />
            هيبرلينك واتساب (مجاني)
          </h3>
          <p className="text-sm text-muted-foreground">
            لا يحتاج إعداد. عند إرسال رسالة، سيفتح واتساب على جهازك مع الرسالة جاهزة للإرسال.
            مناسب للقوائم الصغيرة (أقل من 20 شخص).
          </p>
          <Button className="rounded-full" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? "جارٍ الحفظ..." : "حفظ الطريقة"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default WhatsAppSettings;
