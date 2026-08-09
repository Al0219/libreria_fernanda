import { IpcMain } from 'electron'
import { getDb, saveDb } from '../db/client'
import { queryAll, queryFirst, run, transaction } from '../db/helpers'

export function registerStockEntryHandlers(ipcMain: IpcMain) {
  ipcMain.handle('stockEntries:create', (_e, data: any) => {
    const db = getDb()
    const result = transaction(db, () => {
      const preferredSupplierId = data.setAsPreferredSupplier && data.supplierId ? Number(data.supplierId) : null
      if (preferredSupplierId) {
        const supplier = queryFirst(db, 'SELECT id FROM suppliers WHERE id=?', [preferredSupplierId])
        if (!supplier) throw new Error('El proveedor seleccionado no existe.')
      }

      const entryId = run(db,
        `INSERT INTO stock_entries (supplier_id, date, total_amount, notes) VALUES (?,?,?,?)`,
        [data.supplierId || null, data.date, data.totalAmount, data.notes || null]
      )

      for (const item of data.items) {
        run(db,
          `INSERT INTO stock_entry_items (entry_id, product_id, quantity, purchase_price, sale_price, subtotal) VALUES (?,?,?,?,?,?)`,
          [entryId, item.productId, item.quantity, item.purchasePrice, item.salePrice, item.subtotal]
        )
        run(db,
          `UPDATE products SET stock=stock+?, purchase_price=?, sale_price=?, supplier_id=COALESCE(?, supplier_id), updated_at=datetime('now') WHERE id=?`,
          [item.quantity, item.purchasePrice, item.salePrice, preferredSupplierId, item.productId]
        )
      }

      return { id: entryId, success: true }
    })
    saveDb()
    return result
  })

  ipcMain.handle('stockEntries:cancel', (_e, id: number) => {
    const db = getDb()
    const result = transaction(db, () => {
      const entry = queryFirst(db, 'SELECT cancelled FROM stock_entries WHERE id=?', [id])
      if (!entry || entry.cancelled) return { success: false, error: 'Compra no encontrada o ya cancelada.' }

      const items = queryAll(db, `
        SELECT sei.product_id, sei.quantity, p.stock, p.name as product_name
        FROM stock_entry_items sei
        JOIN products p ON p.id=sei.product_id
        WHERE sei.entry_id=?
      `, [id])

      for (const item of items) {
        if (Number(item.stock) < Number(item.quantity)) {
          return { success: false, error: `No se puede cancelar: el stock de ${item.product_name} es insuficiente.` }
        }
      }

      for (const item of items) {
        run(db, `UPDATE products SET stock=stock-?, updated_at=datetime('now') WHERE id=?`, [item.quantity, item.product_id])
      }
      run(db, 'UPDATE stock_entries SET cancelled=1 WHERE id=?', [id])
      return { success: true }
    })
    if (result.success) saveDb()
    return result
  })

  ipcMain.handle('stockEntries:getAll', (_e, filters?: { supplierId?: number; from?: string; to?: string; showCancelled?: boolean }) => {
    const db = getDb()
    let sql = `SELECT se.*, s.name as supplier_name FROM stock_entries se LEFT JOIN suppliers s ON se.supplier_id=s.id WHERE 1=1`
    const params: any[] = []
    if (!filters?.showCancelled) sql += ' AND (se.cancelled IS NULL OR se.cancelled=0)'
    if (filters?.supplierId) { sql += ' AND se.supplier_id=?'; params.push(filters.supplierId) }
    if (filters?.from) { sql += ' AND se.date>=?'; params.push(filters.from) }
    if (filters?.to) { sql += ' AND se.date<=?'; params.push(filters.to) }
    sql += ' ORDER BY se.date DESC, se.id DESC'
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
      SELECT sei.id, se.id as entry_id, se.date, se.supplier_id,
             COALESCE(s.name, 'Compra general') as supplier_name,
             sei.quantity, sei.purchase_price, sei.sale_price
      FROM stock_entry_items sei
      JOIN stock_entries se ON sei.entry_id=se.id
      LEFT JOIN suppliers s ON se.supplier_id=s.id
      WHERE sei.product_id=? AND (se.cancelled IS NULL OR se.cancelled=0)
      ORDER BY se.date ASC, se.id ASC, sei.id ASC
    `, [productId])
  })
}
