import { cn } from "@/lib/utils";

interface PanelProps {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  // الجداول تملأ البطاقة حتى الحافة بلا حشوة
  flush?: boolean;
  children: React.ReactNode;
}

/** البطاقة الموحدة لكل أقسام الشاشات الداخلية */
const Panel = ({ title, description, actions, className, bodyClassName, flush, children }: PanelProps) => (
  <section className={cn("flex min-w-0 flex-col overflow-hidden rounded-2xl bg-card shadow-soft", className)}>
    {(title || actions) && (
      <div className={cn("flex items-start justify-between gap-3 px-6 pt-5", flush && "pb-4")}>
        <div className="min-w-0">
          {title && <h2 className="text-[15px] font-bold leading-6">{title}</h2>}
          {description && <p className="text-[13px] leading-5 text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
    )}
    <div className={cn("flex-1", !flush && "px-6 pb-6 pt-4", !flush && !title && !actions && "pt-6", bodyClassName)}>{children}</div>
  </section>
);

export default Panel;
