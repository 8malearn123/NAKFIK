import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import Panel from "@/components/app/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Layers, Plus, Trash2 } from "lucide-react";

interface Category {
  id: string;
  name_ar: string;
  name_en: string | null;
  display_order: number;
  is_active: boolean;
}

const AdminProviderCategories = () => {
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("service_provider_categories")
      .select("*")
      .order("display_order");
    setItems((data as any) || []);
    setFetched(true);
  };

  useEffect(() => { document.title = "فئات مزودي الخدمات | الأدمن"; load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("service_provider_categories").insert({
      name_ar: name.trim(),
      display_order: items.length,
    } as any);
    setLoading(false);
    if (error) return toast.error(error.message);
    setName("");
    toast.success("تمت الإضافة");
    load();
  };

  const toggle = async (c: Category) => {
    await supabase.from("service_provider_categories")
      .update({ is_active: !c.is_active } as any).eq("id", c.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف الفئة؟")) return;
    await supabase.from("service_provider_categories").delete().eq("id", id);
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader title="فئات مزودي الخدمات" />

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel className="self-start xl:order-last">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم الفئة (عربي)</Label>
                <Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: تصوير وإعلام" />
              </div>
              <Button onClick={add} disabled={loading} className="w-full">
                <Plus className="h-4 w-4" /> إضافة
              </Button>
            </div>
          </Panel>

          <div className="min-w-0 xl:col-span-2">
            {!fetched ? (
              <div className="h-72 animate-pulse rounded-2xl bg-card shadow-soft" />
            ) : items.length === 0 ? (
              <div className="rounded-2xl bg-card shadow-soft">
                <EmptyState
                  icon={Layers}
                  title="لا توجد فئات بعد"
                  action={<Button variant="outline" size="sm" onClick={() => nameRef.current?.focus()}><Plus className="h-4 w-4" /> إضافة</Button>}
                />
              </div>
            ) : (
              <Panel flush>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-6">الفئة</TableHead>
                      <TableHead className="w-24">مفعّلة</TableHead>
                      <TableHead className="w-16 pe-6"><span className="sr-only">إجراءات</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="ps-6">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-secondary text-primary">
                              <Layers className="h-[18px] w-[18px]" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold leading-[22px]">{c.name_ar}</p>
                              {c.name_en && <p className="text-xs leading-[18px] text-muted-foreground"><bdi dir="ltr">{c.name_en}</bdi></p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch checked={c.is_active} onCheckedChange={() => toggle(c)} aria-label={`تفعيل ${c.name_ar}`} />
                        </TableCell>
                        <TableCell className="pe-6 text-end">
                          <Button variant="ghost" size="icon" aria-label="حذف" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => remove(c.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
export default AdminProviderCategories;
