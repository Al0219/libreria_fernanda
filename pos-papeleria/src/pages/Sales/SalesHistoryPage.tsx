import { useState, useEffect, useCallback } from 'react'
import { Receipt, Search, Calendar, CreditCard, Banknote, ArrowLeftRight,
  Eye, ChevronUp, Package, Printer, BookOpen, Filter, X, Trash2, FileText
} from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { api } from '../../lib/api'
import { formatBusinessDate, formatBusinessTime } from '../../lib/business-time'
import { TicketDocument, type TicketData } from '../POS/TicketPDF'
import ConfirmModal from '../../components/ConfirmModal'

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Sale {
  id: number
  folio: string
  date: string
  subtotal: number
  discount: number
  total: number
  payment_method: string
  amount_paid: number
  change_given: number
  notes: string | null
  customer_id: number | null
  customer_name: string | null
  customer_nit: string | null
  cancelled: number
  created_at: string
  credit_balance?: number | null
  credit_due_date?: string | null
  credit_status?: string | null
}

interface SaleItem {
  id: number
  sale_id: number
  item_type: string
  product_id: number | null
  description: string
  quantity: number
  unit_price: number
  subtotal: number
  metadata_json: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function paymentLabel(method: string) {
  if (method === 'cash')     return { label: 'Efectivo',      icon: <Banknote size={13} />,       color: 'var(--accent-success)' }
  if (method === 'card')     return { label: 'Tarjeta',       icon: <CreditCard size={13} />,     color: 'var(--accent-primary)' }
  if (method === 'credit')   return { label: 'Crédito',       icon: <CreditCard size={13} />,     color: 'var(--accent-warning)' }
  return                            { label: 'Transferencia', icon: <ArrowLeftRight size={13} />, color: 'var(--accent-warning)' }
}

function itemTypeIcon(type: string) {
  if (type === 'product') return <Package  size={13} style={{ color: 'var(--accent-primary)' }} />
  if (type === 'print')   return <Printer  size={13} style={{ color: 'var(--accent-warning)' }} />
  return                         <BookOpen size={13} style={{ color: 'var(--accent-success)' }} />
}

function formatDate(iso: string) {
  return formatBusinessDate(iso, { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(isoFull: string) {
  return formatBusinessTime(isoFull)
}

// ─── Componente de fila expandible ──────────────────────────────────────────
function SaleRow({
  sale,
  onCancelled,
}: {
  sale: Sale
  onCancelled: (id: number) => void
}) {
  const [expanded, setExpanded]     = useState(false)
  const [items, setItems]           = useState<SaleItem[]>([])
  const [loadingItems, setLI]       = useState(false)
  const [printingPdf, setPrinting]  = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const pay = paymentLabel(sale.payment_method)

  // ── Cargar ítems al expandir ─────────────────────────────────────────────
  const loadItems = async () => {
    if (items.length > 0) { setExpanded(e => !e); return }
    setLI(true)
    setExpanded(true)
    try {
      const res = await api.sales.getById(sale.id) as { sale: any; items: SaleItem[] }
      setItems(res.items || [])
    } finally {
      setLI(false)
    }
  }

  // ── Cancelar (eliminación lógica) ─────────────────────────────────────────
  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowConfirm(true)
  }

  const confirmCancel = async () => {
    setShowConfirm(false)
    setCancelling(true)
    try {
      const result = await api.sales.cancel(sale.id) as { success: boolean; error?: string }
      if (!result.success) throw new Error(result.error)
      onCancelled(sale.id)
    } catch {
      alert('No se pudo cancelar la venta. Intenta de nuevo.')
    } finally {
      setCancelling(false)
    }
  }

  // ── Reimprimir ticket PDF ─────────────────────────────────────────────────
  const handleReprint = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setPrinting(true)
    try {
      // La consulta tambiÃ©n aporta el saldo vigente de una venta a crÃ©dito.
      const res = await api.sales.getById(sale.id) as { sale: any; items: SaleItem[]; account?: { balance?: number; due_date?: string } | null }
      const saleItems = res.items || items
      if (items.length === 0) setItems(saleItems)

      const config = await api.config.getAll() as Record<string, string>

      const ticketData: TicketData = {
        folio: sale.folio,
        date: sale.date,
        time: formatTime(sale.created_at),
        paymentMethod: sale.payment_method,
        amountPaid: sale.amount_paid,
        changeGiven: sale.change_given,
        items: saleItems.map(i => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          subtotal: i.subtotal,
          itemType: i.item_type,
        })),
        subtotal: sale.subtotal,
        total: sale.total,
        businessName: config.business_name || 'Papelería',
        businessAddress: config.business_address,
        businessPhone: config.business_phone,
        ticketFooter: config.ticket_footer,
        customerName: sale.customer_name || undefined,
        customerNit: sale.customer_nit || undefined,
        creditBalance: res.account?.balance ?? undefined,
        dueDate: res.account?.due_date ?? undefined,
      }

      const blob = await pdf(<TicketDocument data={ticketData} />).toBlob()
      const arrayBuffer = await blob.arrayBuffer()
      const uint8 = new Uint8Array(arrayBuffer)
      await api.pdf.saveAndOpen(uint8, `ticket-${sale.folio}.pdf`)
    } catch (err) {
      console.error('Error al reimprimir ticket:', err)
      alert('No se pudo generar el ticket PDF.')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <>
      <tr
        onClick={loadItems}
        style={{ cursor: 'pointer', transition: 'background 0.12s', opacity: sale.cancelled ? 0.45 : 1 }}
        title="Haz clic para ver el detalle de la venta"
      >
        {/* Folio */}
        <td>
          <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 13 }}>
            {sale.folio}
          </span>
          {sale.cancelled ? (
            <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--accent-danger)', color: 'white', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>
              CANCELADA
            </span>
          ) : null}
        </td>

        {/* Fecha / Hora */}
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{formatDate(sale.date)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatTime(sale.created_at)}</div>
            </div>
          </div>
        </td>

        {/* Método de pago */}
        <td>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'var(--bg-elevated)', borderRadius: 20,
            padding: '3px 10px', fontSize: 12, color: pay.color, fontWeight: 600,
          }}>
            {pay.icon} {pay.label}
          </span>
          {sale.payment_method === 'credit' && <div style={{ marginTop: 4, fontSize: 11, color: sale.credit_status === 'paid' ? 'var(--accent-success)' : 'var(--accent-warning)' }}>Saldo: Q{Number(sale.credit_balance || 0).toFixed(2)}{sale.credit_due_date ? ' · vence ' + sale.credit_due_date : ''}</div>}
        </td>

        {/* Subtotal */}
        <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)' }}>
          Q{sale.subtotal.toFixed(2)}
        </td>

        {/* Descuento */}
        <td style={{ textAlign: 'right', fontSize: 13, color: sale.discount > 0 ? 'var(--accent-danger)' : 'var(--text-muted)' }}>
          {sale.discount > 0 ? `-Q${sale.discount.toFixed(2)}` : '—'}
        </td>

        {/* Total */}
        <td style={{ textAlign: 'right' }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--accent-success)' }}>
            Q{sale.total.toFixed(2)}
          </span>
        </td>

        {/* Notas */}
        <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 120 }}>
          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sale.notes || '—'}
          </span>
        </td>

        {/* Acciones */}
        <td style={{ textAlign: 'right', width: 130 }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
            {/* Reimprimir ticket */}
            <button
              className="btn btn-ghost btn-icon btn-sm"
              style={{ color: 'var(--accent-primary)' }}
              onClick={handleReprint}
              disabled={printingPdf}
              title="Reimprimir ticket PDF"
            >
              {printingPdf ? '...' : <FileText size={15} />}
            </button>

            {/* Ver detalle */}
            <button
              className="btn btn-ghost btn-icon btn-sm"
              style={{ color: 'var(--accent-info, #6b9fff)' }}
              onClick={e => { e.stopPropagation(); loadItems() }}
              title={expanded ? 'Colapsar' : 'Ver artículos'}
            >
              {expanded ? <ChevronUp size={15} /> : <Eye size={15} />}
            </button>

            {/* Eliminar / Cancelar */}
            {!sale.cancelled && (
              <button
                className="btn btn-ghost btn-icon btn-sm"
                style={{ color: 'var(--accent-danger)' }}
                onClick={handleCancel}
                disabled={cancelling}
                title="Eliminar venta (cancelación lógica)"
              >
                {cancelling ? '...' : <Trash2 size={15} />}
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Panel expandido: ítems de la venta */}
      {expanded && (
        <tr>
          <td colSpan={8} style={{ padding: 0 }}>
            <div style={{
              background: 'var(--bg-elevated)', padding: '12px 24px 16px 32px',
              borderBottom: '1px solid var(--border)'
            }}>
              {loadingItems ? (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando artículos...</span>
              ) : (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    Artículos de esta transacción
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {items.map(item => (
                      <div key={item.id} style={{
                        display: 'grid', gridTemplateColumns: '20px 1fr 80px 90px 90px',
                        gap: 8, alignItems: 'center', padding: '6px 8px',
                        background: 'var(--bg-base)', borderRadius: 6, fontSize: 13,
                      }}>
                        <span>{itemTypeIcon(item.item_type)}</span>
                        <span style={{ fontWeight: 500 }}>{item.description}</span>
                        <span style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>× {item.quantity}</span>
                        <span style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>Q{item.unit_price.toFixed(2)} c/u</span>
                        <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>Q{item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                    {sale.discount > 0 && (
                      <span>Descuento: <strong style={{ color: 'var(--accent-danger)' }}>-Q{sale.discount.toFixed(2)}</strong></span>
                    )}
                    <span>Total: <strong style={{ color: 'var(--accent-success)', fontSize: 15 }}>Q{sale.total.toFixed(2)}</strong></span>
                    <span>Pagó: <strong>Q{sale.amount_paid.toFixed(2)}</strong></span>
                    {sale.change_given > 0 && <span>Cambio: <strong>Q{sale.change_given.toFixed(2)}</strong></span>}
                  </div>
                </>
              )}
            </div>
          </td>
        </tr>
      )}

      {/* Modal de confirmación de cancelación */}
      {showConfirm && (
        <ConfirmModal
          title="¿Eliminar esta venta?"
          message={`Vas a cancelar la venta con folio ${sale.folio}. Esta acción no se puede deshacer.`}
          confirmLabel="Sí, cancelar venta"
          cancelLabel="No, mantenerla"
          danger
          onConfirm={confirmCancel}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function SalesHistoryPage() {
  const [sales, setSales]                 = useState<Sale[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [from, setFrom]                   = useState('')
  const [to, setTo]                       = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [showCancelled, setShowCancelled] = useState(false)
  const [showFilters, setShowFilters]     = useState(false)

  const loadSales = useCallback(async (searchTerm?: string) => {
    setLoading(true)
    try {
      const filters: any = {}
      if (from) filters.from = from
      if (to)   filters.to   = to
      if (paymentFilter)  filters.paymentMethod = paymentFilter
      if (showCancelled)  filters.showCancelled = true
      if (searchTerm?.trim()) filters.search = searchTerm.trim()
      const data = await api.sales.getAll(filters) as Sale[]
      setSales(data)
    } finally {
      setLoading(false)
    }
  }, [from, to, paymentFilter, showCancelled])

  // Recargar cuando cambian filtros de fecha/pago
  useEffect(() => { loadSales(search) }, [loadSales])

  // Debounce en el campo de búsqueda — espera 350ms tras dejar de escribir
  useEffect(() => {
    const timer = setTimeout(() => loadSales(search), 350)
    return () => clearTimeout(timer)
  }, [search])

  const visible        = sales
  const totalRevenue   = visible.filter(s => !s.cancelled).reduce((a, s) => a + s.total, 0)
  const totalCount        = visible.length
  const hasActiveFilters  = from || to || paymentFilter

  const clearFilters = () => { setFrom(''); setTo(''); setPaymentFilter('') }

  const handleCancelled = (id: number) => {
    setSales(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Receipt style={{ color: 'var(--accent-primary)' }} />
            Historial de Ventas
          </h1>
          <p className="page-subtitle">
            {totalCount} venta{totalCount !== 1 ? 's' : ''} · Ingresos totales:&nbsp;
            <strong style={{ color: 'var(--accent-success)' }}>Q{totalRevenue.toFixed(2)}</strong>
          </p>
        </div>

        <button
          className={`btn ${showFilters ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setShowFilters(f => !f)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Filter size={15} />
          Filtros
          {hasActiveFilters && (
            <span style={{
              background: 'var(--accent-danger)', color: 'white', borderRadius: 99,
              width: 18, height: 18, display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, fontWeight: 700,
            }}>!</span>
          )}
        </button>
      </div>

      {/* Búsqueda rápida */}
      <div className="card" style={{ marginBottom: 12, padding: 14 }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 34 }}
            placeholder="Buscar por folio, cliente o notas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Panel de filtros colapsable */}
      {showFilters && (
        <div className="card" style={{ marginBottom: 16, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 150 }}>
            <label className="form-label">Fecha desde</label>
            <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 150 }}>
            <label className="form-label">Fecha hasta</label>
            <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 150 }}>
            <label className="form-label">Método de pago</label>
            <select className="select" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
              <option value="">Todos</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="credit">Crédito</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 2 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={e => setShowCancelled(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              Mostrar canceladas
            </label>
          </div>
          {hasActiveFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={14} /> Limpiar
            </button>
          )}
        </div>
      )}

      {/* Tabla */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Folio</th>
              <th>Fecha / Hora</th>
              <th>Método de pago</th>
              <th style={{ textAlign: 'right' }}>Subtotal</th>
              <th style={{ textAlign: 'right' }}>Descuento</th>
              <th style={{ textAlign: 'right' }}>Total (Q)</th>
              <th>Notas</th>
              <th style={{ width: 130 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                  Cargando historial...
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                  <Receipt size={36} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.25 }} />
                  <div style={{ fontWeight: 500, fontSize: 15 }}>No hay ventas registradas</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    {hasActiveFilters || search ? 'Prueba ajustando los filtros.' : 'Las ventas aparecerán aquí cuando se realicen.'}
                  </div>
                </td>
              </tr>
            ) : (
              visible.map(sale => (
                <SaleRow key={sale.id} sale={sale} onCancelled={handleCancelled} />
              ))
            )}
          </tbody>

          {visible.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', paddingTop: 12 }}>
                  {totalCount} venta{totalCount !== 1 ? 's' : ''}
                </td>
                <td colSpan={2}></td>
                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 16, color: 'var(--accent-success)', paddingTop: 12 }}>
                  Q{totalRevenue.toFixed(2)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
