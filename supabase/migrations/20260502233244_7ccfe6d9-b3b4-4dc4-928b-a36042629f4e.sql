DROP FUNCTION IF EXISTS public.get_connect_card(text);

CREATE OR REPLACE FUNCTION public.get_connect_card(_code text)
RETURNS TABLE (
  user_id uuid, full_name text, avatar_url text,
  job_title text, company text, bio text,
  expertise text[], looking_for text[],
  whatsapp text, email_public text, website_url text,
  linkedin_url text, twitter_handle text, instagram_handle text, snapchat_handle text,
  privacy_level text,
  card_logo_url text, ring_color text, bg_color_from text, bg_color_to text, tier_label text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    np.user_id, p.full_name, p.avatar_url,
    np.job_title, np.company, np.bio,
    np.expertise, np.looking_for,
    np.whatsapp, np.email_public, np.website_url,
    np.linkedin_url, np.twitter_handle, np.instagram_handle, np.snapchat_handle,
    np.privacy_level,
    np.card_logo_url, np.ring_color, np.bg_color_from, np.bg_color_to, np.tier_label
  FROM public.networking_profiles np
  LEFT JOIN public.profiles p ON p.id = np.user_id
  WHERE np.connect_code = _code
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_connect_card(text) TO anon, authenticated;