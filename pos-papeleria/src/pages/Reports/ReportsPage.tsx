import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { formatBusinessDate, getBusinessDate } from '../../lib/business-time'
import { Award, BadgePercent, Banknote, BarChart2, CalendarDays, CreditCard, Landmark, Layers3, Package, TrendingUp, Wrench } from 'lucide-react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface Summary {
  total_sales: number
  total_revenue: number
  total_discounts: number
  cash_total: number
  card_total: number
  transfer_total: number
  credit_total: number
  cash_count: number
  card_count: number
  transfer_count: number
  credit_count: number
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

interface TrendRow {
  period: string
  period_start: string
  count: number
  total: number
}

interface RankRow {
  name: string
  category_name?: string
  item_type?: string
  quantity: number
  total: number
  sale_count: number
}

interface SalesPerformance {
  current: { total_sales: number; total_revenue: number }
  previous: { total_sales: number; total_revenue: number }
  previousFrom: string
  previousTo: string
  trend: TrendRow[]
  products: RankRow[]
  categories: RankRow[]
  services: RankRow[]
}

type GroupBy = 'day' | 'week' | 'month'

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

function formatTrendPeriod(row: TrendRow, groupBy: GroupBy) {
  if (groupBy === 'day') return formatChartDate(row.period_start)
  if (groupBy === 'month') return formatBusinessDate(row.period + '-01', { month: 'short', year: '2-digit' })
  return 'Sem. ' + String(Number(row.period.slice(-2)))
}

