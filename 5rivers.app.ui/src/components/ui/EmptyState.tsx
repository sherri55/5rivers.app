interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-on-surface mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-on-surface-variant max-w-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
