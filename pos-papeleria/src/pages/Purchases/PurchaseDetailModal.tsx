import { useEffect, useState } from 'react'
import { ShoppingBag, Calendar, Truck, FileText, Loader, CreditCard } from 'lucide-react'
import { api } from '../../lib/api'

interface PurchaseDetailModalProps {
  purchase: any // Objeto con id, date, total_amount, supplier_name, notes, etc. de la tabla principal
  onClose: () => void
}

const paymentMethodLabels: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', credit: 'Crédito / pendiente', unknown: 'Sin registro' }

export default function PurchaseDetailModal({ purchase, onClose }: PurchaseDetailModalProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.stockEntries.getById(purchase.id).then((res: any) => {
      setItems(res?.items || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [purchase.id])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620, width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingBag size={20} style={{ color: 'var(--accent-primary)' }} />
            Detalle de Compra / Entrada #{purchase.id}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tarjeta de Resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, background: 'var(--bg-elevated)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>
                <Calendar size={14} /> Fecha de registro
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{purchase.date}</div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>
                <Truck size={14} /> Proveedor
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                {purchase.supplier_name || 'Compra General / Sin Prov.'}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>
                <FileText size={14} /> Factura / Notas
              </div>
              <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-secondary)' }}>
                {purchase.notes || 'Ninguna'}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>
                <CreditCard size={14} /> Medio de pago
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                {paymentMethodLabels[String(purchase.payment_method)] || 'Efectivo'}
              </div>
            </div>
          </div>

          {/* Tabla de Productos Ingresados */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
              Artículos recibidos en esta entrada
            </h4>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--text-muted)', gap: 8 }}>
                <Loader size={18} className="animate-spin" /> Cargando artículos...
              </div>
            ) : items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)' }}>
                No se encontraron artículos para esta compra.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr 1.4fr 1.4fr 1.4fr', gap: 8, padding: '6px 12px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  <span>Producto</span>
                  <span style={{ textAlign: 'center' }}>Cantidad recibida</span>
                  <span style={{ textAlign: 'right' }}>Precio Costo (Q)</span>
                  <span style={{ textAlign: 'right' }}>Precio Venta (Q)</span>
                  <span style={{ textAlign: 'right' }}>Subtotal (Q)</span>
                </div>

                {items.map(item => (
                  <div key={item.id} style={{
                    display: 'grid', gridTemplateColumns: '3fr 1.2fr 1.4fr 1.4fr 1.4fr', gap: 8, alignItems: 'center',
                    padding: '10px 12px', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)'
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{item.product_name || 'Producto #' + item.product_id}</span>
                    <span style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent-success)' }}>+{item.quantity} unds.</span>
                    <span style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>Q{item.purchase_price?.toFixed(2)}</span>
                    <span style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>Q{Number(item.sale_price || 0).toFixed(2)}</span>
                    <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>Q{item.subtotal?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gran Total */}
          <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Total Pagado en Factura:</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-primary)' }}>Q{purchase.total_amount?.toFixed(2)}</span>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
