import { IpcMain } from 'electron'
import { getDb } from '../db/client'
import { queryAll, queryFirst } from '../db/helpers'
import { businessDate } from '../lib/business-time'

const activeSalesCondition = '(cancelled IS NULL OR cancelled=0)'

export function registerReportHandlers(ipcMain: IpcMain) {
  ipcMain.handle('reports:getSalesByRange', (_e, from: string, to: string) => {
    return queryAll(getDb(),
      'SELECT date, COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE date BETWEEN ? AND ? AND ' + activeSalesCondition + ' GROUP BY date ORDER BY date ASC',
      [from, to]
    )
  })

  ipcMain.handle('reports:getOperationalSummary', (_e, from: string, to: string) => {
    const db = getDb()
    const summary = queryFirst(db,
      'SELECT COUNT(*) as total_sales, COALESCE(SUM(total), 0) as total_revenue, COALESCE(SUM(discount), 0) as total_discounts, ' +
      "COALESCE(SUM(CASE WHEN payment_method='cash' THEN total ELSE 0 END), 0) as cash_total, " +
      "COALESCE(SUM(CASE WHEN payment_method='card' THEN total ELSE 0 END), 0) as card_total, " +
      "COALESCE(SUM(CASE WHEN payment_method='transfer' THEN total ELSE 0 END), 0) as transfer_total, " +
      "COALESCE(SUM(CASE WHEN payment_method='credit' THEN total ELSE 0 END), 0) as credit_total, " +
      "COALESCE(SUM(CASE WHEN payment_method='cash' THEN 1 ELSE 0 END), 0) as cash_count, " +
      "COALESCE(SUM(CASE WHEN payment_method='card' THEN 1 ELSE 0 END), 0) as card_count, " +
      "COALESCE(SUM(CASE WHEN payment_method='transfer' THEN 1 ELSE 0 END), 0) as transfer_count, " +
      "COALESCE(SUM(CASE WHEN payment_method='credit' THEN 1 ELSE 0 END), 0) as credit_count " +
      'FROM sales WHERE date BETWEEN ? AND ? AND ' + activeSalesCondition,
      [from, to]
    )

    const daily = queryAll(db,
      'SELECT date, COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE date BETWEEN ? AND ? AND ' + activeSalesCondition + ' GROUP BY date ORDER BY date ASC',
      [from, to]
    )

    const byType = queryAll(db,
      'SELECT si.item_type, COALESCE(SUM(si.subtotal), 0) as total, COUNT(DISTINCT si.sale_id) as count ' +
      'FROM sale_items si JOIN sales s ON si.sale_id=s.id ' +
      'WHERE s.date BETWEEN ? AND ? AND (s.cancelled IS NULL OR s.cancelled=0) ' +
      'GROUP BY si.item_type ORDER BY total DESC',
      [from, to]
    )

    return { summary, daily, byType, from, to }
  })

  ipcMain.handle('reports:getTopProducts', (_e, limit = 10) => {
    return queryAll(getDb(),
      'SELECT p.name, SUM(si.quantity) as total_qty, SUM(si.subtotal) as total_revenue ' +
      'FROM sale_items si JOIN products p ON si.product_id=p.id JOIN sales s ON si.sale_id=s.id ' +
      "WHERE si.item_type='product' AND (s.cancelled IS NULL OR s.cancelled=0) " +
      'GROUP BY si.product_id ORDER BY total_revenue DESC LIMIT ?',
      [limit])
  })

  ipcMain.handle('reports:getDailyCashRegister', (_e, date?: string) => {
    const db = getDb()
    const targetDate = date || businessDate()
    const sales = queryAll(db, 'SELECT * FROM sales WHERE date=? AND ' + activeSalesCondition + ' ORDER BY datetime(created_at) DESC', [targetDate])

    const summary = {
      total_sales: sales.length,
      total_revenue: sales.reduce((sum: number, sale: any) => sum + sale.total, 0),
      total_discounts: sales.reduce((sum: number, sale: any) => sum + (sale.discount || 0), 0),
      cash_total: sales.filter((sale: any) => sale.payment_method === 'cash').reduce((sum: number, sale: any) => sum + sale.total, 0),
      card_total: sales.filter((sale: any) => sale.payment_method === 'card').reduce((sum: number, sale: any) => sum + sale.total, 0),
      transfer_total: sales.filter((sale: any) => sale.payment_method === 'transfer').reduce((sum: number, sale: any) => sum + sale.total, 0),
    }

    const byType = queryAll(db,
      'SELECT si.item_type, SUM(si.subtotal) as total, COUNT(DISTINCT si.sale_id) as count ' +
      'FROM sale_items si JOIN sales s ON si.sale_id=s.id ' +
      'WHERE s.date=? AND (s.cancelled IS NULL OR s.cancelled=0) GROUP BY si.item_type',
      [targetDate]
    )

    return { summary, byType, sales, date: targetDate }
  })

  ipcMain.handle('reports:getLowStockReport', () => {
    return queryAll(getDb(),
      'SELECT p.id, p.name, p.sku, p.stock, p.min_stock, c.name as category_name, s.name as supplier_name ' +
      'FROM products p LEFT JOIN categories c ON p.category_id=c.id LEFT JOIN suppliers s ON p.supplier_id=s.id ' +
      'WHERE p.active=1 AND p.stock <= p.min_stock ORDER BY (p.stock - p.min_stock) ASC'
    )
  })
  ipcMain.handle('reports:getInventoryStatus', (_e, from: string, to: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
      throw new Error('Rango de fechas inválido para el reporte de inventario.')
    }

    const db = getDb()
    const summary = queryFirst(db,
      'SELECT COUNT(*) as active_products, COALESCE(SUM(CASE WHEN stock > 0 THEN stock ELSE 0 END), 0) as units_in_stock, ' +
      'COALESCE(SUM(CASE WHEN stock > 0 THEN stock * purchase_price ELSE 0 END), 0) as inventory_cost, ' +
      'COALESCE(SUM(CASE WHEN stock > 0 AND stock <= min_stock THEN 1 ELSE 0 END), 0) as low_stock_count, ' +
      'COALESCE(SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END), 0) as out_of_stock_count ' +
      'FROM products WHERE active=1'
    ) || { active_products: 0, units_in_stock: 0, inventory_cost: 0, low_stock_count: 0, out_of_stock_count: 0 }

    const columns = 'p.id, p.name, p.sku, p.stock, p.min_stock, p.purchase_price, c.name as category_name, s.name as supplier_name '
    const joins = 'FROM products p LEFT JOIN categories c ON p.category_id=c.id LEFT JOIN suppliers s ON p.supplier_id=s.id '

    const lowStock = queryAll(db,
      'SELECT ' + columns + joins +
      'WHERE p.active=1 AND p.stock > 0 AND p.stock <= p.min_stock ORDER BY (p.stock - p.min_stock) ASC, p.name ASC'
    )
    const outOfStock = queryAll(db,
      'SELECT ' + columns + joins +
      'WHERE p.active=1 AND p.stock <= 0 ORDER BY p.name ASC'
    )

    const withoutMovement = queryAll(db,
      'SELECT ' + columns +
      'last_sales.last_sale_date, last_purchases.last_purchase_date, ' +
      'CASE WHEN last_sales.last_sale_date IS NULL THEN last_purchases.last_purchase_date ' +
      'WHEN last_purchases.last_purchase_date IS NULL THEN last_sales.last_sale_date ' +
      'WHEN last_sales.last_sale_date >= last_purchases.last_purchase_date THEN last_sales.last_sale_date ELSE last_purchases.last_purchase_date END as last_movement_date ' +
      joins +
      'LEFT JOIN (SELECT si.product_id, MAX(s.date) as last_sale_date FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE ' + activeSalesCondition + ' GROUP BY si.product_id) last_sales ON last_sales.product_id=p.id ' +
      'LEFT JOIN (SELECT sei.product_id, MAX(se.date) as last_purchase_date FROM stock_entry_items sei JOIN stock_entries se ON se.id=sei.entry_id WHERE (se.cancelled IS NULL OR se.cancelled=0) GROUP BY sei.product_id) last_purchases ON last_purchases.product_id=p.id ' +
      'WHERE p.active=1 AND NOT EXISTS (SELECT 1 FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE si.product_id=p.id AND s.date BETWEEN ? AND ? AND ' + activeSalesCondition + ' UNION ALL SELECT 1 FROM stock_entry_items sei JOIN stock_entries se ON se.id=sei.entry_id WHERE sei.product_id=p.id AND se.date BETWEEN ? AND ? AND (se.cancelled IS NULL OR se.cancelled=0)) ' +
      'ORDER BY CASE WHEN last_movement_date IS NULL THEN 0 ELSE 1 END ASC, last_movement_date ASC, p.name ASC',
      [from, to, from, to]
    )

    return { summary: { ...summary, without_movement_count: withoutMovement.length }, lowStock, outOfStock, withoutMovement, from, to }
  })
  ipcMain.handle('reports:getPurchasesReport', (_e, from: string, to: string, filters?: { supplierId?: number; productId?: number }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
      throw new Error('Rango de fechas inválido para el reporte de compras.')
    }

    const db = getDb()
    const supplierId = Number(filters?.supplierId) > 0 ? Number(filters?.supplierId) : null
    const productId = Number(filters?.productId) > 0 ? Number(filters?.productId) : null
    const rangeWhere = ['se.date BETWEEN ? AND ?', '(se.cancelled IS NULL OR se.cancelled=0)']
    const rangeParams: any[] = [from, to]
    if (supplierId) { rangeWhere.push('se.supplier_id=?'); rangeParams.push(supplierId) }
    if (productId) { rangeWhere.push('sei.product_id=?'); rangeParams.push(productId) }
    const where = rangeWhere.join(' AND ')
    const baseJoin = 'FROM stock_entries se JOIN stock_entry_items sei ON sei.entry_id=se.id LEFT JOIN suppliers s ON s.id=se.supplier_id LEFT JOIN products p ON p.id=sei.product_id '

    const summary = queryFirst(db,
      'SELECT COUNT(DISTINCT se.id) as purchase_count, COALESCE(SUM(sei.quantity), 0) as total_units, ' +
      'COALESCE(SUM(sei.subtotal), 0) as total_invested, COUNT(DISTINCT se.supplier_id) as supplier_count, ' +
      'COALESCE(SUM(sei.subtotal) / NULLIF(SUM(sei.quantity), 0), 0) as weighted_unit_cost ' +
      baseJoin + 'WHERE ' + where,
      rangeParams
    ) || { purchase_count: 0, total_units: 0, total_invested: 0, supplier_count: 0, weighted_unit_cost: 0 }

    const trend = queryAll(db,
      'SELECT se.date, COUNT(DISTINCT se.id) as purchase_count, COALESCE(SUM(sei.quantity), 0) as units, COALESCE(SUM(sei.subtotal), 0) as total ' +
      baseJoin + 'WHERE ' + where + ' GROUP BY se.date ORDER BY se.date ASC',
      rangeParams
    )

    const suppliers = queryAll(db,
      "SELECT COALESCE(s.name, 'Compra general') as name, s.id as supplier_id, COUNT(DISTINCT se.id) as purchase_count, " +
      'COALESCE(SUM(sei.quantity), 0) as units, COALESCE(SUM(sei.subtotal), 0) as total ' +
      baseJoin + 'WHERE ' + where + ' GROUP BY s.id, s.name ORDER BY total DESC, units DESC',
      rangeParams
    )

    const products = queryAll(db,
      "SELECT COALESCE(p.name, 'Producto #' || sei.product_id) as name, sei.product_id as product_id, p.sku, " +
      'COUNT(DISTINCT se.id) as purchase_count, COALESCE(SUM(sei.quantity), 0) as units, COALESCE(SUM(sei.subtotal), 0) as total, ' +
      'COALESCE(SUM(sei.subtotal) / NULLIF(SUM(sei.quantity), 0), 0) as average_cost ' +
      baseJoin + 'WHERE ' + where + ' GROUP BY sei.product_id, p.name, p.sku ORDER BY total DESC, units DESC',
      rangeParams
    )

    const optionWhere = 'se.date BETWEEN ? AND ? AND (se.cancelled IS NULL OR se.cancelled=0)'
    const suppliersForFilter = queryAll(db,
      'SELECT DISTINCT s.id, s.name FROM stock_entries se JOIN suppliers s ON s.id=se.supplier_id WHERE ' + optionWhere + ' ORDER BY s.name ASC',
      [from, to]
    )
    const productsForFilter = queryAll(db,
      'SELECT DISTINCT p.id, p.name, p.sku FROM stock_entries se JOIN stock_entry_items sei ON sei.entry_id=se.id JOIN products p ON p.id=sei.product_id WHERE ' + optionWhere + ' ORDER BY p.name ASC',
      [from, to]
    )

    const historyProductId = productId || Number(products[0]?.product_id || 0)
    let priceHistory: any[] = []
    if (historyProductId) {
      const historyWhere = ['sei.product_id=?', 'se.date BETWEEN ? AND ?', '(se.cancelled IS NULL OR se.cancelled=0)']
      const historyParams: any[] = [historyProductId, from, to]
      if (supplierId) { historyWhere.push('se.supplier_id=?'); historyParams.push(supplierId) }
      priceHistory = queryAll(db,
        "SELECT se.id as entry_id, se.date, COALESCE(s.name, 'Compra general') as supplier_name, sei.quantity, sei.purchase_price, sei.sale_price " +
        'FROM stock_entry_items sei JOIN stock_entries se ON se.id=sei.entry_id LEFT JOIN suppliers s ON s.id=se.supplier_id ' +
        'WHERE ' + historyWhere.join(' AND ') + ' ORDER BY se.date ASC, se.id ASC, sei.id ASC',
        historyParams
      )
    }

    return { summary, trend, suppliers, products, suppliersForFilter, productsForFilter, selectedProductId: historyProductId || null, priceHistory, from, to }
  })
  ipcMain.handle('reports:getCustomerReport', (_e, from: string, to: string, filters?: { customerId?: number }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
      throw new Error('Rango de fechas inválido para el reporte de clientes.')
    }

    const db = getDb()
    const customerId = Number(filters?.customerId) > 0 ? Number(filters?.customerId) : null
    const whereParts = ['s.date BETWEEN ? AND ?', activeSalesCondition, 's.customer_id IS NOT NULL']
    const params: any[] = [from, to]
    if (customerId) { whereParts.push('s.customer_id=?'); params.push(customerId) }
    const where = whereParts.join(' AND ')
    const baseJoin = 'FROM sales s LEFT JOIN customers c ON c.id=s.customer_id '

    const summary = queryFirst(db,
      'SELECT COUNT(DISTINCT s.customer_id) as customer_count, COUNT(*) as sale_count, COALESCE(SUM(s.total), 0) as total_revenue, COALESCE(AVG(s.total), 0) as average_ticket ' +
      baseJoin + 'WHERE ' + where,
      params
    ) || { customer_count: 0, sale_count: 0, total_revenue: 0, average_ticket: 0 }

    const customers = queryAll(db,
      "SELECT s.customer_id, COALESCE(c.name, MAX(s.customer_name), 'Cliente') as customer_name, COALESCE(c.nit, MAX(s.customer_nit)) as customer_nit, " +
      'COUNT(*) as sale_count, COUNT(DISTINCT s.date) as active_days, COALESCE(SUM(s.total), 0) as total_spent, COALESCE(AVG(s.total), 0) as average_ticket, MIN(s.date) as first_sale_date, MAX(s.date) as last_sale_date ' +
      baseJoin + 'WHERE ' + where + ' GROUP BY s.customer_id ORDER BY total_spent DESC, sale_count DESC, customer_name ASC',
      params
    )

    const customersForFilter = queryAll(db,
      "SELECT s.customer_id as id, COALESCE(c.name, MAX(s.customer_name), 'Cliente') as name, COALESCE(c.nit, MAX(s.customer_nit)) as nit " +
      baseJoin + 'WHERE s.date BETWEEN ? AND ? AND ' + activeSalesCondition + ' AND s.customer_id IS NOT NULL GROUP BY s.customer_id ORDER BY name ASC',
      [from, to]
    )

    const historyCustomerId = customerId || Number(customers[0]?.customer_id || 0)
    let sales: any[] = []
    if (historyCustomerId) {
      sales = queryAll(db,
        'SELECT s.id, s.folio, s.date, s.created_at, s.payment_method, s.total, s.discount, s.amount_paid, ' +
        'COUNT(si.id) as item_count, COALESCE(SUM(si.quantity), 0) as units ' +
        'FROM sales s LEFT JOIN sale_items si ON si.sale_id=s.id ' +
        'WHERE s.customer_id=? AND s.date BETWEEN ? AND ? AND ' + activeSalesCondition +
        ' GROUP BY s.id ORDER BY s.date DESC, datetime(s.created_at) DESC',
        [historyCustomerId, from, to]
      )
    }

    return { summary, customers, customersForFilter, selectedCustomerId: historyCustomerId || null, sales, from, to }
  })
  ipcMain.handle('reports:getSalesPerformance', (_e, from: string, to: string, groupBy: 'day' | 'week' | 'month' = 'day') => {
    const db = getDb()
    const start = new Date(from + 'T00:00:00Z')
    const end = new Date(to + 'T00:00:00Z')
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    const previousToDate = new Date(start)
    previousToDate.setUTCDate(previousToDate.getUTCDate() - 1)
    const previousFromDate = new Date(previousToDate)
    previousFromDate.setUTCDate(previousFromDate.getUTCDate() - Math.max(days - 1, 0))
    const previousFrom = previousFromDate.toISOString().slice(0, 10)
    const previousTo = previousToDate.toISOString().slice(0, 10)

    const summaryFor = (startDate: string, endDate: string) => queryFirst(db,
      'SELECT COUNT(*) as total_sales, COALESCE(SUM(total), 0) as total_revenue FROM sales WHERE date BETWEEN ? AND ? AND ' + activeSalesCondition,
      [startDate, endDate]
    ) || { total_sales: 0, total_revenue: 0 }

    const periodExpression = groupBy === 'month'
      ? "substr(date, 1, 7)"
      : groupBy === 'week'
        ? "strftime('%Y-W%W', date)"
        : 'date'

    const trend = queryAll(db,
      'SELECT ' + periodExpression + ' as period, MIN(date) as period_start, COUNT(*) as count, COALESCE(SUM(total), 0) as total ' +
      'FROM sales WHERE date BETWEEN ? AND ? AND ' + activeSalesCondition + ' ' +
      'GROUP BY period ORDER BY period_start ASC',
      [from, to]
    )

    const products = queryAll(db,
      "SELECT COALESCE(p.name, si.description) as name, COALESCE(c.name, 'Sin categoría') as category_name, " +
      'COALESCE(SUM(si.quantity), 0) as quantity, COALESCE(SUM(si.subtotal), 0) as total, COUNT(DISTINCT s.id) as sale_count ' +
      'FROM sale_items si JOIN sales s ON s.id=si.sale_id ' +
      'LEFT JOIN products p ON p.id=si.product_id LEFT JOIN categories c ON c.id=p.category_id ' +
      "WHERE si.item_type='product' AND s.date BETWEEN ? AND ? AND (s.cancelled IS NULL OR s.cancelled=0) " +
      'GROUP BY si.product_id, si.description, c.name ORDER BY total DESC, quantity DESC LIMIT 10',
      [from, to]
    )

    const categories = queryAll(db,
      "SELECT COALESCE(c.name, 'Sin categoría') as name, COALESCE(SUM(si.quantity), 0) as quantity, " +
      'COALESCE(SUM(si.subtotal), 0) as total, COUNT(DISTINCT s.id) as sale_count ' +
      'FROM sale_items si JOIN sales s ON s.id=si.sale_id ' +
      'LEFT JOIN products p ON p.id=si.product_id LEFT JOIN categories c ON c.id=p.category_id ' +
      "WHERE si.item_type='product' AND s.date BETWEEN ? AND ? AND (s.cancelled IS NULL OR s.cancelled=0) " +
      'GROUP BY c.id, c.name ORDER BY total DESC, quantity DESC LIMIT 10',
      [from, to]
    )

    const services = queryAll(db,
      'SELECT si.description as name, si.item_type, COALESCE(SUM(si.quantity), 0) as quantity, ' +
      'COALESCE(SUM(si.subtotal), 0) as total, COUNT(DISTINCT s.id) as sale_count ' +
      'FROM sale_items si JOIN sales s ON s.id=si.sale_id ' +
      "WHERE si.item_type <> 'product' AND s.date BETWEEN ? AND ? AND (s.cancelled IS NULL OR s.cancelled=0) " +
      'GROUP BY si.item_type, si.description ORDER BY total DESC, quantity DESC LIMIT 10',
      [from, to]
    )

    return {
      current: summaryFor(from, to),
      previous: summaryFor(previousFrom, previousTo),
      previousFrom,
      previousTo,
      trend,
      products,
      categories,
      services,
    }
  })
}
