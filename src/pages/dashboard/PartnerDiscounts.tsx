import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, ExternalLink, Tag, Sparkles, Calendar } from "lucide-react";

const PartnerDiscounts = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "خصومات الشركاء | نكفيك";
    supabase
      .from("partner_brands")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        setItems(data || []);
        setLoading(false);
      });
  }, []);

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("تم نسخ الكود");
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-primary via-primary/90 to-accent p-6 sm:p-8 text-primary-foreground">
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-primary-foreground/10 blur-2xl" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-primary-foreground/10 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-foreground/15 backdrop-blur flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl">خصومات الشركاء</h1>
              <p className="text-sm sm:text-base text-primary-foreground/80 mt-1">
                عروض حصرية لمنظمي الفعاليات في نكفيك — انسخ الكود واستفد فوراً
              </p>
              <div className="flex items-center gap-2 mt-3 text-xs">
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 hover:bg-primary-foreground/25">
                  {items.length} {items.length === 1 ? "شريك" : "شركاء"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-20 bg-card border rounded-3xl">
            <Tag className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">لا توجد عروض حالياً — تابعنا قريباً</p>
          </div>
        )}

        <div dir="rtl" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 [direction:rtl]">
          {items.map((b) => (
            <div
              key={b.id}
              className="group relative bg-card border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Discount ribbon */}
              <div className="absolute top-3 left-3 z-10">
                <div className="bg-gradient-to-bl from-accent to-primary text-primary-foreground rounded-full px-3 py-1 text-xs font-bold shadow-lg">
                  {b.discount_type === "percent"
                    ? `خصم ${b.discount_value}%`
                    : `خصم ${b.discount_value} ر.س`}
                </div>
              </div>

              {/* Logo banner */}
              <div className="h-28 bg-gradient-to-bl from-muted to-muted/40 flex items-center justify-center border-b">
                {b.logo_url ? (
                  <img
                    src={b.logo_url}
                    alt={b.name}
                    className="max-h-20 max-w-[60%] object-contain group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center font-display text-3xl text-primary">
                    {b.name.charAt(0)}
                  </div>
                )}
              </div>

              <div className="p-5 space-y-3">
                <div>
                  <h3 className="font-bold text-base leading-tight">{b.name}</h3>
                  {b.category && (
                    <p className="text-xs text-muted-foreground mt-0.5">{b.category}</p>
                  )}
                </div>

                {b.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {b.description}
                  </p>
                )}

                {/* Coupon */}
                <div className="relative">
                  <div className="border-2 border-dashed border-primary/30 bg-primary/5 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground mb-0.5">كود الخصم</p>
                      <p className="font-mono font-bold text-primary truncate" dir="ltr">
                        {b.discount_code}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => copy(b.discount_code)}
                      className="flex-shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5 ml-1" /> نسخ
                    </Button>
                  </div>
                </div>

                {b.terms && (
                  <p className="text-xs text-muted-foreground border-r-2 border-muted pr-2 line-clamp-2">
                    {b.terms}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t">
                  {b.expires_at ? (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      ينتهي {new Date(b.expires_at).toLocaleDateString("ar-SA")}
                    </p>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">عرض مستمر</span>
                  )}
                  {b.website_url && (
                    <a
                      href={b.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      زيارة <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};
export default PartnerDiscounts;
