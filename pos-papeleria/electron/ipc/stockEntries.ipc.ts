import { IpcMain } from 'electron'
import { getDb, saveDb } from '../db/client'
import { queryAll, queryFirst, run } from '../db/helpers'

export function registerStockEntryHandlers(ipcMain: IpcMain) {
  ipcMain.handle('stockEntries:create', (_e, data: any) => {
    const db = getDb()

    const entryId = run(db,
      `INSERT INTO stock_entries (supplier_id, date, total_amount, notes) VALUES (?,?,?,?)`,
      [data.supplierId || null, data.date, data.totalAmount, data.notes || null]
    )

    for (const item of data.items) {
      run(db,
        `INSERT INTO stock_entry_items (entry_id, product_id, quantity, purchase_price, subtotal) VALUES (?,?,?,?,?)`,
        [entryId, item.productId, item.quantity, item.purchasePrice, item.subtotal]
      )
      run(db,
        `UPDATE products SET stock=stock+?, purchase_price=?, updated_at=datetime('now') WHERE id=?`,
        [item.quantity, item.purchasePrice, item.productId]
      )
    }

    saveDb()
    return { id: entryId, success: true }
  })

  ipcMain.handle('stockEntries:getAll', (_e, filters?: { supplierId?: number; from?: string; to?: string }) => {
    const db = getDb()
    let sql = `SELECT se.*, s.name as supplier_name FROM stock_entries se LEFT JOIN suppliers s ON se.supplier_id=s.id WHERE 1=1`
    const params: any[] = []
    if (filters?.supplierId) { sql += ' AND se.supplier_id=?'; params.push(filters.supplierId) }
    if (filters?.from) { sql += ' AND se.date>=?'; params.push(filters.from) }
    if (filters?.to) { sql += ' AND se.date<=?'; params.push(filters.to) }
    sql += ' ORDER BY se.date DESC'
    return queryAll(db, sql, params)
  })

  ipcMain.handle('stockEntries:getById', (_e, id: number) => {
    const db = getDb()
    const entry = queryFirst(db, 'SELECT * FROM stock_entries WHERE id=?', [id])
    const items = queryAll(db, `
      SELECT sei.*, p.name as product_name
      FROM stock_entry_items sei JOIN products p ON sei.product_id=p.id
      WHERE sei.entry_id=?
    `, [id])
    return { entry, items }
  })

  ipcMain.handle('stockEntries:getPriceHistory', (_e, productId: number) => {
    const db = getDb()
    return queryAll(db, `
      SELECT sei.purchase_price, se.date, s.name as supplier_name
      FROM stock_entry_items sei
      JOIN stock_entries se ON sei.entry_id=se.id
      LEFT JOIN suppliers s ON se.supplier_id=s.id
      WHERE sei.product_id=?
      ORDER BY se.date ASC
    `, [productId])
  })
}
