import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import { formatBusinessDate } from '../../lib/business-time'

// ─── Tipos ───────────────────────────────────────────────────────────────────
export interface TicketData {
  folio: string
  date: string           // YYYY-MM-DD
  time: string           // HH:MM
  paymentMethod: string  // 'cash' | 'card' | 'transfer'
  amountPaid: number
  changeGiven: number
  items: {
    description: string
    quantity: number
    unitPrice: number
    subtotal: number
    itemType: string     // 'product' | 'print' | 'research'
  }[]
  subtotal: number
  total: number
  // Datos del negocio
  businessName: string
  businessAddress?: string
  businessPhone?: string
  ticketFooter?: string
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
}

const TYPE_LABEL: Record<string, string> = {
  product: 'Producto',
  print: 'Impresión',
  research: 'Investigación',
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 36,
    backgroundColor: '#FFFFFF',
    color: '#1a2b3c',
  },

  // Header
  header: {
    textAlign: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#C2DFF5',
    borderBottomStyle: 'solid',
  },
  businessName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#133250',
    marginBottom: 3,
  },
  businessSub: {
    fontSize: 8.5,
    color: '#7CA8C7',
    marginBottom: 1,
  },

  // Folio box
  folioBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FF',
    borderBottomStyle: 'solid',
  },
  folioLabel: { fontSize: 8, color: '#7CA8C7', marginBottom: 2 },
  folioValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#3B82C4' },
  dateText: { fontSize: 8.5, color: '#3B6A91', textAlign: 'right' },

  // Tabla de items
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#D4EFFF',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0F2FF',
    borderBottomStyle: 'solid',
  },
  tableRowAlt: {
    backgroundColor: '#F2FFF9',
  },
  colDesc:  { flex: 3 },
  colQty:   { flex: 1, textAlign: 'center' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  thText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#3B6A91', textTransform: 'uppercase' },
  tdText: { fontSize: 8.5, color: '#133250' },
  tdMuted: { fontSize: 7.5, color: '#7CA8C7', marginTop: 1 },
  tdBold: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#133250' },

  // Totales
  totalsBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#C2DFF5',
    borderTopStyle: 'solid',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: { fontSize: 9, color: '#3B6A91' },
  totalValue: { fontSize: 9, color: '#133250' },
  grandLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#133250' },
  grandValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#3B82C4' },
  changeValue: { fontSize: 9, color: '#43BFA0', fontFamily: 'Helvetica-Bold' },

  // Pago
  paymentBox: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#EFF8FF',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentLabel: { fontSize: 8, color: '#7CA8C7' },
  paymentValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#133250' },

  // Footer
  footer: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#C2DFF5',
    borderTopStyle: 'solid',
    textAlign: 'center',
  },
  footerText: { fontSize: 8.5, color: '#7CA8C7', marginBottom: 3 },
  footerThanks: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#3B82C4' },
})

// ─── Componente PDF ───────────────────────────────────────────────────────────
export function TicketDocument({ data }: { data: TicketData }) {
  const dateFormatted = (() => {
    try {
      return formatBusinessDate(data.date, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    } catch { return data.date }
  })()

  return (
    <Document title={`Ticket ${data.folio}`} author={data.businessName}>
      <Page size="LETTER" style={S.page}>

        {/* ── Encabezado ── */}
        <View style={S.header}>
          <Text style={S.businessName}>{data.businessName}</Text>
          {data.businessAddress && <Text style={S.businessSub}>{data.businessAddress}</Text>}
          {data.businessPhone && <Text style={S.businessSub}>Tel: {data.businessPhone}</Text>}
          <Text style={[S.businessSub, { marginTop: 4 }]}>COMPROBANTE DE VENTA</Text>
        </View>

        {/* ── Folio y fecha ── */}
        <View style={S.folioBox}>
          <View>
            <Text style={S.folioLabel}>FOLIO</Text>
            <Text style={S.folioValue}>{data.folio}</Text>
          </View>
          <View>
            <Text style={S.dateText}>{dateFormatted}</Text>
            <Text style={[S.dateText, { marginTop: 2 }]}>{data.time} hrs</Text>
          </View>
        </View>

        {/* ── Tabla de ítems ── */}
        <View style={S.tableHeader}>
          <Text style={[S.thText, S.colDesc]}>Descripción</Text>
          <Text style={[S.thText, S.colQty]}>Cant.</Text>
          <Text style={[S.thText, S.colPrice]}>P. Unit.</Text>
          <Text style={[S.thText, S.colTotal]}>Subtotal</Text>
        </View>

        {data.items.map((item, i) => (
          <View key={i} style={[S.tableRow, i % 2 !== 0 ? S.tableRowAlt : {}]}>
            <View style={S.colDesc}>
              <Text style={S.tdText}>{item.description}</Text>
              <Text style={S.tdMuted}>{TYPE_LABEL[item.itemType] || item.itemType}</Text>
            </View>
            <Text style={[S.tdText, S.colQty]}>{item.quantity}</Text>
            <Text style={[S.tdText, S.colPrice]}>Q{item.unitPrice.toFixed(2)}</Text>
            <Text style={[S.tdBold, S.colTotal]}>Q{item.subtotal.toFixed(2)}</Text>
          </View>
        ))}

        {/* ── Totales ── */}
        <View style={S.totalsBox}>
          <View style={S.totalRow}>
            <Text style={S.totalLabel}>Subtotal</Text>
            <Text style={S.totalValue}>Q{data.subtotal.toFixed(2)}</Text>
          </View>
          <View style={S.totalRow}>
            <Text style={S.grandLabel}>TOTAL</Text>
            <Text style={S.grandValue}>Q{data.total.toFixed(2)}</Text>
          </View>
        </View>

        {/* ── Método de pago ── */}
        <View style={S.paymentBox}>
          <View>
            <Text style={S.paymentLabel}>Método de pago</Text>
            <Text style={S.paymentValue}>{METHOD_LABEL[data.paymentMethod] || data.paymentMethod}</Text>
          </View>
          {data.paymentMethod === 'cash' && (
            <>
              <View>
                <Text style={S.paymentLabel}>Recibido</Text>
                <Text style={S.paymentValue}>Q{data.amountPaid.toFixed(2)}</Text>
              </View>
              <View>
                <Text style={S.paymentLabel}>Cambio</Text>
                <Text style={[S.paymentValue, { color: '#43BFA0' }]}>
                  Q{data.changeGiven.toFixed(2)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* ── Footer ── */}
        <View style={S.footer}>
          {data.ticketFooter
            ? <Text style={S.footerThanks}>{data.ticketFooter}</Text>
            : <Text style={S.footerThanks}>¡Gracias por su compra!</Text>
          }
          <Text style={[S.footerText, { marginTop: 6 }]}>
            {data.businessName} · {data.date}
          </Text>
        </View>

      </Page>
    </Document>
  )
}
