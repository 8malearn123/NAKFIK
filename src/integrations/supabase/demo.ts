/**
 * الوضع التجريبي (Demo mode)
 * --------------------------------------------------------------
 * يسمح بتجربة المنصة بحسابات الديمو حتى لو لم تكن قاعدة البيانات متاحة.
 * عند تسجيل الدخول بأحد حسابات الديمو نحاول أولاً الخادم الحقيقي؛ إن لم يكن
 * متاحاً (أو رفض الحساب) نفعّل الوضع التجريبي ونخدم جميع طلبات Supabase
 * (المصادقة، الجداول، التخزين، الدوال) من قاعدة بيانات وهمية داخل المتصفح.
 * تبقى البيانات في localStorage لهذا المتصفح فقط، ويُلغى الوضع عند تسجيل الخروج.
 */

export const DEMO_PASSWORD = "Demo@12345";
const MODE_KEY = "nakfeek-demo-mode";
const DB_KEY = "nakfeek-demo-db-v4";
const REAL_LOGIN_TIMEOUT_MS = 6000;

const ORG_ID = "00000000-0000-4000-a000-000000000001";        // منظم شامل (عام + خاص)
const ORG_PUBLIC_ID = "00000000-0000-4000-a000-000000000002"; // منظم فعاليات عامة
const ORG_PRIVATE_ID = "00000000-0000-4000-a000-000000000003"; // منظم فعاليات خاصة
export const DEMO_USERS = {
  "admin@nakfeek.sa": { id: "00000000-0000-4000-a000-0000000000a1", full_name: "مدير المنصة", account_type: "attendee" },
  "org1@nakfeek.sa": { id: "00000000-0000-4000-a000-0000000000b1", full_name: "منظم شامل تجريبي", account_type: "organizer" },
  "org-public@nakfeek.sa": { id: "00000000-0000-4000-a000-0000000000b2", full_name: "منظم الفعاليات العامة", account_type: "organizer" },
  "org-private@nakfeek.sa": { id: "00000000-0000-4000-a000-0000000000b3", full_name: "منظم الفعاليات الخاصة", account_type: "organizer" },
  "attendee1@nakfeek.sa": { id: "00000000-0000-4000-a000-0000000000c1", full_name: "حاضر تجريبي", account_type: "attendee" },
} as const;
type DemoEmail = keyof typeof DEMO_USERS;

type Row = Record<string, unknown>;
type DB = Record<string, Row[]>;

const safeStorage = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  del(k: string) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

export const isDemoMode = () => !!safeStorage.get(MODE_KEY);
const currentDemoEmail = (): DemoEmail | null => {
  const e = safeStorage.get(MODE_KEY);
  return e && e in DEMO_USERS ? (e as DemoEmail) : null;
};

/* ======================= البيانات الأولية ======================= */

const uuid = () =>
  (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

const daysFromNow = (d: number, hour = 19) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  t.setHours(hour, 0, 0, 0);
  return t.toISOString();
};

