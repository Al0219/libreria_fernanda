import { IpcMain } from 'electron'
import { getDb, saveDb } from '../db/client'
import { queryAll, queryFirst, run } from '../db/helpers'

const supplierSelect = `SELECT s.*, COALESCE((SELECT SUM(ap.balance) FROM accounts_payable ap JOIN stock_entries se ON se.id=ap.stock_entry_id WHERE ap.supplier_id=s.id AND ap.status='open' AND (se.cancelled IS NULL OR se.cancelled=0)), 0) as outstanding_balance FROM suppliers s`

export function registerSupplierHandlers(ipcMain: IpcMain) {
  ipcMain.handle('suppliers:getAll', () => queryAll(getDb(), supplierSelect + ' ORDER BY s.name ASC'))
  ipcMain.handle('suppliers:getById', (_e, id: number) => queryFirst(getDb(), supplierSelect + ' WHERE s.id=?', [id]))

  ipcMain.handle('suppliers:create', (_e, data: any) => {
    const db = getDb()
    const id = run(db, 'INSERT INTO suppliers (name, company, nit, phone, email, address, notes) VALUES (?,?,?,?,?,?,?)',
      [data.name, data.company || null, data.nit || null, data.phone || null, data.email || null, data.address || null, data.notes || null])
    saveDb()
    return { id, ...data }
  })

  ipcMain.handle('suppliers:update', (_e, id: number, data: any) => {
    const db = getDb()
    run(db, 'UPDATE suppliers SET name=?,company=?,nit=?,phone=?,email=?,address=?,notes=? WHERE id=?',
      [data.name, data.company || null, data.nit || null, data.phone || null, data.email || null, data.address || null, data.notes || null, id])
    saveDb()
    return { success: true }
  })

  ipcMain.handle('suppliers:delete', (_e, id: number) => {
    const supplierId = Number(id)
    const db = getDb()
    const outstanding = Number(queryFirst(db,
      "SELECT COALESCE(SUM(ap.balance), 0) as balance FROM accounts_payable ap JOIN stock_entries se ON se.id=ap.stock_entry_id WHERE ap.supplier_id=? AND ap.status='open' AND (se.cancelled IS NULL OR se.cancelled=0)", [supplierId])?.balance || 0)
    if (outstanding > 0.0001) return { success: false, error: 'No se puede eliminar un proveedor con saldo pendiente por pagar.' }
    try {
      run(db, 'DELETE FROM suppliers WHERE id=?', [supplierId])
      saveDb()
      return { success: true }
    } catch {
      return { success: false, error: 'No se puede eliminar el proveedor porque tiene compras o productos relacionados.' }
    }
  })
}