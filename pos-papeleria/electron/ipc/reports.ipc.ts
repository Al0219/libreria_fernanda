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
      "COALESCE(SUM(CASE WHEN payment_method='cash' THEN 1 ELSE 0 END), 0) as cash_count, " +
      "COALESCE(SUM(CASE WHEN payment_method='card' THEN 1 ELSE 0 END), 0) as card_count, " +
      "COALESCE(SUM(CASE WHEN payment_method='transfer' THEN 1 ELSE 0 END), 0) as transfer_count " +
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
}
