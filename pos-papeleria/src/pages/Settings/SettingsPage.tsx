import { useState, useEffect, useCallback } from 'react'
import { api } from '../../lib/api'
import { applyTheme, normalizeTheme } from '../../lib/theme'
import { Settings, Save, Printer, Tag, Plus, Edit2, Trash2, Check, X, FolderOpen, DatabaseBackup, Palette } from 'lucide-react'

interface PrintPrice {
  id: number
  paper_type: string
  print_type: string
  price_per_page: number
}

interface Category {
  id: number
  name: string
}

const PAPER_LABELS: Record<string, string> = {
  carta: 'Carta', oficio: 'Oficio', tabloide: 'Tabloide', foto: 'Foto (color)'
}
const TYPE_LABELS: Record<string, string> = { bw: 'Blanco y Negro', color: 'Color' }

export default function SettingsPage() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [printPrices, setPrintPrices] = useState<PrintPrice[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [savedConfig, setSavedConfig] = useState(false)
  const [savedPrices, setSavedPrices] = useState(false)
  const [savingStorage, setSavingStorage] = useState(false)
  const [storageMessage, setStorageMessage] = useState('')
  const [themeSaved, setThemeSaved] = useState(false)

  // Estado para nueva categoría
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)

  // Estado para edición inline de categoría
  const [editingCatId, setEditingCatId] = useState<number | null>(null)
  const [editingCatName, setEditingCatName] = useState('')

  const loadCategories = useCallback(async () => {
    const data = await api.categories.getAll()
    setCategories(data as Category[])
  }, [])

  useEffect(() => {
    api.config.getAll().then((c: any) => setConfig(c as Record<string, string>))
    api.config.getPrintPrices().then((p: any) => setPrintPrices(p as PrintPrice[]))
    loadCategories()
  }, [loadCategories])

  const setField = (key: string, value: string) => setConfig(prev => ({ ...prev, [key]: value }))

  const saveConfig = async () => {
    for (const [key, value] of Object.entries(config)) {
      await api.config.set(key, value)
    }
    setSavedConfig(true)
    setTimeout(() => setSavedConfig(false), 2000)
  }



  const updateTheme = (value: string) => {
    const theme = normalizeTheme(value)
    setField('ui_theme', theme)
    applyTheme(theme)
  }

  const saveTheme = async () => {
    await api.config.set('ui_theme', normalizeTheme(config.ui_theme))
    setThemeSaved(true)
    setTimeout(() => setThemeSaved(false), 2000)
  }
  const chooseDirectory = async (field: 'backup_directory' | 'documents_directory') => {
    const selected = await api.config.chooseDirectory(config[field] || '')
    if (selected) setField(field, selected)
  }

  const saveStorage = async () => {
    setSavingStorage(true)
    try {
      for (const key of ['backup_directory', 'documents_directory', 'auto_backup_on_close', 'backup_retention']) await api.config.set(key, config[key] || '')
      setStorageMessage('Configuracion de almacenamiento guardada.')
    } finally { setSavingStorage(false) }
  }

  const createBackupNow = async () => {
    setSavingStorage(true)
    try {
      await api.config.set('backup_directory', config.backup_directory || '')
      await api.config.set('backup_retention', config.backup_retention || '30')
      const result: any = await api.config.createBackup()
      setStorageMessage(result?.ok ? 'Respaldo creado en: ' + result.path : (result?.error || 'No se pudo crear el respaldo.'))
    } finally { setSavingStorage(false) }
  }
  const updatePrice = (id: number, value: string) => {
    setPrintPrices(prev => prev.map(p => p.id === id ? { ...p, price_per_page: parseFloat(value) || 0 } : p))
  }

  const savePrices = async () => {
    for (const p of printPrices) {
      await api.config.setPrintPrice(p.id, p.price_per_page)
    }
    setSavedPrices(true)
    setTimeout(() => setSavedPrices(false), 2000)
  }

  // Categorías
  const handleAddCategory = async () => {
    const name = newCatName.trim()
    if (!name) return
    setAddingCat(true)
    await api.categories.create({ name })
    setNewCatName('')
    setAddingCat(false)
    loadCategories()
  }

  const startEdit = (cat: Category) => {
    setEditingCatId(cat.id)
    setEditingCatName(cat.name)
  }

  const confirmEdit = async () => {
    if (!editingCatName.trim() || editingCatId === null) return
    await api.categories.update(editingCatId, { name: editingCatName.trim() })
    setEditingCatId(null)
    setEditingCatName('')
    loadCategories()
  }

  const cancelEdit = () => {
    setEditingCatId(null)
    setEditingCatName('')
  }

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar la categoría "${name}"?\nSolo se puede eliminar si no tiene productos asignados.`)) return
    const result = await api.categories.delete(id) as any
    if (result?.error) {
      alert(result.error)
    } else {
      loadCategories()
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-subtitle">Ajusta los datos del negocio, categorías y precios de servicios</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>

        {/* ─── Datos del negocio ─── */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={16} style={{ color: 'var(--accent-primary)' }} /> Datos del negocio
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Nombre del negocio</label>
              <input className="input" value={config.business_name || ''} onChange={e => setField('business_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Dirección</label>
              <input className="input" value={config.business_address || ''} onChange={e => setField('business_address', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input className="input" value={config.business_phone || ''} onChange={e => setField('business_phone', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <input className="input" type="email" value={config.business_email || ''} onChange={e => setField('business_email', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Mensaje en ticket</label>
              <input className="input" value={config.ticket_footer || ''} onChange={e => setField('ticket_footer', e.target.value)} placeholder="Ej: Gracias por su compra" />
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={saveConfig}>
              <Save size={15} /> {savedConfig ? '✓ Guardado' : 'Guardar datos'}
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><Palette size={16} style={{ color: 'var(--accent-primary)' }} /> Tema y visibilidad</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>Suave reduce el brillo y la saturación para pantallas donde los tonos pastel se ven demasiado intensos. Alto contraste conserva bordes y colores más marcados.</p>
          <div className="form-group"><label className="form-label">Tema visual</label><select className="select" value={normalizeTheme(config.ui_theme)} onChange={e => updateTheme(e.target.value)}><option value="standard">Estandar</option><option value="soft">Suave (menos contraste)</option><option value="high-contrast">Alto contraste</option></select></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn btn-primary" onClick={saveTheme}><Save size={15} /> {themeSaved ? 'Guardado' : 'Guardar tema'}</button></div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><DatabaseBackup size={16} style={{ color: 'var(--accent-success)' }} /> Almacenamiento y respaldos</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>La base activa permanece en el SSD. Selecciona una carpeta del HDD para copias y otra para tickets, PDF, CSV y reportes.</p>
          <div className="form-group"><label className="form-label">Carpeta de respaldos</label><div style={{ display: 'flex', gap: 8 }}><input className="input" value={config.backup_directory || ''} readOnly placeholder="Ej. D:\\Respaldos POS" /><button className="btn btn-ghost" onClick={() => chooseDirectory('backup_directory')}><FolderOpen size={15} /> Elegir</button></div></div>
          <div className="form-group"><label className="form-label">Carpeta de documentos</label><div style={{ display: 'flex', gap: 8 }}><input className="input" value={config.documents_directory || ''} readOnly placeholder="Ej. D:\\Documentos POS" /><button className="btn btn-ghost" onClick={() => chooseDirectory('documents_directory')}><FolderOpen size={15} /> Elegir</button></div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 12, alignItems: 'end' }}><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={config.auto_backup_on_close !== 'false'} onChange={e => setField('auto_backup_on_close', e.target.checked ? 'true' : 'false')} /> Crear respaldo automatico al cerrar caja</label><div className="form-group" style={{ margin: 0 }}><label className="form-label">Copias a conservar</label><input className="input" type="number" min="1" max="365" value={config.backup_retention || '30'} onChange={e => setField('backup_retention', e.target.value)} /></div></div>
          {storageMessage && <p style={{ fontSize: 12.5, color: storageMessage.startsWith('Respaldo creado') || storageMessage.startsWith('Configuracion') ? 'var(--accent-success)' : 'var(--accent-danger)', marginTop: 12 }}>{storageMessage}</p>}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button className="btn btn-ghost" disabled={savingStorage || !config.backup_directory} onClick={createBackupNow}><DatabaseBackup size={15} /> Respaldar ahora</button><button className="btn btn-primary" disabled={savingStorage} onClick={saveStorage}><Save size={15} /> {savingStorage ? 'Guardando...' : 'Guardar almacenamiento'}</button></div>
        </div>
        {/* ─── Categorías ─── */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={16} style={{ color: 'var(--accent-primary)' }} /> Categorías de productos
          </h3>

          {/* Lista de categorías existentes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {categories.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                No hay categorías registradas
              </p>
            )}
            {categories.map(cat => (
              <div
                key={cat.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px',
                  background: 'var(--bg-base)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                }}
              >
                {editingCatId === cat.id ? (
                  // Modo edición inline
                  <>
                    <input
                      className="input"
                      value={editingCatName}
                      onChange={e => setEditingCatName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit() }}
                      autoFocus
                      style={{ flex: 1, padding: '4px 8px', fontSize: 13 }}
                    />
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={confirmEdit} title="Guardar" style={{ color: 'var(--accent-success)' }}>
                      <Check size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={cancelEdit} title="Cancelar">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  // Modo visualización
                  <>
                    <Tag size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{cat.name}</span>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => startEdit(cat)} title="Editar">
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      title="Eliminar"
                      style={{ color: 'var(--accent-danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Formulario para agregar nueva categoría */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>
              Nueva categoría
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                placeholder="Ej: Útiles Escolares, Tóner..."
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddCategory() }}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAddCategory}
                disabled={addingCat || !newCatName.trim()}
                style={{ flexShrink: 0 }}
              >
                <Plus size={14} />
                {addingCat ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Precios de impresión ─── */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Printer size={16} style={{ color: 'var(--accent-warning)' }} /> Precios de Impresión (por página)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {printPrices.map(p => (
              <div key={p.id} className="flex items-center justify-between" style={{
                padding: '10px 14px', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)'
              }}>
                <div>
                  <span style={{ fontWeight: 500, fontSize: 13.5 }}>{PAPER_LABELS[p.paper_type] || p.paper_type}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {TYPE_LABELS[p.print_type] || p.print_type}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Q</span>
                  <input
                    className="input"
                    type="number"
                    step="0.50"
                    min="0"
                    style={{ width: 80, textAlign: 'right', fontWeight: 600 }}
                    value={p.price_per_page}
                    onChange={e => updatePrice(p.id, e.target.value)}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>/pág</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={savePrices}>
              <Save size={15} /> {savedPrices ? '✓ Guardado' : 'Guardar precios'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
