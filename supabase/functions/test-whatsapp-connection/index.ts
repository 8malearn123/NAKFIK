import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { connection_id, test_phone } = body;

    if (!connection_id || !test_phone) {
      return new Response(JSON.stringify({ error: "connection_id and test_phone required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("id", connection_id)
      .eq("account_id", user.id)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPhone = test_phone.replace(/[^0-9]/g, "");
    const testMessage = "✅ رسالة اختبار من نكفيك تيكت — الاتصال يعمل بنجاح!";

    if (connection.connection_type === "rest_api" || connection.connection_type === "qr_gateway") {
      if (!connection.endpoint_url) {
        return new Response(JSON.stringify({ success: false, error: "Endpoint URL missing" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (connection.auth_method === "bearer" && connection.auth_value) {
        headers["Authorization"] = `Bearer ${connection.auth_value}`;
      } else if (connection.auth_method === "api_key" && connection.auth_value) {
        headers["Authorization"] = connection.auth_value;
      } else if (connection.auth_method === "basic" && connection.auth_value) {
        headers["Authorization"] = `Basic ${btoa(connection.auth_value)}`;
      }

      let bodyStr = JSON.stringify(connection.body_template || { to: "{{phone}}", message: "{{message}}" });
      bodyStr = bodyStr.replace(/\{\{phone\}\}/g, cleanPhone);
      bodyStr = bodyStr.replace(/\{\{message\}\}/g, testMessage);
      if (connection.instance_id) {
        bodyStr = bodyStr.replace(/\{\{instance_id\}\}/g, connection.instance_id);
      }

      const extResponse = await fetch(connection.endpoint_url, { method: "POST", headers, body: bodyStr });
      const extData = await extResponse.json().catch(() => ({}));

      // Update connection verification status
      await supabase.from("whatsapp_connections").update({
        is_verified: extResponse.ok,
        last_tested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", connection_id);

      return new Response(JSON.stringify({
        success: extResponse.ok,
        message: extResponse.ok ? "✅ تم إرسال رسالة الاختبار بنجاح" : "❌ فشل الاتصال",
        details: extData,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Test only supported for external connections" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
