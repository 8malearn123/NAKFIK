import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import EmptyState from "@/components/app/EmptyState";
import PageHeader from "@/components/app/PageHeader";
import StatusBadge from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar, Copy, ExternalLink, Tag } from "lucide-react";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";

// صياغة العدد بالعربية: شريك واحد، شريكان، 5 شركاء، 12 شريكاً
const partnersLabel = (n: number) => {
  if (n === 1) return "شريك واحد";
  if (n === 2) return "شريكان";
  return n <= 10 ? `${n} شركاء` : `${formatNumber(n)} شريكاً`;
};

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
      <div className="space-y-6">
        <PageHeader
          title="خصومات الشركاء"
          description="عروض حصرية لمنظمي الفعاليات في نكفيك — انسخ الكود واستفد فوراً"
          actions={!loading && items.length > 0 && <span className="text-sm text-muted-foreground">{partnersLabel(items.length)}</span>}
        />

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-card shadow-soft" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-card shadow-soft">
            <EmptyState
              icon={Tag}
              title="لا توجد عروض حالياً"
              description="تابعنا قريباً"
              action={<Button asChild><Link to="/dashboard/services">سوق الخدمات</Link></Button>}
            />
          </div>
        ) : (
          <div dir="rtl" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((b) => (
              <article key={b.id} className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-soft">
                <div className="flex h-[76px] items-center justify-between bg-secondary px-5">
                  <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-white/85 text-base font-bold text-primary">
                    {b.logo_url ? <img src={b.logo_url} alt={b.name} className="h-full w-full object-contain p-1" /> : b.name.charAt(0)}
                  </span>
                  <StatusBadge tone="primary" className="bg-white">
                    خصم {b.discount_type === "percent" ? formatPercent(b.discount_value) : `${formatNumber(b.discount_value)} ر.س`}
                  </StatusBadge>
                </div>

                <div className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-4">
                  <div>
                    <h3 className="truncate text-base font-bold leading-6">{b.name}</h3>
                    {b.category && <p className="text-xs leading-[18px] text-muted-foreground">{b.category}</p>}
                  </div>

                  {b.description && <p className="line-clamp-2 min-h-10 text-[13px] leading-5 text-muted-foreground">{b.description}</p>}

                  {/* Coupon */}
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 py-2.5 pe-2.5 ps-4">
                    <div className="min-w-0">
                      <p className="text-xs leading-[18px] text-muted-foreground">كود الخصم</p>
                      <p className="truncate text-sm font-bold leading-[22px]"><bdi dir="ltr">{b.discount_code}</bdi></p>
                    </div>
                    <Button size="sm" variant="soft" className="flex-none" onClick={() => copy(b.discount_code)}>
                      <Copy className="w-3.5 h-3.5" /> نسخ
                    </Button>
                  </div>

                  {b.terms && <p className="line-clamp-2 text-xs leading-[18px] text-muted-foreground">{b.terms}</p>}

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3 text-xs leading-[18px] text-muted-foreground">
                    {b.expires_at ? (
                      <p className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 flex-none opacity-70" />
                        ينتهي {formatDate(b.expires_at)}
                      </p>
                    ) : (
                      <span>عرض مستمر</span>
                    )}
                    {b.website_url && (
                      <a
                        href={b.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        زيارة <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
export default PartnerDiscounts;
