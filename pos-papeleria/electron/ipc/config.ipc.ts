import { dialog, IpcMain } from 'electron'
import { createBackup, getDb, saveDb } from '../db/client'
import { queryAll, queryFirst, run } from '../db/helpers'

export function registerConfigHandlers(ipcMain: IpcMain) {
  ipcMain.handle('config:get', (_e, key: string) => queryFirst(getDb(), 'SELECT value FROM business_config WHERE key=?', [key])?.value)

  ipcMain.handle('config:set', (_e, key: string, value: string) => {
    const db = getDb()
    run(db, 'INSERT OR REPLACE INTO business_config (key, value) VALUES (?,?)', [key, value])
    saveDb()
    return { success: true }
  })

  ipcMain.handle('config:getAll', () => {
    const rows = queryAll(getDb(), 'SELECT * FROM business_config') as { key: string; value: string }[]
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  })

  ipcMain.handle('config:chooseDirectory', async (_e, currentPath?: string) => {
    const result = await dialog.showOpenDialog({ defaultPath: currentPath || undefined, properties: ['openDirectory', 'createDirectory'] })
    return result.canceled || !result.filePaths[0] ? null : result.filePaths[0]
  })

  ipcMain.handle('config:createBackup', () => {
    const db = getDb()
    const destination = String(queryFirst(db, 'SELECT value FROM business_config WHERE key=?', ['backup_directory'])?.value || '').trim()
    const retention = Number(queryFirst(db, 'SELECT value FROM business_config WHERE key=?', ['backup_retention'])?.value || 30)
    return createBackup(destination, retention)
  })

  ipcMain.handle('config:getPrintPrices', () => queryAll(getDb(), 'SELECT * FROM print_prices ORDER BY paper_type, print_type'))

  ipcMain.handle('config:setPrintPrice', (_e, id: number, price: number) => {
    const db = getDb()
    run(db, 'UPDATE print_prices SET price_per_page=?, updated_at=datetime(\'now\') WHERE id=?', [price, id])
    saveDb()
    return { success: true }
  })
}