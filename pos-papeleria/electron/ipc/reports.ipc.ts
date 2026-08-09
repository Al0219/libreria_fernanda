import { IpcMain } from 'electron'
import { getDb, saveDb } from '../db/client'
import { queryAll, queryFirst, run } from '../db/helpers'
import { businessDate } from '../lib/business-time'

export function registerReportHandlers(ipcMain: IpcMain) {
  ipcMain.handle('reports:getSalesByRange', (_e, from: string, to: string) => {
    return queryAll(getDb(),
      `SELECT date, COUNT(*) as count, SUM(total) as total FROM sales WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date ASC`,
      [from, to]
    )
  })

  ipcMain.handle('reports:getTopProducts', (_e, limit = 10) => {
    return queryAll(getDb(), `
      SELECT p.name, SUM(si.quantity) as total_qty, SUM(si.subtotal) as total_revenue
      FROM sale_items si JOIN products p ON si.product_id=p.id
      WHERE si.item_type='product'
      GROUP BY si.product_id ORDER BY total_revenue DESC LIMIT ?
    `, [limit])
  })

  ipcMain.handle('reports:getDailyCashRegister', (_e, date?: string) => {
    const db = getDb()
    const targetDate = date || businessDate()

    const sales = queryAll(db, `SELECT * FROM sales WHERE date=? ORDER BY datetime(created_at) DESC`, [targetDate])

    const summary = {
      total_sales: sales.length,
      total_revenue: sales.reduce((s: number, r: any) => s + r.total, 0),
      total_discounts: sales.reduce((s: number, r: any) => s + (r.discount || 0), 0),
      cash_total: sales.filter((s: any) => s.payment_method === 'cash').reduce((s: number, r: any) => s + r.total, 0),
      card_total: sales.filter((s: any) => s.payment_method === 'card').reduce((s: number, r: any) => s + r.total, 0),
      transfer_total: sales.filter((s: any) => s.payment_method === 'transfer').reduce((s: number, r: any) => s + r.total, 0),
    }

    const byType = queryAll(db, `
      SELECT si.item_type, SUM(si.subtotal) as total, COUNT(DISTINCT si.sale_id) as count
      FROM sale_items si JOIN sales s ON si.sale_id=s.id
      WHERE s.date=? GROUP BY si.item_type
    `, [targetDate])

    return { summary, byType, sales, date: targetDate }
  })

  ipcMain.handle('reports:getLowStockReport', () => {
    return queryAll(getDb(), `
      SELECT p.id, p.name, p.sku, p.stock, p.min_stock, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id=c.id
      LEFT JOIN suppliers s ON p.supplier_id=s.id
      WHERE p.active=1 AND p.stock <= p.min_stock
      ORDER BY (p.stock - p.min_stock) ASC
    `)
  })
}
