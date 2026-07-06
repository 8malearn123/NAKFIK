// Admin invite user — sends Supabase magic-link/invite to a new user.
// Requires the caller to be authenticated as a super_admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteBody {
  email: string;
  full_name?: string;
  phone?: string;
  account_type: "organizer" | "attendee" | "venue_owner";
  org_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is super_admin
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = (await req.json()) as InviteBody;
    if (!body?.email || !body?.account_type || !body?.phone || !body?.full_name) {
      return new Response(JSON.stringify({ error: "missing_fields", message: "الاسم والبريد والجوال إلزامية" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const phone = body.phone.trim();
    if (!/^\+9665\d{8}$/.test(phone)) {
      return new Response(JSON.stringify({ error: "invalid_phone", message: "رقم الجوال يجب أن يكون بصيغة +9665XXXXXXXX" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data, error } = await admin.auth.admin.inviteUserByEmail(body.email, {
      data: {
        full_name: body.full_name,
        account_type: body.account_type,
        phone,
      },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newUserId = data.user?.id;

    // Persist phone + name on profile so WhatsApp notifications work immediately
    if (newUserId) {
      await admin.from("profiles").update({
        phone,
        full_name: body.full_name,
      }).eq("id", newUserId);
    }

    // If organizer, create org row
    if (newUserId && body.account_type === "organizer" && body.org_name) {
      await admin.from("organizations").insert({
        owner_id: newUserId,
        name: body.org_name,
        phone,
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
