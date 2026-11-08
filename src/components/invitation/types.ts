import type { DesignExtras } from "@/components/design/templates";
import type { NameOverlay } from "@/components/design/CustomTemplateDesigner";

// شكل الدعوة والضيف كما تعيدهما الدالة get_invitation_by_token لصفحة الضيف.

export type InvitationGuest = {
  id?: string;
  token: string;
  guest_name: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
  rsvp_status: string;
  companions_count: number | null;
  checked_in_at: string | null;
  confirmed_at?: string | null;
};

export type GuestInvitation = {
  title: string;
  host_name: string | null;
  event_date: string;
  status: string;
  custom_message: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_map_url: string | null;
  dress_code: string | null;
  theme_color: string | null;
  accent_color: string | null;
  text_color: string | null;
  font_family: string | null;
  body_font: string | null;
  layout_style: string | null;
  ornament_style: string | null;
  background_image_url: string | null;
  cover_image_url: string | null;
  design_extras: DesignExtras | null;
  use_custom_template: boolean | null;
  custom_template_url: string | null;
  name_overlay: NameOverlay | null;
  allow_companions: boolean | null;
  max_companions: number | null;
  contact_whatsapp: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  attachments: unknown;
  gift_options: { types?: string[]; payment_methods?: string[] } | null;
  gift_notes: string | null;
  reminder_hours_before: number | null;
  rescheduled_from: string | null;
  reschedule_note: string | null;
  cancel_reason: string | null;
};

export type InvitationPayload = { guest: InvitationGuest | null; invitation: GuestInvitation | null };
export type RsvpResult = { rsvp_status: string; companions_count: number };
