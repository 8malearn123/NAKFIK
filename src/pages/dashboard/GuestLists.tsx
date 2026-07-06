import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Database, Plus, Pencil, Trash2, Users, Upload, FileSpreadsheet, Search, X } from "lucide-react";

interface List {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
  contacts_count?: number;
}

interface Contact {
  id: string;
  list_id: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  tags: string[] | null;
  notes: string | null;
}

// Parse pasted lines like: "Ahmad, +9665..., a@x.com" OR "Ahmad\t+966...\ta@x.com"
const parseBulk = (raw: string): { name: string; phone: string | null; email: string | null }[] => {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[,\t;|]/).map((p) => p.trim());
      const name = parts[0] || "";
      let phone: string | null = null;
      let email: string | null = null;
      for (const p of parts.slice(1)) {
        if (!p) continue;
        if (p.includes("@")) email = p;
        else if (/[\d+]/.test(p)) phone = p;
      }
      return { name, phone, email };
    })
    .filter((c) => c.name);
};

const GuestLists = () => {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);

  const [listOpen, setListOpen] = useState(false);
  const [editing, setEditing] = useState<List | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const [active, setActive] = useState<List | null>(null);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [newContact, setNewContact] = useState({ guest_name: "", guest_phone: "", guest_email: "" });

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRaw, setBulkRaw] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: orgs } = await supabase.from("organizations").select("id").eq("owner_id", user.id).limit(1);
    const org = orgs?.[0];
    if (!org) { setLoading(false); return; }
    setOrgId(org.id);
    const { data } = await supabase
      .from("guest_lists")
      .select("*")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false });
    const ls = (data || []) as List[];
    // Fetch counts
    if (ls.length) {
      const ids = ls.map((l) => l.id);
      const { data: counts } = await supabase
        .from("guest_list_contacts")
        .select("list_id")
        .in("list_id", ids);
      const map: Record<string, number> = {};
      (counts || []).forEach((c: any) => { map[c.list_id] = (map[c.list_id] || 0) + 1; });
      ls.forEach((l) => { l.contacts_count = map[l.id] || 0; });
    }
    setLists(ls);
    setLoading(false);
  };

  useEffect(() => { document.title = "قواعد بيانات المدعوين | نكفيك"; load(); }, [user]);

  const openNew = () => { setEditing(null); setForm({ name: "", description: "" }); setListOpen(true); };
  const openEdit = (l: List) => { setEditing(l); setForm({ name: l.name, description: l.description || "" }); setListOpen(true); };

  const saveList = async () => {
    if (!orgId || !user) return;
    if (!form.name.trim()) return toast.error("اسم القائمة مطلوب");
    if (editing) {
      const { error } = await supabase.from("guest_lists").update({ name: form.name, description: form.description || null }).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("تم التحديث");
    } else {
      const { error } = await supabase.from("guest_lists").insert({
        organization_id: orgId, name: form.name, description: form.description || null, created_by: user.id,
      });
      if (error) return toast.error(error.message);
      toast.success("تم إنشاء القائمة");
    }
    setListOpen(false);
    load();
  };

  const removeList = async (id: string) => {
    if (!confirm("حذف القائمة وكل جهات اتصالها؟")) return;
    const { error } = await supabase.from("guest_lists").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    load();
  };

  const loadContacts = async (listId: string) => {
    const { data } = await supabase
      .from("guest_list_contacts")
      .select("*")
      .eq("list_id", listId)
      .order("created_at", { ascending: false });
    setContacts((data || []) as Contact[]);
  };

  const openContacts = async (l: List) => {
    setActive(l); setContactsOpen(true); setSearch("");
    await loadContacts(l.id);
  };

  const addContact = async () => {
    if (!active) return;
    if (!newContact.guest_name.trim()) return toast.error("الاسم مطلوب");
    const { error } = await supabase.from("guest_list_contacts").insert({
      list_id: active.id,
      guest_name: newContact.guest_name.trim(),
      guest_phone: newContact.guest_phone || null,
      guest_email: newContact.guest_email || null,
    });
    if (error) return toast.error(error.message);
    setNewContact({ guest_name: "", guest_phone: "", guest_email: "" });
    await loadContacts(active.id);
    load();
  };

  const removeContact = async (id: string) => {
    await supabase.from("guest_list_contacts").delete().eq("id", id);
    if (active) { loadContacts(active.id); load(); }
  };

  const bulkImport = async () => {
    if (!active) return;
    const parsed = parseBulk(bulkRaw);
    if (!parsed.length) return toast.error("لا توجد بيانات صالحة. ضع كل جهة في سطر: الاسم، الجوال، البريد");
    const rows = parsed.map((p) => ({
      list_id: active.id, guest_name: p.name, guest_phone: p.phone, guest_email: p.email,
    }));
    const { error } = await supabase.from("guest_list_contacts").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`تم استيراد ${rows.length} جهة`);
    setBulkRaw(""); setBulkOpen(false);
    loadContacts(active.id); load();
  };

  const onCsvFile = async (file: File) => {
    const text = await file.text();
    setBulkRaw(text);
    setBulkOpen(true);
  };

  const filteredContacts = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.guest_name.toLowerCase().includes(q)
      || (c.guest_phone || "").includes(q)
      || (c.guest_email || "").toLowerCase().includes(q);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl text-primary flex items-center gap-2">
              <Database className="w-6 h-6" /> قواعد بيانات المدعوين
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              أنشئ قوائم جاهزة (عائلة، موظفين، VIP…) واربطها بأي دعوة لإرسالها دفعة واحدة.
            </p>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4 ml-1" /> قائمة جديدة</Button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-card border rounded-2xl animate-pulse" />)}
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-16 bg-card border rounded-3xl">
            <Database className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">لم تنشئ أي قائمة بعد</p>
            <Button onClick={openNew} className="mt-4"><Plus className="w-4 h-4 ml-1" /> أنشئ أول قائمة</Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((l) => (
              <div key={l.id} className="bg-card border rounded-2xl p-4 hover:shadow-md transition flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold">{l.name}</h3>
                      {l.description && <p className="text-xs text-muted-foreground line-clamp-1">{l.description}</p>}
                    </div>
                  </div>
                  <Badge variant="secondary">{l.contacts_count || 0}</Badge>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  <Button size="sm" variant="secondary" onClick={() => openContacts(l)}>
                    <Users className="w-3 h-3 ml-1" /> الجهات
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(l)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeList(l.id)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List form */}
        <Dialog open={listOpen} onOpenChange={setListOpen}>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader><DialogTitle>{editing ? "تعديل القائمة" : "قائمة جديدة"}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label>اسم القائمة *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: ضيوف العائلة" />
              </div>
              <div>
                <Label>الوصف (اختياري)</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setListOpen(false)}>إلغاء</Button>
              <Button onClick={saveList}>{editing ? "حفظ" : "إنشاء"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Contacts */}
        <Dialog open={contactsOpen} onOpenChange={setContactsOpen}>
          <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{active?.name} — {contacts.length} جهة</DialogTitle>
            </DialogHeader>

            <div className="flex gap-2 flex-wrap mb-3">
              <Button size="sm" variant="outline" onClick={() => { setBulkRaw(""); setBulkOpen(true); }}>
                <Upload className="w-4 h-4 ml-1" /> استيراد دفعة (لصق)
              </Button>
              <label className="cursor-pointer">
                <Button size="sm" variant="outline" asChild>
                  <span><FileSpreadsheet className="w-4 h-4 ml-1" /> استيراد CSV</span>
                </Button>
                <input type="file" accept=".csv,text/csv,text/plain" className="hidden"
                  onChange={(e) => e.target.files?.[0] && onCsvFile(e.target.files[0])} />
              </label>
              <div className="flex-1 min-w-[180px] relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pr-9" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-muted/30 rounded-xl p-3 mb-3">
              <Input placeholder="الاسم *" value={newContact.guest_name} onChange={(e) => setNewContact({ ...newContact, guest_name: e.target.value })} />
              <Input dir="ltr" placeholder="+9665..." value={newContact.guest_phone} onChange={(e) => setNewContact({ ...newContact, guest_phone: e.target.value })} />
              <Input dir="ltr" placeholder="البريد" value={newContact.guest_email} onChange={(e) => setNewContact({ ...newContact, guest_email: e.target.value })} />
              <Button onClick={addContact}><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
            </div>

            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {filteredContacts.length === 0 && <p className="text-center text-muted-foreground p-6 text-sm">لا توجد جهات</p>}
              {filteredContacts.map((c) => (
                <div key={c.id} className="border rounded-xl p-2.5 flex items-center justify-between gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{c.guest_name}</p>
                    <div className="text-xs text-muted-foreground flex gap-3 flex-wrap" dir="ltr">
                      {c.guest_phone && <span>{c.guest_phone}</span>}
                      {c.guest_email && <span>{c.guest_email}</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeContact(c.id)}>
                    <X className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk import */}
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent dir="rtl" className="max-w-2xl">
            <DialogHeader><DialogTitle>استيراد دفعة من الجهات</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                كل جهة في سطر — يفصل بين الحقول بفاصلة أو tab. مثال:
              </p>
              <pre className="text-[11px] bg-muted/40 p-2 rounded-lg" dir="ltr">
{`أحمد العتيبي, +966555555555, ahmad@x.com
سارة, +966500000000
وليد, , walid@x.com`}
              </pre>
              <Textarea rows={10} dir="ltr" value={bulkRaw} onChange={(e) => setBulkRaw(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkOpen(false)}>إلغاء</Button>
              <Button onClick={bulkImport}>استيراد</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default GuestLists;
