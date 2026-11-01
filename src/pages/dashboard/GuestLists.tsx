import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import { formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { Database, FileSpreadsheet, MoreHorizontal, Pencil, Plus, Search, Trash2, Upload, Users } from "lucide-react";

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

// نافذة بترويسة وتذييل ثابتين، والمحتوى وحده يتمرر
const SCROLL_DIALOG = "flex max-h-[90dvh] w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 outline-none";

// عدد المدعوين بصياغة عربية صحيحة، مثل: مدعوان، 5 مدعوين، 12 مدعواً
const guestCount = (n: number) => {
  if (n === 1) return "مدعو واحد";
  if (n === 2) return "مدعوان";
  const tail = n % 100;
  return `${formatNumber(n)} ${tail >= 3 && tail <= 10 ? "مدعوين" : tail >= 11 ? "مدعواً" : "مدعو"}`;
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
    if (!confirm("حذف القائمة وكل مدعويها؟")) return;
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
    if (!parsed.length) return toast.error("لا توجد بيانات صالحة. ضع كل مدعو في سطر: الاسم، الجوال، البريد");
    const rows = parsed.map((p) => ({
      list_id: active.id, guest_name: p.name, guest_phone: p.phone, guest_email: p.email,
    }));
    const { error } = await supabase.from("guest_list_contacts").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`تم استيراد ${guestCount(rows.length)}`);
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
        <PageHeader
          title="قواعد بيانات المدعوين"
          description="أنشئ قوائم جاهزة (عائلة، موظفين، VIP…) واربطها بأي دعوة لإرسالها دفعة واحدة."
          actions={<Button onClick={openNew}><Plus className="h-4 w-4" /> قائمة جديدة</Button>}
        />

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-card shadow-soft" />)}
          </div>
        ) : lists.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={Database}
              title="لم تنشئ أي قائمة بعد"
              description="أنشئ قائمة وأضف إليها مدعويك لتستخدمها في أي دعوة"
              action={<Button onClick={openNew}><Plus className="h-4 w-4" /> أنشئ أول قائمة</Button>}
            />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {lists.map((l) => (
              <article key={l.id} className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-soft">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
                    <Users className="h-[17px] w-[17px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold leading-6">{l.name}</h3>
                    <p className="truncate text-[13px] leading-5 text-muted-foreground">{l.description || "بدون وصف"}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{guestCount(l.contacts_count || 0)}</p>
                <div className="mt-auto flex items-center gap-2">
                  <Button size="sm" variant="soft" className="flex-1" onClick={() => openContacts(l)}>
                    <Users className="h-[15px] w-[15px]" /> المدعوون
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="outline" className="h-9 w-9 flex-none" aria-label="المزيد"><MoreHorizontal className="h-[18px] w-[18px]" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /> تعديل</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => removeList(l.id)}><Trash2 className="h-4 w-4" /> حذف</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* List form */}
        <Dialog open={listOpen} onOpenChange={setListOpen}>
          <DialogContent dir="rtl" className="w-[calc(100%-1.5rem)] max-w-md rounded-2xl outline-none">
            <DialogHeader className="pe-6 text-start"><DialogTitle>{editing ? "تعديل القائمة" : "قائمة جديدة"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>اسم القائمة *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: ضيوف العائلة" />
              </div>
              <div className="space-y-1.5">
                <Label>الوصف (اختياري)</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter className="flex-row gap-2">
              <Button className="flex-1 sm:flex-none" onClick={saveList}>{editing ? "حفظ" : "إنشاء"}</Button>
              <Button variant="outline" onClick={() => setListOpen(false)}>إلغاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Contacts */}
        <Dialog open={contactsOpen} onOpenChange={setContactsOpen}>
          <DialogContent dir="rtl" className={`${SCROLL_DIALOG} max-w-3xl`}>
            <DialogHeader className="px-6 pb-4 pe-12 pt-6 text-start">
              <DialogTitle>{active?.name}</DialogTitle>
              <DialogDescription>{guestCount(contacts.length)}</DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-4 px-6 pb-4">
                <div className="grid gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end">
                  <div className="space-y-1.5">
                    <Label>الاسم *</Label>
                    <Input value={newContact.guest_name} onChange={(e) => setNewContact({ ...newContact, guest_name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>الجوال</Label>
                    <Input dir="ltr" placeholder="+9665..." value={newContact.guest_phone} onChange={(e) => setNewContact({ ...newContact, guest_phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>البريد</Label>
                    <Input dir="ltr" value={newContact.guest_email} onChange={(e) => setNewContact({ ...newContact, guest_email: e.target.value })} />
                  </div>
                  <Button onClick={addContact}><Plus className="h-4 w-4" /> إضافة</Button>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative min-w-[11rem] flex-1">
                    <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="ps-9" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <Button variant="outline" onClick={() => { setBulkRaw(""); setBulkOpen(true); }}>
                    <Upload className="h-4 w-4" /> استيراد دفعة (لصق)
                  </Button>
                  <label className="cursor-pointer">
                    <Button variant="outline" asChild>
                      <span><FileSpreadsheet className="h-4 w-4" /> استيراد CSV</span>
                    </Button>
                    <input type="file" accept=".csv,text/csv,text/plain" className="hidden"
                      onChange={(e) => e.target.files?.[0] && onCsvFile(e.target.files[0])} />
                  </label>
                </div>
              </div>

              {contacts.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="لا يوجد مدعوون في هذه القائمة"
                  description="أضف مدعواً من النموذج أعلاه أو استورد قائمة كاملة"
                  action={<Button variant="outline" onClick={() => { setBulkRaw(""); setBulkOpen(true); }}><Upload className="h-4 w-4" /> استيراد دفعة (لصق)</Button>}
                />
              ) : filteredContacts.length === 0 ? (
                <p className="px-6 pb-8 pt-4 text-center text-sm text-muted-foreground">لا توجد نتائج مطابقة لبحثك</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-6">المدعو</TableHead>
                      <TableHead className="hidden sm:table-cell">الجوال</TableHead>
                      <TableHead className="hidden sm:table-cell">البريد</TableHead>
                      <TableHead className="w-14 pe-6"><span className="sr-only">حذف</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="ps-6">
                          <p className="font-semibold leading-[22px]">{c.guest_name}</p>
                          {(c.guest_phone || c.guest_email) && (
                            <p className="flex flex-wrap gap-x-3 text-xs leading-[18px] text-muted-foreground sm:hidden">
                              {c.guest_phone && <bdi dir="ltr">{c.guest_phone}</bdi>}
                              {c.guest_email && <bdi dir="ltr">{c.guest_email}</bdi>}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">{c.guest_phone ? <bdi dir="ltr">{c.guest_phone}</bdi> : "—"}</TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">{c.guest_email ? <bdi dir="ltr">{c.guest_email}</bdi> : "—"}</TableCell>
                        <TableCell className="pe-6">
                          <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive" aria-label="حذف" onClick={() => removeContact(c.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk import */}
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent dir="rtl" className={`${SCROLL_DIALOG} max-w-2xl`}>
            <DialogHeader className="px-6 pb-4 pe-12 pt-6 text-start">
              <DialogTitle>استيراد دفعة من المدعوين</DialogTitle>
              <DialogDescription>كل مدعو في سطر، ويفصل بين الحقول بفاصلة أو tab. مثال:</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6">
              <pre className="overflow-x-auto rounded-xl bg-muted/50 p-3 text-xs leading-5" dir="ltr">
{`أحمد العتيبي, +966555555555, ahmad@x.com
سارة, +966500000000
وليد, , walid@x.com`}
              </pre>
              <Textarea rows={10} dir="ltr" value={bulkRaw} onChange={(e) => setBulkRaw(e.target.value)} />
            </div>
            <DialogFooter className="flex-row gap-2 border-t border-border px-6 py-4">
              <Button className="flex-1 sm:flex-none" onClick={bulkImport}>استيراد</Button>
              <Button variant="outline" onClick={() => setBulkOpen(false)}>إلغاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default GuestLists;
