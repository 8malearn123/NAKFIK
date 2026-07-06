import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
  Eye,
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
    toast({ title: status === "published" ? "تم النشر" : "تم الأرشفة" });
    fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    toast({ title: "تم حذف الإعلان" });
    fetchAnnouncements();
  };

  const typeIcon = (t: string) => {
    if (t === "urgent") return <AlertCircle className="w-4 h-4 text-destructive" />;
    if (t === "warning") return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <Info className="w-4 h-4 text-primary" />;
  };

  const typeLabel = (t: string) => t === "urgent" ? "عاجل" : t === "warning" ? "تنبيه" : "معلومة";
  const statusLabel = (s: string) => s === "published" ? "منشور" : s === "archived" ? "مؤرشف" : "مسودة";
  const audienceLabel = (a: string) => a === "organizers" ? "المنظمين" : a === "attendees" ? "الحضور" : "الجميع";

  const statusColor = (s: string): "default" | "secondary" | "destructive" | "outline" =>
    s === "published" ? "default" : s === "archived" ? "secondary" : "outline";

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-bold text-2xl text-foreground">الإعلانات</h1>
            <p className="text-muted-foreground text-sm mt-1">إدارة الإعلانات والتنبيهات العامة للمنصة</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> إعلان جديد
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            { key: "all", label: "الكل", icon: Megaphone, color: "text-foreground" },
            { key: "draft", label: "مسودات", icon: Edit2, color: "text-muted-foreground" },
            { key: "published", label: "منشورة", icon: Eye, color: "text-primary" },
            { key: "archived", label: "مؤرشفة", icon: Archive, color: "text-muted-foreground" },
          ] as const).map((s) => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`bg-card rounded-xl border p-4 text-right transition-all ${filter === s.key ? "border-primary ring-1 ring-primary/30" : "border-border/50 hover:border-border"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <span className="text-2xl font-bold">{counts[s.key]}</span>
              </div>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-12 text-center space-y-3">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="font-semibold text-lg">لا توجد إعلانات</h3>
            <p className="text-muted-foreground text-sm">أنشئ إعلاناً جديداً للبدء</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
              <div key={a.id} className="bg-card rounded-xl border border-border/50 p-4 hover:border-border transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {typeIcon(a.type)}
                      <h3 className="font-semibold text-sm truncate">{a.title}</h3>
                      <Badge variant={statusColor(a.status)} className="text-[10px]">{statusLabel(a.status)}</Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Users className="w-3 h-3" /> {audienceLabel(a.target_audience)}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs line-clamp-2 mt-1">{a.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(a.created_at).toLocaleDateString("ar-SA")}
                      </span>
                      {a.expires_at && (
                        <span>ينتهي: {new Date(a.expires_at).toLocaleDateString("ar-SA")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {a.status === "draft" && (
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(a.id, "published")} title="نشر">
                        <Send className="w-4 h-4 text-primary" />
                      </Button>
                    )}
                    {a.status === "published" && (
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(a.id, "archived")} title="أرشفة">
                        <Archive className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(a)} title="تعديل">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)} title="حذف">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "تعديل الإعلان" : "إعلان جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">العنوان</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان الإعلان" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">المحتوى</label>
                <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="نص الإعلان..." rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">النوع</label>
                  <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">معلومة</SelectItem>
                      <SelectItem value="warning">تنبيه</SelectItem>
                      <SelectItem value="urgent">عاجل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">الجمهور المستهدف</label>
                  <Select value={form.target_audience} onValueChange={(v: any) => setForm({ ...form, target_audience: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الجميع</SelectItem>
                      <SelectItem value="organizers">المنظمين</SelectItem>
                      <SelectItem value="attendees">الحضور</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">يبدأ في</label>
                  <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">ينتهي في (اختياري)</label>
                  <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "جاري الحفظ..." : editingId ? "تحديث" : "إنشاء"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Announcements;
