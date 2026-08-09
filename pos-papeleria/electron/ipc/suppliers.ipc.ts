import { IpcMain } from 'electron'
import { getDb, saveDb } from '../db/client'
import { queryAll, queryFirst, run } from '../db/helpers'

export function registerSupplierHandlers(ipcMain: IpcMain) {
  ipcMain.handle('suppliers:getAll', () =>
    queryAll(getDb(), 'SELECT * FROM suppliers ORDER BY name ASC')
  )

  ipcMain.handle('suppliers:getById', (_e, id: number) =>
    queryFirst(getDb(), 'SELECT * FROM suppliers WHERE id=?', [id])
  )

  ipcMain.handle('suppliers:create', (_e, data: any) => {
    const db = getDb()
    const id = run(db,
      `INSERT INTO suppliers (name, company, phone, email, address, notes) VALUES (?,?,?,?,?,?)`,
      [data.name, data.company || null, data.phone || null, data.email || null, data.address || null, data.notes || null]
    )
    saveDb()
    return { id, ...data }
  })

  ipcMain.handle('suppliers:update', (_e, id: number, data: any) => {
    const db = getDb()
    run(db,
      `UPDATE suppliers SET name=?,company=?,phone=?,email=?,address=?,notes=? WHERE id=?`,
      [data.name, data.company || null, data.phone || null, data.email || null, data.address || null, data.notes || null, id]
    )
    saveDb()
    return { success: true }
  })

  ipcMain.handle('suppliers:delete', (_e, id: number) => {
    const db = getDb()
    run(db, 'DELETE FROM suppliers WHERE id=?', [id])
    saveDb()
    return { success: true }
  })
}
