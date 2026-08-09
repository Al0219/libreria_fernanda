import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { api } from '../../lib/api'
import { formatBusinessTime, getBusinessDate } from '../../lib/business-time'
import { CheckCircle, Banknote, FileText, Printer } from 'lucide-react'
import { CartItem } from '../../stores/cart.store'
import { TicketDocument, TicketData } from './TicketPDF'

interface PaymentModalProps {
  total: number
  items: CartItem[]
  onClose: () => void
  onComplete: () => void
}

type PaymentMethod = 'cash' | 'card' | 'transfer'

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: '💵 Efectivo',
  card: '💳 Tarjeta',
  transfer: '📲 Transferencia',
}

export default function PaymentModal({ total, items, onClose, onComplete }: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [amountPaid, setAmountPaid] = useState(total.toFixed(2))
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [saleResult, setSaleResult] = useState<{ folio: string; date: string; createdAt: string; changeGiven: number } | null>(null)
  const [printingPdf, setPrintingPdf] = useState(false)

  const change = Math.max(0, parseFloat(amountPaid) - total)
  const canComplete = parseFloat(amountPaid) >= total || method !== 'cash'

  const handleComplete = async () => {
    setSaving(true)
    try {
      const result = await api.sales.create({
        subtotal: total,
        discount: 0,
        total,
        paymentMethod: method,
        amountPaid: parseFloat(amountPaid),
        changeGiven: method === 'cash' ? change : 0,
        items: items.map(item => ({
          itemType: item.itemType,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          metadataJson: item.metadataJson,
        })),
      }) as { id: number; folio: string; date: string; createdAt: string }

      setSaleResult({ folio: result.folio, date: result.date, createdAt: result.createdAt, changeGiven: method === 'cash' ? change : 0 })
      setDone(true)
    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  const handlePrintTicket = async () => {
    if (!saleResult) return
    setPrintingPdf(true)
    try {
      // Cargar configuración del negocio
      const config = await api.config.getAll() as Record<string, string>

      const ticketData: TicketData = {
        folio: saleResult.folio,
        date: saleResult.date || getBusinessDate(),
        time: formatBusinessTime(saleResult.createdAt),
        paymentMethod: method,
        amountPaid: parseFloat(amountPaid),
        changeGiven: saleResult.changeGiven,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          itemType: item.itemType,
        })),
        subtotal: total,
        total,
        businessName: config.business_name || 'Papelería',
        businessAddress: config.business_address,
        businessPhone: config.business_phone,
        ticketFooter: config.ticket_footer,
      }

      // Generar PDF en el renderer
      const blob = await pdf(<TicketDocument data={ticketData} />).toBlob()
      const arrayBuffer = await blob.arrayBuffer()
      const uint8 = new Uint8Array(arrayBuffer)
      const filename = `ticket-${saleResult.folio}.pdf`

      await api.pdf.saveAndOpen(uint8, filename)
    } catch (err) {
      console.error('Error al generar ticket:', err)
      alert('No se pudo generar el ticket PDF.')
    } finally {
      setPrintingPdf(false)
    }
  }

  // ── Pantalla de éxito ────────────────────────────────────────────────────────
  if (done && saleResult) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ textAlign: 'center', padding: 40, maxWidth: 420 }}>
          <CheckCircle size={64} style={{ color: 'var(--accent-success)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>¡Venta registrada!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>
            Folio: <strong style={{ color: 'var(--accent-primary)' }}>{saleResult.folio}</strong>
          </p>
          {saleResult.changeGiven > 0 && (
            <div style={{
              display: 'inline-block', marginTop: 10, padding: '8px 20px',
              background: 'rgba(67,191,160,0.12)', borderRadius: 8,
              border: '1px solid var(--accent-success)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--accent-success)', marginBottom: 2 }}>Cambio a entregar</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-success)' }}>
                Q{saleResult.changeGiven.toFixed(2)}
              </div>
            </div>
          )}

          {/* Botones */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
            <button
              className="btn btn-primary"
              onClick={handlePrintTicket}
              disabled={printingPdf}
              style={{ gap: 8 }}
            >
              {printingPdf
                ? <><Printer size={15} /> Generando...</>
                : <><FileText size={15} /> Imprimir ticket</>
              }
            </button>
            <button className="btn btn-ghost" onClick={onComplete}>
              Cerrar
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
            El ticket se abrirá en el visor de PDF del sistema
          </p>
        </div>
      </div>
    )
  }

  // ── Modal de cobro ───────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Banknote size={18} style={{ color: 'var(--accent-success)' }} />
            Cobrar venta
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Resumen */}
        <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
            {items.length} ítem{items.length !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-primary)' }}>
            Q{total.toFixed(2)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Método de pago */}
          <div className="form-group">
            <label className="form-label">Método de pago</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className="btn btn-sm"
                  style={{
                    padding: '10px 8px',
                    background: method === m ? 'var(--accent-success)' : 'var(--bg-elevated)',
                    color: method === m ? 'white' : 'var(--text-secondary)',
                    fontSize: 12.5,
                  }}
                >
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Monto recibido (solo para efectivo) */}
          {method === 'cash' && (
            <div className="form-group">
              <label className="form-label">Monto recibido</label>
              <input
                className="input"
                type="number"
                step="0.50"
                style={{ fontSize: 20, fontWeight: 700, textAlign: 'right', padding: '10px 14px' }}
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
              />
              {/* Accesos rápidos */}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {[20, 50, 100, 200, 500].map(bill => (
                  <button
                    key={bill}
                    onClick={() => setAmountPaid(bill.toString())}
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1, fontSize: 12 }}
                  >
                    Q{bill}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cambio */}
          {method === 'cash' && change > 0 && (
            <div style={{
              background: 'rgba(67,191,160,0.10)', border: '1px solid var(--accent-success)',
              borderRadius: 'var(--radius-md)', padding: 14, textAlign: 'center'
            }}>
              <div style={{ fontSize: 12, color: 'var(--accent-success)', marginBottom: 4 }}>Cambio a entregar</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-success)' }}>Q{change.toFixed(2)}</div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button
            className="btn btn-success btn-lg"
            onClick={handleComplete}
            disabled={!canComplete || saving}
          >
            {saving ? 'Guardando...' : '✓ Confirmar venta'}
          </button>
        </div>
      </div>
    </div>
  )
}
