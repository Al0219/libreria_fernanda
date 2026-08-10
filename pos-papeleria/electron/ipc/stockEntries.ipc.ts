import { IpcMain } from 'electron'
import { getDb, saveDb } from '../db/client'
import { queryAll, queryFirst, run, transaction } from '../db/helpers'
import { businessDate } from '../lib/business-time'

const paymentMethods = ['cash', 'card', 'transfer', 'credit']
const directPaymentMethods = ['cash', 'card', 'transfer']
const isBusinessDate = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))

export function registerStockEntryHandlers(ipcMain: IpcMain) {
  ipcMain.handle('stockEntries:create', (_e, data: any) => {
    const paymentMethod = paymentMethods.includes(data.paymentMethod) ? data.paymentMethod : 'cash'
    const totalAmount = Math.round(Number(data.totalAmount) * 100) / 100
    const purchaseDate = String(data.date || '')
    const supplierId = data.supplierId ? Number(data.supplierId) : null
    const initialPayment = Math.round(Number(data.initialPayment || 0) * 100) / 100
    const dueDate = String(data.dueDate || '')
    const initialPaymentMethod = String(data.initialPaymentMethod || 'cash')

    if (!isBusinessDate(purchaseDate)) return { success: false, error: 'La fecha de compra no es válida.' }
    if (!Array.isArray(data.items) || data.items.length === 0) return { success: false, error: 'Agrega al menos un producto a la compra.' }
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) return { success: false, error: 'El total de la compra debe ser mayor a cero.' }
    if (supplierId !== null && (!Number.isInteger(supplierId) || supplierId <= 0)) return { success: false, error: 'El proveedor seleccionado no es válido.' }

    if (paymentMethod === 'credit') {
      if (!supplierId) return { success: false, error: 'Las compras a crédito requieren un proveedor.' }
      if (!isBusinessDate(dueDate) || dueDate < purchaseDate) return { success: false, error: 'Indica una fecha de vencimiento igual o posterior a la compra.' }
      if (!Number.isFinite(initialPayment) || initialPayment < 0 || initialPayment >= totalAmount) return { success: false, error: 'El anticipo debe ser mayor o igual a cero y menor al total.' }
      if (initialPayment > 0 && !directPaymentMethods.includes(initialPaymentMethod)) return { success: false, error: 'El medio del anticipo no es válido.' }
    }

    const db = getDb()
    const result = transaction(db, () => {
      if (supplierId) {
        const supplier = queryFirst(db, 'SELECT id FROM suppliers WHERE id=?', [supplierId])
        if (!supplier) return { success: false, error: 'El proveedor seleccionado no existe.' }
      }
      const preferredSupplierId = data.setAsPreferredSupplier && supplierId ? supplierId : null
      const entryId = run(db,
        'INSERT INTO stock_entries (supplier_id, date, total_amount, payment_method, notes) VALUES (?,?,?,?,?)',
        [supplierId, purchaseDate, totalAmount, paymentMethod, String(data.notes || '').trim() || null]
      )

      for (const item of data.items) {
        const quantity = Number(item.quantity)
        const purchasePrice = Math.round(Number(item.purchasePrice) * 100) / 100
        const salePrice = Math.round(Number(item.salePrice) * 100) / 100
        const productId = Number(item.productId)
        if (!Number.isInteger(productId) || productId <= 0 || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(purchasePrice) || purchasePrice < 0 || !Number.isFinite(salePrice) || salePrice < 0) {
          throw new Error('Uno de los productos de la compra tiene datos inválidos.')
        }
        const product = queryFirst(db, 'SELECT id FROM products WHERE id=?', [productId])
        if (!product) throw new Error('Uno de los productos ya no existe.')
        const subtotal = Math.round(quantity * purchasePrice * 100) / 100
        run(db,
          'INSERT INTO stock_entry_items (entry_id, product_id, quantity, purchase_price, sale_price, subtotal) VALUES (?,?,?,?,?,?)',
          [entryId, productId, quantity, purchasePrice, salePrice, subtotal]
        )
        run(db,
          'UPDATE products SET stock=stock+?, purchase_price=?, sale_price=?, supplier_id=COALESCE(?, supplier_id), updated_at=datetime(\'now\') WHERE id=?',
          [quantity, purchasePrice, salePrice, preferredSupplierId, productId]
        )
      }

      if (paymentMethod === 'credit') {
        const balance = Math.round((totalAmount - initialPayment) * 100) / 100
        const accountId = run(db,
          'INSERT INTO accounts_payable (stock_entry_id, supplier_id, original_amount, balance, due_date, status) VALUES (?,?,?,?,?,?)',
          [entryId, supplierId, totalAmount, balance, dueDate, 'open']
        )
        if (initialPayment > 0) {
          run(db,
            'INSERT INTO payable_payments (account_id, stock_entry_id, supplier_id, amount, payment_method, business_date, notes, created_at) VALUES (?,?,?,?,?,?,?,?)',
            [accountId, entryId, supplierId, initialPayment, initialPaymentMethod, businessDate(), 'Anticipo registrado con la compra', new Date().toISOString()]
          )
        }
        return { id: entryId, accountId, balance, success: true }
      }
      return { id: entryId, success: true }
    })
    if (result.success) saveDb()
    return result
  })

  ipcMain.handle('stockEntries:cancel', (_e, id: number) => {
    const entryId = Number(id)
    if (!Number.isInteger(entryId) || entryId <= 0) return { success: false, error: 'La compra indicada no es válida.' }
    const db = getDb()
    const result = transaction(db, () => {
      const entry = queryFirst(db, 'SELECT id, cancelled FROM stock_entries WHERE id=?', [entryId])
      if (!entry || entry.cancelled) return { success: false, error: 'Compra no encontrada o ya cancelada.' }

      const account = queryFirst(db, 'SELECT * FROM accounts_payable WHERE stock_entry_id=?', [entryId])
      if (account && (account.status !== 'open' || Number(account.balance) < Number(account.original_amount) - 0.0001)) {
        return { success: false, error: 'No se puede cancelar una compra a crédito que ya tiene anticipos o abonos. Registra primero el ajuste correspondiente.' }
      }

      const items = queryAll(db, `
        SELECT sei.product_id, sei.quantity, p.stock, p.name as product_name
        FROM stock_entry_items sei JOIN products p ON p.id=sei.product_id
        WHERE sei.entry_id=?
      `, [entryId])
      for (const item of items) {
        if (Number(item.stock) < Number(item.quantity)) return { success: false, error: `No se puede cancelar: el stock de ${item.product_name} es insuficiente.` }
      }
      for (const item of items) run(db, 'UPDATE products SET stock=stock-?, updated_at=datetime(\'now\') WHERE id=?', [item.quantity, item.product_id])
      if (account) run(db, 'UPDATE accounts_payable SET balance=0, status=?, cancelled_at=? WHERE id=?', ['cancelled', new Date().toISOString(), account.id])
      run(db, 'UPDATE stock_entries SET cancelled=1 WHERE id=?', [entryId])
      return { success: true }
    })
    if (result.success) saveDb()
    return result
  })

  ipcMain.handle('stockEntries:getAll', (_e, filters?: { supplierId?: number; from?: string; to?: string; showCancelled?: boolean }) => {
    const db = getDb()
    let sql = `SELECT se.*, s.name as supplier_name, ap.balance as payable_balance, ap.due_date as payable_due_date, ap.status as payable_status
      FROM stock_entries se LEFT JOIN suppliers s ON se.supplier_id=s.id
      LEFT JOIN accounts_payable ap ON ap.stock_entry_id=se.id WHERE 1=1`
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
    const entry = queryFirst(db, `SELECT se.*, s.name as supplier_name, ap.id as payable_account_id, ap.original_amount as payable_original_amount,
      ap.balance as payable_balance, ap.due_date as payable_due_date, ap.status as payable_status
      FROM stock_entries se LEFT JOIN suppliers s ON s.id=se.supplier_id LEFT JOIN accounts_payable ap ON ap.stock_entry_id=se.id WHERE se.id=?`, [id])
    const items = queryAll(db, 'SELECT sei.*, p.name as product_name FROM stock_entry_items sei JOIN products p ON sei.product_id=p.id WHERE sei.entry_id=?', [id])
    return { entry, items }
  })

  ipcMain.handle('stockEntries:getPriceHistory', (_e, productId: number) => queryAll(getDb(), `
    SELECT sei.id, se.id as entry_id, se.date, se.supplier_id, COALESCE(s.name, 'Compra general') as supplier_name,
           sei.quantity, sei.purchase_price, sei.sale_price
    FROM stock_entry_items sei JOIN stock_entries se ON sei.entry_id=se.id LEFT JOIN suppliers s ON se.supplier_id=s.id
    WHERE sei.product_id=? AND (se.cancelled IS NULL OR se.cancelled=0)
    ORDER BY se.date ASC, se.id ASC, sei.id ASC
  `, [productId]))
}