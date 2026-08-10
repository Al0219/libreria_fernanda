import { IpcMain } from 'electron'
import { getDb, saveDb } from '../db/client'
import { queryAll, queryFirst, run, transaction } from '../db/helpers'
import { businessDate } from '../lib/business-time'

const directPaymentMethods = ['cash', 'card', 'transfer']
const activeSalesCondition = '(cancelled IS NULL OR cancelled=0)'

export function registerSaleHandlers(ipcMain: IpcMain) {
  ipcMain.handle('sales:create', (_e, data: any) => {
    const db = getDb()
    const result = transaction(db, () => {
      const total = Math.round(Number(data.total) * 100) / 100
      const subtotal = Math.round(Number(data.subtotal) * 100) / 100
      const discount = Math.round(Number(data.discount || 0) * 100) / 100
      if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(subtotal) || subtotal < total || !Array.isArray(data.items) || data.items.length === 0) {
        throw new Error('Los datos de la venta no son válidos.')
      }
      if (![...directPaymentMethods, 'credit'].includes(data.paymentMethod)) throw new Error('El método de pago no es válido.')

      const todayStr = businessDate()
      const createdAt = new Date().toISOString()
      let customer: any = null
      if (data.customerId) {
        customer = queryFirst(db, 'SELECT id, name, nit, credit_authorized, credit_limit FROM customers WHERE id=? AND active=1', [data.customerId])
        if (!customer) throw new Error('El cliente seleccionado no existe o está archivado.')
      }

      let amountPaid = Math.round(Number(data.amountPaid || 0) * 100) / 100
      let changeGiven = 0
      let dueDate: string | null = null
      let initialPaymentMethod: string | null = null
      let creditBalance = 0

      if (data.paymentMethod === 'credit') {
        if (!customer) throw new Error('Selecciona un cliente activo para registrar una venta a crédito.')
        if (!customer.credit_authorized || Number(customer.credit_limit) <= 0) throw new Error('Este cliente no tiene crédito autorizado.')
        dueDate = String(data.dueDate || '')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || dueDate < todayStr) throw new Error('Indica una fecha de vencimiento válida.')
        if (!Number.isFinite(amountPaid) || amountPaid < 0 || amountPaid >= total) throw new Error('El anticipo debe ser mayor o igual a cero y menor al total.')
        creditBalance = Math.round((total - amountPaid) * 100) / 100
        if (amountPaid > 0) {
          initialPaymentMethod = String(data.initialPaymentMethod || '')
          if (!directPaymentMethods.includes(initialPaymentMethod)) throw new Error('Selecciona el medio de pago del anticipo.')
        }
        const outstanding = Number(queryFirst(db,
          "SELECT COALESCE(SUM(balance), 0) as total FROM accounts_receivable WHERE customer_id=? AND status='open'",
          [customer.id])?.total || 0)
        if (outstanding + creditBalance > Number(customer.credit_limit) + 0.0001) throw new Error('La venta supera el crédito disponible del cliente.')
      } else {
        if (!Number.isFinite(amountPaid)) amountPaid = total
        if (data.paymentMethod === 'cash') {
          if (amountPaid < total) throw new Error('El efectivo recibido no cubre el total de la venta.')
          changeGiven = Math.round((amountPaid - total) * 100) / 100
        } else {
          amountPaid = total
        }
      }

      const customerName = customer?.name || 'Consumidor final'
      const customerNit = customer?.nit || 'C/F'
      const todayCompact = todayStr.replace(/-/g, '')
      const lastSale = queryFirst(db, 'SELECT folio FROM sales WHERE date=? ORDER BY id DESC LIMIT 1', [todayStr])
      const seq = lastSale?.folio ? parseInt(String(lastSale.folio).split('-').pop() || '0') + 1 : 1
      const folio = `${todayCompact}-${String(seq).padStart(3, '0')}`

      const saleId = run(db,
        `INSERT INTO sales (folio, date, subtotal, discount, total, payment_method, amount_paid, change_given, notes, customer_id, customer_name, customer_nit, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [folio, todayStr, subtotal, discount, total, data.paymentMethod, amountPaid, changeGiven, data.notes || null, customer?.id || null, customerName, customerNit, createdAt]
      )

      for (const item of data.items) {
        let unitCost = 0
        if (item.itemType === 'product') {
          if (!item.productId) throw new Error('El producto de la venta no es válido.')
          const product = queryFirst(db, 'SELECT purchase_price, stock FROM products WHERE id=?', [item.productId])
          if (!product) throw new Error('El producto seleccionado ya no existe.')
          if (Number(product.stock) < Number(item.quantity)) throw new Error('Stock insuficiente para completar la venta.')
          unitCost = Number(product.purchase_price) || 0
        }
        run(db,
          `INSERT INTO sale_items (sale_id, item_type, product_id, description, quantity, unit_price, unit_cost, subtotal, metadata_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [saleId, item.itemType, item.productId || null, item.description, item.quantity, item.unitPrice, unitCost, item.subtotal, item.metadataJson ? JSON.stringify(item.metadataJson) : null]
        )
        if (item.itemType === 'product') run(db, 'UPDATE products SET stock=stock-?, updated_at=datetime(\'now\') WHERE id=?', [item.quantity, item.productId])
      }

      if (data.paymentMethod === 'credit' && customer && dueDate) {
        const accountId = run(db,
          'INSERT INTO accounts_receivable (sale_id, customer_id, original_amount, balance, due_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [saleId, customer.id, total, creditBalance, dueDate, 'open', createdAt]
        )
        if (amountPaid > 0 && initialPaymentMethod) {
          run(db,
            'INSERT INTO credit_payments (account_id, sale_id, customer_id, amount, payment_method, business_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [accountId, saleId, customer.id, amountPaid, initialPaymentMethod, todayStr, 'Anticipo de venta a crédito', createdAt]
          )
        }
      }

      return { id: saleId, folio, date: todayStr, createdAt, customerName, customerNit, changeGiven, creditBalance, dueDate }
    })
    saveDb()
    return result
  })

  ipcMain.handle('sales:getAll', (_e, filters?: { from?: string; to?: string; paymentMethod?: string; showCancelled?: boolean; search?: string }) => {
    const db = getDb(); const params: any[] = []; let sql = 'SELECT DISTINCT s.*, ar.balance as credit_balance, ar.due_date as credit_due_date, ar.status as credit_status FROM sales s LEFT JOIN accounts_receivable ar ON ar.sale_id=s.id'
    if (filters?.search) sql += ' LEFT JOIN sale_items si ON si.sale_id=s.id'
    sql += ' WHERE 1=1'
    if (!filters?.showCancelled) sql += ' AND (s.cancelled IS NULL OR s.cancelled=0)'
    if (filters?.from) { sql += ' AND s.date>=?'; params.push(filters.from) }
    if (filters?.to) { sql += ' AND s.date<=?'; params.push(filters.to) }
    if (filters?.paymentMethod) { sql += ' AND s.payment_method=?'; params.push(filters.paymentMethod) }
    if (filters?.search) { const term = `%${filters.search}%`; sql += ' AND (s.folio LIKE ? OR s.notes LIKE ? OR s.customer_name LIKE ? OR s.customer_nit LIKE ? OR si.description LIKE ?)'; params.push(term, term, term, term, term) }
    return queryAll(db, sql + ' ORDER BY datetime(s.created_at) DESC', params)
  })

  ipcMain.handle('sales:getById', (_e, id: number) => ({
    sale: queryFirst(getDb(), 'SELECT * FROM sales WHERE id=?', [id]),
    items: queryAll(getDb(), 'SELECT * FROM sale_items WHERE sale_id=?', [id]),
    account: queryFirst(getDb(), 'SELECT * FROM accounts_receivable WHERE sale_id=?', [id]),
  }))
  ipcMain.handle('sales:getToday', () => queryAll(getDb(), 'SELECT * FROM sales WHERE date=? AND ' + activeSalesCondition + ' ORDER BY datetime(created_at) DESC', [businessDate()]))

  ipcMain.handle('sales:cancel', (_e, id: number) => {
    const db = getDb(); const result = transaction(db, () => {
      const sale = queryFirst(db, 'SELECT id, cancelled, payment_method FROM sales WHERE id=?', [id])
      if (!sale || sale.cancelled) return { success: false, error: 'Venta no encontrada o ya cancelada.' }
      if (sale.payment_method === 'credit') {
        const account = queryFirst(db, 'SELECT * FROM accounts_receivable WHERE sale_id=?', [id])
        if (!account) return { success: false, error: 'No se encontró la cuenta por cobrar de esta venta.' }
        if (Math.abs(Number(account.balance) - Number(account.original_amount)) > 0.0001) return { success: false, error: 'No se puede cancelar una venta a crédito con anticipos o abonos. Registra primero la devolución correspondiente.' }
        run(db, 'UPDATE accounts_receivable SET status=?, balance=0, cancelled_at=? WHERE id=?', ['cancelled', new Date().toISOString(), account.id])
      }
      const items = queryAll(db, 'SELECT product_id, quantity, item_type FROM sale_items WHERE sale_id=?', [id])
      for (const item of items) if (item.item_type === 'product' && item.product_id) run(db, 'UPDATE products SET stock=stock+?, updated_at=datetime(\'now\') WHERE id=?', [item.quantity, item.product_id])
      run(db, 'UPDATE sales SET cancelled=1 WHERE id=?', [id])
      return { success: true }
    })
    if (result.success) saveDb(); return result
  })

  ipcMain.handle('sales:getDailySummary', (_e, date?: string) => {
    const targetDate = date || businessDate(); const sales = queryAll(getDb(), 'SELECT * FROM sales WHERE date=? AND ' + activeSalesCondition, [targetDate])
    const totalFor = (method: string) => sales.filter((sale: any) => sale.payment_method === method).reduce((sum: number, sale: any) => sum + Number(sale.total), 0)
    return { summary: { total_sales: sales.length, total_revenue: sales.reduce((sum: number, sale: any) => sum + Number(sale.total), 0), cash_total: totalFor('cash'), card_total: totalFor('card'), transfer_total: totalFor('transfer'), credit_total: totalFor('credit') }, date: targetDate }
  })
}