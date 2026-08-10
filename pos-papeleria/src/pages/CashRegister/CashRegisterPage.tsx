import { useCallback, useEffect, useState } from 'react'
import { Banknote, CircleAlert, ClipboardCheck, Coins, MinusCircle, PlusCircle, ReceiptText, RotateCcw, Trash2, WalletCards } from 'lucide-react'
import { api } from '../../lib/api'
import ConfirmModal from '../../components/ConfirmModal'
import { formatBusinessDate, getBusinessDate } from '../../lib/business-time'

const formatMoney = (value: number) => 'Q' + Number(value || 0).toFixed(2)
const expenseCategories = ['Alimentación', 'Gasto personal', 'Suministros', 'Transporte', 'Otro']


interface CashRegister {
  id: number
  business_date: string
  opening_amount: number
  status: 'open' | 'closed'
  expected_cash: number | null
  counted_cash: number | null
  difference: number | null
  opening_notes?: string | null
  closing_notes?: string | null
  opened_at?: string
  closed_at?: string | null
}

interface Metrics {
  openingAmount: number
  cashSales: number
  cashPurchases: number
  cashCreditPayments: number
  expenses: number
  expectedCash: number
}

interface Expense {
  id: number
  category: string
  description: string
  amount: number
  created_at: string
}

interface DayData {
  date: string
  register: CashRegister | null
  metrics: Metrics | null
  expenses: Expense[]
}

function MetricCard({ label, value, icon: Icon, color = 'var(--accent-primary)' }: { label: string; value: number; icon: any; color?: string }) {
  return (
    <div className="stat-card" style={{ minWidth: 0 }}>
      <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={15} color={color} /> {label}</div>
      <div className="stat-value" style={{ color }}>{formatMoney(value)}</div>
    </div>
  )
}

