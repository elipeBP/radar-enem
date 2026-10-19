
import './styles-status-badge/StatusBadge.css';

const statusConfig = {
  checking: {
    label: 'Verificando API...',
    className: 'status-badge__dot--checking',
  },
  online: {
    label: 'API conectada',
    className: 'status-badge__dot--online',
  },
  offline: {
    label: 'API indisponível',
    className: 'status-badge__dot--offline',
  },
};

function StatusBadge({ status = 'checking' }) {
  const config = statusConfig[status] ?? statusConfig.checking;

  return (
    <div className="status-badge">
      <span
        className={`status-badge__dot ${config.className}`}
        aria-hidden="true"
      />
      <span className="status-badge__text">{config.label}</span>
    </div>
  );
}

export default StatusBadge;

