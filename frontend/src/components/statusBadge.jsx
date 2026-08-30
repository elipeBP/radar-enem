function StatusBadge({ status }) {

  const statusConfig = {
    checking: {
      color: 'bg-yellow-500',
      text: 'Verificando conexão...',
    },

    online: {
      color: 'bg-green-500',
      text: 'API Online',
    },

    offline: {
      color: 'bg-red-500',
      text: 'API Offline',
    },
  }

  const currentStatus = statusConfig[status]

  return (
    <div className="flex items-center gap-3">

      <span
        className={`h-3 w-3 rounded-full ${currentStatus.color}`}
      />

      <span className="font-medium text-slate-700">
        {currentStatus.text}
      </span>

    </div>
  )
}

export default StatusBadge