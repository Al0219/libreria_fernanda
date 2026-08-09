import { useState } from 'react'
import { Tag } from 'lucide-react'
import { api } from '../../lib/api'

interface CategoryFormModalProps {
  onClose: () => void
  onCreated: (category: { id: number; name: string }) => void
}

export default function CategoryFormModal({ onClose, onCreated }: CategoryFormModalProps) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('Escribe el nombre de la categoría'); return }

    setSaving(true)
    setError('')
    try {
      const result = await api.categories.create({ name: trimmed }) as { id: number; name: string }
      onCreated(result)
    } catch (e: any) {
      setError(e.message || 'Error al guardar')
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }} onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 380, padding: 24 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" style={{ marginBottom: 16 }}>
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={16} style={{ color: 'var(--accent-primary)' }} />
            Nueva categoría
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Nombre de la categoría *</label>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: Papelería, Cuadernos, Material de Oficina..."
            autoFocus
          />
          {error && (
            <span style={{ fontSize: 12, color: 'var(--accent-danger)', marginTop: 4 }}>{error}</span>
          )}
        </div>

        <div className="modal-footer" style={{ marginTop: 12, paddingTop: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Guardando...' : '+ Crear categoría'}
          </button>
        </div>
      </div>
    </div>
  )
}
