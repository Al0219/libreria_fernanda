import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, AlertTriangle, Edit2, Trash2, Package, History } from 'lucide-react'
import ProductFormModal from './ProductFormModal'
import PriceHistoryModal from './PriceHistoryModal'
import { api } from '../../lib/api'

interface Product {
  id: number
  name: string
  sku: string
  barcode: string
  sale_price: number
  purchase_price: number
  stock: number
  min_stock: number
  category_id: number
  supplier_id: number
  category_name: string
  supplier_name: string
  active: number
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('')
  const [categories, setCategories] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null)
  const [lowStockCount, setLowStockCount] = useState(0)

  const loadProducts = useCallback(async () => {
    const filters: any = {}
    if (search) filters.search = search
    if (categoryFilter) filters.categoryId = categoryFilter
    const data = await api.products.getAll(filters)
    setProducts(data as Product[])
    const low = (data as Product[]).filter(p => p.stock <= p.min_stock)
    setLowStockCount(low.length)
  }, [search, categoryFilter])

  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { api.categories.getAll().then((c: any) => setCategories(c as any[])) }, [])

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Desactivar el producto "${name}"?`)) return
    await api.products.delete(id)
    loadProducts()
  }

  const handleEdit = (product: Product) => {
    setEditProduct(product)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditProduct(null)
    loadProducts()
  }

  const margin = (p: Product) => p.purchase_price > 0
    ? (((p.sale_price - p.purchase_price) / p.purchase_price) * 100).toFixed(0)
    : '—'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-subtitle">{products.length} productos activos</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditProduct(null); setShowModal(true) }}>
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {/* Alerta de stock bajo */}
      {lowStockCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
          background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--accent-warning)',
          borderRadius: 'var(--radius-md)', marginBottom: 16
        }}>
          <AlertTriangle size={16} style={{ color: 'var(--accent-warning)', flexShrink: 0 }} />
          <span style={{ fontSize: 13 }}>
            <strong>{lowStockCount}</strong> producto{lowStockCount !== 1 ? 's' : ''} con stock bajo o agotado
          </span>
        </div>
      )}

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16, padding: 14 }}>
        <div className="flex gap-3">
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: 32 }}
              placeholder="Buscar por nombre, SKU o código de barras..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="select" style={{ width: 200 }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio venta</th>
              <th>Precio compra</th>
              <th>Margen</th>
              <th>Stock</th>
              <th>Proveedor</th>
              <th style={{ width: 112 }}></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <Package size={32} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} />
                  No hay productos registrados
                </td>
              </tr>
            ) : products.map(product => (
              <tr key={product.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{product.name}</div>
                  {product.sku && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>SKU: {product.sku}</div>}
                </td>
                <td>
                  <span className="badge badge-neutral">{product.category_name || '—'}</span>
                </td>
                <td style={{ fontWeight: 600 }}>Q{product.sale_price.toFixed(2)}</td>
                <td style={{ color: 'var(--text-secondary)' }}>Q{product.purchase_price.toFixed(2)}</td>
                <td>
                  <span className={`badge ${parseInt(margin(product)) >= 30 ? 'badge-success' : parseInt(margin(product)) >= 10 ? 'badge-warning' : 'badge-danger'}`}>
                    {margin(product)}{margin(product) !== '—' ? '%' : ''}
                  </span>
                </td>
                <td>
                  <span className={`badge ${product.stock === 0 ? 'badge-danger' : product.stock <= product.min_stock ? 'badge-warning' : 'badge-success'}`}>
                    {product.stock === 0 ? '✕ Sin stock' : product.stock <= product.min_stock ? `⚠ ${product.stock}` : `✓ ${product.stock}`}
                  </span>
                </td>
                <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{product.supplier_name || '—'}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setHistoryProduct(product)} title="Historial de precios">
                      <History size={13} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleEdit(product)} title="Editar">
                      <Edit2 size={13} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--accent-danger)' }} onClick={() => handleDelete(product.id, product.name)} title="Desactivar">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {historyProduct && (
        <PriceHistoryModal
          product={historyProduct}
          onClose={() => setHistoryProduct(null)}
        />
      )}

      {showModal && (
        <ProductFormModal
          product={editProduct}
          categories={categories}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
