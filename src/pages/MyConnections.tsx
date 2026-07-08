import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Navbar from "@/components/landing/Navbar";
import {
  Loader2,
  Download,
  ExternalLink,
  Users,
  Bell,
  Search,
  MessageCircle,
  Mail,
  QrCode,
  Calendar as CalendarIcon,
  Building2,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ConnectionRow {
  id: string;
  scanned_at: string;
  event_id: string | null;
  scanned_id: string;
  contact: {
    full_name: string | null;
    avatar_url: string | null;
    job_title?: string | null;
    company?: string | null;
    connect_code?: string | null;
    whatsapp?: string | null;
    email_public?: string | null;
  };
  event_title?: string | null;
}

export default function MyConnections() {
  const { user } = useAuth();
  const { t, lang, dir } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConnectionRow[]>([]);
  const [query, setQuery] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "name" | "company">("recent");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: conns } = await supabase
        .from("networking_connections")
        .select("id, scanned_at, event_id, scanned_id")
        .eq("scanner_id", user.id)
        .order("scanned_at", { ascending: false });

      if (!conns?.length) {
        setLoading(false);
        return;
      }

      const ids = conns.map((c) => c.scanned_id);
      const eventIds = conns.map((c) => c.event_id).filter(Boolean) as string[];

      const [{ data: profiles }, { data: nets }, { data: events }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids),
        supabase
          .from("networking_profiles")
          .select("user_id, job_title, company, connect_code, whatsapp, email_public")
          .in("user_id", ids),
        eventIds.length
          ? supabase.from("events").select("id, title_ar").in("id", eventIds)
          : Promise.resolve({ data: [] as any }),
      ]);

      const result: ConnectionRow[] = conns.map((c) => {
        const p = profiles?.find((pp) => pp.id === c.scanned_id);
        const n = nets?.find((nn) => nn.user_id === c.scanned_id);
        const e = events?.find((ee: any) => ee.id === c.event_id);
        return {
          ...c,
          contact: { ...(p as any), ...(n as any) },
          event_title: e?.title_ar || null,
        };
      });
      setRows(result);
      setLoading(false);
    })();
  }, [user]);

  const events = useMemo(() => {
    const set = new Map<string, string>();
    rows.forEach((r) => {
      if (r.event_id) set.set(r.event_id, r.event_title || t("pgNetworking.connections.eventFallback"));
    });
    return Array.from(set.entries());
  }, [rows, t]);

  const companies = useMemo(
    () => new Set(rows.map((r) => r.contact.company).filter(Boolean)).size,
    [rows]
  );

  const filtered = useMemo(() => {
    let out = rows;
    if (eventFilter !== "all") {
      out = out.filter((r) =>
        eventFilter === "none" ? !r.event_id : r.event_id === eventFilter
      );
    }
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter((r) =>
        [r.contact.full_name, r.contact.company, r.contact.job_title, r.contact.email_public]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q))
      );
    }
    out = [...out];
    if (sort === "name")
      out.sort((a, b) => (a.contact.full_name || "").localeCompare(b.contact.full_name || "", lang));
    else if (sort === "company")
      out.sort((a, b) => (a.contact.company || "").localeCompare(b.contact.company || "", lang));
    else out.sort((a, b) => +new Date(b.scanned_at) - +new Date(a.scanned_at));
    return out;
  }, [rows, query, eventFilter, sort, lang]);

  const exportCsv = () => {
    const data = filtered.map((r) => ({
      [t("pgNetworking.connections.csvName")]: r.contact.full_name,
      [t("pgNetworking.connections.csvJobTitle")]: r.contact.job_title,
      [t("pgNetworking.connections.csvCompany")]: r.contact.company,
      [t("pgNetworking.connections.csvWhatsapp")]: r.contact.whatsapp,
      [t("pgNetworking.connections.csvEmail")]: r.contact.email_public,
      [t("pgNetworking.connections.csvEvent")]: r.event_title,
      [t("pgNetworking.connections.csvDate")]: new Date(r.scanned_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US"),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "my-contacts.xlsx");
  };

  const waLink = (num?: string | null) => {
    if (!num) return null;
    const clean = num.replace(/[^\d]/g, "");
    return `https://wa.me/${clean}`;
  };

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <Navbar />
      <div className="container mx-auto pt-24 pb-12 px-4 max-w-5xl">
        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-l from-primary via-brand-mauve to-brand-purple text-primary-foreground p-6 md:p-8 mb-6 shadow-elegant">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-cairo flex items-center gap-2">
                <Users className="w-7 h-7" /> {t("pgNetworking.connections.title")}
              </h1>
              <p className="opacity-90 mt-1 text-sm">
                {t("pgNetworking.connections.subtitle")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" asChild>
                <Link to="/my/profile/networking">
                  <QrCode className="w-4 h-4 ms-2" /> {t("pgNetworking.connections.myCard")}
                </Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link to="/my/notifications">
                  <Bell className="w-4 h-4 ms-2" /> {t("pgNetworking.connections.notifications")}
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{rows.length}</p>
              <p className="text-xs opacity-80">{t("pgNetworking.connections.statContacts")}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{events.length}</p>
              <p className="text-xs opacity-80">{t("pgNetworking.connections.statEvents")}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{companies}</p>
              <p className="text-xs opacity-80">{t("pgNetworking.connections.statCompanies")}</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <Card className="p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("pgNetworking.connections.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ps-3 pe-9"
            />
          </div>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("pgNetworking.connections.allEvents")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("pgNetworking.connections.allEvents")}</SelectItem>
              {events.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
              <SelectItem value="none">{t("pgNetworking.connections.noEvent")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v: any) => setSort(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">{t("pgNetworking.connections.sortRecent")}</SelectItem>
              <SelectItem value="name">{t("pgNetworking.connections.sortName")}</SelectItem>
              <SelectItem value="company">{t("pgNetworking.connections.sortCompany")}</SelectItem>
            </SelectContent>
          </Select>
          {filtered.length > 0 && (
            <Button onClick={exportCsv} variant="outline" size="sm">
              <Download className="w-4 h-4 ms-2" /> {t("pgNetworking.connections.exportExcel")}
            </Button>
          )}
        </Card>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">{t("pgNetworking.connections.emptyState")}</p>
            <Button asChild>
              <Link to="/events">{t("pgNetworking.connections.browseEvents")}</Link>
            </Button>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            {t("pgNetworking.connections.noResults")}
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {filtered.map((r) => {
              const wa = waLink(r.contact.whatsapp);
              return (
                <Card
                  key={r.id}
                  className="p-4 hover:shadow-elegant transition-all border-s-4 border-s-primary/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-brand-mauve flex items-center justify-center font-bold text-primary-foreground overflow-hidden shrink-0">
                      {r.contact.avatar_url ? (
                        <img
                          src={r.contact.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        r.contact.full_name?.[0] || "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{r.contact.full_name || t("pgNetworking.connections.noName")}</p>
                      {r.contact.job_title && (
                        <p className="text-sm text-muted-foreground truncate">
                          {r.contact.job_title}
                        </p>
                      )}
                      {r.contact.company && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" /> {r.contact.company}
                        </p>
                      )}
                      {r.event_title && (
                        <Badge variant="secondary" className="mt-2 text-[10px] gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {r.event_title}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
                    {wa && (
                      <Button size="sm" variant="outline" className="h-8 px-2" asChild>
                        <a href={wa} target="_blank" rel="noreferrer">
                          <MessageCircle className="w-3.5 h-3.5 ms-1 text-brand-teal" />
                          {t("pgNetworking.connections.whatsapp")}
                        </a>
                      </Button>
                    )}
                    {r.contact.email_public && (
                      <Button size="sm" variant="outline" className="h-8 px-2" asChild>
                        <a href={`mailto:${r.contact.email_public}`}>
                          <Mail className="w-3.5 h-3.5 ms-1" />
                          {t("pgNetworking.connections.email")}
                        </a>
                      </Button>
                    )}
                    {r.contact.connect_code && (
                      <Button size="sm" variant="outline" className="h-8 px-2" asChild>
                        <Link
                          to={`/connect/${r.contact.connect_code}`}
                          target="_blank"
                        >
                          <ExternalLink className="w-3.5 h-3.5 ms-1" />
                          {t("pgNetworking.connections.card")}
                        </Link>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
