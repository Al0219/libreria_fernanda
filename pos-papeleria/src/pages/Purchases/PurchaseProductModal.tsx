import { useState } from 'react'
import { Plus, Package } from 'lucide-react'
import { api } from '../../lib/api'
import CategoryFormModal from '../Inventory/CategoryFormModal'

interface PurchaseProductModalProps {
  supplierId: string
  supplierName: string
  categories: any[]
  onClose: () => void
  onProductCreated: (newProduct: any) => void
}

export default function PurchaseProductModal({
  supplierId,
  supplierName,
  categories: initialCategories,
  onClose,
  onProductCreated,
}: PurchaseProductModalProps) {
  const [categories, setCategories] = useState<any[]>(initialCategories)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    barcode: '',
    categoryId: '',
    salePrice: '',
    purchasePrice: '',
    minStock: 5,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  const handleCategoryCreated = (newCategory: { id: number; name: string }) => {
    setCategories(prev => [...prev, newCategory])
    set('categoryId', String(newCategory.id))
    setShowCategoryModal(false)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('El nombre del producto es obligatorio'); return }
    if (!form.salePrice || parseFloat(String(form.salePrice)) <= 0) {
      setError('El precio de venta debe ser mayor a 0')
      return
    }

    setSaving(true)
    setError('')
    try {
      const data = {
        name: form.name.trim(),
        barcode: form.barcode.trim() || null,
        categoryId: form.categoryId || null,
        supplierId: supplierId ? parseInt(supplierId) : null,
        salePrice: parseFloat(String(form.salePrice)),
        purchasePrice: parseFloat(String(form.purchasePrice)) || 0,
        stock: 0, // La compra incrementa el stock al registrarse
        minStock: parseInt(String(form.minStock)) || 5,
      }

      const res = await api.products.create(data)
      const created = await api.products.getById(res.id)
      onProductCreated(created || { ...data, id: res.id, name: data.name, stock: 0 })
      onClose()
    } catch (e: any) {
      setError(e.message || 'Error al guardar el producto')
      setSaving(false)
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 550 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={18} style={{ color: 'var(--accent-primary)' }} />
              Crear Producto Rápido (para compra)
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-danger)', borderRadius: 6, padding: '8px 12px', marginBottom: 16, color: 'var(--accent-danger)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Nombre del producto *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej: Bolígrafo azul punta fina" autoFocus />
            </div>

            <div className="form-group">
              <label className="form-label">Código de barras / SKU</label>
              <input className="input" value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="Escanear o escribir (opcional)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    className="select"
                    value={form.categoryId}
                    onChange={e => set('categoryId', e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Sin categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => setShowCategoryModal(true)}
                    title="Crear nueva categoría"
                    style={{ flexShrink: 0, padding: '8px 10px', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Proveedor asignado</label>
                <input
                  className="input"
                  disabled
                  value={supplierId ? supplierName : 'Sin proveedor general'}
                  style={{ backgroundColor: 'var(--bg-surface)', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Tomado de la factura de compra actual
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Precio de venta * (Q)</label>
                <input className="input" type="number" step="0.50" min="0" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Precio de compra inicial (Q)</label>
                <input className="input" type="number" step="0.50" min="0" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Stock inicial</label>
                <input
                  className="input"
                  type="number"
                  disabled
                  value={0}
                  style={{ backgroundColor: 'var(--bg-surface)', cursor: 'not-allowed', color: 'var(--accent-primary)', fontWeight: 'bold' }}
                />
                <span style={{ fontSize: 11, color: 'var(--accent-primary)', marginTop: 2 }}>
                  Se aumentará al confirmar la compra
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Stock mínimo (alerta)</label>
                <input className="input" type="number" min="0" value={form.minStock} onChange={e => set('minStock', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Guardando...' : 'Crear y añadir a la compra'}
            </button>
          </div>
        </div>
      </div>

      {showCategoryModal && (
        <CategoryFormModal
          onClose={() => setShowCategoryModal(false)}
          onCreated={handleCategoryCreated}
        />
      )}
    </>
  )
}
