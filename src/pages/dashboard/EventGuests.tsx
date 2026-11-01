import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatCard from "@/components/app/StatCard";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime, formatNumber } from "@/lib/format";
import { toast } from "sonner";
import {
  ArrowRight, Upload, Download, Plus, Send, Search, Users, CheckCircle2, Clock, MessageSquare, FileSpreadsheet, MoreHorizontal, TrendingUp, X, Settings as SettingsIcon, Mail, Smartphone,
} from "lucide-react";
import * as XLSX from "xlsx";

interface Guest {
  id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  rsvp_status: string;
  confirmed_at: string | null;
  rsvp_token: string;
  whatsapp_opened_at: string | null;
  invite_sent_at: string | null;
  invite_sent_channels: string[] | null;
  ticket_id: string | null;
  extra_data: Record<string, any> | null;
}

interface TicketOption {
  id: string;
  name_ar: string;
  badge_color: string | null;
  badge_tier_label: string | null;
}

interface EventInfo {
  id: string;
  title_ar: string;
  start_date: string;
  venue_name: string | null;
  invite_channels: string[];
  invite_send_mode: string;
  invite_message_template: string | null;
}

const CHANNEL_LABELS: Record<string, { label: string; icon: any }> = {
  whatsapp: { label: "واتساب", icon: MessageSquare },
  sms: { label: "رسالة نصية", icon: Smartphone },
  email: { label: "بريد إلكتروني", icon: Mail },
};

const statusLabels: Record<string, { label: string; tone: StatusTone }> = {
  not_sent: { label: "لم تُرسل الدعوة", tone: "neutral" },
  invited: { label: "تم الإرسال", tone: "primary" },
  confirmed: { label: "تم التأكيد", tone: "success" },
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "confirmed", label: "مؤكدون" },
  { key: "pending", label: "بانتظار الرد" },
  { key: "not_sent", label: "لم تُرسل" },
];

const TEMPLATE_VARS = ["name", "title", "date", "time", "venue", "link"];

// العدد مع معدوده بالصيغة الصحيحة: ضيف واحد، ضيفين، 3 ضيوف، 11 ضيفاً، 100 ضيف
const countOf = (n: number, [one, two, few, many]: [string, string, string, string]) => {
  const tens = n % 100;
  if (n === 1) return `${one} واحد`;
  if (n === 2) return two;
  if (tens >= 3 && tens <= 10) return `${formatNumber(n)} ${few}`;
  if (tens >= 11) return `${formatNumber(n)} ${many}`;
  return `${formatNumber(n)} ${one}`;
};
const guestCount = (n: number) => countOf(n, ["ضيف", "ضيفين", "ضيوف", "ضيفاً"]);
const fieldCount = (n: number) => countOf(n, ["حقل", "حقلان", "حقول", "حقلاً"]);

const ticketLabel = (t: TicketOption) =>
  t.badge_tier_label && t.badge_tier_label !== t.name_ar ? `${t.badge_tier_label}، ${t.name_ar}` : t.name_ar;

const tileClass = (active: boolean) =>
  `rounded-xl p-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-secondary text-primary ring-2 ring-primary" : "bg-muted/50 text-muted-foreground hover:bg-secondary"}`;

