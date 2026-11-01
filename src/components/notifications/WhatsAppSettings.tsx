import { useState, useEffect } from "react";
import Panel from "@/components/app/Panel";
import StatusBadge from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Link2, Loader2, MessageSquare, Save, Server, TestTube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ConnectionType = "rest_api" | "qr_gateway" | "nakfeek" | "deeplink";

const METHODS: { key: ConnectionType; includes: ConnectionType[]; icon: typeof Server; title: string; description: React.ReactNode }[] = [
  {
    key: "rest_api",
    includes: ["rest_api", "qr_gateway"],
    icon: Server,
    title: "ربط واتساب الخاص بك",
    description: <>REST API أو QR Gateway — <bdi dir="ltr">Twilio, 360dialog, UltraMsg...</bdi></>,
  },
  {
    key: "nakfeek",
    includes: ["nakfeek"],
    icon: MessageSquare,
    title: "الإرسال من خلال نكفيك",
    description: "إرسال مدفوع من رقم نكفيك الرسمي — حصة شهرية حسب الباقة",
  },
  {
    key: "deeplink",
    includes: ["deeplink"],
    icon: Link2,
    title: "هيبرلينك فقط (مجاني)",
    description: "يفتح واتساب مع رسالة جاهزة — ترسل بنفسك يدوياً",
  },
];

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
        toast.success(data.message || "الاتصال يعمل!");
        setSettings(prev => ({ ...prev, is_verified: true }));
      } else {
        toast.error(data?.message || "فشل الاختبار");
      }
    } catch (err: any) {
      toast.error(err.message || "خطأ في الاختبار");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-2xl bg-card shadow-soft" />
        <div className="h-44 animate-pulse rounded-2xl bg-card shadow-soft" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Method Selection */}
      <Panel title="طريقة إرسال واتساب">
        <div role="radiogroup" aria-label="طريقة إرسال واتساب" className="grid gap-4 xl:grid-cols-3">
          {METHODS.map((m) => {
            const selected = m.includes.includes(connectionType);
            return (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setConnectionType(m.key)}
                className={cn("flex items-start gap-3 rounded-xl p-4 text-start transition-colors", selected ? "bg-secondary" : "bg-muted/50 hover:bg-muted")}
              >
                <span className={cn("grid h-9 w-9 flex-none place-items-center rounded-[10px] text-primary", selected ? "bg-card" : "bg-secondary")}>
                  <m.icon className="h-[17px] w-[17px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-[22px]">{m.title}</span>
                  <span className="block text-xs leading-[18px] text-muted-foreground">{m.description}</span>
                </span>
                {selected && <CheckCircle2 className="h-5 w-5 flex-none text-primary" />}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* REST API / QR Gateway Config */}
      {(connectionType === "rest_api" || connectionType === "qr_gateway") && (
        <Panel title="إعدادات الاتصال الخارجي" bodyClassName="space-y-5">
          {/* Sub-type toggle */}
          <Tabs value={connectionType} onValueChange={(v) => setConnectionType(v as ConnectionType)}>
            <TabsList>
              <TabsTrigger value="rest_api">REST API</TabsTrigger>
              <TabsTrigger value="qr_gateway">QR Gateway</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-4 md:grid-cols-2">
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
                className="placeholder:text-end"
              />
            </div>

            {connectionType === "qr_gateway" && (
              <div className="space-y-2 md:col-span-2">
                <Label>Instance ID</Label>
                <Input
                  placeholder="معرف الجلسة من المزود"
                  value={settings.instance_id}
                  onChange={(e) => setSettings({ ...settings, instance_id: e.target.value })}
                  dir="ltr"
                  className="placeholder:text-end"
                />
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
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
                استخدم <bdi dir="ltr">{"{{phone}}"}</bdi> و <bdi dir="ltr">{"{{message}}"}</bdi> كمتغيرات. للـ QR Gateway أضف <bdi dir="ltr">{"{{instance_id}}"}</bdi>
              </p>
            </div>
          </div>

          {/* Test Connection */}
          <div className="space-y-3 rounded-xl bg-muted/50 p-4">
            <h4 className="text-sm font-semibold">اختبار الاتصال</h4>
            <div className="flex max-w-md gap-3">
              <Input
                placeholder="966XXXXXXXXX"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                dir="ltr"
                className="min-w-0 flex-1"
              />
              <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                {testing ? "جارٍ..." : "اختبار"}
              </Button>
            </div>
            {settings.is_verified && <StatusBadge tone="success">تم التحقق — الاتصال يعمل</StatusBadge>}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </Button>
            <div className="flex items-center gap-2">
              <Switch
                aria-label="تفعيل"
                checked={settings.is_active}
                onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
              />
              <span className="text-sm text-muted-foreground">تفعيل</span>
            </div>
          </div>
        </Panel>
      )}

      {/* Nakfeek Method - Quota Display */}
      {connectionType === "nakfeek" && (
        <Panel title="الإرسال من خلال نكفيك" bodyClassName="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "الحصة الشهرية", value: formatNumber(quota.plan_monthly_quota) },
              { label: "المستخدم", value: formatNumber(quota.messages_used_this_month) },
              { label: "المتبقي", value: formatNumber(Math.max(0, quota.plan_monthly_quota - quota.messages_used_this_month)) },
              { label: "الرصيد", value: formatNumber(quota.credit_balance_sar), unit: "ر.س" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-muted/50 p-4">
                <p className="text-[13px] leading-5 text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-2xl font-bold leading-8">
                  {item.value} {item.unit && <span className="text-sm font-semibold text-muted-foreground">{item.unit}</span>}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            سعر الزيادة: {formatNumber(quota.overage_rate_sar)} ر.س / رسالة بعد انتهاء الحصة الشهرية
          </p>

          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? "جارٍ الحفظ..." : "تفعيل هذه الطريقة"}
          </Button>
        </Panel>
      )}

      {/* Deeplink - No Setup */}
      {connectionType === "deeplink" && (
        <Panel title="هيبرلينك واتساب (مجاني)" bodyClassName="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            لا يحتاج إلى إعداد. عند إرسال رسالة، سيفتح واتساب على جهازك مع الرسالة جاهزة للإرسال.
            مناسب للقوائم الصغيرة (أقل من 20 شخصاً).
          </p>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? "جارٍ الحفظ..." : "حفظ الطريقة"}
          </Button>
        </Panel>
      )}
    </div>
  );
};

export default WhatsAppSettings;
