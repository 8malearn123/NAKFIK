import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate, formatNumber } from "@/lib/format";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import StatCard from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import {
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

export default function MyConnections({ embedded = false }: { embedded?: boolean }) {
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
      [t("pgNetworking.connections.csvDate")]: formatDate(r.scanned_at),
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

  const content = (
    <div className="space-y-6">
      <PageHeader
        title={t("pgNetworking.connections.title")}
        description={t("pgNetworking.connections.subtitle")}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/my/profile/networking">
                <QrCode className="h-4 w-4" /> {t("pgNetworking.connections.myCard")}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/my/notifications">
                <Bell className="h-4 w-4" /> {t("pgNetworking.connections.notifications")}
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        <StatCard className="border px-4 sm:px-6" label={t("pgNetworking.connections.statContacts")} value={formatNumber(rows.length)} icon={Users} />
        <StatCard className="border px-4 sm:px-6" label={t("pgNetworking.connections.statEvents")} value={formatNumber(events.length)} icon={CalendarIcon} />
        <StatCard className="col-span-2 border px-4 sm:col-span-1 sm:px-6" label={t("pgNetworking.connections.statCompanies")} value={formatNumber(companies)} icon={Building2} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("pgNetworking.connections.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ps-3 pe-9"
          />
        </div>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="h-10 w-auto min-w-[150px] flex-1 gap-2 font-medium sm:flex-none">
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
          <SelectTrigger className="h-10 w-auto min-w-[130px] flex-1 gap-2 font-medium sm:flex-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{t("pgNetworking.connections.sortRecent")}</SelectItem>
            <SelectItem value="name">{t("pgNetworking.connections.sortName")}</SelectItem>
            <SelectItem value="company">{t("pgNetworking.connections.sortCompany")}</SelectItem>
          </SelectContent>
        </Select>
        {filtered.length > 0 && (
          <Button onClick={exportCsv} variant="outline" className="w-full sm:w-auto">
            <Download className="h-4 w-4" /> {t("pgNetworking.connections.exportExcel")}
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-card shadow-soft" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border bg-card shadow-soft">
          <EmptyState
            icon={Users}
            title={t("pgNetworking.connections.emptyState")}
            action={<Button asChild><Link to="/events">{t("pgNetworking.connections.browseEvents")}</Link></Button>}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card shadow-soft">
          <EmptyState
            icon={Search}
            title={t("pgNetworking.connections.noResults")}
            action={<Button variant="outline" size="sm" onClick={() => { setQuery(""); setEventFilter("all"); }}>{lang === "ar" ? "إعادة تعيين" : "Reset"}</Button>}
          />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {filtered.map((r) => {
            const wa = waLink(r.contact.whatsapp);
            return (
              <article key={r.id} className="flex flex-col rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-full bg-secondary font-bold text-primary">
                    {r.contact.avatar_url ? (
                      <img
                        src={r.contact.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      r.contact.full_name?.[0] || "?"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold leading-6">{r.contact.full_name || t("pgNetworking.connections.noName")}</p>
                    {r.contact.job_title && (
                      <p className="truncate text-[13px] leading-5 text-muted-foreground">
                        {r.contact.job_title}
                      </p>
                    )}
                    <div className="mt-2 space-y-1 text-[13px] leading-5 text-muted-foreground">
                      {r.contact.company && (
                        <p className="flex items-center gap-2">
                          <Building2 className="h-[15px] w-[15px] flex-none opacity-70" />
                          <span className="truncate">{r.contact.company}</span>
                        </p>
                      )}
                      {r.event_title && (
                        <p className="flex items-center gap-2">
                          <CalendarIcon className="h-[15px] w-[15px] flex-none opacity-70" />
                          <span className="truncate">{r.event_title}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {(wa || r.contact.email_public || r.contact.connect_code) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {wa && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={wa} target="_blank" rel="noreferrer">
                          <MessageCircle className="h-[15px] w-[15px]" />
                          {t("pgNetworking.connections.whatsapp")}
                        </a>
                      </Button>
                    )}
                    {r.contact.email_public && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`mailto:${r.contact.email_public}`}>
                          <Mail className="h-[15px] w-[15px]" />
                          {t("pgNetworking.connections.email")}
                        </a>
                      </Button>
                    )}
                    {r.contact.connect_code && (
                      <Button size="sm" variant="outline" asChild>
                        <Link
                          to={`/connect/${r.contact.connect_code}`}
                          target="_blank"
                        >
                          <ExternalLink className="h-[15px] w-[15px]" />
                          {t("pgNetworking.connections.card")}
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  // داخل نافذة منبثقة (من صفحة الملف الشخصي) بدون شريط التنقل والتذييل
  if (embedded) return <div dir={dir}>{content}</div>;

  return (
    <div className="flex min-h-screen flex-col bg-background font-cairo" dir={dir}>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-24">{content}</main>
      <Footer />
    </div>
  );
}
