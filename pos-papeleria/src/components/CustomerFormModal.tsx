import { useState } from 'react'
import { UserRound } from 'lucide-react'
import { api } from '../lib/api'

export interface Customer {
  id: number
  name: string
  nit: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  active: number
  credit_authorized?: number | boolean
  credit_limit?: number
  outstanding_balance?: number
}

interface CustomerFormModalProps {
  customer?: Customer | null
  quick?: boolean
  onClose: () => void
  onSaved: (customer: Customer) => void
}

export default function CustomerFormModal({ customer = null, quick = false, onClose, onSaved }: CustomerFormModalProps) {
  const [form, setForm] = useState({
    name: customer?.name || '', nit: customer?.nit || '', phone: customer?.phone || '', email: customer?.email || '', address: customer?.address || '', notes: customer?.notes || '',
    creditAuthorized: Boolean(customer?.credit_authorized), creditLimit: String(customer?.credit_limit || ''),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field: string, value: string | boolean) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('El nombre del cliente es obligatorio.'); return }
    setSaving(true); setError('')
    try {
      const data = { ...form, name: form.name.trim(), creditLimit: Number(form.creditLimit || 0) }
      const saved = customer ? await api.customers.update(customer.id, data) : await api.customers.create(data)
      onSaved(saved as Customer)
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar el cliente.')
      setSaving(false)
    }
  }

  return <div className="modal-overlay" onClick={onClose}><div className="modal" style={{ maxWidth: quick ? 460 : 560 }} onClick={e => e.stopPropagation()}>
    <div className="modal-header"><h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UserRound size={18} style={{ color: 'var(--accent-primary)' }} />{customer ? 'Editar cliente' : quick ? 'Crear cliente rápido' : 'Nuevo cliente'}</h2><button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button></div>
    {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-danger)', borderRadius: 6, padding: '8px 12px', marginBottom: 16, color: 'var(--accent-danger)', fontSize: 13 }}>{error}</div>}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="form-group"><label className="form-label">Nombre o razón social *</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} autoFocus /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><div className="form-group"><label className="form-label">NIT</label><input className="input" value={form.nit} onChange={e => set('nit', e.target.value)} placeholder="1234567-8" /></div><div className="form-group"><label className="form-label">Teléfono</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="5555-1234" /></div></div>
      {!quick && <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><div className="form-group"><label className="form-label">Correo</label><input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div><div className="form-group"><label className="form-label">Dirección</label><input className="input" value={form.address} onChange={e => set('address', e.target.value)} /></div></div>
        <div className="form-group"><label className="form-label">Notas</label><textarea className="textarea" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} /></div>
        <div style={{ padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--bg-base)', border: '1px solid var(--border)' }}><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}><input type="checkbox" checked={form.creditAuthorized} onChange={e => set('creditAuthorized', e.target.checked)} /> Autorizar ventas a crédito</label>{form.creditAuthorized && <div className="form-group" style={{ margin: '10px 0 0' }}><label className="form-label">Límite de crédito (Q)</label><input className="input" type="number" min="0.01" step="0.01" value={form.creditLimit} onChange={e => set('creditLimit', e.target.value)} placeholder="0.00" /></div>}</div>
      </>}
      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Se permite el mismo nombre sólo si el NIT o teléfono es distinto.</p>
    </div>
    <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button><button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? 'Guardando...' : customer ? 'Guardar cambios' : quick ? 'Crear y seleccionar' : 'Crear cliente'}</button></div>
  </div></div>
}