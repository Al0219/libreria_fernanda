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
  // Clientes
  customers: {
    getAll: (filters?: any) => ipcRenderer.invoke('customers:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('customers:getById', id),
    create: (data: any) => ipcRenderer.invoke('customers:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('customers:update', id, data),
    setActive: (id: number, active: boolean) => ipcRenderer.invoke('customers:setActive', id, active),
  },
  // Entradas de mercancía
  stockEntries: {
    create: (data: any) => ipcRenderer.invoke('stockEntries:create', data),
    getAll: (filters?: any) => ipcRenderer.invoke('stockEntries:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('stockEntries:getById', id),
    getPriceHistory: (productId: number) => ipcRenderer.invoke('stockEntries:getPriceHistory', productId),
    cancel: (id: number) => ipcRenderer.invoke('stockEntries:cancel', id),
  },
  // Reportes
  reports: {
    getSalesByRange: (from: string, to: string) => ipcRenderer.invoke('reports:getSalesByRange', from, to),
    getOperationalSummary: (from: string, to: string) => ipcRenderer.invoke('reports:getOperationalSummary', from, to),
    getSalesPerformance: (from: string, to: string, groupBy: 'day' | 'week' | 'month') => ipcRenderer.invoke('reports:getSalesPerformance', from, to, groupBy),
    getTopProducts: (limit?: number) => ipcRenderer.invoke('reports:getTopProducts', limit),
    getDailyCashRegister: (date?: string) => ipcRenderer.invoke('reports:getDailyCashRegister', date),
    getLowStockReport: () => ipcRenderer.invoke('reports:getLowStockReport'),
    getInventoryStatus: (from: string, to: string) => ipcRenderer.invoke('reports:getInventoryStatus', from, to),
    getPurchasesReport: (from: string, to: string, filters?: { supplierId?: number; productId?: number }) => ipcRenderer.invoke('reports:getPurchasesReport', from, to, filters),
  },
  // Cuentas por cobrar
  credits: {
    getDashboard: (filters?: { search?: string; status?: string }) => ipcRenderer.invoke('credits:getDashboard', filters),
    getPayments: (accountId: number) => ipcRenderer.invoke('credits:getPayments', accountId),
    addPayment: (data: { accountId: number; amount: number; paymentMethod: string; notes?: string }) => ipcRenderer.invoke('credits:addPayment', data),
  },  // Caja y gastos
  cashRegister: {
    getToday: () => ipcRenderer.invoke('cashRegister:getToday'),
    getHistory: () => ipcRenderer.invoke('cashRegister:getHistory'),
    open: (data: { openingAmount: number; notes?: string }) => ipcRenderer.invoke('cashRegister:open', data),
    addExpense: (data: { category: string; description: string; amount: number }) => ipcRenderer.invoke('cashRegister:addExpense', data),
    close: (data: { countedCash: number; notes?: string }) => ipcRenderer.invoke('cashRegister:close', data),
    reopen: () => ipcRenderer.invoke('cashRegister:reopen'),
    deleteExpense: (id: number) => ipcRenderer.invoke('cashRegister:deleteExpense', id),
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