function variation(current: number, previous: number) {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

function VariationText({ current, previous }: { current: number; previous: number }) {
  const change = variation(current, previous)
  if (change === null) return <span style={{ color: 'var(--text-muted)' }}>Sin período previo comparable</span>
  const color = change >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'
  return <span style={{ color, fontWeight: 700 }}>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
}

function RankingTable({ title, subtitle, icon: Icon, items, accent, meta }: {
  title: string
  subtitle: string
  icon: any
  items: RankRow[]
  accent: string
  meta: (item: RankRow) => string | undefined
}) {
  return (
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 7 }}>
        <Icon size={16} style={{ color: accent }} /> {title}
      </h3>
      <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</p>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Sin ventas en este período.</div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>#</th><th>Concepto</th><th style={{ textAlign: 'right' }}>Cant.</th><th style={{ textAlign: 'right' }}>Ventas brutas</th></tr></thead>
            <tbody>
              {items.map((item, index) => {
                const detail = meta(item)
                return <tr key={item.name + index}>
                  <td style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{index + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    {detail && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{detail}</div>}
                  </td>
                  <td style={{ textAlign: 'right' }}>{Number(item.quantity || 0).toFixed(Number(item.quantity || 0) % 1 === 0 ? 0 : 2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: accent }}>{formatMoney(item.total)}</td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const today = getBusinessDate()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [groupBy, setGroupBy] = useState<GroupBy>('day')
  const [report, setReport] = useState<OperationalReport | null>(null)
  const [performance, setPerformance] = useState<SalesPerformance | null>(null)
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

    Promise.all([
      api.reports.getOperationalSummary(from, to),
      api.reports.getSalesPerformance(from, to, groupBy),
    ])
      .then(([operational, salesPerformance]: any[]) => {
        if (!active) return
        setReport(operational as OperationalReport)
        setPerformance(salesPerformance as SalesPerformance)
      })
      .catch(() => {
        if (active) setError('No se pudo cargar el reporte. Intenta nuevamente.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [from, to, groupBy])

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

  const trendData = useMemo(() => (performance?.trend || []).map(row => ({
    name: formatTrendPeriod(row, groupBy),
    total: Number(row.total),
    count: Number(row.count),
  })), [performance, groupBy])

  const paymentRows = [
    { label: 'Efectivo', value: summary?.cash_total || 0, count: summary?.cash_count || 0, icon: Banknote, color: '#f59e0b' },
    { label: 'Tarjeta', value: summary?.card_total || 0, count: summary?.card_count || 0, icon: CreditCard, color: '#3b82f6' },
    { label: 'Transferencia', value: summary?.transfer_total || 0, count: summary?.transfer_count || 0, icon: Landmark, color: '#8b5cf6' },    { label: 'Crédito', value: summary?.credit_total || 0, count: summary?.credit_count || 0, icon: CreditCard, color: '#f59e0b' },
  ]

  const groupLabels: Record<GroupBy, string> = { day: 'día', week: 'semana', month: 'mes' }
  const rangeLabel = from === to
    ? 'Corte del día — ' + formatReportDate(from)
    : 'Corte operativo del ' + formatReportDate(from) + ' al ' + formatReportDate(to)

  const setQuickRange = (days: number) => {
    setFrom(offsetDate(today, -(days - 1)))
    setTo(today)
  }

  if (loading && (!report || !performance)) {
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
        <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
          <label className="form-label">Agrupar rendimiento por</label>
          <select className="select" value={groupBy} onChange={event => setGroupBy(event.target.value as GroupBy)}>
            <option value="day">Día</option><option value="week">Semana</option><option value="month">Mes</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setQuickRange(1)}>Hoy</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setQuickRange(7)}>Últimos 7 días</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setFrom(firstDayOfMonth(today)); setTo(today) }}>Este mes</button>
        </div>
      </div>

      {error ? (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', color: 'var(--accent-danger)', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-danger)' }}>{error}</div>
      ) : (
        <>
          <div className="grid-cols-4" style={{ marginBottom: 24 }}>
            {[
              { label: 'Ventas realizadas', value: summary?.total_sales || 0, format: 'number', icon: BarChart2, color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
              { label: 'Ingresos netos', value: summary?.total_revenue || 0, format: 'money', icon: TrendingUp, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
              { label: 'Descuentos otorgados', value: summary?.total_discounts || 0, format: 'money', icon: BadgePercent, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
              { label: 'Cobrado en efectivo', value: summary?.cash_total || 0, format: 'money', icon: Banknote, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
            ].map(({ label, value, format, icon: Icon, color, bg }) => (
              <div key={label} className="stat-card"><div className="stat-icon" style={{ background: bg }}><Icon size={20} style={{ color }} /></div><div><div className="stat-label">{label}</div><div className="stat-value" style={{ color }}>{format === 'money' ? formatMoney(value as number) : value}</div></div></div>
            ))}
          </div>

          <div className="grid-cols-2" style={{ marginBottom: 16 }}>
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}><CalendarDays size={16} style={{ color: 'var(--accent-primary)' }} />Ventas por día</h3>
              {dailyData.length === 0 ? <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)', fontSize: 13 }}>No hay ventas activas en este período.</div> : <ResponsiveContainer width="100%" height={230}><BarChart data={dailyData} margin={{ top: 4, right: 0, left: -12, bottom: 0 }}><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 13 }} formatter={(value: any, _name: string, item: any) => [formatMoney(Number(value)), Number(item.payload.count) + ' venta(s)']} /><Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#10b981" /></BarChart></ResponsiveContainer>}
            </div>
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Cobros por medio de pago</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{paymentRows.map(({ label, value, count, icon: Icon, color }) => <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 'var(--radius-sm)', background: 'var(--bg-base)' }}><div style={{ width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', background: color + '22' }}><Icon size={17} style={{ color }} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div><div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{count} venta(s)</div></div><div style={{ fontWeight: 700, color }}>{formatMoney(value)}</div></div>)}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>Ventas por tipo de artículo</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)' }}>Importes antes de descuentos globales de la venta.</p>
            {typeData.length === 0 ? <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)', fontSize: 13 }}>No hay artículos vendidos en este período.</div> : <ResponsiveContainer width="100%" height={230}><BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 12, left: 20, bottom: 0 }}><XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 13 }} formatter={(value: any, _name: string, item: any) => [formatMoney(Number(value)), Number(item.payload.count) + ' venta(s)']} /><Bar dataKey="total" radius={[0, 6, 6, 0]}>{typeData.map((item, index) => <Cell key={index} fill={item.color} />)}</Bar></BarChart></ResponsiveContainer>}
          </div>

          <div style={{ margin: '28px 0 12px' }}>
            <h2 style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Award size={20} style={{ color: 'var(--accent-primary)' }} />Detalle y rendimiento de ventas</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '5px 0 0' }}>Comparado automáticamente con el período anterior de igual duración.</p>
          </div>

          <div className="grid-cols-2" style={{ marginBottom: 16 }}>
            <div className="card"><div className="stat-label">Ingresos del período</div><div className="stat-value" style={{ color: 'var(--accent-success)' }}>{formatMoney(performance?.current.total_revenue || 0)}</div><div style={{ marginTop: 7, fontSize: 12 }}>Vs. {formatMoney(performance?.previous.total_revenue || 0)} anterior · <VariationText current={Number(performance?.current.total_revenue || 0)} previous={Number(performance?.previous.total_revenue || 0)} /></div></div>
            <div className="card"><div className="stat-label">Ventas realizadas</div><div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{performance?.current.total_sales || 0}</div><div style={{ marginTop: 7, fontSize: 12 }}>Vs. {performance?.previous.total_sales || 0} anterior · <VariationText current={Number(performance?.current.total_sales || 0)} previous={Number(performance?.previous.total_sales || 0)} /></div></div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 7 }}><CalendarDays size={16} style={{ color: 'var(--accent-primary)' }} />Rendimiento por {groupLabels[groupBy]}</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)' }}>Período previo: {formatReportDate(performance?.previousFrom || from)} al {formatReportDate(performance?.previousTo || to)}.</p>
            {trendData.length === 0 ? <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)', fontSize: 13 }}>No hay ventas activas en este período.</div> : <ResponsiveContainer width="100%" height={250}><BarChart data={trendData} margin={{ top: 4, right: 0, left: -12, bottom: 0 }}><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 13 }} formatter={(value: any, _name: string, item: any) => [formatMoney(Number(value)), Number(item.payload.count) + ' venta(s)']} /><Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#6366f1" /></BarChart></ResponsiveContainer>}
          </div>

          <div className="grid-cols-3">
            <RankingTable title="Productos más vendidos" subtitle="Ranking por ventas brutas" icon={Package} accent="#3b82f6" items={performance?.products || []} meta={item => item.category_name} />
            <RankingTable title="Categorías más vendidas" subtitle="Ranking por ventas brutas" icon={Layers3} accent="#10b981" items={performance?.categories || []} meta={item => Number(item.sale_count || 0) + ' venta(s)'} />
            <RankingTable title="Servicios más vendidos" subtitle="Impresiones e investigaciones" icon={Wrench} accent="#f59e0b" items={performance?.services || []} meta={item => typeMap[item.item_type || '']?.label || item.item_type} />
          </div>
        </>
      )}
    </div>
  )
}