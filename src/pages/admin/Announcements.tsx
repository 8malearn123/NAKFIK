import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import StatusBadge, { type StatusTone } from "@/components/app/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatNumber } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Send,
  Archive,
  AlertTriangle,
  Info,
  AlertCircle,
  Users,
  Calendar,
  MoreHorizontal,
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "info" | "warning" | "urgent";
  status: "draft" | "published" | "archived";
  target_audience: "all" | "organizers" | "attendees";
  starts_at: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
}

const defaultForm: {
  title: string;
  content: string;
  type: "info" | "warning" | "urgent";
  target_audience: "all" | "organizers" | "attendees";
  starts_at: string;
  expires_at: string;
} = {
  title: "",
  content: "",
  type: "info",
  target_audience: "all",
  starts_at: "",
  expires_at: "",
};

const Announcements = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "draft" | "published" | "archived">("all");

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setAnnouncements((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      content: a.content,
      type: a.type as "info" | "warning" | "urgent",
      target_audience: a.target_audience as "all" | "organizers" | "attendees",
      starts_at: a.starts_at ? a.starts_at.slice(0, 16) : "",
      expires_at: a.expires_at ? a.expires_at.slice(0, 16) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "يرجى تعبئة العنوان والمحتوى", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      title: form.title,
      content: form.content,
      type: form.type,
      target_audience: form.target_audience,
      starts_at: form.starts_at || new Date().toISOString(),
      expires_at: form.expires_at || null,
    };

    if (editingId) {
      const { error } = await supabase.from("announcements").update(payload).eq("id", editingId);
      if (error) toast({ title: "خطأ في التحديث", variant: "destructive" });
      else toast({ title: "تم تحديث الإعلان" });
    } else {
      payload.created_by = user?.id;
      payload.status = "draft";
      const { error } = await supabase.from("announcements").insert(payload);
      if (error) toast({ title: "خطأ في الإنشاء", variant: "destructive" });
      else toast({ title: "تم إنشاء الإعلان" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchAnnouncements();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("announcements").update({ status }).eq("id", id);
    toast({ title: status === "published" ? "تم النشر" : "تمت الأرشفة" });
    fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    toast({ title: "تم حذف الإعلان" });
    fetchAnnouncements();
  };

  const typeIcon = (t: string) => (t === "urgent" ? AlertCircle : t === "warning" ? AlertTriangle : Info);
  const typeTone = (t: string): StatusTone => (t === "urgent" ? "danger" : t === "warning" ? "warning" : "neutral");

  const typeLabel = (t: string) => t === "urgent" ? "عاجل" : t === "warning" ? "تنبيه" : "معلومة";
  const statusLabel = (s: string) => s === "published" ? "منشور" : s === "archived" ? "مؤرشف" : "مسودة";
  const audienceLabel = (a: string) => a === "organizers" ? "المنظمون" : a === "attendees" ? "الحضور" : "الجميع";

  const statusTone = (s: string): StatusTone => (s === "published" ? "success" : "neutral");

  const filtered = filter === "all" ? announcements : announcements.filter((a) => a.status === filter);

  const counts = {
    all: announcements.length,
    draft: announcements.filter((a) => a.status === "draft").length,
    published: announcements.filter((a) => a.status === "published").length,
    archived: announcements.filter((a) => a.status === "archived").length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="الإعلانات"
          description="إدارة الإعلانات والتنبيهات العامة للمنصة"
          actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> إعلان جديد</Button>}
        />

        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="max-w-full justify-start overflow-x-auto">
            {([
              { key: "all", label: "الكل" },
              { key: "draft", label: "مسودات" },
              { key: "published", label: "منشورة" },
              { key: "archived", label: "مؤرشفة" },
            ] as const).map((s) => (
              <TabsTrigger key={s.key} value={s.key} className="gap-1.5">
                {s.label}
                <span className="text-xs font-normal text-muted-foreground">{formatNumber(counts[s.key])}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-card shadow-soft" />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={Megaphone}
              title="لا توجد إعلانات"
              description="أنشئ إعلاناً جديداً للبدء"
              action={<Button variant="soft" size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> إعلان جديد</Button>}
            />
          </div>
        ) : (
          <Panel>
            <div className="divide-y divide-border">
              {filtered.map((a) => {
                const TypeIcon = typeIcon(a.type);
                return (
                  <article key={a.id} className="flex flex-wrap items-start gap-3 py-4 first:pt-0 last:pb-0 sm:flex-nowrap">
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
                      <TypeIcon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="min-w-0 text-sm font-semibold leading-[22px]">{a.title}</h3>
                        <StatusBadge tone={statusTone(a.status)}>{statusLabel(a.status)}</StatusBadge>
                        <StatusBadge tone={typeTone(a.type)}>{typeLabel(a.type)}</StatusBadge>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-muted-foreground">{a.content}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs leading-[18px] text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 flex-none opacity-70" /> {audienceLabel(a.target_audience)}</span>
                        <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 flex-none opacity-70" /> {formatDate(a.created_at)}</span>
                        {a.expires_at && <span>ينتهي: {formatDate(a.expires_at)}</span>}
                      </div>
                    </div>
                    <div className="flex w-full flex-none items-center gap-2 sm:w-auto">
                      {a.status === "draft" && (
                        <Button size="sm" variant="soft" className="flex-1 sm:flex-none" onClick={() => updateStatus(a.id, "published")}><Send className="h-4 w-4" /> نشر</Button>
                      )}
                      {a.status === "published" && (
                        <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => updateStatus(a.id, "archived")}><Archive className="h-4 w-4" /> أرشفة</Button>
                      )}
                      {a.status === "archived" && (
                        <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => openEdit(a)}><Edit2 className="h-4 w-4" /> تعديل</Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="outline" className="h-9 w-9 flex-none" aria-label="المزيد"><MoreHorizontal className="h-[18px] w-[18px]" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {a.status !== "archived" && (
                            <>
                              <DropdownMenuItem onClick={() => openEdit(a)}><Edit2 className="h-4 w-4" /> تعديل</DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4" /> حذف</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent dir="rtl" className="max-h-[92vh] w-[calc(100%-1.5rem)] rounded-2xl max-w-lg overflow-y-auto">
            <DialogHeader className="pe-6 text-start">
              <DialogTitle>{editingId ? "تعديل الإعلان" : "إعلان جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ann-title">العنوان</Label>
                <Input id="ann-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان الإعلان" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-content">المحتوى</Label>
                <Textarea id="ann-content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="نص الإعلان..." rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>النوع</Label>
                  <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                    <SelectTrigger aria-label="النوع"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">معلومة</SelectItem>
                      <SelectItem value="warning">تنبيه</SelectItem>
                      <SelectItem value="urgent">عاجل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الجمهور المستهدف</Label>
                  <Select value={form.target_audience} onValueChange={(v: any) => setForm({ ...form, target_audience: v })}>
                    <SelectTrigger aria-label="الجمهور المستهدف"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الجميع</SelectItem>
                      <SelectItem value="organizers">المنظمون</SelectItem>
                      <SelectItem value="attendees">الحضور</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-start">يبدأ في</Label>
                <Input id="ann-start" type="datetime-local" dir="ltr" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-end">ينتهي في (اختياري)</Label>
                <Input id="ann-end" type="datetime-local" dir="ltr" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "جاري الحفظ..." : editingId ? "تحديث" : "إنشاء"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Announcements;