function seed(): DB {
  const now = new Date().toISOString();
  const admin = DEMO_USERS["admin@nakfeek.sa"];
  const org = DEMO_USERS["org1@nakfeek.sa"];
  const orgPub = DEMO_USERS["org-public@nakfeek.sa"];
  const orgPriv = DEMO_USERS["org-private@nakfeek.sa"];
  const att = DEMO_USERS["attendee1@nakfeek.sa"];

  const profiles = (Object.keys(DEMO_USERS) as DemoEmail[]).map((email) => ({
    id: DEMO_USERS[email].id, email, full_name: DEMO_USERS[email].full_name,
    account_type: DEMO_USERS[email].account_type, phone: "0500000000", org_name: null,
    avatar_url: null, bio: null, company: null, job_title: null, linkedin_url: null,
    x_handle: null, instagram_handle: null, profile_completed: true, created_at: now, updated_at: now,
  }));

  const event = (id: string, title: string, d: number, status: string, extra: Row = {}, orgId = ORG_ID, ownerId: string = org.id) => ({
    id, title_ar: title, title_en: null, description_ar: "فعالية تجريبية لعرض إمكانيات المنصة.", description_en: null,
    category: "conference", type: "public", status, organization_id: orgId, created_by: ownerId,
    start_date: daysFromNow(d), end_date: daysFromNow(d, 23), registration_deadline: null,
    venue_name: "مركز الملك عبدالعزيز الدولي", venue_address: "الرياض", venue_map_url: null,
    is_online: false, online_link: null, is_free: true, max_attendees: 300, current_attendees_count: 0,
    cover_image_url: null, private_link: null, invite_channels: ["whatsapp"], invite_message_template: null,
    invite_send_mode: "manual", referral_points: 20, share_points: 5, social_hashtags: null,
    social_share_enabled: false, social_share_text: null, rejection_reason: null, created_at: now, updated_at: now,
    ...extra,
  });
  const events = [
    event("00000000-0000-4000-b000-000000000001", "ملتقى الرياض للابتكار", 12, "published", { current_attendees_count: 2 }),
    event("00000000-0000-4000-b000-000000000002", "ورشة تصميم تجربة المستخدم", 25, "pending_review", { category: "workshop", max_attendees: 40 }),
    event("00000000-0000-4000-b000-000000000003", "لقاء رواد الأعمال", -20, "completed", { category: "meetup" }),
    event("00000000-0000-4000-b000-000000000011", "مهرجان جدة للتقنية", 9, "published", { current_attendees_count: 1, venue_name: "سوبر دوم جدة", venue_address: "جدة", max_attendees: 1500 }, ORG_PUBLIC_ID, orgPub.id),
    event("00000000-0000-4000-b000-000000000012", "مؤتمر التسويق الرقمي", 33, "published", { is_free: false, venue_name: "فندق الريتز كارلتون", max_attendees: 500 }, ORG_PUBLIC_ID, orgPub.id),
    event("00000000-0000-4000-b000-000000000013", "ندوة ريادة الأعمال النسائية", 45, "draft", { category: "seminar" }, ORG_PUBLIC_ID, orgPub.id),
  ];

  const inv = (id: string, title: string, d: number, extra: Row = {}, orgId = ORG_ID, ownerId: string = org.id) => ({
    id, title, organization_id: orgId, created_by: ownerId, event_date: daysFromNow(d, 20), status: "active",
    scope: "private", category: "wedding", formality: "formal", host_name: "عائلة الأحمد",
    venue_name: "قاعة الفيصلية", venue_address: "الرياض", venue_map_url: null, custom_message: "يسعدنا حضوركم ومشاركتنا فرحتنا",
    dress_code: null, theme_color: "#492C5A", accent_color: "#CC8E3D", text_color: "#FFFFFF", font_family: "Cairo",
    body_font: "Cairo", layout_style: "classic", ornament_style: "none", template_key: null, use_custom_template: false,
    custom_template_url: null, cover_image_url: null, background_image_url: null, name_overlay: {},
    allow_companions: true, max_companions: 2, max_attendees: 200, contact_email: null, contact_phone: null,
    contact_whatsapp: null, gift_account_holder: null, gift_bank_name: null, gift_iban: null, gift_notes: null,
    created_at: now, updated_at: now, ...extra,
  });
  const invitations = [
    inv("00000000-0000-4000-c000-000000000001", "حفل زفاف خالد وسارة", 18),
    inv("00000000-0000-4000-c000-000000000002", "عشاء الشركاء السنوي", 6, { category: "corporate", host_name: "نكفيك التجارية" }),
    inv("00000000-0000-4000-c000-000000000011", "حفل تخرج دفعة 2026", 14, { category: "graduation", host_name: "عائلة القحطاني", venue_name: "قاعة الملكية" }, ORG_PRIVATE_ID, orgPriv.id),
    inv("00000000-0000-4000-c000-000000000012", "ملكة عبدالله وريم", 27, { host_name: "عائلة الشمري" }, ORG_PRIVATE_ID, orgPriv.id),
    inv("00000000-0000-4000-c000-000000000013", "اجتماع مجلس الإدارة", 4, { category: "corporate", formality: "business", host_name: "شركة الأفق", venue_name: "برج المملكة" }, ORG_PRIVATE_ID, orgPriv.id),
  ];
  const names = ["أحمد العتيبي", "نورة القحطاني", "فهد الشمري", "ريم الدوسري", "سلمان الحربي", "هند الزهراني", "ماجد المطيري", "لمى السبيعي"];
  const statuses = ["confirmed", "confirmed", "confirmed", "declined", "pending", "pending", "confirmed", "pending"];
  const guests = invitations.flatMap((iv, k) =>
    names.map((n, i) => ({
      id: uuid(), invitation_id: iv.id, guest_name: n, guest_phone: `05${(k * 8 + i + 10000000).toString().slice(0, 8)}`,
      guest_email: null, rsvp_status: statuses[(i + k) % statuses.length], companions_count: i % 3 === 0 ? 1 : 0,
      token: uuid().replace(/-/g, ""), invite_sent_at: now, confirmed_at: statuses[(i + k) % statuses.length] === "confirmed" ? now : null,
      checked_in_at: null, notes: null, created_at: now, updated_at: now,
    })),
  );

  const ticketId = "00000000-0000-4000-d000-000000000001";
  const ticket = (id: string, eventId: string, name: string, extra: Row = {}) => ({
    id, event_id: eventId, name_ar: name, name_en: null, type: "free", price: 0, currency: "SAR",
    quantity_total: 300, quantity_sold: 0, is_active: true, is_for_sale: true, visibility: "public", description: null,
    allow_companions: false, max_companions: 0, attachments: [], badge_color: null, badge_logo_url: null, badge_symbol: null,
    badge_tier_label: null, sale_start: null, sale_end: null, created_at: now, ...extra,
  });
  const organization = (id: string, name: string, ownerId: string, email: string, planScope: string) => ({
    id, name, owner_id: ownerId, subscription_plan: "pro", plan_scope: planScope, is_active: true,
    description: "حساب منظم تجريبي", logo_url: "/favicon.svg", cover_image_url: null, brand_color: "#492C5A", phone: "0500000000",
    public_email: email, address: "الرياض", website: null, commercial_register: "1010000000", tax_number: "300000000000003",
    bank_name: "البنك التجريبي", iban: "SA0000000000000000000000", bank_account_holder: name, billing_name: null, billing_address: null, billing_tax_number: null,
    instagram_url: null, linkedin_url: null, snapchat_url: null, tiktok_url: null, twitter_url: null,
    privacy_policy: null, refund_policy: null, terms_text: null, subscription_expires_at: daysFromNow(300), created_at: now, updated_at: now,
  });
  const subscription = (accountId: string, used: number) => ({
    id: uuid(), account_id: accountId, account_type: "organizer", plan_id: PRO_PLAN_ID, status: "active",
    billing_cycle: "yearly", amount: 4990, currency: "SAR", events_quota: 50, events_used: used,
    current_period_start: now, current_period_end: daysFromNow(300), expires_at: daysFromNow(300),
    cancel_at_period_end: false, cancelled_at: null, created_at: now, updated_at: now,
  });
  const PRO_PLAN_ID = "00000000-0000-4000-e000-000000000002";
  return {
    profiles,
    user_roles: [
      { id: uuid(), user_id: admin.id, role: "super_admin" },
      { id: uuid(), user_id: org.id, role: "organizer" },
      { id: uuid(), user_id: orgPub.id, role: "organizer" },
      { id: uuid(), user_id: orgPriv.id, role: "organizer" },
    ],
    organizations: [
      organization(ORG_ID, "منظمة تجريبية شاملة", org.id, "org1@nakfeek.sa", "both"),
      organization(ORG_PUBLIC_ID, "شركة الفعاليات العامة", orgPub.id, "org-public@nakfeek.sa", "public"),
      organization(ORG_PRIVATE_ID, "مؤسسة المناسبات الخاصة", orgPriv.id, "org-private@nakfeek.sa", "private"),
    ],
    events,
    tickets: [
      ticket(ticketId, events[0].id, "دخول عام", { quantity_sold: 2 }),
      ticket("00000000-0000-4000-d000-000000000011", "00000000-0000-4000-b000-000000000011", "دخول عام", { quantity_total: 1500, quantity_sold: 1 }),
      ticket("00000000-0000-4000-d000-000000000012", "00000000-0000-4000-b000-000000000012", "تذكرة VIP", { type: "vip", price: 350, quantity_total: 100 }),
    ],
    registrations: [
      { id: uuid(), event_id: events[0].id, attendee_id: att.id, ticket_id: ticketId, status: "confirmed", payment_status: "free", amount_paid: 0, qr_code: "DEMO-QR-1", registered_at: now, checked_in_at: null },
      { id: uuid(), event_id: events[2].id, attendee_id: att.id, ticket_id: null, status: "checked_in", payment_status: "free", amount_paid: 0, qr_code: "DEMO-QR-2", registered_at: now, checked_in_at: now },
      { id: uuid(), event_id: events[3].id, attendee_id: att.id, ticket_id: "00000000-0000-4000-d000-000000000011", status: "confirmed", payment_status: "free", amount_paid: 0, qr_code: "DEMO-QR-3", registered_at: now, checked_in_at: null },
    ],
    account_subscriptions: [subscription(org.id, 3), subscription(orgPub.id, 3), subscription(orgPriv.id, 3)],
    private_invitations: invitations,
    private_invitation_guests: guests,
    subscription_plans: [
      { id: uuid(), name_ar: "الأساسية", name_en: "Basic", target_type: "organizer", price: 0, price_monthly: 0, price_yearly: 0, price_per_event: 0, validity_months: 12, is_active: true, display_order: 1, features: [], max_events: 3, max_attendees_per_event: 100, max_total_attendees: null, max_reservations_per_month: null, whatsapp_quota: 100, badge_color: null, description_ar: null, description_en: null, created_at: now, updated_at: now },
      { id: PRO_PLAN_ID, name_ar: "الاحترافية", name_en: "Pro", target_type: "organizer", price: 499, price_monthly: 499, price_yearly: 4990, price_per_event: 0, validity_months: 12, is_active: true, display_order: 2, features: [], max_events: null, max_attendees_per_event: 1000, max_total_attendees: null, max_reservations_per_month: null, whatsapp_quota: 2000, badge_color: "#CC8E3D", description_ar: null, description_en: null, created_at: now, updated_at: now },
    ],
  };
}

