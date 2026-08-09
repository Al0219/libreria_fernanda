import { useState, useEffect, useCallback } from 'react'
import { api } from '../../lib/api'
import { Plus, Truck, Edit2, Trash2, Phone, Mail } from 'lucide-react'

interface Supplier {
  id: number
  name: string
  company: string
  nit: string
  phone: string
  email: string
  address: string
  notes: string
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)

  const loadSuppliers = useCallback(async () => {
    const data = await api.suppliers.getAll()
    setSuppliers(data as Supplier[])
  }, [])

  useEffect(() => { loadSuppliers() }, [loadSuppliers])

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar el proveedor "${name}"?`)) return
    await api.suppliers.delete(id)
    loadSuppliers()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Proveedores</h1>
          <p className="page-subtitle">{suppliers.length} proveedores registrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditSupplier(null); setShowModal(true) }}>
          <Plus size={16} /> Nuevo proveedor
        </button>
      </div>

      {suppliers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Truck size={48} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No hay proveedores registrados</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {suppliers.map(supplier => (
            <div key={supplier.id} className="card">
              <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: 15 }}>{supplier.name}</h3>
                  {supplier.company && <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{supplier.company}</p>}
                  {supplier.nit && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>NIT: {supplier.nit}</p>}
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditSupplier(supplier); setShowModal(true) }}>
                    <Edit2 size={13} />
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--accent-danger)' }} onClick={() => handleDelete(supplier.id, supplier.name)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {supplier.phone && (
                <div className="flex gap-2 items-center" style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <Phone size={12} /> {supplier.phone}
                </div>
              )}
              {supplier.email && (
                <div className="flex gap-2 items-center" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  <Mail size={12} /> {supplier.email}
                </div>
              )}
              {supplier.notes && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>{supplier.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <SupplierFormModal
          supplier={editSupplier}
          onClose={() => { setShowModal(false); setEditSupplier(null); loadSuppliers() }}
        />
      )}
    </div>
  )
}

function SupplierFormModal({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const [form, setForm] = useState({
    name: supplier?.name || '',
    company: supplier?.company || '',
    nit: supplier?.nit || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
    notes: supplier?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    if (supplier) {
      await api.suppliers.update(supplier.id, form)
    } else {
      await api.suppliers.create(form)
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{supplier ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group"><label className="form-label">Nombre *</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} autoFocus /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group"><label className="form-label">Empresa</label><input className="input" value={form.company} onChange={e => set('company', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">NIT</label><input className="input" value={form.nit} onChange={e => set('nit', e.target.value)} placeholder="1234567-8" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group"><label className="form-label">Teléfono</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Correo</label><input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Dirección</label><input className="input" value={form.address} onChange={e => set('address', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Notas</label><textarea className="textarea" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.name.trim()}>
            {saving ? 'Guardando...' : supplier ? 'Guardar cambios' : 'Crear proveedor'}
          </button>
        </div>
      </div>
    </div>
  )
}
