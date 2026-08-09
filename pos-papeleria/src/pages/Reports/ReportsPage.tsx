import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { formatBusinessDate, getBusinessDate } from '../../lib/business-time'
import { BadgePercent, Banknote, BarChart2, CalendarDays, CreditCard, Landmark, TrendingUp } from 'lucide-react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface Summary {
  total_sales: number
  total_revenue: number
  total_discounts: number
  cash_total: number
  card_total: number
  transfer_total: number
  cash_count: number
  card_count: number
  transfer_count: number
}

interface DailySale {
  date: string
  count: number
  total: number
}

interface SalesByType {
  item_type: string
  count: number
  total: number
}

interface OperationalReport {
  summary: Summary
  daily: DailySale[]
  byType: SalesByType[]
  from: string
  to: string
}

const formatMoney = (value: number) => 'Q' + Number(value || 0).toFixed(2)

function offsetDate(date: string, days: number) {
  const parts = date.split('-').map(Number)
  const result = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

function firstDayOfMonth(date: string) {
  return date.slice(0, 8) + '01'
}

function formatReportDate(date: string) {
  return formatBusinessDate(date, { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatChartDate(date: string) {
  return formatBusinessDate(date, { day: '2-digit', month: 'short' })
}

export default function ReportsPage() {
  const today = getBusinessDate()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [report, setReport] = useState<OperationalReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (from > to) {
      setError('La fecha inicial no puede ser posterior a la fecha final.')
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError('')

    api.reports.getOperationalSummary(from, to)
      .then((data: any) => {
        if (active) setReport(data as OperationalReport)
      })
      .catch(() => {
        if (active) setError('No se pudo cargar el reporte. Intenta nuevamente.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [from, to])

  const summary = report?.summary
  const dailyData = useMemo(() => (report?.daily || []).map(day => ({
    name: formatChartDate(day.date),
    total: Number(day.total),
    count: Number(day.count),
  })), [report])

  const typeMap: Record<string, { label: string; color: string }> = {
    product: { label: 'Productos', color: '#3b82f6' },
    print: { label: 'Impresión', color: '#f59e0b' },
    research: { label: 'Investigaciones', color: '#8b5cf6' },
  }

  const typeData = useMemo(() => (report?.byType || []).map(item => ({
    name: typeMap[item.item_type]?.label || item.item_type,
    total: Number(item.total),
    count: Number(item.count),
    color: typeMap[item.item_type]?.color || '#64748b',
  })), [report])

  const paymentRows = [
    { label: 'Efectivo', value: summary?.cash_total || 0, count: summary?.cash_count || 0, icon: Banknote, color: '#f59e0b' },
    { label: 'Tarjeta', value: summary?.card_total || 0, count: summary?.card_count || 0, icon: CreditCard, color: '#3b82f6' },
    { label: 'Transferencia', value: summary?.transfer_total || 0, count: summary?.transfer_count || 0, icon: Landmark, color: '#8b5cf6' },
  ]

  const rangeLabel = from === to
    ? 'Corte del día — ' + formatReportDate(from)
    : 'Corte operativo del ' + formatReportDate(from) + ' al ' + formatReportDate(to)

  const setQuickRange = (days: number) => {
    setFrom(offsetDate(today, -(days - 1)))
    setTo(today)
  }

  if (loading && !report) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Cargando reportes...</div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">{rangeLabel}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
          <label className="form-label">Desde</label>
          <input className="input" type="date" value={from} onChange={event => setFrom(event.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
          <label className="form-label">Hasta</label>
          <input className="input" type="date" value={to} onChange={event => setTo(event.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setQuickRange(1)}>Hoy</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setQuickRange(7)}>Últimos 7 días</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setFrom(firstDayOfMonth(today)); setTo(today) }}>Este mes</button>
        </div>
      </div>

      {error ? (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', color: 'var(--accent-danger)', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-danger)' }}>
          {error}
        </div>
      ) : (
        <>
          <div className="grid-cols-4" style={{ marginBottom: 24 }}>
            {[
              { label: 'Ventas realizadas', value: summary?.total_sales || 0, format: 'number', icon: BarChart2, color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
              { label: 'Ingresos netos', value: summary?.total_revenue || 0, format: 'money', icon: TrendingUp, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
              { label: 'Descuentos otorgados', value: summary?.total_discounts || 0, format: 'money', icon: BadgePercent, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
              { label: 'Cobrado en efectivo', value: summary?.cash_total || 0, format: 'money', icon: Banknote, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
            ].map(({ label, value, format, icon: Icon, color, bg }) => (
              <div key={label} className="stat-card">
                <div className="stat-icon" style={{ background: bg }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <div>
                  <div className="stat-label">{label}</div>
                  <div className="stat-value" style={{ color }}>
                    {format === 'money' ? formatMoney(value as number) : value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid-cols-2" style={{ marginBottom: 16 }}>
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
                <CalendarDays size={16} style={{ color: 'var(--accent-primary)' }} />
                Ventas por día
              </h3>
              {dailyData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)', fontSize: 13 }}>No hay ventas activas en este período.</div>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={dailyData} margin={{ top: 4, right: 0, left: -12, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 13 }}
                      formatter={(value: any, _name: string, item: any) => [formatMoney(Number(value)), Number(item.payload.count) + ' venta(s)']}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Cobros por medio de pago</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {paymentRows.map(({ label, value, count, icon: Icon, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 'var(--radius-sm)', background: 'var(--bg-base)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', background: color + '22' }}>
                      <Icon size={17} style={{ color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{count} venta(s)</div>
                    </div>
                    <div style={{ fontWeight: 700, color }}>{formatMoney(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>Ventas por tipo de artículo</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)' }}>Importes antes de descuentos globales de la venta.</p>
            {typeData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)', fontSize: 13 }}>No hay artículos vendidos en este período.</div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 12, left: 20, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 13 }}
                    formatter={(value: any, _name: string, item: any) => [formatMoney(Number(value)), Number(item.payload.count) + ' venta(s)']}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {typeData.map((item, index) => <Cell key={index} fill={item.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  )
}
