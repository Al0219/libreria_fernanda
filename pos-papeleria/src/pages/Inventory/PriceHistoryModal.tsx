import { useEffect, useMemo, useState } from 'react'
import { History, Loader, TrendingDown, TrendingUp, X } from 'lucide-react'
import { api } from '../../lib/api'

interface PriceHistoryModalProps {
  product: {
    id: number
    name: string
  }
  onClose: () => void
}

interface PriceHistoryItem {
  id: number
  entry_id: number
  date: string
  supplier_id: number | null
  supplier_name: string
  quantity: number
  purchase_price: number
  sale_price: number
}

const formatMoney = (value: number) => `Q${Number(value || 0).toFixed(2)}`
const formatDate = (date: string) => date?.split('-').reverse().join('/') || '—'

export default function PriceHistoryModal({ product, onClose }: PriceHistoryModalProps) {
  const [items, setItems] = useState<PriceHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    api.stockEntries.getPriceHistory(product.id)
      .then((data: any) => {
        if (active) setItems(data as PriceHistoryItem[])
      })
      .catch(() => {
        if (active) setError('No se pudo cargar el historial de precios.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [product.id])

  const lowest = useMemo(() => {
    if (items.length === 0) return null
    return items.reduce((best, item) =>
      Number(item.purchase_price) < Number(best.purchase_price) ? item : best
    )
  }, [items])

  const latest = items.length > 0 ? items[items.length - 1] : null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 860, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={event => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={20} style={{ color: 'var(--accent-primary)' }} />
              Historial de precios
            </h2>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{product.name}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <Loader size={20} className="spin" />
            </div>
          ) : error ? (
            <div style={{ padding: 20, color: 'var(--accent-danger)', textAlign: 'center' }}>{error}</div>
          ) : items.length === 0 ? (
            <div style={{ padding: 32, color: 'var(--text-muted)', textAlign: 'center', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)' }}>
              Aún no hay compras registradas para este producto.
            </div>
          ) : (
            <>
              <div className="grid-cols-3" style={{ marginBottom: 16 }}>
                <div className="stat-card">
                  <div className="stat-label">Último costo</div>
                  <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{formatMoney(latest!.purchase_price)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{latest!.supplier_name}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Menor costo histórico</div>
                  <div className="stat-value" style={{ color: 'var(--accent-success)' }}>{formatMoney(lowest!.purchase_price)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{lowest!.supplier_name}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Compras registradas</div>
                  <div className="stat-value">{items.length}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Sin compras canceladas</div>
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Proveedor</th>
                      <th style={{ textAlign: 'right' }}>Cantidad</th>
                      <th style={{ textAlign: 'right' }}>Costo</th>
                      <th style={{ textAlign: 'right' }}>Venta</th>
                      <th style={{ textAlign: 'right' }}>Cambio de costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const previous = index > 0 ? items[index - 1] : null
                      const difference = previous ? Number(item.purchase_price) - Number(previous.purchase_price) : null
                      const hasIncrease = difference !== null && difference > 0
                      const hasDecrease = difference !== null && difference < 0

                      return (
                        <tr key={item.id}>
                          <td>{formatDate(item.date)}</td>
                          <td style={{ fontWeight: 500 }}>{item.supplier_name}</td>
                          <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(item.purchase_price)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{formatMoney(item.sale_price)}</td>
                          <td style={{
                            textAlign: 'right',
                            color: hasIncrease ? 'var(--accent-danger)' : hasDecrease ? 'var(--accent-success)' : 'var(--text-muted)',
                            fontWeight: difference === null || difference === 0 ? 400 : 600
                          }}>
                            {difference === null ? 'Primera compra' : difference === 0 ? 'Sin cambio' : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {hasIncrease ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {hasIncrease ? '+' : ''}{formatMoney(difference)}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
