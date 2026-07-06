import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KARZOUN_API_URL = "https://api.karzoun.app/CloudApi.php";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { phone, message, template, params, recipient_name, type, related_to, related_id } = body;

    if (!phone) {
      return new Response(JSON.stringify({ error: "phone is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "");

    // Get user's whatsapp connection
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("account_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const connectionType = connection?.connection_type || "deeplink";

    // Build message text
    let messageText = message || "";
    if (!messageText && template) {
      messageText = template;
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          messageText = messageText.replace(`{${key}}`, String(value));
        });
      }
    }

    // Route based on connection type
    if (connectionType === "deeplink") {
      // Just log it - actual sending happens client-side via wa.me link
      await supabase.from("whatsapp_message_logs").insert({
        account_id: user.id,
        method: "deeplink",
        to_phone: phone,
        message_body: messageText,
        related_to: related_to || "manual",
        related_id: related_id || null,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      const deepLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
      return new Response(JSON.stringify({ success: true, method: "deeplink", deep_link: deepLink }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (connectionType === "nakfeek") {
      // Use platform Karzoun credentials
      const appKey = Deno.env.get("KARZOUN_APP_KEY") || "";
      const authKey = Deno.env.get("KARZOUN_AUTH_KEY") || "";

      if (!appKey || !authKey) {
        return new Response(JSON.stringify({ error: "Platform WhatsApp not configured" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check quota
      const { data: quota } = await supabase
        .from("whatsapp_quota")
        .select("*")
        .eq("account_id", user.id)
        .maybeSingle();

      let isOverage = false;
      let costSar = 0;

      if (quota) {
        if (quota.messages_used_this_month >= quota.plan_monthly_quota) {
          // Overage - check credit
          if (quota.credit_balance_sar < quota.overage_rate_sar) {
            return new Response(JSON.stringify({ error: "رصيد غير كافٍ، يرجى شحن الرصيد" }), {
              status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          isOverage = true;
          costSar = quota.overage_rate_sar;
        }
      }

      // Send via Karzoun
      const url = new URL(KARZOUN_API_URL);
      url.searchParams.set("appkey", appKey);
      url.searchParams.set("authkey", authKey);
      url.searchParams.set("to", cleanPhone);
      url.searchParams.set("message", messageText);

      const karzounResponse = await fetch(url.toString(), { method: "POST" });
      const karzounData = await karzounResponse.json().catch(() => ({}));
      const status = karzounResponse.ok ? "sent" : "failed";

      // Log message
      await supabase.from("whatsapp_message_logs").insert({
        account_id: user.id,
        method: "nakfeek",
        to_phone: phone,
        message_body: messageText,
        related_to: related_to || "manual",
        related_id: related_id || null,
        status,
        is_overage: isOverage,
        cost_sar: status === "sent" ? costSar : 0,
        sent_at: status === "sent" ? new Date().toISOString() : null,
        failed_reason: status === "failed" ? JSON.stringify(karzounData) : null,
      });

      // Update quota if sent
      if (status === "sent" && quota) {
        const updates: Record<string, any> = {
          messages_used_this_month: quota.messages_used_this_month + 1,
          updated_at: new Date().toISOString(),
        };
        if (isOverage) {
          updates.credit_balance_sar = quota.credit_balance_sar - costSar;
        }
        await supabase.from("whatsapp_quota").update(updates).eq("id", quota.id);
      }

      if (!karzounResponse.ok) {
        return new Response(JSON.stringify({ success: false, error: "Failed to send", details: karzounData }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, method: "nakfeek", data: karzounData }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (connectionType === "rest_api" || connectionType === "qr_gateway") {
      // External API
      if (!connection.endpoint_url) {
        return new Response(JSON.stringify({ error: "Endpoint URL not configured" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build request headers
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (connection.auth_method === "bearer" && connection.auth_value) {
        headers["Authorization"] = `Bearer ${connection.auth_value}`;
      } else if (connection.auth_method === "api_key" && connection.auth_value) {
        headers["Authorization"] = connection.auth_value;
      } else if (connection.auth_method === "basic" && connection.auth_value) {
        headers["Authorization"] = `Basic ${btoa(connection.auth_value)}`;
      }

      // Build body from template
      let bodyObj = connection.body_template || { to: "{{phone}}", message: "{{message}}" };
      let bodyStr = JSON.stringify(bodyObj);
      bodyStr = bodyStr.replace(/\{\{phone\}\}/g, cleanPhone);
      bodyStr = bodyStr.replace(/\{\{message\}\}/g, messageText);
      if (connection.instance_id) {
        bodyStr = bodyStr.replace(/\{\{instance_id\}\}/g, connection.instance_id);
      }

      const extResponse = await fetch(connection.endpoint_url, {
        method: "POST",
        headers,
        body: bodyStr,
      });
      const extData = await extResponse.json().catch(() => ({}));
      const extStatus = extResponse.ok ? "sent" : "failed";

      await supabase.from("whatsapp_message_logs").insert({
        account_id: user.id,
        method: "external",
        to_phone: phone,
        message_body: messageText,
        related_to: related_to || "manual",
        related_id: related_id || null,
        status: extStatus,
        sent_at: extStatus === "sent" ? new Date().toISOString() : null,
        failed_reason: extStatus === "failed" ? JSON.stringify(extData) : null,
      });

      if (!extResponse.ok) {
        return new Response(JSON.stringify({ success: false, error: "External API failed", details: extData }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, method: "external", data: extData }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown connection type" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
