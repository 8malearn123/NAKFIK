// Organization profile completeness check - required before creating events.

export interface OrgLike {
  id?: string;
  name?: string | null;
  logo_url?: string | null;
  description?: string | null;
  phone?: string | null;
  public_email?: string | null;
  address?: string | null;
  commercial_register?: string | null;
  tax_number?: string | null;
  bank_name?: string | null;
  iban?: string | null;
  bank_account_holder?: string | null;
  is_active?: boolean | null;
}

export const REQUIRED_ORG_FIELDS: { key: keyof OrgLike; label: string }[] = [
  { key: "name", label: "اسم المؤسسة" },
  { key: "logo_url", label: "شعار المؤسسة" },
  { key: "description", label: "نبذة تعريفية" },
  { key: "phone", label: "رقم الجوال" },
  { key: "public_email", label: "البريد الإلكتروني العام" },
  { key: "address", label: "العنوان" },
  { key: "commercial_register", label: "السجل التجاري" },
  { key: "tax_number", label: "الرقم الضريبي" },
  { key: "bank_name", label: "اسم البنك" },
  { key: "iban", label: "رقم الآيبان" },
  { key: "bank_account_holder", label: "اسم صاحب الحساب البنكي" },
];

export function getMissingOrgFields(org: OrgLike | null | undefined) {
  if (!org) return REQUIRED_ORG_FIELDS;
  return REQUIRED_ORG_FIELDS.filter(f => {
    const v = (org as any)[f.key];
    return !v || (typeof v === "string" && v.trim() === "");
  });
}

export function isOrgReady(org: OrgLike | null | undefined) {
  if (!org) return false;
  if (org.is_active === false) return false;
  return getMissingOrgFields(org).length === 0;
}
