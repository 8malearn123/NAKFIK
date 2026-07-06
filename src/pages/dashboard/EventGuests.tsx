import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Upload, Download, Plus, Send, Search, Users, CheckCircle, Clock, MessageSquare, FileSpreadsheet, X, Settings as SettingsIcon, Mail, Smartphone,
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

const statusLabels: Record<string, { label: string; color: string }> = {
  not_sent: { label: "لم تُرسل الدعوة", color: "bg-muted text-muted-foreground" },
  invited: { label: "تم الإرسال", color: "bg-blue-100 text-blue-700" },
  confirmed: { label: "أكد الحضور", color: "bg-teal/10 text-teal" },
};

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

      toast.success(`تم استيراد ${validRows.length} ضيف بنجاح ✅`);
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
      toast.success("تم حفظ الإعدادات ✅");
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
      "تاريخ التأكيد": g.confirmed_at ? new Date(g.confirmed_at).toLocaleString("ar-SA") : "",
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-bold text-2xl text-foreground">قائمة المدعوين</h1>
            <p className="text-muted-foreground text-sm">{event?.title_ar}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setShowSettings(true)}>
              <SettingsIcon className="w-4 h-4" /> إعدادات الدعوات
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={downloadTemplate}>
              <FileSpreadsheet className="w-4 h-4" /> تحميل القالب
            </Button>
            <label>
              <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileUpload} />
              <Button variant="outline" size="sm" className="rounded-full" asChild>
                <span><Upload className="w-4 h-4" /> رفع قائمة</span>
              </Button>
            </label>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4" /> إضافة ضيف
            </Button>
            {guests.length > 0 && (
              <Button variant="outline" size="sm" className="rounded-full" onClick={exportGuests}>
                <Download className="w-4 h-4" /> تصدير
              </Button>
            )}
          </div>
        </div>

        {/* Preview Modal */}
        {previewData && (
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">معاينة البيانات — {previewData.length} صف</h3>
              <Button variant="ghost" size="icon" onClick={() => setPreviewData(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="text-teal">✅ {previewData.filter(r => r.valid).length} صالح</span>
              <span className="text-destructive">⚠️ {previewData.filter(r => !r.valid).length} غير صالح</span>
            </div>
            {tickets.length > 0 && (
              <div className="space-y-1">
                <label className="text-sm font-semibold text-foreground">فئة البطاقة لجميع المستوردين</label>
                <select
                  value={bulkTicketId}
                  onChange={e => setBulkTicketId(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm"
                >
                  {tickets.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.badge_tier_label || t.name_ar} — {t.name_ar}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="max-h-64 overflow-y-auto border rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr><th className="text-right p-2">الاسم</th><th className="text-right p-2">الجوال</th><th className="text-right p-2">الحالة</th></tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 20).map((r, i) => (
                    <tr key={i} className={!r.valid ? "bg-destructive/5" : ""}>
                      <td className="p-2">{r.name || "—"}</td>
                      <td className="p-2 font-mono text-xs" dir="ltr">{r.phone || "—"}</td>
                      <td className="p-2">{r.valid ? <span className="text-teal text-xs">✅</span> : <span className="text-destructive text-xs">{r.error}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <Button onClick={importGuests} disabled={uploading || previewData.filter(r => r.valid).length === 0} className="rounded-full">
                {uploading ? "جارٍ الاستيراد..." : `استيراد ${previewData.filter(r => r.valid).length} ضيف`}
              </Button>
              <Button variant="outline" onClick={() => setPreviewData(null)} className="rounded-full">إلغاء</Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "إجمالي المدعوين", value: stats.total, icon: Users, color: "text-primary" },
            { label: "أكدوا الحضور", value: stats.confirmed, icon: CheckCircle, color: "text-teal" },
            { label: "لم يؤكدوا بعد", value: stats.pending, icon: Clock, color: "text-accent" },
            { label: "نسبة التأكيد", value: `${stats.rate}%`, icon: CheckCircle, color: "text-primary" },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث بالاسم أو الرقم..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 rounded-full" />
          </div>
          {["all", "confirmed", "pending", "not_sent"].map(f => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setFilter(f)}>
              {f === "all" ? "الكل" : f === "confirmed" ? "أكد الحضور" : f === "pending" ? "لم يؤكد" : "لم تُرسل"}
            </Button>
          ))}
        </div>

        {/* Guest list */}
        {filtered.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-bold text-foreground mb-1">لا يوجد مدعوون</h3>
            <p className="text-sm text-muted-foreground">ارفع ملف Excel أو أضف ضيوف يدوياً</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right p-3 font-semibold text-foreground">الاسم</th>
                    <th className="text-right p-3 font-semibold text-foreground">رقم الجوال</th>
                    <th className="text-right p-3 font-semibold text-foreground">فئة البطاقة</th>
                    <th className="text-right p-3 font-semibold text-foreground">حالة التأكيد</th>
                    <th className="text-right p-3 font-semibold text-foreground">البيانات</th>
                    <th className="text-right p-3 font-semibold text-foreground">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map(g => {
                    const tk = tickets.find(t => t.id === g.ticket_id);
                    const dataKeys = g.extra_data ? Object.keys(g.extra_data).filter(k => g.extra_data![k]) : [];
                    return (
                    <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-semibold text-foreground">{g.guest_name}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground" dir="ltr">{g.guest_phone}</td>
                      <td className="p-3">
                        {tk ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: tk.badge_color || "#492C5A" }}>
                            {tk.badge_tier_label || tk.name_ar}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusLabels[g.rsvp_status]?.color || "bg-muted text-muted-foreground"}`}>
                          {statusLabels[g.rsvp_status]?.label || g.rsvp_status}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {dataKeys.length > 0 ? <span className="text-teal">✓ {dataKeys.length} حقول</span> : "—"}
                      </td>
                      <td className="p-3">
                        {g.rsvp_status !== "confirmed" && (
                          <Button variant="ghost" size="sm" className="rounded-full text-teal" onClick={() => openWhatsApp(g)}>
                            <MessageSquare className="w-4 h-4" /> واتساب
                          </Button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bulk WhatsApp for unconfirmed */}
        {guests.filter(g => g.rsvp_status !== "confirmed").length > 0 && (
          <div className="flex justify-center">
            <Button variant="outline" className="rounded-full" onClick={() => {
              const unconfirmed = guests.filter(g => g.rsvp_status !== "confirmed");
              unconfirmed.forEach((g, i) => setTimeout(() => openWhatsApp(g), i * 500));
            }}>
              <Send className="w-4 h-4" /> إرسال تذكير للباقين ({guests.filter(g => g.rsvp_status !== "confirmed").length})
            </Button>
          </div>
        )}

        {/* Add guest modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <div className="bg-card rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg text-foreground">إضافة ضيف يدوياً</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm text-foreground font-semibold">الاسم</label>
                  <Input placeholder="اسم الضيف" value={addName} onChange={e => setAddName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-foreground font-semibold">رقم الجوال</label>
                  <Input placeholder="05XXXXXXXX" value={addPhone} onChange={e => setAddPhone(e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-foreground font-semibold">البريد الإلكتروني (اختياري)</label>
                  <Input placeholder="name@example.com" value={addEmail} onChange={e => setAddEmail(e.target.value)} dir="ltr" type="email" />
                </div>
                {tickets.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-sm text-foreground font-semibold">فئة البطاقة</label>
                    <select
                      value={addTicketId}
                      onChange={e => setAddTicketId(e.target.value)}
                      className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm"
                    >
                      {tickets.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.badge_tier_label || t.name_ar} — {t.name_ar}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground">يحدد لون وشعار وفئة البطاقة التي ستظهر للضيف بعد التأكيد</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button onClick={addSingleGuest} disabled={!addName.trim() || !addPhone.trim()} className="rounded-full flex-1">إضافة</Button>
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="rounded-full">إلغاء</Button>
              </div>
            </div>
          </div>
        )}

        {/* Invite settings modal */}
        {showSettings && event && (
          <div className="fixed inset-0 bg-foreground/30 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
            <div className="bg-card rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div>
                <h3 className="font-bold text-lg text-foreground">إعدادات إرسال الدعوات</h3>
                <p className="text-xs text-muted-foreground mt-1">تنطبق على جميع المدعوين في هذه الفعالية</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-foreground font-semibold">قنوات الإرسال</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(CHANNEL_LABELS).map(([key, { label, icon: Icon }]) => {
                    const active = draftChannels.includes(key);
                    return (
                      <button key={key} type="button" onClick={() => setDraftChannels(p => active ? p.filter(c => c !== key) : [...p, key])}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${active ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-semibold">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-foreground font-semibold">توقيت الإرسال</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: "manual", l: "يدوي", d: "أرسل أنا متى ما أردت" },
                    { v: "auto", l: "تلقائي", d: "فور إضافة الضيف" },
                  ].map(o => (
                    <button key={o.v} type="button" onClick={() => setDraftMode(o.v)}
                      className={`p-3 rounded-xl border-2 text-right transition-all ${draftMode === o.v ? "border-primary bg-primary/5" : "border-border"}`}>
                      <div className={`font-bold text-sm ${draftMode === o.v ? "text-primary" : "text-foreground"}`}>{o.l}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{o.d}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-foreground font-semibold">قالب الرسالة (اختياري)</label>
                <textarea
                  className="w-full min-h-[120px] rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder={`مرحباً {name} 👋\nأنت مدعو لحضور: {title}\n📅 {date} - {time}\n📍 {venue}\n\nأكّد حضورك:\n{link}`}
                  value={draftTemplate} onChange={e => setDraftTemplate(e.target.value)} dir="rtl"
                />
                <p className="text-xs text-muted-foreground">المتغيرات: <code className="bg-muted px-1 rounded">{"{name}"}</code> <code className="bg-muted px-1 rounded">{"{title}"}</code> <code className="bg-muted px-1 rounded">{"{date}"}</code> <code className="bg-muted px-1 rounded">{"{time}"}</code> <code className="bg-muted px-1 rounded">{"{venue}"}</code> <code className="bg-muted px-1 rounded">{"{link}"}</code></p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={saveSettings} disabled={savingSettings || draftChannels.length === 0} className="rounded-full flex-1">
                  {savingSettings ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
                </Button>
                <Button variant="outline" onClick={() => setShowSettings(false)} className="rounded-full">إلغاء</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EventGuests;
