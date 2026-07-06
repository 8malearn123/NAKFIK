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
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the guest by token
    const { data: guest, error: guestError } = await supabase
      .from("event_guests")
      .select("*, events:event_id(id, title_ar, start_date, end_date, venue_name, is_online, cover_image_url, status)")
      .eq("rsvp_token", token)
      .maybeSingle();

    if (guestError || !guest) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = (guest as any).events;

    // Check event status
    if (event.status === "cancelled") {
      return new Response(JSON.stringify({ error: "event_cancelled", guest, event }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(event.start_date) < new Date()) {
      return new Response(JSON.stringify({ error: "event_passed", guest, event }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already confirmed
    if (guest.rsvp_status === "confirmed") {
      return new Response(JSON.stringify({ status: "already_confirmed", guest, event }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirm
    const { error: updateError } = await supabase
      .from("event_guests")
      .update({ rsvp_status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", guest.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "update_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send in-app notification to organizer
    const { data: eventFull } = await supabase
      .from("events")
      .select("organization_id, organizations:organization_id(owner_id)")
      .eq("id", guest.event_id)
      .single();

    if (eventFull) {
      const ownerId = (eventFull as any).organizations?.owner_id;
      if (ownerId) {
        await supabase.from("in_app_notifications").insert({
          user_id: ownerId,
          title: "تأكيد حضور جديد",
          body: `${guest.guest_name} أكد حضوره للفعالية`,
          link: `/dashboard/events`,
        });
      }
    }

    return new Response(JSON.stringify({ status: "confirmed", guest: { ...guest, rsvp_status: "confirmed", confirmed_at: new Date().toISOString() }, event }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
