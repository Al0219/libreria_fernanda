import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ShoppingBag, Search, AlertCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { getBusinessDate } from '../../lib/business-time'
import PurchaseProductModal from './PurchaseProductModal'

interface PurchaseFormModalProps {
  onClose: () => void
  onSuccess: () => void
}

interface PurchaseItem {
  id: string
  productId: number
  name: string
  currentStock: number
  quantity: number
  purchasePrice: number
  salePrice: number
  subtotal: number
}

export default function PurchaseFormModal({ onClose, onSuccess }: PurchaseFormModalProps) {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [supplierId, setSupplierId] = useState<string>('')
  const [date, setDate] = useState<string>(getBusinessDate())
  const [notes, setNotes] = useState<string>('')
  
  // Lista de items del formulario
  const [items, setItems] = useState<PurchaseItem[]>([])
  
  // Búsqueda de productos
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showProductModal, setShowProductModal] = useState(false)
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.suppliers.getAll().then((s: any) => setSuppliers(s as any[]))
    api.categories.getAll().then((c: any) => setCategories(c as any[]))
  }, [])

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    const res = await api.products.getAll({ search: q })
    setSearchResults(res as any[])
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(search), 300)
    return () => clearTimeout(timer)
  }, [search, searchProducts])

  const addProductToPurchase = (p: any) => {
    // Si ya existe en la lista, sumar 1 a cantidad
    const existing = items.find(i => i.productId === p.id)
    if (existing) {
      updateItem(existing.id, 'quantity', existing.quantity + 1)
    } else {
      const initialPrice = p.purchase_price ?? p.purchasePrice ?? 0
      const initialSalePrice = p.sale_price ?? p.salePrice ?? 0
      const newItem: PurchaseItem = {
        id: `pi-${Date.now()}-${Math.random()}`,
        productId: p.id,
        name: p.name,
        currentStock: p.stock ?? 0,
        quantity: 1,
        purchasePrice: initialPrice,
        salePrice: initialSalePrice,
        subtotal: 1 * initialPrice
      }
      setItems(prev => [...prev, newItem])
    }
    setSearch('')
    setSearchResults([])
  }

  const updateItem = (id: string, field: 'quantity' | 'purchasePrice' | 'salePrice', val: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const next = { ...item, [field]: val >= 0 ? val : 0 }
        next.subtotal = next.quantity * next.purchasePrice
        return next
      }
      return item
    }))
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const totalAmount = items.reduce((acc, curr) => acc + curr.subtotal, 0)

  const handleSubmit = async () => {
    if (items.length === 0) {
      setError('Debes añadir al menos un producto a la compra')
      return
    }
    if (items.some(i => i.quantity <= 0)) {
      setError('Todas las cantidades deben ser mayores a 0')
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload = {
        supplierId: supplierId ? parseInt(supplierId) : null,
        date: date || getBusinessDate(),
        totalAmount,
        notes: notes.trim() || null,
        items: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          purchasePrice: i.purchasePrice,
          salePrice: i.salePrice,
          subtotal: i.subtotal,
        })),
      }

      await api.stockEntries.create(payload)
      onSuccess()
    } catch (e: any) {
      setError(e.message || 'Error al procesar la entrada de mercancía')
      setSaving(false)
    }
  }

  const selectedSupplierName = suppliers.find(s => String(s.id) === supplierId)?.name || 'Sin proveedor'

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 750, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={20} style={{ color: 'var(--accent-success)' }} />
              Registrar Entrada de Mercancía (Nueva Compra)
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-danger)', borderRadius: 6, padding: '8px 12px', marginBottom: 12, color: 'var(--accent-danger)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 4 }}>
            {/* Encabezado: Proveedor y Fecha */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 12, background: 'var(--bg-elevated)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div className="form-group">
                <label className="form-label">Proveedor (opcional)</label>
                <select className="select" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                  <option value="">-- Compra general / Sin proveedor --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fecha de entrada</label>
                <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">No. Factura / Notas (opcional)</label>
                <input
                  className="input"
                  placeholder="Ej: Factura #1094 o Remisión"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Buscador de productos con botón de creación rápida */}
            <div style={{ background: 'var(--bg-base)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Añadir productos a la entrada</label>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: 'var(--accent-primary)', color: 'white' }}
                  onClick={() => setShowProductModal(true)}
                >
                  <Plus size={14} /> Crear producto rápido
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: 34 }}
                  placeholder="Buscar producto por nombre o código para sumar al inventario..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />

                {/* Resultados flotantes */}
                {searchResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', maxHeight: 200, overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)', marginTop: 4
                  }}>
                    {searchResults.map(p => (
                      <div
                        key={p.id}
                        onClick={() => addProductToPurchase(p)}
                        style={{
                          padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)',
                          cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Stock actual: <strong>{p.stock}</strong> · Precio venta: Q{p.sale_price}</div>
                        </div>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: 13 }}>+ Añadir a lista</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Lista de productos agregados al documento */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Artículos a ingresar al inventario ({items.length})
              </h4>
              
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
                  No has agregado productos aún. Busca uno arriba o crea uno nuevo con el botón azul.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.25fr 1.55fr 1.55fr 1.45fr 40px', gap: 8, padding: '6px 12px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                    <span>Producto</span>
                    <span style={{ textAlign: 'center' }}>Cantidad que llega</span>
                    <span style={{ textAlign: 'right' }}>Precio de Costo (Q)</span>
                    <span style={{ textAlign: 'right' }}>Precio de Venta (Q)</span>
                    <span style={{ textAlign: 'right' }}>Subtotal (Q)</span>
                    <span></span>
                  </div>

                  {items.map(item => (
                    <div key={item.id} style={{
                      display: 'grid', gridTemplateColumns: '3fr 1.25fr 1.55fr 1.55fr 1.45fr 40px', gap: 8, alignItems: 'center',
                      padding: '10px 12px', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Stock actual: {item.currentStock} → <strong style={{ color: 'var(--accent-success)' }}>Nuevo stock: {item.currentStock + (Number(item.quantity) || 0)}</strong></div>
                      </div>

                      <div>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          style={{ textAlign: 'center', fontWeight: 600 }}
                          value={item.quantity === 0 ? '' : item.quantity}
                          onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Q</span>
                        <input
                          className="input"
                          type="number"
                          step="0.01"
                          min="0"
                          style={{ textAlign: 'right', width: 90 }}
                          value={item.purchasePrice === 0 ? '' : item.purchasePrice}
                          onChange={e => updateItem(item.id, 'purchasePrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Q</span>
                        <input
                          className="input"
                          type="number"
                          step="0.01"
                          min="0"
                          style={{ textAlign: 'right', width: 90 }}
                          value={item.salePrice === 0 ? '' : item.salePrice}
                          onChange={e => updateItem(item.id, 'salePrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', fontSize: 14 }}>
                        Q{item.subtotal.toFixed(2)}
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-danger)', padding: 4 }}
                          title="Quitar de la lista"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumen Total */}
            <div style={{ marginTop: 'auto', background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total de artículos a sumar al stock: </span>
                <strong style={{ fontSize: 15, color: 'var(--accent-success)' }}>{items.reduce((a, b) => a + (Number(b.quantity) || 0), 0)} unidades</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', marginRight: 8 }}>Total Factura / Compra:</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-primary)' }}>Q{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button
              className="btn btn-success btn-lg"
              onClick={handleSubmit}
              disabled={saving || items.length === 0}
              style={{ padding: '10px 24px', fontWeight: 700 }}
            >
              {saving ? 'Procesando entrada...' : '✓ Confirmar Entrada y Sumar Stock'}
            </button>
          </div>
        </div>
      </div>

      {showProductModal && (
        <PurchaseProductModal
          supplierId={supplierId}
          supplierName={selectedSupplierName}
          categories={categories}
          onClose={() => setShowProductModal(false)}
          onProductCreated={(newProd) => addProductToPurchase(newProd)}
        />
      )}
    </>
  )
}
