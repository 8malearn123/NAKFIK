import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

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

  const load = async () => {
    const { data } = await supabase
      .from("service_provider_categories")
      .select("*")
      .order("display_order");
    setItems((data as any) || []);
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
      <div className="space-y-6 max-w-3xl">
        <h1 className="font-display text-2xl text-primary">فئات مزودي الخدمات</h1>

        <div className="bg-card border rounded-2xl p-4 flex gap-3 items-end">
          <div className="flex-1">
            <Label>اسم الفئة (عربي)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: تصوير وإعلام" />
          </div>
          <Button onClick={add} disabled={loading}>
            <Plus className="w-4 h-4 ml-1" /> إضافة
          </Button>
        </div>

        <div className="bg-card border rounded-2xl divide-y">
          {items.length === 0 && <p className="p-6 text-center text-muted-foreground text-sm">لا توجد فئات بعد</p>}
          {items.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-4">
              <span className="flex-1 font-medium">{c.name_ar}</span>
              <Switch checked={c.is_active} onCheckedChange={() => toggle(c)} />
              <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};
export default AdminProviderCategories;
