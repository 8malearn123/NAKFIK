import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Sparkles, ExternalLink, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Match {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  company: string | null;
  connect_code: string;
  whatsapp: string | null;
  looking_for: string[];
  expertise: string[];
  score: number;
}

export default function SmartMatch({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const LOOKING_FOR_LABELS: Record<string, string> = {
    partnerships: t("pgEventDetail.lookingForPartnerships"),
    funding: t("pgEventDetail.lookingForFunding"),
    career: t("pgEventDetail.lookingForCareer"),
    jobs: t("pgEventDetail.lookingForJobs"),
    learning: t("pgEventDetail.lookingForLearning"),
  };
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !eventId) return;
    (async () => {
      // 1. Current user's networking profile
      const { data: me } = await supabase
        .from("networking_profiles")
        .select("looking_for, expertise, privacy_level")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!me) { setLoading(false); return; }

      // 2. Other registered attendees
      const { data: regs } = await supabase
        .from("registrations")
        .select("attendee_id")
        .eq("event_id", eventId)
        .neq("attendee_id", user.id);
      const ids = (regs || []).map((r: any) => r.attendee_id);
      if (!ids.length) { setLoading(false); return; }

      const [{ data: profiles }, { data: nets }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids),
        supabase
          .from("networking_profiles")
          .select("user_id, job_title, company, connect_code, whatsapp, looking_for, expertise, privacy_level")
          .in("user_id", ids),
      ]);

      const myLF = new Set((me as any).looking_for || []);
      const myEX = new Set((me as any).expertise || []);

      const computed: Match[] = (nets || [])
        .filter((n: any) => n.privacy_level !== undefined) // visible per RLS
        .map((n: any) => {
          const p = profiles?.find((pp: any) => pp.id === n.user_id);
          const lfOverlap = (n.looking_for || []).filter((x: string) => myLF.has(x)).length;
          const exOverlap = (n.expertise || []).filter((x: string) => myEX.has(x)).length;
          const score = lfOverlap * 2 + exOverlap;
          return {
            user_id: n.user_id,
            full_name: p?.full_name || null,
            avatar_url: p?.avatar_url || null,
            job_title: n.job_title,
            company: n.company,
            connect_code: n.connect_code,
            whatsapp: n.whatsapp,
            looking_for: n.looking_for || [],
            expertise: n.expertise || [],
            score,
          };
        })
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      setMatches(computed);
      setLoading(false);
    })();
  }, [user, eventId]);

  if (loading || matches.length === 0) return null;

  const maxScore = Math.max(...matches.map((m) => m.score), 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-primary/20 p-5"
    >
      <h2 className="font-bold text-foreground mb-1 flex items-center gap-2 font-cairo">
        <Sparkles className="w-5 h-5 text-accent" />
        {t("pgEventDetail.matchTitle")}
      </h2>
      <p className="text-xs text-muted-foreground mb-4">{t("pgEventDetail.matchSubtitle")}</p>
      <div className="space-y-3">
        {matches.map((m) => {
          const dots = Math.min(5, Math.max(1, Math.round((m.score / maxScore) * 5)));
          return (
            <Card key={m.user_id} className="p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold overflow-hidden flex-shrink-0">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (m.full_name?.[0] || t("pgEventDetail.avatarFallback"))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{m.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {m.job_title}{m.company ? ` · ${m.company}` : ""}
                </p>
                {m.looking_for.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {m.looking_for.slice(0, 2).map((lf) => (
                      <Badge key={lf} variant="secondary" className="text-[10px] py-0">
                        {LOOKING_FOR_LABELS[lf] || lf}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-0.5 mt-1.5" title={`${t("pgEventDetail.matchSimilarity")} ${m.score}`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < dots ? "bg-accent" : "bg-muted"}`} />
                  ))}
                  <span className="text-[10px] text-muted-foreground ms-1">{t("pgEventDetail.matchSimilarity")}</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                {m.whatsapp && (
                  <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/${m.whatsapp!.replace(/[^\d]/g, "")}`, "_blank")}>
                    <MessageCircle className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/connect/${m.connect_code}`} target="_blank">
                    <ExternalLink className="w-3.5 h-3.5 ms-1" /> {t("pgEventDetail.matchCard")}
                  </Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}
