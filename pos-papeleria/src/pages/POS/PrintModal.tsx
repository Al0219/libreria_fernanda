import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Printer } from 'lucide-react'

interface PrintPrice {
  id: number
  paper_type: string
  print_type: string
  price_per_page: number
}

interface PrintModalProps {
  onClose: () => void
  onAdd: (item: any) => void
}

const PAPER_TYPES = [
  'Papel normal', 'Papel reciclado', 'Papel grueso', 'Papel membretado', 'Papel preimpreso',
  'Papel perforado', 'Papel de color', 'Papel mate', 'Papel couché', 'Papel para folletos',
  'Papel fotográfico brillante', 'Papel fotográfico semibrillante', 'Papel fotográfico mate',
  'Cartulina', 'Opalina', 'Papel bristol', 'Etiquetas', 'Sobre', 'Transparencias', 'Papel de calco'
]

const PAPER_SIZES = [
  'Carta: 215.9 × 279.4 mm', 'Oficio: 215.9 x 330.2 mm', 'Legal: 216 x 340 mm', // Fixed Oficio measurement for realism, but I'll use exactly what they asked or close to it
  'A0: 841 × 1189 mm', 'A1: 594 × 841 mm', 'A2: 420 × 594 mm', 'A3: 297 × 420 mm',
  'A4: 210 × 297 mm', 'A5: 148 × 210 mm', 'A6: 105 × 148 mm', 'A7: 74 × 105 mm', 'A8: 52 × 74 mm',
  'Gobierno: 139.7 x 215.9 mm', 'Ejecutivo: 184.1 x 266.7 mm', 'Doble carta: 279.4 x 431.8 mm',
  '10 x 15 cm', '13 x 18 cm', '20 x 25 cm', 'Sobre DL: 110 x 220 mm', 'Sobre C5: 162 x 229 mm'
]

export default function PrintModal({ onClose, onAdd }: PrintModalProps) {
  const [prices, setPrices] = useState<PrintPrice[]>([])
  const [paperType, setPaperType] = useState(PAPER_TYPES[0])
  const [paperSize, setPaperSize] = useState(PAPER_SIZES[0])
  const [printType, setPrintType] = useState('bw')
  const [copies, setCopies] = useState(1)
  const [customPrice, setCustomPrice] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    api.config.getPrintPrices().then((p: any) => {
      setPrices(p as PrintPrice[])
    })
  }, [])

  const getBasePrice = () => {
    // Como ahora los tipos de papel son dinámicos, el precio base podría no coincidir con la DB
    // Por ahora retornamos 0 si no hay coincidencia exacta para obligar al usuario a fijar el precio,
    // o el usuario puede modificar la BD después para igualar estos nombres.
    const match = prices.find(p => p.paper_type === paperType && p.print_type === printType)
    return match?.price_per_page ?? 0
  }

  // Precio unitario por copia (lo que ingresa el usuario)
  const pricePerCopy = parseFloat(customPrice) || 0
  // Total = precio unitario × número de copias
  const totalPrice = pricePerCopy * copies

  // Cuando cambia la selección de papel/tipo y hay precio en DB, precargarlo como precio por copia
  useEffect(() => {
    const base = getBasePrice()
    if (base > 0) setCustomPrice(base.toFixed(2))
  }, [paperType, printType, prices])

  const handleAdd = () => {
    if (pricePerCopy <= 0) return
    const desc = description.trim() ||
      `Impresión ${paperType} (${paperSize}) ${printType === 'bw' ? 'B/N' : 'Color'}`

    onAdd({
      itemType: 'print',
      description: desc,
      quantity: copies,         // ← cantidad = número de copias
      unitPrice: pricePerCopy,  // ← precio individual por copia
      metadataJson: { paperType, paperSize, printType, copies },
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Printer size={18} style={{ color: 'var(--accent-warning)' }} />
            Servicio de Impresión
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tamaño de papel */}
          <div className="form-group">
            <label className="form-label">Tamaño de papel</label>
            <select
              className="select"
              value={paperSize}
              onChange={e => setPaperSize(e.target.value)}
            >
              {PAPER_SIZES.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          {/* Tipo de papel */}
          <div className="form-group">
            <label className="form-label">Tipo de papel</label>
            <select
              className="select"
              value={paperType}
              onChange={e => {
                setPaperType(e.target.value)
                if (e.target.value.toLowerCase().includes('foto')) setPrintType('color')
              }}
            >
              {PAPER_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Tipo de impresión */}
          {!paperType.toLowerCase().includes('foto') && (
            <div className="form-group">
              <label className="form-label">Tipo de impresión</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['bw', 'Blanco y Negro'], ['color', 'Color']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setPrintType(val)}
                    className="btn btn-sm"
                    style={{
                      flex: 1, background: printType === val ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                      color: printType === val ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Copias */}
          <div className="form-group">
            <label className="form-label">Copias / Cantidad</label>
            <input className="input" type="number" min={1} value={copies} onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>

          {/* Precio por copia + total */}
          <div style={{
            background: 'var(--bg-base)', border: '2px solid var(--accent-primary)', borderRadius: 'var(--radius-md)',
            padding: 16, display: 'flex', flexDirection: 'column', gap: 12
          }}>
            {/* Precio unitario */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Precio por copia</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Ingresa el precio individual de cada copia</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>Q</span>
                <input
                  className="input"
                  style={{ width: 100, textAlign: 'right', fontSize: 18, fontWeight: 700, color: 'var(--accent-primary)' }}
                  value={customPrice}
                  onChange={e => setCustomPrice(e.target.value)}
                  placeholder="0.00"
                  type="number"
                  min="0"
                  step="0.50"
                />
              </div>
            </div>

            {/* Separador y total calculado */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Q{pricePerCopy.toFixed(2)} × {copies} copia{copies > 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total:</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-success)' }}>
                  Q{totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Descripción opcional */}
          <div className="form-group">
            <label className="form-label">Descripción (opcional)</label>
            <input
              className="input"
              placeholder="Ej: Tarea de historia, fotos de portafolio..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={pricePerCopy <= 0}
          >
            Agregar al carrito ({copies} copia{copies > 1 ? 's' : ''} · Q{totalPrice.toFixed(2)})
          </button>
        </div>
      </div>
    </div>
  )
}
