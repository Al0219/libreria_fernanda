import { useCallback, useEffect, useState } from 'react'
import { Archive, Edit2, Mail, Phone, Plus, Search, UserRound, RotateCcw } from 'lucide-react'
import { api } from '../../lib/api'
import CustomerFormModal, { type Customer } from '../../components/CustomerFormModal'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)

  const loadCustomers = useCallback(async () => {
    const data = await api.customers.getAll({ search, includeArchived: showArchived })
    setCustomers(data as Customer[])
  }, [search, showArchived])

  useEffect(() => {
    const timer = setTimeout(loadCustomers, 250)
    return () => clearTimeout(timer)
  }, [loadCustomers])

  const handleSaved = () => {
    setShowForm(false)
    setEditing(null)
    loadCustomers()
  }

  const setActive = async (customer: Customer, active: boolean) => {
    await api.customers.setActive(customer.id, active)
    loadCustomers()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{customers.filter(customer => customer.active).length} clientes activos</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 14 }}>
        <div className="flex gap-3" style={{ alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Buscar por nombre, NIT, teléfono o correo..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} /> Ver archivados
          </label>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <UserRound size={48} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{search ? 'No se encontraron clientes' : 'No hay clientes registrados'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {customers.map(customer => (
            <div key={customer.id} className="card" style={{ opacity: customer.active ? 1 : 0.55 }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: 15 }}>{customer.name}</h3>
                  {customer.nit && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>NIT: {customer.nit}</p>}
                  {!customer.active && <span style={{ fontSize: 10, color: 'var(--accent-warning)' }}>ARCHIVADO</span>}
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditing(customer); setShowForm(true) }} title="Editar cliente"><Edit2 size={13} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: customer.active ? 'var(--accent-danger)' : 'var(--accent-success)' }} onClick={() => setActive(customer, !customer.active)} title={customer.active ? 'Archivar cliente' : 'Reactivar cliente'}>
                    {customer.active ? <Archive size={13} /> : <RotateCcw size={13} />}
                  </button>
                </div>
              </div>
              {customer.phone && <div className="flex gap-2 items-center" style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}><Phone size={12} /> {customer.phone}</div>}
              {customer.email && <div className="flex gap-2 items-center" style={{ fontSize: 13, color: 'var(--text-secondary)' }}><Mail size={12} /> {customer.email}</div>}
              {customer.address && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{customer.address}</p>}              {Boolean(customer.credit_authorized) && <div style={{ marginTop: 9, paddingTop: 8, borderTop: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-secondary)' }}>Crédito: <strong>Q{Number(customer.credit_limit || 0).toFixed(2)}</strong> · Pendiente: <strong style={{ color: Number(customer.outstanding_balance || 0) > 0 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>Q{Number(customer.outstanding_balance || 0).toFixed(2)}</strong></div>}
            </div>
          ))}
        </div>
      )}

      {showForm && <CustomerFormModal customer={editing} onClose={() => { setShowForm(false); setEditing(null) }} onSaved={handleSaved} />}
    </div>
  )
}