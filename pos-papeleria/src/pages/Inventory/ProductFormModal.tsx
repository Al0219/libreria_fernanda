import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { api } from '../../lib/api'
import CategoryFormModal from './CategoryFormModal'

interface ProductFormModalProps {
  product: any | null
  categories: any[]
  onClose: () => void
}

export default function ProductFormModal({ product, categories: initialCategories, onClose }: ProductFormModalProps) {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>(initialCategories)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [form, setForm] = useState({
    name: product?.name || '',
    barcode: product?.barcode || '',
    categoryId: product?.category_id || '',
    supplierId: product?.supplier_id || '',
    salePrice: product?.sale_price || '',
    purchasePrice: product?.purchase_price || '',
    stock: product?.stock || 0,
    minStock: product?.min_stock || 5,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.suppliers.getAll().then((s: any) => setSuppliers(s as any[]))
  }, [])

  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  // Cuando se crea una categoría nueva: añadirla a la lista y seleccionarla
  const handleCategoryCreated = (newCategory: { id: number; name: string }) => {
    setCategories(prev => [...prev, newCategory])
    set('categoryId', String(newCategory.id))
    setShowCategoryModal(false)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.salePrice || parseFloat(String(form.salePrice)) <= 0) { setError('El precio de venta debe ser mayor a 0'); return }

    setSaving(true)
    setError('')
    try {
      const data = {
        ...form,
        salePrice: parseFloat(String(form.salePrice)),
        purchasePrice: parseFloat(String(form.purchasePrice)) || 0,
        stock: parseInt(String(form.stock)) || 0,
        minStock: parseInt(String(form.minStock)) || 5,
        categoryId: form.categoryId || null,
        supplierId: form.supplierId || null,
      }

      if (product) {
        await api.products.update(product.id, data)
      } else {
        await api.products.create(data)
      }
      onClose()
    } catch (e: any) {
      setError(e.message || 'Error al guardar')
      setSaving(false)
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">{product ? 'Editar producto' : 'Nuevo producto'}</h2>
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
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej: Cuaderno 100 hojas" autoFocus />
            </div>

            <div className="form-group">
              <label className="form-label">Código de barras</label>
              <input className="input" value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="Escanear o escribir" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* ─── Categoría con botón + ─── */}
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
                    style={{
                      flexShrink: 0,
                      padding: '8px 10px',
                      color: 'var(--accent-primary)',
                      borderColor: 'var(--accent-primary)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Usa <strong>+</strong> para crear una categoría nueva
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Proveedor</label>
                <select className="select" value={form.supplierId} onChange={e => set('supplierId', e.target.value)}>
                  <option value="">Sin proveedor</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Precio de venta * (Q)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Precio de compra (Q)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Stock actual
                </label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={e => set('stock', e.target.value)}
                  disabled={!!product}
                  style={product ? { backgroundColor: 'var(--bg-surface)', cursor: 'not-allowed', opacity: 0.8 } : {}}
                  title={product ? "El stock solo se puede modificar registrando una entrada de mercancía/compra" : ""}
                />
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
              {saving ? 'Guardando...' : product ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </div>
      </div>

      {/* Mini-modal de nueva categoría (z-index superior) */}
      {showCategoryModal && (
        <CategoryFormModal
          onClose={() => setShowCategoryModal(false)}
          onCreated={handleCategoryCreated}
        />
      )}
    </>
  )
}
