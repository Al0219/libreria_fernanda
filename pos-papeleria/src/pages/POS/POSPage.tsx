import { useState, useEffect, useCallback } from 'react'
import { api } from '../../lib/api'
import { Search, Printer, BookOpen, X, Minus, Plus, CreditCard, Trash2 } from 'lucide-react'
import { useCartStore } from '../../stores/cart.store'
import PrintModal from './PrintModal'
import ResearchModal from './ResearchModal'
import PaymentModal from './PaymentModal'
import CustomerFormModal, { type Customer } from '../../components/CustomerFormModal'

interface Product {
  id: number
  name: string
  sku: string
  sale_price: number
  stock: number
  category_name: string
}

export default function POSPage() {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [todaySales, setTodaySales] = useState<any[]>([])
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showResearchModal, setShowResearchModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerSelector, setShowCustomerSelector] = useState(false)
  const [showQuickCustomer, setShowQuickCustomer] = useState(false)

  const { items, addItem, removeItem, updateQuantity, updatePrice, clearCart, total } = useCartStore()

  // Búsqueda de productos
  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setProducts([]); return }
    const results = await api.products.getAll({ search: q })
    setProducts(results as Product[])
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(search), 300)
    return () => clearTimeout(timer)
  }, [search, searchProducts])

  useEffect(() => {
    if (!showCustomerSelector) return
    const timer = setTimeout(async () => {
      const data = await api.customers.getAll({ search: customerSearch })
      setCustomers(data as Customer[])
    }, 200)
    return () => clearTimeout(timer)
  }, [showCustomerSelector, customerSearch])
  // Cargar ventas del día
  const loadTodaySales = useCallback(async () => {
    const sales = await api.sales.getToday()
    setTodaySales(sales as any[])
  }, [])

  useEffect(() => { loadTodaySales() }, [loadTodaySales])

  const addProductToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`No hay stock disponible para: ${product.name}`)
      return
    }
    const existing = items.find(i => i.productId === product.id && i.itemType === 'product')
    if (existing) {
      updateQuantity(existing.id, existing.quantity + 1)
    } else {
      addItem({
        itemType: 'product',
        productId: product.id,
        description: product.name,
        quantity: 1,
        unitPrice: product.sale_price,
        maxStock: product.stock,
      })
    }
    setSearch('')
    setProducts([])
  }

  const handleSaleComplete = async () => {
    await loadTodaySales()
    clearCart()
    setSelectedCustomer(null)
    setCustomerSearch('')
    setShowPaymentModal(false)
  }

  const totalToday = todaySales.reduce((sum: number, s: any) => sum + s.total, 0)

  return (
    <div style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header rápido */}
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Punto de Venta</h1>
          <p className="page-subtitle">
            {todaySales.length} ventas hoy · Total: Q{totalToday.toFixed(2)}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowPrintModal(true)}>
            <Printer size={15} /> Impresión
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowResearchModal(true)}>
            <BookOpen size={15} /> Investigación
          </button>
        </div>
      </div>

      <div className="pos-layout">
        {/* Columna izquierda — búsqueda */}
        <div className="pos-left">
          {/* Buscador */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                style={{ paddingLeft: 34 }}
                placeholder="Buscar producto por nombre o SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Resultados */}
            {products.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addProductToCart(product)}
                    disabled={product.stock <= 0}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', background: 'var(--bg-base)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', cursor: product.stock <= 0 ? 'not-allowed' : 'pointer', color: 'var(--text-primary)',
                      transition: 'all 0.1s ease',
                      opacity: product.stock <= 0 ? 0.5 : 1
                    }}
                    onMouseEnter={e => { if (product.stock > 0) e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 500, fontSize: 13.5, textDecoration: product.stock <= 0 ? 'line-through' : 'none' }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: 12, color: product.stock <= 0 ? 'var(--accent-danger)' : 'var(--text-muted)' }}>
                        {product.category_name} · Stock: {product.stock} {product.stock <= 0 && '(Agotado)'}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 15 }}>
                      Q{product.sale_price.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {search && products.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: 13 }}>
                No se encontraron productos para "{search}"
              </div>
            )}
          </div>

          {/* Ventas del día */}
          <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Ventas de hoy
            </h3>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {todaySales.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: 13 }}>
                  No hay ventas registradas hoy
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {todaySales.map((sale: any) => (
                    <div key={sale.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{sale.folio}</span>
                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                          {sale.payment_method === 'cash' ? '💵 Efectivo' : sale.payment_method === 'card' ? '💳 Tarjeta' : '📲 Transfer'}
                        </span>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--accent-success)' }}>
                        Q{sale.total.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna derecha — carrito */}
        <div className="pos-right">
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Carrito ({items.length})</span>
            {items.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={clearCart} style={{ color: 'var(--accent-danger)' }}>
                <Trash2 size={13} /> Limpiar
              </button>
            )}
          </div>

          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: selectedCustomer || showCustomerSelector ? 8 : 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Cliente</span>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: 'var(--accent-primary)' }} onClick={() => setShowQuickCustomer(true)}>
                  <Plus size={13} /> Nuevo
                </button>
                <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={() => setShowCustomerSelector(value => !value)}>
                  <Search size={13} /> {selectedCustomer ? 'Cambiar' : 'Seleccionar'}
                </button>
              </div>
            </div>

            {selectedCustomer ? (
              <div className="flex justify-between items-center" style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: '7px 9px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedCustomer.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedCustomer.nit ? `NIT: ${selectedCustomer.nit}` : 'Sin NIT'}</div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" title="Usar consumidor final" onClick={() => setSelectedCustomer(null)}><X size={13} /></button>
              </div>
            ) : !showCustomerSelector && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Consumidor final · NIT: C/F</div>
            )}

            {showCustomerSelector && (
              <div style={{ marginTop: 8 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input" style={{ paddingLeft: 30, fontSize: 13 }} placeholder="Buscar nombre, NIT o teléfono..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} autoFocus />
                </div>
                <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {customers.map(customer => (
                    <button key={customer.id} onClick={() => { setSelectedCustomer(customer); setShowCustomerSelector(false); setCustomerSearch('') }} style={{ textAlign: 'left', padding: '7px 9px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{customer.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{customer.nit || customer.phone || 'Sin NIT ni teléfono'}</div>
                    </button>
                  ))}
                  {customers.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 6 }}>No hay coincidencias. Crea un cliente rápido.</div>}
                </div>
              </div>
            )}
          </div>
          <div className="cart-items">
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <ShoppingCartEmpty />
                <p style={{ marginTop: 8, fontSize: 13 }}>El carrito está vacío</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Busca un producto o agrega un servicio</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(item => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onRemove={() => removeItem(item.id)}
                    onQuantityChange={(q) => updateQuantity(item.id, q)}
                    onPriceChange={(p) => updatePrice(item.id, p)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="cart-footer">
            <div className="flex justify-between" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <span>Subtotal</span>
              <span>Q{total().toFixed(2)}</span>
            </div>
            <hr className="divider" />
            <div className="flex justify-between" style={{ fontSize: 20, fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ color: 'var(--accent-primary)' }}>Q{total().toFixed(2)}</span>
            </div>
            <button
              className="btn btn-success btn-lg w-full"
              disabled={items.length === 0}
              onClick={() => setShowPaymentModal(true)}
            >
              <CreditCard size={18} /> Cobrar
            </button>
          </div>
        </div>
      </div>

      {/* Modales */}
      {showPrintModal && (
        <PrintModal
          onClose={() => setShowPrintModal(false)}
          onAdd={(item) => {
            addItem(item)
            setShowPrintModal(false)
          }}
        />
      )}

      {showResearchModal && (
        <ResearchModal
          onClose={() => setShowResearchModal(false)}
          onAdd={(item) => {
            addItem(item)
            setShowResearchModal(false)
          }}
        />
      )}

      {showPaymentModal && (
        <PaymentModal
          total={total()}
          items={items}
          customer={selectedCustomer}
          onClose={() => setShowPaymentModal(false)}
          onComplete={handleSaleComplete}
        />
      )}
      {showQuickCustomer && (
        <CustomerFormModal
          quick
          onClose={() => setShowQuickCustomer(false)}
          onSaved={(customer) => {
            setSelectedCustomer(customer)
            setShowQuickCustomer(false)
            setShowCustomerSelector(false)
            setCustomerSearch('')
          }}
        />
      )}
    </div>
  )
}

function ShoppingCartEmpty() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto', display: 'block', opacity: 0.3 }}>
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

interface CartItemRowProps {
  item: any
  onRemove: () => void
  onQuantityChange: (q: number) => void
  onPriceChange: (p: number) => void
}

function CartItemRow({ item, onRemove, onQuantityChange, onPriceChange }: CartItemRowProps) {
  const [editPrice, setEditPrice] = useState(false)
  const [priceValue, setPriceValue] = useState(item.unitPrice.toString())

  const typeColors: Record<string, string> = {
    product: 'var(--accent-info)',
    print: 'var(--accent-warning)',
    research: 'var(--accent-primary)',
  }

  const typeLabels: Record<string, string> = {
    product: 'Producto',
    print: 'Impresión',
    research: 'Investigación',
  }

  return (
    <div style={{
      padding: 10, background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-subtle)',
    }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
        <div style={{ flex: 1, marginRight: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{item.description}</div>
          <span style={{
            fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 10,
            background: `${typeColors[item.itemType]}22`, color: typeColors[item.itemType]
          }}>
            {typeLabels[item.itemType]}
          </span>
        </div>
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
          <X size={14} />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onQuantityChange(item.quantity - 1)}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 4, width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
          ><Minus size={11} /></button>
          <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
          <button
            onClick={() => onQuantityChange(item.quantity + 1)}
            disabled={item.maxStock !== undefined && item.quantity >= item.maxStock}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 4, width: 24, height: 24,
              cursor: item.maxStock !== undefined && item.quantity >= item.maxStock ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: item.maxStock !== undefined && item.quantity >= item.maxStock ? 'var(--text-muted)' : 'var(--text-secondary)',
              opacity: item.maxStock !== undefined && item.quantity >= item.maxStock ? 0.5 : 1
            }}
          ><Plus size={11} /></button>
        </div>
        <div style={{ textAlign: 'right' }}>
          {editPrice ? (
            <input
              className="input"
              style={{ width: 80, padding: '3px 6px', fontSize: 13, textAlign: 'right' }}
              value={priceValue}
              onChange={e => setPriceValue(e.target.value)}
              onBlur={() => { onPriceChange(parseFloat(priceValue) || 0); setEditPrice(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { onPriceChange(parseFloat(priceValue) || 0); setEditPrice(false) } }}
              autoFocus
            />
          ) : (
            <div
              onClick={() => { setPriceValue(item.unitPrice.toString()); setEditPrice(true) }}
              style={{ cursor: 'pointer', textAlign: 'right' }}
              title="Clic para editar precio"
            >
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Q{item.unitPrice.toFixed(2)} c/u</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Q{item.subtotal.toFixed(2)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
