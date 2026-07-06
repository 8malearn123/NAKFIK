// Send RSVP invite link to a guest on selected channels
// Returns ready-to-open URLs (wa.me, sms:, mailto:) so the client can trigger them
// Also logs attempt and updates event_guests.invite_sent_at
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { guest_ids, event_id, channels: overrideChannels, app_origin } = await req.json();
    if (!Array.isArray(guest_ids) || guest_ids.length === 0 || !event_id) {
      return json({ error: "guest_ids and event_id are required" }, 400);
    }

    // Fetch event + verify ownership
    const { data: event } = await supabase
      .from("events")
      .select("id, title_ar, start_date, venue_name, is_online, invite_channels, invite_message_template, organization_id, organizations:organization_id(owner_id)")
      .eq("id", event_id)
      .maybeSingle();
    if (!event) return json({ error: "Event not found" }, 404);

    const ownerId = (event as any).organizations?.owner_id;
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin").maybeSingle();
    if (ownerId !== user.id && !roleRow) return json({ error: "Forbidden" }, 403);

    const channels: string[] = (overrideChannels && overrideChannels.length ? overrideChannels : event.invite_channels) || ["whatsapp"];
    const origin = app_origin || `https://${req.headers.get("host")}`;

    const { data: guests } = await supabase
      .from("event_guests")
      .select("id, guest_name, guest_phone, guest_email, rsvp_token")
      .in("id", guest_ids)
      .eq("event_id", event_id);

    if (!guests || guests.length === 0) return json({ error: "No guests" }, 404);

    const dateStr = new Date(event.start_date).toLocaleDateString("ar-SA", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const timeStr = new Date(event.start_date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

    const dispatch = guests.map((g: any) => {
      const link = `${origin}/rsvp/${g.rsvp_token}`;
      const tmpl = event.invite_message_template
        || `مرحباً {name} 👋\nأنت مدعو لحضور: {title}\n📅 {date} - {time}\n📍 {venue}\n\nأكّد حضورك من هنا:\n{link}`;
      const message = tmpl
        .replace("{name}", g.guest_name)
        .replace("{title}", event.title_ar)
        .replace("{date}", dateStr)
        .replace("{time}", timeStr)
        .replace("{venue}", event.is_online ? "أونلاين" : (event.venue_name || ""))
        .replace("{link}", link);

      const phone = (g.guest_phone || "").replace(/[^0-9]/g, "");
      const links: Record<string, string> = {};
      if (channels.includes("whatsapp") && phone) {
        links.whatsapp = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      }
      if (channels.includes("sms") && phone) {
        links.sms = `sms:+${phone}?body=${encodeURIComponent(message)}`;
      }
      if (channels.includes("email") && g.guest_email) {
        const subject = `دعوة لحضور: ${event.title_ar}`;
        links.email = `mailto:${g.guest_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      }

      return { id: g.id, name: g.guest_name, message, link, links };
    });

    // Mark as queued
    await supabase
      .from("event_guests")
      .update({
        invite_sent_at: new Date().toISOString(),
        invite_sent_channels: channels,
        invite_send_status: "sent",
      })
      .in("id", guest_ids);

    return json({ success: true, dispatch, channels });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
