CREATE OR REPLACE FUNCTION public.get_connect_card(_code text)
 RETURNS TABLE(user_id uuid, full_name text, avatar_url text, job_title text, company text, bio text, expertise text[], looking_for text[], whatsapp text, email_public text, website_url text, linkedin_url text, twitter_handle text, instagram_handle text, snapchat_handle text, privacy_level text, card_logo_url text, ring_color text, bg_color_from text, bg_color_to text, tier_label text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    np.user_id,
    p.full_name,
    p.avatar_url,
    COALESCE(np.job_title, p.job_title) AS job_title,
    COALESCE(np.company, p.company) AS company,
    COALESCE(np.bio, p.bio) AS bio,
    np.expertise,
    np.looking_for,
    COALESCE(np.whatsapp, p.phone) AS whatsapp,
    COALESCE(np.email_public, p.email) AS email_public,
    np.website_url,
    COALESCE(np.linkedin_url, p.linkedin_url) AS linkedin_url,
    COALESCE(np.twitter_handle, p.x_handle) AS twitter_handle,
    COALESCE(np.instagram_handle, p.instagram_handle) AS instagram_handle,
    np.snapchat_handle,
    np.privacy_level,
    np.card_logo_url,
    np.ring_color,
    np.bg_color_from,
    np.bg_color_to,
    COALESCE(
      (
        SELECT t.badge_tier_label
        FROM public.registrations r
        JOIN public.tickets t ON t.id = r.ticket_id
        LEFT JOIN public.events e ON e.id = r.event_id
        WHERE r.attendee_id = np.user_id
          AND t.badge_tier_label IS NOT NULL
          AND r.status IN ('confirmed'::registration_status, 'checked_in'::registration_status)
        ORDER BY e.start_date DESC NULLS LAST, r.registered_at DESC
        LIMIT 1
      ),
      np.tier_label
    ) AS tier_label
  FROM public.networking_profiles np
  LEFT JOIN public.profiles p ON p.id = np.user_id
  WHERE np.connect_code = _code
  LIMIT 1
$function$;