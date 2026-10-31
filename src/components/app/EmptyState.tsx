import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
      <Icon className="h-6 w-6" />
    </span>
    <p className="mt-4 text-[15px] font-bold leading-6">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
