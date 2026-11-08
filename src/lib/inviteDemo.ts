// دعوة تجريبية لصفحة الضيف على /demo/invite — بلا قاعدة بيانات.
// تعرض تجربة الظرف المختوم كاملة في كل مرة تُفتح، والرد يُحفظ في الصفحة فقط ولا يُرسل لأي مكان.

import type { GuestInvitation, InvitationGuest } from "@/components/invitation/types";

export const DEMO_INVITE_TOKEN = "d3a0c7e2-5b1f-4c6e-9a8d-2f7b6c1e4a90";

export const demoInvitation = (): GuestInvitation => {
  const date = new Date();
  date.setDate(date.getDate() + 12);
  date.setHours(20, 30, 0, 0);
  return {
    title: "حفل زفاف عبدالله وسارة",
    host_name: "آل القحطاني",
    event_date: date.toISOString(),
    status: "active",
    custom_message: "حضوركم تاج فرحتنا",
    venue_name: "قاعة الماسة",
    venue_address: "طريق الملك فهد، الرياض",
    venue_map_url: "https://maps.google.com/?q=Riyadh",
    dress_code: "رسمي",
    theme_color: "#7B2C50",
    accent_color: "#D4A574",
    text_color: "#FFFFFF",
    font_family: "Amiri",
    body_font: "Cairo",
    layout_style: "framed",
    ornament_style: "floral",
    background_image_url: null,
    cover_image_url: null,
    design_extras: {},
    use_custom_template: false,
    custom_template_url: null,
    name_overlay: null,
    allow_companions: true,
    max_companions: 2,
    contact_whatsapp: "0500000000",
    contact_phone: null,
    contact_email: null,
    attachments: [],
    gift_options: { types: ["flowers", "box", "cheque"], payment_methods: ["tabby", "tamara"] },
    gift_notes: null,
    reminder_hours_before: 3,
    rescheduled_from: null,
    reschedule_note: null,
    cancel_reason: null,
  };
};

export const demoGuest = (): InvitationGuest => ({
  id: "demo-guest",
  guest_name: "نورة العتيبي",
  token: DEMO_INVITE_TOKEN,
  rsvp_status: "pending",
  companions_count: 0,
  checked_in_at: null,
  confirmed_at: null,
});
