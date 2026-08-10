import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { initializeDatabase } from './db/client'
import { registerProductHandlers } from './ipc/products.ipc'
import { registerCategoryHandlers } from './ipc/categories.ipc'
import { registerSaleHandlers } from './ipc/sales.ipc'
import { registerSupplierHandlers } from './ipc/suppliers.ipc'
import { registerReportHandlers } from './ipc/reports.ipc'
import { registerConfigHandlers } from './ipc/config.ipc'
import { registerStockEntryHandlers } from './ipc/stockEntries.ipc'
import { registerCustomerHandlers } from './ipc/customers.ipc'
import { registerCashRegisterHandlers } from './ipc/cashRegister.ipc'
import { registerCreditHandlers } from './ipc/credits.ipc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'POS Papelería',
    backgroundColor: '#ffffff',
  })

  win.webContents.openDevTools()

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(process.env.DIST!, 'index.html'))
  }
}

app.whenReady().then(async () => {
  // Inicializar base de datos (async con sql.js)
  await initializeDatabase()

  // Registrar handlers IPC
  registerProductHandlers(ipcMain)
  registerCategoryHandlers(ipcMain)
  registerSaleHandlers(ipcMain)
  registerSupplierHandlers(ipcMain)
  registerReportHandlers(ipcMain)
  registerConfigHandlers(ipcMain)
  registerStockEntryHandlers(ipcMain)
  registerCustomerHandlers(ipcMain)
  registerCashRegisterHandlers(ipcMain)
  registerCreditHandlers(ipcMain)

  // PDF: guardar buffer y abrir con visor del sistema
  ipcMain.handle('pdf:saveAndOpen', async (_e, buffer: Uint8Array, filename: string) => {
    try {
      const dir = path.join(app.getPath('userData'), 'tickets')
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      const filePath = path.join(dir, filename)
      fs.writeFileSync(filePath, Buffer.from(buffer))
      await shell.openPath(filePath)
      return { ok: true, path: filePath }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  // Exportaciones: guardar y abrir con la aplicación predeterminada
  ipcMain.handle('exports:saveAndOpen', async (_e, buffer: Uint8Array, filename: string) => {
    try {
      const dir = path.join(app.getPath('userData'), 'exports')
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      const safeName = path.basename(String(filename || 'reporte'))
      const filePath = path.join(dir, safeName)
      fs.writeFileSync(filePath, Buffer.from(buffer))
      await shell.openPath(filePath)
      return { ok: true, path: filePath }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})