let dbCache: DB | null = null;
const loadDB = (): DB => {
  if (dbCache) return dbCache;
  const raw = safeStorage.get(DB_KEY);
  try { dbCache = raw ? JSON.parse(raw) : seed(); } catch { dbCache = seed(); }
  return dbCache!;
};
const saveDB = () => dbCache && safeStorage.set(DB_KEY, JSON.stringify(dbCache));
const table = (name: string) => (loadDB()[name] ??= []);

/* ======================= المصادقة ======================= */

const b64url = (o: unknown) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

const demoUser = (email: DemoEmail) => {
  const u = DEMO_USERS[email];
  return {
    id: u.id, aud: "authenticated", role: "authenticated", email, phone: "",
    email_confirmed_at: "2026-01-01T00:00:00Z", confirmed_at: "2026-01-01T00:00:00Z", last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"], demo: true },
    user_metadata: { full_name: u.full_name, account_type: u.account_type },
    identities: [], created_at: "2026-01-01T00:00:00Z", updated_at: new Date().toISOString(), is_anonymous: false,
  };
};

const demoSession = (email: DemoEmail) => {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const user = demoUser(email);
  const token = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: user.id, email, role: "authenticated", aud: "authenticated", exp, iat: exp - 604800, session_id: "demo" })}.demo`;
  return { access_token: token, token_type: "bearer", expires_in: 604800, expires_at: exp, refresh_token: `demo-${email}`, user };
};

/* ======================= محاكي PostgREST ======================= */

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? "" : JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json", ...headers },
  });

const parseValue = (v: string): unknown => {
  if (v === "null") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  return v.replace(/^"(.*)"$/, "$1");
};

const cmp = (a: unknown, b: unknown) => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  const na = Number(a), nb = Number(b);
  if (typeof a !== "boolean" && !isNaN(na) && !isNaN(nb) && String(a).trim() !== "" && String(b).trim() !== "") return na - nb;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
};

const getPath = (row: Row, col: string): unknown => {
  // يدعم col->key و col->>key
  const m = col.split(/->>?/);
  let v: unknown = row[m[0]];
  for (const k of m.slice(1)) v = v && typeof v === "object" ? (v as Row)[k] : undefined;
  return v;
};

function matchCond(row: Row, col: string, expr: string): boolean {
  let negate = false;
  if (expr.startsWith("not.")) { negate = true; expr = expr.slice(4); }
  const dot = expr.indexOf(".");
  const op = expr.slice(0, dot);
  const raw = expr.slice(dot + 1);
  const v = getPath(row, col);
  let r: boolean;
  switch (op) {
    case "eq": r = cmp(v, parseValue(raw)) === 0 && v != null; break;
    case "neq": r = v == null || cmp(v, parseValue(raw)) !== 0; break;
    case "gt": r = v != null && cmp(v, raw) > 0; break;
    case "gte": r = v != null && cmp(v, raw) >= 0; break;
    case "lt": r = v != null && cmp(v, raw) < 0; break;
    case "lte": r = v != null && cmp(v, raw) <= 0; break;
    case "is": r = raw === "null" ? v == null : v === parseValue(raw); break;
    case "in": {
      const list = raw.replace(/^\(|\)$/g, "").split(",").map((x) => String(parseValue(x.trim())));
      r = v != null && list.includes(String(v)); break;
    }
    case "like": case "ilike": {
      const re = new RegExp("^" + raw.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/[*%]/g, ".*") + "$", op === "ilike" ? "i" : "");
      r = v != null && re.test(String(v)); break;
    }
    case "cs": {
      const want = raw.replace(/^[{[]|[}\]]$/g, "").split(",").map((x) => x.replace(/"/g, "").trim()).filter(Boolean);
      r = Array.isArray(v) && want.every((w) => (v as unknown[]).map(String).includes(w)); break;
    }
    case "ov": {
      const want = raw.replace(/^[{[]|[}\]]$/g, "").split(",").map((x) => x.replace(/"/g, "").trim());
      r = Array.isArray(v) && want.some((w) => (v as unknown[]).map(String).includes(w)); break;
    }
    default: r = true;
  }
  return negate ? !r : r;
}

// تقسيم "a.eq.1,and(b.eq.2,c.eq.3)" على مستوى الأقواس العليا
const splitTop = (s: string) => {
  const out: string[] = []; let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
};

function matchLogic(row: Row, kind: "or" | "and", inner: string): boolean {
  const parts = splitTop(inner.replace(/^\(|\)$/g, ""));
  const res = parts.map((p) => {
    const m = p.match(/^(or|and)\((.*)\)$/);
    if (m) return matchLogic(row, m[1] as "or" | "and", m[2]);
    const i = p.indexOf(".");
    return matchCond(row, p.slice(0, i), p.slice(i + 1));
  });
  return kind === "or" ? res.some(Boolean) : res.every(Boolean);
}

const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

function filterRows(rows: Row[], params: URLSearchParams): Row[] {
  return rows.filter((row) => {
    for (const [k, v] of params.entries()) {
      if (RESERVED.has(k)) continue;
      if (k === "or" || k === "and") { if (!matchLogic(row, k, v)) return false; continue; }
      if (k.endsWith(".or") || k.endsWith(".and")) continue; // فلاتر على الجداول المضمّنة — تُتجاهل
      if (k.includes(".")) continue;
      if (!matchCond(row, k, v)) return false;
    }
    return true;
  });
}

/* --- تضمين الجداول المرتبطة: organization:organizations(id,name) --- */

const singular = (t: string) => t.replace(/ies$/, "y").replace(/s$/, "");

function parseSelect(sel: string) {
  const items = splitTop(sel.replace(/\s+/g, ""));
  return items.map((it) => {
    const m = it.match(/^(?:([\w]+):)?([\w]+)(?:![\w]+)*\((.*)\)$/);
    if (!m) return null;
    return { alias: m[1] || m[2], table: m[2], inner: m[3] };
  }).filter(Boolean) as { alias: string; table: string; inner: string }[];
}

function embed(rows: Row[], parentTable: string, sel: string | null): Row[] {
  if (!sel) return rows;
  const rels = parseSelect(sel);
  if (!rels.length) return rows.map((r) => ({ ...r }));
  const db = loadDB();
  return rows.map((row) => {
    const out: Row = { ...row };
    for (const rel of rels) {
      const target = db[rel.table] ?? [];
      const fk = `${singular(rel.table)}_id`;
      const aliasFk = `${rel.alias}_id`;
      if (row[aliasFk] !== undefined || row[fk] !== undefined) {
        const id = row[aliasFk] ?? row[fk];
        const found = target.find((t) => t.id === id) ?? null;
        out[rel.alias] = found ? embed([found], rel.table, rel.inner)[0] : null;
      } else {
        const back = `${singular(parentTable)}_id`;
        const kids = target.filter((t) => t[back] === row.id);
        out[rel.alias] = embed(kids, rel.table, rel.inner);
      }
    }
    return out;
  });
}

function handleRest(method: string, url: URL, headers: Headers, body: string | null): Response {
  const path = url.pathname.replace(/^.*\/rest\/v1\//, "");
  if (path.startsWith("rpc/")) return handleRpc(path.slice(4), body);

  const name = path.split("/")[0];
  const rows = table(name);
  const params = url.searchParams;
  const prefer = headers.get("Prefer") ?? "";
  const wantsObject = (headers.get("Accept") ?? "").includes("vnd.pgrst.object");
  const returnRep = prefer.includes("return=representation");

  const respond = (data: Row[], total = data.length) => {
    const range = `0-${Math.max(0, data.length - 1)}/${total}`;
    if (method === "HEAD") return new Response(null, { status: 200, headers: { "Content-Range": range } });
    if (wantsObject) {
      if (data.length !== 1) return json({ code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${data.length} rows`, hint: null }, 406);
      return json(data[0], 200, { "Content-Range": range });
    }
    return json(data, 200, { "Content-Range": range });
  };

  if (method === "GET" || method === "HEAD") {
    let res = filterRows(rows, params);
    const order = params.get("order");
    if (order) {
      const keys = order.split(",").map((o) => { const [c, dir, nulls] = o.split("."); return { c, desc: dir === "desc", nulls }; });
      res = [...res].sort((a, b) => {
        for (const k of keys) { const d = cmp(a[k.c], b[k.c]); if (d) return k.desc ? -d : d; }
        return 0;
      });
    }
    const total = res.length;
    let from = Number(params.get("offset") ?? 0);
    let to = params.get("limit") ? from + Number(params.get("limit")) - 1 : Infinity;
    const rangeH = headers.get("Range");
    if (rangeH) { const [a, b] = rangeH.split("-").map(Number); from = a; to = b; }
    res = res.slice(from, to === Infinity ? undefined : to + 1);
    return respond(embed(res, name, params.get("select")), total);
  }

  const now = new Date().toISOString();
  if (method === "POST") {
    const input = body ? JSON.parse(body) : [];
    const list: Row[] = Array.isArray(input) ? input : [input];
    const upsert = prefer.includes("resolution=merge-duplicates") || prefer.includes("resolution=ignore-duplicates");
    const conflict = (params.get("on_conflict") ?? "id").split(",");
    const written: Row[] = [];
    for (const item of list) {
      const existing = upsert ? rows.find((r) => conflict.every((c) => item[c] !== undefined && r[c] === item[c])) : undefined;
      if (existing) {
        if (!prefer.includes("ignore-duplicates")) Object.assign(existing, item, { updated_at: now });
        written.push(existing);
      } else {
        const row: Row = { id: uuid(), created_at: now, updated_at: now, ...item };
        rows.push(row);
        written.push(row);
      }
    }
    saveDB();
    return returnRep ? respond(embed(written, name, params.get("select"))) : new Response(null, { status: 201 });
  }
  if (method === "PATCH") {
    const patch = body ? JSON.parse(body) : {};
    const hits = filterRows(rows, params);
    hits.forEach((r) => Object.assign(r, patch, { updated_at: now }));
    saveDB();
    return returnRep ? respond(embed(hits, name, params.get("select"))) : new Response(null, { status: 204 });
  }
  if (method === "DELETE") {
    const hits = filterRows(rows, params);
    loadDB()[name] = rows.filter((r) => !hits.includes(r));
    saveDB();
    return returnRep ? respond(hits) : new Response(null, { status: 204 });
  }
  return json({ message: "Unsupported in demo mode" }, 405);
}

