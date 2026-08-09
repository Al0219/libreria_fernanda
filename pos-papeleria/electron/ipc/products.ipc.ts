import { IpcMain } from 'electron'
import { getDb, saveDb } from '../db/client'
import { queryAll, queryFirst, run } from '../db/helpers'

export function registerProductHandlers(ipcMain: IpcMain) {
  ipcMain.handle('products:getAll', (_e, filters?: { search?: string; categoryId?: number; lowStock?: boolean }) => {
    const db = getDb()
    let sql = `
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.active = 1
    `
    const params: any[] = []

    if (filters?.search) {
      sql += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`
      const q = `%${filters.search}%`
      params.push(q, q, q)
    }
    if (filters?.categoryId) {
      sql += ` AND p.category_id = ?`
      params.push(filters.categoryId)
    }
    if (filters?.lowStock) {
      sql += ` AND p.stock <= p.min_stock`
    }
    sql += ` ORDER BY p.name ASC`

    return queryAll(db, sql, params)
  })

  ipcMain.handle('products:getById', (_e, id: number) => {
    const db = getDb()
    return queryFirst(db, `
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `, [id])
  })

  ipcMain.handle('products:create', (_e, data: any) => {
    const db = getDb()

    // Generar SKU automático: primeras 3 letras del nombre (mayúsculas) + número secuencial
    const prefix = (data.name as string)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
      .replace(/[^a-zA-Z0-9]/g, '')                     // solo alfanuméricos
      .substring(0, 3)
      .toUpperCase()
      .padEnd(3, 'X')                                   // rellenar si el nombre es muy corto

    // Contar cuántos productos tienen ese prefijo para el número secuencial
    const existing = queryAll(db, `SELECT sku FROM products WHERE sku LIKE ?`, [`${prefix}-%`])
    const seq = existing.length + 1
    const sku = `${prefix}-${String(seq).padStart(4, '0')}`

    const id = run(db,
      `INSERT INTO products (name, sku, barcode, category_id, supplier_id, sale_price, purchase_price, stock, min_stock, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [data.name, sku, data.barcode || null, data.categoryId || null, data.supplierId || null,
       data.salePrice, data.purchasePrice || 0, 0, data.minStock || 5]
    )
    saveDb()
    return { id, sku, ...data, stock: 0 }
  })

  ipcMain.handle('products:update', (_e, id: number, data: any) => {
    const db = getDb()
    run(db,
      `UPDATE products SET name=?, sku=?, barcode=?, category_id=?, supplier_id=?,
       sale_price=?, purchase_price=?, min_stock=?, updated_at=datetime('now')
       WHERE id=?`,
      [data.name, data.sku || null, data.barcode || null, data.categoryId || null, data.supplierId || null,
       data.salePrice, data.purchasePrice || 0, data.minStock || 5, id]
    )
    saveDb()
    return { success: true }
  })

  ipcMain.handle('products:delete', (_e, id: number) => {
    const db = getDb()
    run(db, `UPDATE products SET active=0 WHERE id=?`, [id])
    saveDb()
    return { success: true }
  })

  ipcMain.handle('products:getLowStock', () => {
    const db = getDb()
    return queryAll(db, `
      SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1 AND p.stock <= p.min_stock
      ORDER BY p.stock ASC
    `)
  })
}