const EventGuests = () => {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addTicketId, setAddTicketId] = useState<string>("");
  const [bulkTicketId, setBulkTicketId] = useState<string>("");
  const [tickets, setTickets] = useState<TicketOption[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<{ name: string; phone: string; email?: string; valid: boolean; error?: string }[] | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [draftChannels, setDraftChannels] = useState<string[]>([]);
  const [draftMode, setDraftMode] = useState<string>("manual");
  const [draftTemplate, setDraftTemplate] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const baseUrl = window.location.origin;

  const loadData = useCallback(async () => {
    if (!eventId) return;
    const [{ data: evt }, { data: guestList }, { data: ticketList }] = await Promise.all([
      supabase.from("events").select("id, title_ar, start_date, venue_name, invite_channels, invite_send_mode, invite_message_template").eq("id", eventId).single(),
      supabase.from("event_guests").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
      supabase.from("tickets").select("id, name_ar, badge_color, badge_tier_label").eq("event_id", eventId).eq("is_active", true).order("created_at"),
    ]);
    setEvent(evt as any);
    setGuests((guestList || []) as any);
    setTickets((ticketList || []) as any);
    if (ticketList && ticketList.length > 0) {
      setAddTicketId(prev => prev || (ticketList[0] as any).id);
      setBulkTicketId(prev => prev || (ticketList[0] as any).id);
    }
    if (evt) {
      setDraftChannels((evt as any).invite_channels || ["whatsapp"]);
      setDraftMode((evt as any).invite_send_mode || "manual");
      setDraftTemplate((evt as any).invite_message_template || "");
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => g.rsvp_status === "confirmed").length,
    pending: guests.filter(g => g.rsvp_status !== "confirmed").length,
    rate: guests.length > 0 ? Math.round((guests.filter(g => g.rsvp_status === "confirmed").length / guests.length) * 100) : 0,
  };

  const filtered = guests.filter(g => {
    if (filter === "confirmed" && g.rsvp_status !== "confirmed") return false;
    if (filter === "pending" && g.rsvp_status === "confirmed") return false;
    if (filter === "not_sent" && g.rsvp_status !== "not_sent") return false;
    if (search && !g.guest_name.includes(search) && !g.guest_phone.includes(search)) return false;
    return true;
  });

  const cleanPhone = (phone: string) => {
    let p = phone.replace(/[^0-9+]/g, "");
    if (p.startsWith("05")) p = "966" + p.slice(1);
    if (p.startsWith("+")) p = p.slice(1);
    if (!p.startsWith("966")) p = "966" + p;
    return p;
  };

  const isValidPhone = (phone: string) => /^(966|05|5)\d{8,9}$/.test(phone.replace(/[^0-9]/g, ""));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        // Skip header row
        const dataRows = rows.slice(1).filter(r => r.length >= 2 && (r[0] || r[1]));
        const preview = dataRows.map(row => {
          const name = String(row[0] || "").trim();
          const phone = String(row[1] || "").trim();
          const email = String(row[2] || "").trim();
          const valid = name.length > 0 && isValidPhone(phone);
          return { name, phone, email: email || undefined, valid, error: !name ? "اسم فارغ" : !isValidPhone(phone) ? "رقم غير صحيح" : undefined };
        });
        setPreviewData(preview);
      } catch {
        toast.error("خطأ في قراءة الملف");
      }
    };
    reader.readAsBinaryString(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const importGuests = async () => {
    if (!previewData || !eventId || !user) return;
    setUploading(true);
    const validRows = previewData.filter(r => r.valid);
    try {
      // Create batch
      const { data: batch } = await supabase.from("guest_import_batches").insert({
        event_id: eventId,
        imported_by: user.id,
        file_name: "upload.xlsx",
        total_rows: previewData.length,
        valid_rows: validRows.length,
        skipped_rows: previewData.length - validRows.length,
        status: "completed",
      } as any).select("id").single();

      // Insert guests
      if (validRows.length > 0 && batch) {
        await supabase.from("event_guests").insert(
          validRows.map(r => ({
            event_id: eventId,
            imported_by: user.id,
            guest_name: r.name,
            guest_phone: cleanPhone(r.phone),
            guest_email: r.email || null,
            ticket_id: bulkTicketId || null,
            import_batch_id: (batch as any).id,
            rsvp_status: "not_sent",
          } as any))
        );
      }

      toast.success(`تم استيراد ${guestCount(validRows.length)} بنجاح`);
      setPreviewData(null);
      loadData();
    } catch (err) {
      toast.error("خطأ في الاستيراد");
    } finally {
      setUploading(false);
    }
  };

  const addSingleGuest = async () => {
    if (!addName.trim() || !addPhone.trim() || !eventId || !user) return;
    try {
      const { data: inserted } = await supabase.from("event_guests").insert({
        event_id: eventId,
        imported_by: user.id,
        guest_name: addName.trim(),
        guest_phone: cleanPhone(addPhone),
        guest_email: addEmail.trim() || null,
        ticket_id: addTicketId || null,
        rsvp_status: "not_sent",
      } as any).select("*").single();
      toast.success("تمت إضافة الضيف");
      setShowAddModal(false);
      setAddName(""); setAddPhone(""); setAddEmail("");
      // Auto-send if configured
      if (event?.invite_send_mode === "auto" && inserted) {
        await sendInvite(inserted as any);
      }
      loadData();
    } catch {
      toast.error("خطأ في الإضافة");
    }
  };

  const saveSettings = async () => {
    if (!eventId) return;
    setSavingSettings(true);
    try {
      await supabase.from("events").update({
        invite_channels: draftChannels.length ? draftChannels : ["whatsapp"],
        invite_send_mode: draftMode,
        invite_message_template: draftTemplate.trim() || null,
      } as any).eq("id", eventId);
      toast.success("تم حفظ الإعدادات");
      setShowSettings(false);
      loadData();
    } catch {
      toast.error("خطأ في الحفظ");
    } finally {
      setSavingSettings(false);
    }
  };

  const sendInvite = async (guest: Guest) => {
    if (!event) return;
    try {
      const { data, error } = await supabase.functions.invoke("send-rsvp-invite", {
        body: { guest_ids: [guest.id], event_id: event.id, app_origin: baseUrl },
      });
      if (error) throw error;
      const item = (data as any).dispatch?.[0];
      if (!item) throw new Error("no dispatch");
      // Open the first available channel link automatically; user can re-trigger others
      const order = (event.invite_channels || ["whatsapp"]);
      for (const ch of order) {
        if (item.links[ch]) { window.open(item.links[ch], "_blank"); break; }
      }
      setGuests(prev => prev.map(g => g.id === guest.id
        ? { ...g, rsvp_status: g.rsvp_status === "confirmed" ? g.rsvp_status : "invited", invite_sent_at: new Date().toISOString(), invite_sent_channels: order }
        : g));
    } catch (e) {
      toast.error("تعذّر إرسال الدعوة");
    }
  };
  // Backwards-compat alias
  const openWhatsApp = sendInvite;

  const exportGuests = () => {
    const data = guests.map(g => ({
      "الاسم": g.guest_name,
      "رقم الجوال": g.guest_phone,
      "حالة التأكيد": statusLabels[g.rsvp_status]?.label || g.rsvp_status,
      "تاريخ التأكيد": g.confirmed_at ? formatDateTime(g.confirmed_at) : "",
      "رابط RSVP": `${baseUrl}/rsvp/${g.rsvp_token}`,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المدعوون");
    XLSX.writeFile(wb, `guests-${eventId}.xlsx`);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["الاسم", "رقم الجوال"],
      ["محمد الغامدي", "0501234567"],
      ["نورة العتيبي", "0559876543"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "قالب");
    XLSX.writeFile(wb, "guest-template.xlsx");
  };

  const remaining = guests.filter(g => g.rsvp_status !== "confirmed");
  const validPreview = previewData ? previewData.filter(r => r.valid).length : 0;
  const filterCount = (key: string) =>
    key === "confirmed" ? stats.confirmed
      : key === "pending" ? stats.pending
      : key === "not_sent" ? guests.filter(g => g.rsvp_status === "not_sent").length
      : stats.total;

  const header = (actions?: React.ReactNode) => (
    <div className="space-y-2">
      <Link to="/dashboard/events" className="inline-flex items-center gap-1.5 text-[13px] font-semibold leading-5 text-primary">
        <ArrowRight className="h-4 w-4" /> العودة لفعالياتي
      </Link>
      <PageHeader title="قائمة المدعوين" description={event?.title_ar} actions={actions} />
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {header()}
          <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-36 animate-pulse rounded-2xl bg-card shadow-soft" />)}
          </div>
          <div className="h-96 animate-pulse rounded-2xl bg-card shadow-soft" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {header(
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="المزيد"><MoreHorizontal className="h-[18px] w-[18px]" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setShowSettings(true)}><SettingsIcon className="h-4 w-4" /> إعدادات الدعوات</DropdownMenuItem>
                <DropdownMenuItem onClick={downloadTemplate}><FileSpreadsheet className="h-4 w-4" /> تحميل القالب</DropdownMenuItem>
                {guests.length > 0 && <DropdownMenuItem onClick={exportGuests}><Download className="h-4 w-4" /> تصدير</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> رفع قائمة</Button>
            <Button onClick={() => setShowAddModal(true)}><Plus className="h-4 w-4" /> إضافة ضيف</Button>
          </>,
        )}
        <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileUpload} />

        {/* Preview */}
        {previewData && (
          <Panel
            flush
            title="معاينة البيانات"
            description={`عدد الصفوف: ${formatNumber(previewData.length)}`}
            actions={<Button variant="ghost" size="icon" className="h-9 w-9" aria-label="إغلاق المعاينة" onClick={() => setPreviewData(null)}><X className="h-4 w-4" /></Button>}
          >
            <div className="space-y-4 px-6 pb-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="success">صالحة: {formatNumber(validPreview)}</StatusBadge>
                <StatusBadge tone="danger">غير صالحة: {formatNumber(previewData.length - validPreview)}</StatusBadge>
              </div>
              {tickets.length > 0 && (
                <div className="space-y-1.5 sm:max-w-sm">
                  <Label>فئة البطاقة لجميع المستوردين</Label>
                  <Select value={bulkTicketId} onValueChange={setBulkTicketId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{tickets.map(t => <SelectItem key={t.id} value={t.id}>{ticketLabel(t)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="max-h-64 overflow-auto [&>div]:overflow-visible">
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="ps-6">الاسم</TableHead>
                    <TableHead>الجوال</TableHead>
                    <TableHead className="pe-6">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 20).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="whitespace-nowrap ps-6 font-semibold">{r.name || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground"><bdi dir="ltr">{r.phone || "—"}</bdi></TableCell>
                      <TableCell className="pe-6">
                        {r.valid ? <StatusBadge tone="success">صالح</StatusBadge> : <StatusBadge tone="danger">{r.error}</StatusBadge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap gap-2.5 px-6 py-4">
              <Button onClick={importGuests} disabled={uploading || validPreview === 0}>
                {uploading ? "جارٍ الاستيراد..." : `استيراد ${guestCount(validPreview)}`}
              </Button>
              <Button variant="outline" onClick={() => setPreviewData(null)}>إلغاء</Button>
            </div>
          </Panel>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-4">
          <StatCard label="إجمالي المدعوين" value={formatNumber(stats.total)} icon={Users} />
          <StatCard label="مؤكدون" value={formatNumber(stats.confirmed)} icon={CheckCircle2} />
          <StatCard label="بانتظار الرد" value={formatNumber(stats.pending)} icon={Clock} />
          <StatCard label="نسبة التأكيد" value={`${stats.rate}%`} icon={TrendingUp} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
            <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
              {FILTERS.map(f => (
                <TabsTrigger key={f.key} value={f.key} className="flex-1 gap-1 px-2 sm:flex-none sm:gap-1.5 sm:px-4">
                  {f.label}
                  <span className="text-xs font-normal text-muted-foreground">{formatNumber(filterCount(f.key))}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:ms-auto sm:w-72">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="بحث بالاسم أو الرقم..." value={search} onChange={e => setSearch(e.target.value)} className="ps-9" />
          </div>
        </div>

        {/* Guest list */}
        <Panel
          flush
          title="المدعوون"
          actions={remaining.length > 0 && (
            <Button
              variant="soft"
              size="sm"
              onClick={() => {
                const unconfirmed = guests.filter(g => g.rsvp_status !== "confirmed");
                unconfirmed.forEach((g, i) => setTimeout(() => openWhatsApp(g), i * 500));
              }}
            >
              <Send className="h-4 w-4" /> إرسال تذكير للباقين ({formatNumber(remaining.length)})
            </Button>
          )}
        >
          {filtered.length === 0 ? (
            guests.length === 0 ? (
              <EmptyState
                icon={Users}
                title="لا يوجد مدعوون"
                description="ارفع ملف Excel أو أضف ضيوفاً يدوياً"
                action={<Button variant="soft" size="sm" onClick={() => setShowAddModal(true)}><Plus className="h-4 w-4" /> إضافة ضيف</Button>}
              />
            ) : (
              <EmptyState
                icon={Search}
                title="لا يوجد مدعوون مطابقون"
                action={<Button variant="outline" size="sm" onClick={() => { setFilter("all"); setSearch(""); }}>عرض الكل</Button>}
              />
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-6">الاسم</TableHead>
                  <TableHead>فئة البطاقة</TableHead>
                  <TableHead>حالة التأكيد</TableHead>
                  <TableHead>البيانات</TableHead>
                  <TableHead className="pe-6 text-end">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(g => {
                  const tk = tickets.find(t => t.id === g.ticket_id);
                  const dataKeys = g.extra_data ? Object.keys(g.extra_data).filter(k => g.extra_data![k]) : [];
                  const status = statusLabels[g.rsvp_status] ?? { label: g.rsvp_status, tone: "neutral" as StatusTone };
                  return (
                    <TableRow key={g.id}>
                      <TableCell className="whitespace-nowrap ps-6">
                        <p className="font-semibold leading-[22px]">{g.guest_name}</p>
                        <p className="text-xs leading-[18px] text-muted-foreground"><bdi dir="ltr">{g.guest_phone}</bdi></p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {tk ? (
                          <span className="inline-flex items-center gap-2">
                            <i className="h-2 w-2 flex-none rounded-full" style={{ backgroundColor: tk.badge_color || "#492C5A" }} />
                            <bdi>{tk.badge_tier_label || tk.name_ar}</bdi>
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell><StatusBadge tone={status.tone}>{status.label}</StatusBadge></TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {dataKeys.length > 0 ? fieldCount(dataKeys.length) : "—"}
                      </TableCell>
                      <TableCell className="pe-6 text-end">
                        {g.rsvp_status !== "confirmed" && (
                          <Button variant="outline" size="sm" onClick={() => openWhatsApp(g)}>
                            <MessageSquare className="h-4 w-4" /> واتساب
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Panel>

        {/* Add guest */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent dir="rtl" className="max-h-[90vh] w-[calc(100%-1.5rem)] rounded-2xl max-w-lg overflow-y-auto">
            <DialogHeader className="pe-6 text-start"><DialogTitle>إضافة ضيف يدوياً</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="guest-name">الاسم</Label>
                <Input id="guest-name" placeholder="اسم الضيف" value={addName} onChange={e => setAddName(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="guest-phone">رقم الجوال</Label>
                  <Input id="guest-phone" placeholder="05XXXXXXXX" value={addPhone} onChange={e => setAddPhone(e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guest-email">البريد الإلكتروني (اختياري)</Label>
                  <Input id="guest-email" placeholder="name@example.com" value={addEmail} onChange={e => setAddEmail(e.target.value)} dir="ltr" type="email" />
                </div>
              </div>
              {tickets.length > 0 && (
                <div className="space-y-1.5">
                  <Label>فئة البطاقة</Label>
                  <Select value={addTicketId} onValueChange={setAddTicketId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{tickets.map(t => <SelectItem key={t.id} value={t.id}>{ticketLabel(t)}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">يحدد لون وشعار وفئة البطاقة التي ستظهر للضيف بعد التأكيد</p>
                </div>
              )}
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button onClick={addSingleGuest} disabled={!addName.trim() || !addPhone.trim()}>إضافة</Button>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>إلغاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invite settings */}
        <Dialog open={showSettings && !!event} onOpenChange={setShowSettings}>
          <DialogContent dir="rtl" className="max-h-[90vh] w-[calc(100%-1.5rem)] rounded-2xl max-w-lg overflow-y-auto">
            <DialogHeader className="pe-6 text-start">
              <DialogTitle>إعدادات إرسال الدعوات</DialogTitle>
              <DialogDescription>تنطبق على جميع المدعوين في هذه الفعالية</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>قنوات الإرسال</Label>
                <div className="grid grid-cols-3 gap-2.5">
                  {Object.entries(CHANNEL_LABELS).map(([key, { label, icon: Icon }]) => {
                    const active = draftChannels.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setDraftChannels(p => active ? p.filter(c => c !== key) : [...p, key])}
                        className={`${tileClass(active)} flex flex-col items-center gap-1.5`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs font-semibold">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>توقيت الإرسال</Label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { v: "manual", l: "يدوي", d: "أرسل أنا متى ما أردت" },
                    { v: "auto", l: "تلقائي", d: "فور إضافة الضيف" },
                  ].map(o => (
                    <button key={o.v} type="button" aria-pressed={draftMode === o.v} onClick={() => setDraftMode(o.v)} className={`${tileClass(draftMode === o.v)} text-start`}>
                      <span className="block text-sm font-bold">{o.l}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{o.d}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invite-template">قالب الرسالة (اختياري)</Label>
                <Textarea
                  id="invite-template"
                  className="min-h-[168px]"
                  placeholder={`مرحباً {name}\nأنت مدعو لحضور: {title}\n{date} - {time}\n{venue}\n\nأكّد حضورك:\n{link}`}
                  value={draftTemplate}
                  onChange={e => setDraftTemplate(e.target.value)}
                />
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  المتغيرات:
                  {TEMPLATE_VARS.map(v => <code key={v} className="rounded bg-muted px-1.5 py-0.5"><bdi dir="ltr">{`{${v}}`}</bdi></code>)}
                </p>
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button onClick={saveSettings} disabled={savingSettings || draftChannels.length === 0}>
                {savingSettings ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
              </Button>
              <Button variant="outline" onClick={() => setShowSettings(false)}>إلغاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default EventGuests;