function handleRpc(fn: string, body: string | null): Response {
  const args = body ? JSON.parse(body) : {};
  const db = loadDB();
  switch (fn) {
    case "has_role":
      return json(db.user_roles.some((r) => r.user_id === args._user_id && r.role === args._role));
    case "find_user_id_by_email":
      return json(db.profiles.find((p) => String(p.email).toLowerCase() === String(args._email ?? args.email ?? "").toLowerCase())?.id ?? null);
    case "get_invitation_by_token": {
      const g = db.private_invitation_guests.find((x) => x.token === (args._token ?? args.token));
      if (!g) return json(null);
      return json({ ...g, guest: g, invitation: db.private_invitations.find((i) => i.id === g.invitation_id) ?? null });
    }
    default:
      return json(null);
  }
}

/* ======================= نقطة الدخول ======================= */

const urlOf = (input: RequestInfo | URL) =>
  new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);

async function readBody(input: RequestInfo | URL, init?: RequestInit): Promise<string | null> {
  if (init?.body != null) return typeof init.body === "string" ? init.body : null;
  if (input instanceof Request) { try { return await input.clone().text(); } catch { return null; } }
  return null;
}

function handleDemo(method: string, url: URL, headers: Headers, body: string | null): Response {
  const p = url.pathname;
  const email = currentDemoEmail();

  if (p.includes("/auth/v1/")) {
    if (p.endsWith("/logout")) { disableDemoMode(); return new Response(null, { status: 204 }); }
    if (!email) return json({ code: 401, error_code: "session_not_found", msg: "Session not found" }, 401);
    if (p.endsWith("/token")) return json(demoSession(email));
    if (p.endsWith("/user")) return json(demoUser(email));
    if (p.endsWith("/signup") || p.endsWith("/recover"))
      return json({ code: 400, error_code: "demo_mode", msg: "غير متاح في الوضع التجريبي" }, 400);
    return json({});
  }
  if (p.includes("/rest/v1/")) return handleRest(method, url, headers, body);
  if (p.includes("/storage/v1/")) {
    if (method === "GET") return json([]);
    return json({ Key: p.replace(/^.*\/object\//, ""), Id: uuid() });
  }
  if (p.includes("/functions/v1/")) return json({ success: true, demo: true });
  return json({});
}

export function disableDemoMode() {
  safeStorage.del(MODE_KEY);
}

/** fetch بديل يمرّر الطلبات للخادم الحقيقي، أو للمحاكي في الوضع التجريبي */
export function createDemoAwareFetch(supabaseUrl: string): typeof fetch {
  const base = (() => { try { return new URL(supabaseUrl).origin; } catch { return supabaseUrl; } })();
  return async (input, init) => {
    const url = urlOf(input);
    if (url.origin !== base) return fetch(input, init);

    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));

    // تسجيل الدخول بحساب ديمو: الخادم الحقيقي أولاً، ثم الوضع التجريبي
    if (url.pathname.endsWith("/auth/v1/token") && url.searchParams.get("grant_type") === "password") {
      const body = await readBody(input, init);
      let creds: { email?: string; password?: string } = {};
      try { creds = JSON.parse(body ?? "{}"); } catch { /* ignore */ }
      const email = String(creds.email ?? "").trim().toLowerCase();
      if (email in DEMO_USERS && creds.password === DEMO_PASSWORD) {
        if (!isDemoMode()) {
          try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), REAL_LOGIN_TIMEOUT_MS);
            const real = await fetch(input, { ...init, signal: ctrl.signal });
            clearTimeout(timer);
            if (real.ok) return real;
          } catch { /* الخادم غير متاح */ }
        }
        safeStorage.set(MODE_KEY, email);
        return json(demoSession(email as DemoEmail));
      }
      disableDemoMode();
      return fetch(input, init);
    }

    if (isDemoMode()) return handleDemo(method, url, headers, await readBody(input, init));
    return fetch(input, init);
  };
}