export default function CashRegisterPage() {
  const [data, setData] = useState<DayData | null>(null)
  const [history, setHistory] = useState<CashRegister[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [openingAmount, setOpeningAmount] = useState('')
  const [openingNotes, setOpeningNotes] = useState('')
  const [expenseCategory, setExpenseCategory] = useState(expenseCategories[0])
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [countedCash, setCountedCash] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [showReopenConfirm, setShowReopenConfirm] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [today, past] = await Promise.all([api.cashRegister.getToday(), api.cashRegister.getHistory()])
      setData(today as DayData)
      setHistory((past || []) as CashRegister[])
      setError('')
    } catch (cause: any) {
      setError(cause?.message || 'No se pudo cargar la caja.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openRegister = async () => {
    setSaving(true)
    const result: any = await api.cashRegister.open({ openingAmount: Number(openingAmount), notes: openingNotes })
    setSaving(false)
    if (!result.success) { setError(result.error || 'No se pudo abrir la caja.'); return }
    setOpeningAmount('')
    setOpeningNotes('')
    await load()
  }

  const addExpense = async () => {
    setSaving(true)
    const result: any = await api.cashRegister.addExpense({
      category: expenseCategory,
      description: expenseDescription,
      amount: Number(expenseAmount),
    })
    setSaving(false)
    if (!result.success) { setError(result.error || 'No se pudo registrar el gasto.'); return }
    setExpenseDescription('')
    setExpenseAmount('')
    await load()
  }

  const closeRegister = async () => {
    setSaving(true)
    const result: any = await api.cashRegister.close({ countedCash: Number(countedCash), notes: closingNotes })
    setSaving(false)
    if (!result.success) { setError(result.error || 'No se pudo cerrar la caja.'); return }
    setCountedCash('')
    setClosingNotes('')
    await load()
  }

  const reopenRegister = async () => {
    setSaving(true)
    const result: any = await api.cashRegister.reopen()
    setSaving(false)
    if (!result.success) { setError(result.error || 'No se pudo reabrir la caja.'); return }
    await load()
  }

  const deleteExpense = async () => {
    if (!expenseToDelete) return
    setSaving(true)
    const result: any = await api.cashRegister.deleteExpense(expenseToDelete.id)
    setSaving(false)
    if (!result.success) { setError(result.error || 'No se pudo eliminar el gasto.'); return }
    setExpenseToDelete(null)
    await load()
  }
  const date = data?.date || getBusinessDate()
  const formattedDate = formatBusinessDate(date, { day: '2-digit', month: 'long', year: 'numeric' })
  const register = data?.register
  const metrics = data?.metrics

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title"><WalletCards size={25} style={{ marginRight: 9, verticalAlign: 'text-bottom' }} />Caja y corte diario</h1>
          <p className="page-subtitle">Control de efectivo para {formattedDate}</p>
        </div>
        {register && <span className={register.status === 'open' ? 'badge badge-success' : 'badge'}>{register.status === 'open' ? 'Caja abierta' : 'Caja cerrada'}</span>}
      </div>

      {error && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 12px', color: 'var(--accent-danger)', background: 'rgba(239,68,68,.1)', border: '1px solid var(--accent-danger)', borderRadius: 'var(--radius-md)' }}><CircleAlert size={17} />{error}</div>}

      {loading ? <div className="empty-state">Cargando caja...</div> : !register ? (
        <div className="card" style={{ maxWidth: 620 }}>
          <div className="card-header"><h2 className="card-title"><PlusCircle size={18} /> Abrir caja</h2></div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 18 }}>Registra el fondo inicial con el que empieza el día. Desde esta apertura se calculará el efectivo esperado.</p>
          <div className="form-group">
            <label className="form-label">Fondo inicial (Q)</label>
            <input className="input" type="number" min="0" step="0.01" value={openingAmount} onChange={event => setOpeningAmount(event.target.value)} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label className="form-label">Notas de apertura (opcional)</label>
            <input className="input" value={openingNotes} onChange={event => setOpeningNotes(event.target.value)} placeholder="Ej. cambio para clientes" />
          </div>
          <button className="btn btn-primary" disabled={saving || openingAmount === ''} onClick={openRegister}><PlusCircle size={16} /> {saving ? 'Abriendo...' : 'Abrir caja'}</button>
        </div>
      ) : (
        <>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', marginBottom: 18 }}>
            <MetricCard label="Fondo inicial" value={metrics?.openingAmount || 0} icon={WalletCards} />
            <MetricCard label="Ventas efectivo" value={metrics?.cashSales || 0} icon={Banknote} color="var(--accent-success)" />
            <MetricCard label="Abonos crédito efectivo" value={metrics?.cashCreditPayments || 0} icon={Banknote} color="var(--accent-success)" />
            <MetricCard label="Compras efectivo" value={metrics?.cashPurchases || 0} icon={ReceiptText} color="var(--accent-danger)" />
            <MetricCard label="Gastos de caja" value={metrics?.expenses || 0} icon={MinusCircle} color="var(--accent-danger)" />
            <MetricCard label="Efectivo esperado" value={metrics?.expectedCash || 0} icon={Coins} color="var(--accent-primary)" />
          </div>

          {register.status === 'open' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
              <div className="card">
                <div className="card-header"><h2 className="card-title"><MinusCircle size={18} /> Registrar gasto</h2></div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>Todo gasto sale del efectivo disponible y queda registrado en el corte.</p>
                <div className="form-group"><label className="form-label">Categoría</label><select className="select" value={expenseCategory} onChange={event => setExpenseCategory(event.target.value)}>{expenseCategories.map(category => <option key={category}>{category}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Descripción</label><input className="input" value={expenseDescription} onChange={event => setExpenseDescription(event.target.value)} placeholder="Ej. almuerzo del equipo" /></div>
                <div className="form-group"><label className="form-label">Monto (Q)</label><input className="input" type="number" min="0.01" step="0.01" value={expenseAmount} onChange={event => setExpenseAmount(event.target.value)} placeholder="0.00" /></div>
                <button className="btn btn-danger" disabled={saving || !expenseDescription.trim() || expenseAmount === ''} onClick={addExpense}><MinusCircle size={16} /> {saving ? 'Guardando...' : 'Registrar gasto'}</button>
              </div>
              <div className="card">
                <div className="card-header"><h2 className="card-title"><ClipboardCheck size={18} /> Cerrar caja</h2></div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>Cuenta el efectivo físico e ingrésalo para guardar la diferencia con el monto esperado.</p>
                <div className="form-group"><label className="form-label">Efectivo contado (Q)</label><input className="input" type="number" min="0" step="0.01" value={countedCash} onChange={event => setCountedCash(event.target.value)} placeholder="0.00" /></div>
                <div className="form-group"><label className="form-label">Notas de cierre (opcional)</label><input className="input" value={closingNotes} onChange={event => setClosingNotes(event.target.value)} placeholder="Ej. faltante explicado" /></div>
                <button className="btn btn-success" disabled={saving || countedCash === ''} onClick={closeRegister}><ClipboardCheck size={16} /> {saving ? 'Cerrando...' : 'Guardar corte'}</button>
              </div>
            </div>
          )}

          {register.status === 'closed' && (
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card-header" style={{ alignItems: 'center' }}>
                <h2 className="card-title"><ClipboardCheck size={18} /> Corte guardado</h2>
                <button className="btn btn-sm btn-primary" disabled={saving} onClick={() => setShowReopenConfirm(true)}><RotateCcw size={14} /> Reabrir caja</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26 }}>
                <div><div className="stat-label">Efectivo contado</div><strong>{formatMoney(Number(register.counted_cash || 0))}</strong></div>
                <div><div className="stat-label">Diferencia</div><strong style={{ color: Number(register.difference || 0) === 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{formatMoney(Number(register.difference || 0))}</strong></div>
                {register.closing_notes && <div><div className="stat-label">Notas</div><span>{register.closing_notes}</span></div>}
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: 18 }}>
            <div className="card-header"><h2 className="card-title"><ReceiptText size={18} /> Gastos del día</h2></div>
            {!data?.expenses.length ? <div className="empty-state" style={{ padding: 20 }}>No hay gastos registrados.</div> : <div className="table-container"><table><thead><tr><th>Categoría</th><th>Descripción</th><th style={{ textAlign: 'right' }}>Monto</th>{register.status === 'open' && <th style={{ width: 90 }}></th>}</tr></thead><tbody>{data.expenses.map(expense => <tr key={expense.id}><td>{expense.category}</td><td>{expense.description}</td><td style={{ textAlign: 'right', color: 'var(--accent-danger)', fontWeight: 700 }}>-{formatMoney(expense.amount)}</td>{register.status === 'open' && <td><button className="btn btn-sm btn-danger" disabled={saving} onClick={() => setExpenseToDelete(expense)} title="Eliminar gasto"><Trash2 size={14} /></button></td>}</tr>)}</tbody></table></div>}
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-header"><h2 className="card-title"><ClipboardCheck size={18} /> Historial de cortes</h2></div>
        {!history.length ? <div className="empty-state" style={{ padding: 20 }}>Aún no hay cortes registrados.</div> : <div className="table-container"><table><thead><tr><th>Fecha</th><th>Estado</th><th style={{ textAlign: 'right' }}>Esperado</th><th style={{ textAlign: 'right' }}>Contado</th><th style={{ textAlign: 'right' }}>Diferencia</th></tr></thead><tbody>{history.map(item => <tr key={item.id}><td>{formatBusinessDate(item.business_date, { day: '2-digit', month: 'short', year: 'numeric' })}</td><td><span className={item.status === 'open' ? 'badge badge-success' : 'badge'}>{item.status === 'open' ? 'Abierta' : 'Cerrada'}</span></td><td style={{ textAlign: 'right' }}>{item.expected_cash == null ? '—' : formatMoney(item.expected_cash)}</td><td style={{ textAlign: 'right' }}>{item.counted_cash == null ? '—' : formatMoney(item.counted_cash)}</td><td style={{ textAlign: 'right', color: Number(item.difference || 0) === 0 ? 'var(--text-secondary)' : 'var(--accent-danger)' }}>{item.difference == null ? '—' : formatMoney(item.difference)}</td></tr>)}</tbody></table></div>}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 14 }}>Las ventas y compras solo afectan este corte si se registran en efectivo. Compras con tarjeta, transferencia, crédito o sin método histórico no cambian el efectivo esperado.</p>
      {showReopenConfirm && (
        <ConfirmModal
          title="¿Reabrir la caja de hoy?"
          message="El corte guardado se habilitará para corrección. Podrás ajustar gastos y volver a realizar el cierre antes de terminar el día."
          confirmLabel="Reabrir caja"
          danger
          onConfirm={() => { setShowReopenConfirm(false); reopenRegister() }}
          onCancel={() => setShowReopenConfirm(false)}
        />
      )}

      {expenseToDelete && (
        <ConfirmModal
          title="¿Eliminar este gasto?"
          message={'Se eliminará el gasto de ' + formatMoney(expenseToDelete.amount) + ': ' + expenseToDelete.description + '. Esta acción solo está disponible antes del cierre.'}
          confirmLabel="Eliminar gasto"
          danger
          onConfirm={deleteExpense}
          onCancel={() => setExpenseToDelete(null)}
        />
      )}
    </div>
  )
}
