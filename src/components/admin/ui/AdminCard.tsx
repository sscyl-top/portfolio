type AdminCardProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
};

export function AdminCard({
  title,
  description,
  icon,
  action,
  children,
  className = "",
  padded = true,
}: AdminCardProps) {
  return (
    <section className={`rounded-lg border border-white/[0.08] bg-white/[0.025] ${padded ? "p-4" : ""} ${className}`}>
      {title || action || description ? (
        <div className={`flex items-start justify-between gap-3 ${padded ? "" : "p-4 pb-0"} ${children ? "mb-3" : ""}`}>
          <div className="flex items-start gap-3 min-w-0">
            {icon ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan/10 text-cyan">
                {icon}
              </div>
            ) : null}
            <div className="min-w-0">
              {title ? <h3 className="text-sm font-semibold text-white/88">{title}</h3> : null}
              {description ? <p className="mt-0.5 text-[11px] text-white/38">{description}</p> : null}
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
