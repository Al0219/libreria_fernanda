import { AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 420, textAlign: 'center', padding: '32px 28px' }}
      >
        {/* Ícono */}
        <div style={{
          width: 60, height: 60, borderRadius: '50%', margin: '0 auto 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)',
        }}>
          <AlertTriangle
            size={28}
            style={{ color: danger ? 'var(--accent-danger)' : 'var(--accent-primary)' }}
          />
        </div>

        {/* Título */}
        <h2 style={{
          fontSize: 18, fontWeight: 700, marginBottom: 10,
          color: 'var(--text-primary)',
        }}>
          {title}
        </h2>

        {/* Mensaje */}
        <p style={{
          fontSize: 13.5, color: 'var(--text-secondary)',
          lineHeight: 1.6, marginBottom: 28,
        }}>
          {message}
        </p>

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            style={{ flex: 1, maxWidth: 160 }}
          >
            {cancelLabel}
          </button>
          <button
            className="btn"
            onClick={onConfirm}
            style={{
              flex: 1, maxWidth: 160, fontWeight: 700,
              background: danger ? 'var(--accent-danger)' : 'var(--accent-primary)',
              color: 'white',
              border: 'none',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
