import { IpcMain } from 'electron'
import { getDb, saveDb } from '../db/client'
import { queryAll, queryFirst, run, count } from '../db/helpers'

export function registerCategoryHandlers(ipcMain: IpcMain) {
  ipcMain.handle('categories:getAll', () => {
    return queryAll(getDb(), 'SELECT * FROM categories ORDER BY name ASC')
  })

  ipcMain.handle('categories:create', (_e, data: { name: string }) => {
    const db = getDb()
    const id = run(db, 'INSERT INTO categories (name) VALUES (?)', [data.name])
    saveDb()
    return { id, name: data.name }
  })

  ipcMain.handle('categories:update', (_e, id: number, data: { name: string }) => {
    const db = getDb()
    run(db, 'UPDATE categories SET name=? WHERE id=?', [data.name, id])
    saveDb()
    return { success: true }
  })

  ipcMain.handle('categories:delete', (_e, id: number) => {
    const db = getDb()
    const used = count(db, 'SELECT COUNT(*) FROM products WHERE category_id=? AND active=1', [id])
    if (used > 0) return { success: false, error: 'La categoría tiene productos activos' }
    run(db, 'DELETE FROM categories WHERE id=?', [id])
    saveDb()
    return { success: true }
  })
}
