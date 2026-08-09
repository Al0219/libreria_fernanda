import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { BarChart2, TrendingUp, ShoppingBag, Printer, BookOpen, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function ReportsPage() {
  const [dailySummary, setDailySummary] = useState<any>(null)
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    Promise.all([
      api.reports.getDailyCashRegister(today),
      api.reports.getTopProducts(10),
    ]).then(([daily, top]) => {
      setDailySummary(daily)
      setTopProducts(top as any[])
      setLoading(false)
    })
  }, [today])

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Cargando reportes...</div>

  const summary = dailySummary?.summary
  const byType: any[] = dailySummary?.byType || []

  const typeMap: Record<string, { label: string; icon: any; color: string }> = {
    product: { label: 'Productos', icon: ShoppingBag, color: '#3b82f6' },
    print: { label: 'Impresión', icon: Printer, color: '#f59e0b' },
    research: { label: 'Investigaciones', icon: BookOpen, color: '#6366f1' },
  }

  const typeChartData = byType.map(t => ({
    name: typeMap[t.item_type]?.label || t.item_type,
    total: t.total,
    color: typeMap[t.item_type]?.color || '#64748b',
  }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Corte del día — {new Date(today + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid-cols-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total ventas', value: summary?.total_sales || 0, format: 'num', icon: BarChart2, color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
          { label: 'Ingresos del día', value: summary?.total_revenue || 0, format: 'money', icon: TrendingUp, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
          { label: 'Efectivo', value: summary?.cash_total || 0, format: 'money', icon: DollarSign, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
          { label: 'Tarjeta / Transfer', value: (summary?.card_total || 0) + (summary?.transfer_total || 0), format: 'money', icon: DollarSign, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
        ].map(({ label, value, format, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{ background: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color }}>
                {format === 'money' ? `Q${(value as number).toFixed(2)}` : value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-cols-2">
        {/* Ingresos por tipo */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Ingresos por tipo de servicio</h3>
          {typeChartData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Sin datos hoy</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeChartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 13 }}
                  formatter={(v: any) => [`Q${Number(v).toFixed(2)}`, 'Total']}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {typeChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top productos */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Productos más vendidos</h3>
          {topProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Sin datos</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topProducts.slice(0, 6).map((p, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex gap-3 items-center">
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 18, textAlign: 'right' }}>#{i + 1}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{p.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--accent-success)', fontWeight: 600 }}>Q{p.total_revenue?.toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.total_qty} uds.</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
