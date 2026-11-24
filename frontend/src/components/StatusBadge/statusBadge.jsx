
const statusConfig = {
  checking: { label: 'Verificando API...', dot: 'bg-amber-500 animate-pulse' },
  online: { label: 'API conectada', dot: 'bg-emerald-500' },
  offline: { label: 'API indisponível', dot: 'bg-red-500' },
};

function StatusBadge({ status = 'checking' }) {
  const config = statusConfig[status] ?? statusConfig.checking;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
      <span className={`size-2.5 shrink-0 rounded-full ${config.dot}`} aria-hidden="true" />
      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {config.label}
      </span>
    </div>
  );
}

export default StatusBadge;
