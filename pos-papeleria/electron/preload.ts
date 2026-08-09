import { contextBridge, ipcRenderer } from 'electron'

// Exponer API segura al renderer process
const api = {
  // Productos
  products: {
    getAll: (filters?: any) => ipcRenderer.invoke('products:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('products:getById', id),
    create: (data: any) => ipcRenderer.invoke('products:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('products:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('products:delete', id),
    getLowStock: () => ipcRenderer.invoke('products:getLowStock'),
  },
  // Categorías
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    create: (data: any) => ipcRenderer.invoke('categories:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('categories:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('categories:delete', id),
  },
  // Ventas
  sales: {
    create: (data: any) => ipcRenderer.invoke('sales:create', data),
    getAll: (filters?: any) => ipcRenderer.invoke('sales:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('sales:getById', id),
    getToday: () => ipcRenderer.invoke('sales:getToday'),
    getDailySummary: (date?: string) => ipcRenderer.invoke('sales:getDailySummary', date),
    cancel: (id: number) => ipcRenderer.invoke('sales:cancel', id),
  },
  // Proveedores
  suppliers: {
    getAll: () => ipcRenderer.invoke('suppliers:getAll'),
    getById: (id: number) => ipcRenderer.invoke('suppliers:getById', id),
    create: (data: any) => ipcRenderer.invoke('suppliers:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('suppliers:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('suppliers:delete', id),
  },
  // Entradas de mercancía
  stockEntries: {
    create: (data: any) => ipcRenderer.invoke('stockEntries:create', data),
    getAll: (filters?: any) => ipcRenderer.invoke('stockEntries:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('stockEntries:getById', id),
    getPriceHistory: (productId: number) => ipcRenderer.invoke('stockEntries:getPriceHistory', productId),
  },
  // Reportes
  reports: {
    getSalesByRange: (from: string, to: string) => ipcRenderer.invoke('reports:getSalesByRange', from, to),
    getTopProducts: (limit?: number) => ipcRenderer.invoke('reports:getTopProducts', limit),
    getDailyCashRegister: (date?: string) => ipcRenderer.invoke('reports:getDailyCashRegister', date),
    getLowStockReport: () => ipcRenderer.invoke('reports:getLowStockReport'),
  },
  // Configuración
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('config:set', key, value),
    getAll: () => ipcRenderer.invoke('config:getAll'),
    getPrintPrices: () => ipcRenderer.invoke('config:getPrintPrices'),
    setPrintPrice: (id: number, price: number) => ipcRenderer.invoke('config:setPrintPrice', id, price),
  },
  // PDF
  pdf: {
    saveAndOpen: (buffer: Uint8Array, filename: string) =>
      ipcRenderer.invoke('pdf:saveAndOpen', buffer, filename),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
