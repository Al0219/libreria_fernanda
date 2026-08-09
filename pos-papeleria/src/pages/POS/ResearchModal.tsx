import { useState } from 'react'
import { BookOpen } from 'lucide-react'

interface ResearchModalProps {
  onClose: () => void
  onAdd: (item: any) => void
}

const LEVELS = ['Preescolar', 'Primaria', 'Secundaria', 'Preparatoria', 'Universidad', 'Otro']

export default function ResearchModal({ onClose, onAdd }: ResearchModalProps) {
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState('Primaria')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')

  const handleAdd = () => {
    const p = parseFloat(price)
    if (!topic.trim() || isNaN(p) || p <= 0) return

    onAdd({
      itemType: 'research',
      description: `Investigación: ${topic}`,
      quantity: 1,
      unitPrice: p,
      metadataJson: { topic, level, notes },
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} style={{ color: 'var(--accent-primary)' }} />
            Servicio de Investigación
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tema */}
          <div className="form-group">
            <label className="form-label">Tema de investigación *</label>
            <input
              className="input"
              placeholder="Ej: Las 7 maravillas del mundo, la Revolución Mexicana..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              autoFocus
            />
          </div>

          {/* Nivel escolar */}
          <div className="form-group">
            <label className="form-label">Nivel escolar</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LEVELS.map(l => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className="btn btn-sm"
                  style={{
                    background: level === l ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: level === l ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div className="form-group">
            <label className="form-label">Notas adicionales (opcional)</label>
            <input
              className="input"
              placeholder="Ej: Incluir imágenes, agregar bibliografía..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Precio */}
          <div style={{
            background: 'var(--bg-base)', border: '2px solid var(--accent-primary)',
            borderRadius: 'var(--radius-md)', padding: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Precio del servicio</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Ingresa el precio según el trabajo
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 18, fontWeight: 600 }}>Q</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.50"
                style={{ width: 100, textAlign: 'right', fontSize: 22, fontWeight: 700, color: 'var(--accent-primary)', padding: '6px 10px' }}
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0.00"
                autoFocus={false}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={!topic.trim() || !price || parseFloat(price) <= 0}
          >
            Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  )
}
