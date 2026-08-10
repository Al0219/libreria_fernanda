import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export interface ReportExportData {
  businessName: string
  periodLabel: string
  generatedAt: string
  sales: { count: number; revenue: number; cash: number; discounts: number }
  inventory: { cost: number; units: number; lowStock: number; outOfStock: number }
  purchases: { invested: number; count: number; units: number }
  customers: { count: number; sales: number; revenue: number }
  profitability: { revenue: number; cost: number; profit: number; margin: number | null; missingCostRevenue: number }
  topProducts: { name: string; quantity: number; total: number }[]
  lowStockProducts: { name: string; stock: number; minStock: number }[]
  topCustomers: { name: string; sales: number; total: number }[]
  profitableProducts: { name: string; revenue: number; cost: number; profit: number; margin: number | null }[]
}

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, color: '#1e293b', fontFamily: 'Helvetica' },
  header: { borderBottomWidth: 2, borderBottomColor: '#2563eb', paddingBottom: 10, marginBottom: 14 },
  title: { fontSize: 18, fontWeight: 700, color: '#1e3a5f' },
  subtitle: { fontSize: 9, color: '#64748b', marginTop: 4 },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#1e3a5f', marginBottom: 6 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metric: { width: '23%', borderWidth: 1, borderColor: '#dbeafe', backgroundColor: '#f8fafc', padding: 7, borderRadius: 3 },
  label: { fontSize: 7, color: '#64748b' },
  value: { fontSize: 12, fontWeight: 700, marginTop: 3, color: '#0f172a' },
  grid: { flexDirection: 'row', gap: 10 },
  tableBlock: { flexGrow: 1, width: '49%' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 4 },
  head: { backgroundColor: '#eff6ff', fontWeight: 700, color: '#1e3a5f' },
  cellName: { width: '52%' },
  cellNumber: { width: '24%', textAlign: 'right' },
  note: { marginTop: 8, padding: 7, backgroundColor: '#fffbeb', color: '#92400e', borderWidth: 1, borderColor: '#fde68a' },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', fontSize: 7, color: '#94a3b8' },
})

const money = (value: number) => 'Q' + Number(value || 0).toFixed(2)

function Metric({ label, value }: { label: string; value: string | number }) {
  return <View style={styles.metric}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>
}

function CompactTable({ title, rows, headers }: { title: string; rows: string[][]; headers: string[] }) {
  return <View style={styles.tableBlock} wrap={false}><Text style={styles.sectionTitle}>{title}</Text><View style={[styles.row, styles.head]}>{headers.map((header, index) => <Text key={header} style={index === 0 ? styles.cellName : styles.cellNumber}>{header}</Text>)}</View>{rows.length === 0 ? <View style={styles.row}><Text style={styles.cellName}>Sin datos</Text></View> : rows.slice(0, 8).map((row, rowIndex) => <View key={rowIndex} style={styles.row}>{row.map((cell, index) => <Text key={index} style={index === 0 ? styles.cellName : styles.cellNumber}>{cell}</Text>)}</View>)}</View>
}

export function ReportDocument({ data }: { data: ReportExportData }) {
  const margin = data.profitability.margin == null ? '—' : data.profitability.margin.toFixed(1) + '%'
  return <Document title={'Corte de reportes - ' + data.periodLabel} author={data.businessName}>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}><Text style={styles.title}>{data.businessName}</Text><Text style={styles.subtitle}>Corte de reportes · {data.periodLabel}</Text><Text style={styles.subtitle}>Generado: {data.generatedAt}</Text></View>

      <View style={styles.section}><Text style={styles.sectionTitle}>Resumen de ventas</Text><View style={styles.metrics}><Metric label="Ventas" value={data.sales.count} /><Metric label="Ingresos netos" value={money(data.sales.revenue)} /><Metric label="Efectivo" value={money(data.sales.cash)} /><Metric label="Descuentos" value={money(data.sales.discounts)} /></View></View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Inventario y compras</Text><View style={styles.metrics}><Metric label="Inventario al costo" value={money(data.inventory.cost)} /><Metric label="Unidades disponibles" value={data.inventory.units} /><Metric label="Bajo stock / agotados" value={data.inventory.lowStock + ' / ' + data.inventory.outOfStock} /><Metric label="Compras invertidas" value={money(data.purchases.invested)} /></View></View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Clientes y rentabilidad</Text><View style={styles.metrics}><Metric label="Clientes atendidos" value={data.customers.count} /><Metric label="Ventas con cliente" value={data.customers.sales} /><Metric label="Utilidad bruta" value={money(data.profitability.profit)} /><Metric label="Margen bruto" value={margin} /></View></View>

      {data.profitability.missingCostRevenue > 0 && <Text style={styles.note}>Advertencia: {money(data.profitability.missingCostRevenue)} de ventas de productos no tiene costo histórico; no se incluye en utilidad ni margen.</Text>}

      <View style={[styles.section, styles.grid]}><CompactTable title="Productos más vendidos" headers={['Producto', 'Unid.', 'Venta']} rows={data.topProducts.map(row => [row.name, String(row.quantity), money(row.total)])} /><CompactTable title="Alertas de inventario" headers={['Producto', 'Stock', 'Mín.']} rows={data.lowStockProducts.map(row => [row.name, String(row.stock), String(row.minStock)])} /></View>
      <View style={[styles.section, styles.grid]}><CompactTable title="Clientes con mayor monto" headers={['Cliente', 'Compras', 'Monto']} rows={data.topCustomers.map(row => [row.name, String(row.sales), money(row.total)])} /><CompactTable title="Rentabilidad por producto" headers={['Producto', 'Utilidad', 'Margen']} rows={data.profitableProducts.map(row => [row.name, money(row.profit), row.margin == null ? '—' : row.margin.toFixed(1) + '%'])} /></View>

      <Text style={styles.footer}>Corte generado por Sistema POS Papelería</Text>
    </Page>
  </Document>
}