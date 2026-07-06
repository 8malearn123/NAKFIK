import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  org_name: string | null;
  account_type: string;
  avatar_url: string | null;
  bio: string | null;
  job_title?: string | null;
  company?: string | null;
  linkedin_url?: string | null;
  x_handle?: string | null;
  instagram_handle?: string | null;
  profile_completed?: boolean;
}

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  owner_id: string;
  subscription_plan: string;
  is_active: boolean;
  brand_color: string | null;
  phone: string | null;
  public_email: string | null;
  address: string | null;
  commercial_register: string | null;
  tax_number: string | null;
  bank_name: string | null;
  iban: string | null;
  bank_account_holder: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  loading: boolean;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  organization: null,
  loading: true,
  isSuperAdmin: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data as Profile | null);
    return data as Profile | null;
  };

  const fetchOrganization = async (userId: string) => {
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();
    setOrganization(data as Organization | null);
  };

  const checkSuperAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();
    setIsSuperAdmin(!!data);
  };

  const loadUserData = async (userId: string) => {
    const p = await fetchProfile(userId);
    await Promise.all([
      checkSuperAdmin(userId),
      p?.account_type === "organizer" ? fetchOrganization(userId) : Promise.resolve(),
    ]);
  };

  const refreshProfile = async () => {
    if (user) await loadUserData(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock with async auth callbacks
          setTimeout(async () => {
            await loadUserData(session.user.id);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setOrganization(null);
          setIsSuperAdmin(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setOrganization(null);
    setIsSuperAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, organization, loading, isSuperAdmin, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
