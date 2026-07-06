import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EffectiveProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  account_type: string;
}

interface EffectiveOrganization {
  id: string;
  name: string;
  owner_id: string;
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
  is_active?: boolean;
}

/**
 * Returns the effective user context — either the real user or the impersonated one.
 * Super admin uses this to view dashboards as if they were the target user.
 */
export function useEffectiveUser() {
  const { user, profile, organization } = useAuth();
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const [effectiveOrg, setEffectiveOrg] = useState<EffectiveOrganization | null>(organization);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isImpersonating || !impersonatedUser) {
      setEffectiveOrg(organization);
      return;
    }

    // When impersonating, fetch the target user's organization
    if (impersonatedUser.account_type === "organizer") {
      setLoading(true);
      supabase
        .from("organizations")
        .select("id, name, owner_id")
        .eq("owner_id", impersonatedUser.id)
        .maybeSingle()
        .then(({ data }) => {
          setEffectiveOrg(data as EffectiveOrganization | null);
          setLoading(false);
        });
    } else {
      setEffectiveOrg(null);
      setLoading(false);
    }
  }, [isImpersonating, impersonatedUser, organization]);

  if (isImpersonating && impersonatedUser) {
    return {
      effectiveUserId: impersonatedUser.id,
      effectiveProfile: impersonatedUser as EffectiveProfile,
      effectiveOrganization: effectiveOrg,
      isImpersonating: true,
      loading,
    };
  }

  return {
    effectiveUserId: user?.id || null,
    effectiveProfile: profile as EffectiveProfile | null,
    effectiveOrganization: organization as EffectiveOrganization | null,
    isImpersonating: false,
    loading: false,
  };
}
