import { useState, useEffect, useCallback } from 'react'
import { Plus, ShoppingBag, Eye, Calendar, Truck, FileText } from 'lucide-react'
import { api } from '../../lib/api'
import PurchaseFormModal from './PurchaseFormModal'
import PurchaseDetailModal from './PurchaseDetailModal'

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')

  const [showFormModal, setShowFormModal] = useState(false)
  const [selectedPurchaseForDetail, setSelectedPurchaseForDetail] = useState<any | null>(null)

  const [loading, setLoading] = useState(true)

  const loadPurchases = useCallback(async () => {
    setLoading(true)
    try {
      const filters: any = {}
      if (selectedSupplier) filters.supplierId = parseInt(selectedSupplier)

      const data = await api.stockEntries.getAll(filters)
      setPurchases(data as any[])
    } catch (err) {
      console.error('Error cargando compras:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedSupplier])

  useEffect(() => {
    api.suppliers.getAll().then((s: any) => setSuppliers(s as any[]))
  }, [])

  useEffect(() => {
    loadPurchases()
  }, [loadPurchases])

  const totalInvoiced = purchases.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0)

  return (
    <div>
      {/* Encabezado */}
      <div className="page-header flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingBag style={{ color: 'var(--accent-primary)' }} />
            Compras y Entradas de Mercancía
          </h1>
          <p className="page-subtitle">
            {purchases.length} registros de entrada · Inversión total en compras: <strong style={{ color: 'var(--accent-success)' }}>Q{totalInvoiced.toFixed(2)}</strong>
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowFormModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
        >
          <Plus size={16} /> Registrar Entrada / Compra
        </button>
      </div>

      {/* Filtros de Búsqueda */}
      <div className="card" style={{ marginBottom: 16, padding: 14 }}>
        <div className="flex gap-3 items-center">
          <Truck size={16} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Filtrar por proveedor:</span>
          <select
            className="select"
            style={{ width: 250 }}
            value={selectedSupplier}
            onChange={e => setSelectedSupplier(e.target.value)}
          >
            <option value="">Todos los proveedores</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {selectedSupplier && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedSupplier('')}
              style={{ color: 'var(--accent-danger)', fontSize: 12 }}
            >
              Limpiar filtro
            </button>
          )}
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: 80 }}>Folio</th>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Factura / Notas</th>
              <th style={{ textAlign: 'right' }}>Monto Total (Q)</th>
              <th style={{ width: 100, textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Cargando historial de compras...
                </td>
              </tr>
            ) : purchases.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                  <ShoppingBag size={36} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
                  <p style={{ fontSize: 15, fontWeight: 500 }}>No hay compras registradas</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                    Registra facturas de entrada para que el inventario aumente en automático.
                  </p>
                </td>
              </tr>
            ) : (
              purchases.map(purchase => (
                <tr
                  key={purchase.id}
                  onClick={() => setSelectedPurchaseForDetail(purchase)}
                  style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                  title="Haz clic para inspeccionar artículos"
                >
                  <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                    #{purchase.id}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                      <span>{purchase.date}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {purchase.supplier_name ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Truck size={14} style={{ color: 'var(--accent-info)' }} />
                        {purchase.supplier_name}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>General / Sin proveedor</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    {purchase.notes ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileText size={13} style={{ color: 'var(--text-muted)' }} />
                        {purchase.notes}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-success)', fontSize: 15 }}>
                    Q{Number(purchase.total_amount || 0).toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setSelectedPurchaseForDetail(purchase)}
                      style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <Eye size={15} /> Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modales */}
      {showFormModal && (
        <PurchaseFormModal
          onClose={() => setShowFormModal(false)}
          onSuccess={() => {
            setShowFormModal(false)
            loadPurchases()
          }}
        />
      )}

      {selectedPurchaseForDetail && (
        <PurchaseDetailModal
          purchase={selectedPurchaseForDetail}
          onClose={() => setSelectedPurchaseForDetail(null)}
        />
      )}
    </div>
  )
}
