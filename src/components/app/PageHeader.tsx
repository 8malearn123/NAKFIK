interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      <h1 className="text-2xl font-bold leading-[34px]">{title}</h1>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
  </div>
);

export default PageHeader;
