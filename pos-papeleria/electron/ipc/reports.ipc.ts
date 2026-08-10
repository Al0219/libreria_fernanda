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
