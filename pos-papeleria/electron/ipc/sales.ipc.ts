import { IpcMain } from 'electron'
import { getDb, saveDb } from '../db/client'
import { queryAll, queryFirst, run, transaction } from '../db/helpers'
import { businessDate } from '../lib/business-time'

export function registerSaleHandlers(ipcMain: IpcMain) {
  ipcMain.handle('sales:create', (_e, data: any) => {
    const db = getDb()
    const result = transaction(db, () => {

      let customer: any = null
      if (data.customerId) {
        customer = queryFirst(db, 'SELECT id, name, nit FROM customers WHERE id=? AND active=1', [data.customerId])
        if (!customer) throw new Error('El cliente seleccionado no existe o está archivado.')
      }
      const customerName = customer?.name || 'Consumidor final'
      const customerNit = customer?.nit || 'C/F'

      // Generar folio YYYYMMDD-NNN
      const todayStr = businessDate()
      const createdAt = new Date().toISOString()
      const todayCompact = todayStr.replace(/-/g, '')
      const lastSale = queryFirst(db, `SELECT folio FROM sales WHERE date=? ORDER BY id DESC LIMIT 1`, [todayStr])
      let seq = 1
      if (lastSale?.folio) {
        const parts = (lastSale.folio as string).split('-')
        seq = parseInt(parts[parts.length - 1]) + 1
      }
      const folio = `${todayCompact}-${String(seq).padStart(3, '0')}`

      // Insertar venta
      const saleId = run(db,
        `INSERT INTO sales (folio, date, subtotal, discount, total, payment_method, amount_paid, change_given, notes, customer_id, customer_name, customer_nit, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [folio, todayStr, data.subtotal, data.discount || 0, data.total,
         data.paymentMethod, data.amountPaid, data.changeGiven || 0, data.notes || null,
         customer?.id || null, customerName, customerNit, createdAt]
      )

      // Insertar ítems y descontar stock
      for (const item of data.items) {
        run(db,
          `INSERT INTO sale_items (sale_id, item_type, product_id, description, quantity, unit_price, subtotal, metadata_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [saleId, item.itemType, item.productId || null, item.description,
           item.quantity, item.unitPrice, item.subtotal,
           item.metadataJson ? JSON.stringify(item.metadataJson) : null]
        )

        if (item.itemType === 'product' && item.productId) {
          run(db, `UPDATE products SET stock = stock - ? WHERE id=?`, [item.quantity, item.productId])
        }
      }

      return { id: saleId, folio, date: todayStr, createdAt, customerName, customerNit }
    })
    saveDb()
    return result
  })

  ipcMain.handle('sales:getAll', (_e, filters?: {
    from?: string; to?: string; paymentMethod?: string;
    showCancelled?: boolean; search?: string
  }) => {
    const db = getDb()
    const params: any[] = []

    // Base siempre con alias s; solo agrega JOIN cuando haya búsqueda de texto
    let sql = `SELECT DISTINCT s.* FROM sales s`
    if (filters?.search) {
      sql += ` LEFT JOIN sale_items si ON si.sale_id = s.id`
    }
    sql += ` WHERE 1=1`

    if (!filters?.showCancelled) { sql += ' AND (s.cancelled IS NULL OR s.cancelled = 0)' }
    if (filters?.from)           { sql += ' AND s.date >= ?'; params.push(filters.from) }
    if (filters?.to)             { sql += ' AND s.date <= ?'; params.push(filters.to) }
    if (filters?.paymentMethod)  { sql += ' AND s.payment_method=?'; params.push(filters.paymentMethod) }

    if (filters?.search) {
      const term = `%${filters.search}%`
      sql += ` AND (s.folio LIKE ? OR s.notes LIKE ? OR s.customer_name LIKE ? OR s.customer_nit LIKE ? OR si.description LIKE ?)`
      params.push(term, term, term, term, term)
    }

    sql += ' ORDER BY datetime(s.created_at) DESC'
    return queryAll(db, sql, params)
  })

  ipcMain.handle('sales:getById', (_e, id: number) => {
    const db = getDb()
    const sale = queryFirst(db, 'SELECT * FROM sales WHERE id=?', [id])
    const items = queryAll(db, 'SELECT * FROM sale_items WHERE sale_id=?', [id])
    return { sale, items }
  })

  ipcMain.handle('sales:getToday', () => {
    const db = getDb()
    const today = businessDate()
    return queryAll(db, `SELECT * FROM sales WHERE date=? AND (cancelled IS NULL OR cancelled=0) ORDER BY datetime(created_at) DESC`, [today])
  })

  ipcMain.handle('sales:cancel', (_e, id: number) => {
    const db = getDb()
    const result = transaction(db, () => {

      // Verificar que la venta no esté ya cancelada
      const sale = queryFirst(db, `SELECT cancelled FROM sales WHERE id=?`, [id])
      if (!sale || sale.cancelled) return { success: false, error: 'Venta no encontrada o ya cancelada' }

      // Reponer stock de los productos vendidos
      const items = queryAll(db, `SELECT product_id, quantity, item_type FROM sale_items WHERE sale_id=?`, [id])
      for (const item of items) {
        if (item.item_type === 'product' && item.product_id) {
          run(db, `UPDATE products SET stock = stock + ?, updated_at = datetime('now') WHERE id=?`,
            [item.quantity, item.product_id])
        }
      }

      // Marcar como cancelada
      run(db, `UPDATE sales SET cancelled=1 WHERE id=?`, [id])
      return { success: true }
    })
    if (result.success) saveDb()
    return result
  })

  ipcMain.handle('sales:getDailySummary', (_e, date?: string) => {
    const db = getDb()
    const targetDate = date || businessDate()

    const sales = queryAll(db, `SELECT * FROM sales WHERE date=? ORDER BY datetime(created_at) DESC`, [targetDate])

    const summary = {
      total_sales: sales.length,
      total_revenue: sales.reduce((s: number, r: any) => s + r.total, 0),
      cash_total: sales.filter((s: any) => s.payment_method === 'cash').reduce((s: number, r: any) => s + r.total, 0),
      card_total: sales.filter((s: any) => s.payment_method === 'card').reduce((s: number, r: any) => s + r.total, 0),
      transfer_total: sales.filter((s: any) => s.payment_method === 'transfer').reduce((s: number, r: any) => s + r.total, 0),
    }

    const byType = queryAll(db, `
      SELECT si.item_type, SUM(si.subtotal) as total
      FROM sale_items si JOIN sales s ON si.sale_id=s.id
      WHERE s.date=? GROUP BY si.item_type
    `, [targetDate])

    return { summary, byType, sales }
  })
}
