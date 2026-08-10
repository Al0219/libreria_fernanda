import { IpcMain } from 'electron'
import { getDb, saveDb } from '../db/client'
import { queryAll, queryFirst, run, transaction } from '../db/helpers'
import { businessDate } from '../lib/business-time'

const paymentMethods = ['cash', 'card', 'transfer']

function accountStatusExpression(today: string) {
  return "CASE WHEN ap.status='open' AND ap.due_date < '" + today + "' THEN 'overdue' ELSE ap.status END"
}

export function registerPayableHandlers(ipcMain: IpcMain) {
  ipcMain.handle('payables:getDashboard', (_e, filters?: { search?: string; status?: string }) => {
    const db = getDb()
    const today = businessDate()
    const params: any[] = []
    const statusExpression = accountStatusExpression(today)
    let where = " WHERE ap.status='open' AND (se.cancelled IS NULL OR se.cancelled=0)"
    if (filters?.status === 'overdue') { where += ' AND ap.due_date < ?'; params.push(today) }
    else if (filters?.status === 'open') { where += ' AND ap.due_date >= ?'; params.push(today) }
    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`
      where += ' AND (s.name LIKE ? OR s.nit LIKE ? OR CAST(se.id AS TEXT) LIKE ?)'
      params.push(term, term, term)
    }

    const accounts = queryAll(db,
      'SELECT ap.*, se.id as stock_entry_id, se.date as purchase_date, se.notes as purchase_notes, s.name as supplier_name, s.nit as supplier_nit, ' +
      statusExpression + ' as display_status, (ap.original_amount - ap.balance) as paid_amount ' +
      'FROM accounts_payable ap JOIN stock_entries se ON se.id=ap.stock_entry_id JOIN suppliers s ON s.id=ap.supplier_id' + where +
      ' ORDER BY CASE WHEN ap.due_date < ? THEN 0 ELSE 1 END, ap.due_date ASC, ap.id ASC', [...params, today]
    )
    const summary = queryFirst(db,
      "SELECT COALESCE(SUM(ap.balance), 0) as outstanding, COALESCE(SUM(CASE WHEN ap.due_date < ? THEN ap.balance ELSE 0 END), 0) as overdue, COUNT(*) as open_count FROM accounts_payable ap JOIN stock_entries se ON se.id=ap.stock_entry_id WHERE ap.status='open' AND (se.cancelled IS NULL OR se.cancelled=0)",
      [today]
    )
    return { summary, accounts, today }
  })

  ipcMain.handle('payables:getPayments', (_e, accountId: number) => queryAll(getDb(),
    'SELECT * FROM payable_payments WHERE account_id=? ORDER BY datetime(created_at) DESC, id DESC', [accountId]
  ))

  ipcMain.handle('payables:addPayment', (_e, data: { accountId: number; amount: number; paymentMethod: string; notes?: string }) => {
    const accountId = Number(data.accountId)
    const amount = Math.round(Number(data.amount) * 100) / 100
    if (!Number.isInteger(accountId) || accountId <= 0) return { success: false, error: 'La cuenta por pagar no es válida.' }
    if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'El pago debe ser mayor a cero.' }
    if (!paymentMethods.includes(data.paymentMethod)) return { success: false, error: 'El medio de pago no es válido.' }

    const db = getDb()
    const date = businessDate()
    const result = transaction(db, () => {
      const account = queryFirst(db,
        'SELECT ap.*, se.cancelled FROM accounts_payable ap JOIN stock_entries se ON se.id=ap.stock_entry_id WHERE ap.id=?', [accountId]
      )
      if (!account || account.status !== 'open' || account.cancelled) return { success: false, error: 'La cuenta no está disponible para pagos.' }
      if (amount > Number(account.balance) + 0.0001) return { success: false, error: 'El pago no puede superar el saldo pendiente.' }

      const newBalance = Math.max(0, Math.round((Number(account.balance) - amount) * 100) / 100)
      run(db,
        'INSERT INTO payable_payments (account_id, stock_entry_id, supplier_id, amount, payment_method, business_date, notes, created_at) VALUES (?,?,?,?,?,?,?,?)',
        [account.id, account.stock_entry_id, account.supplier_id, amount, data.paymentMethod, date, String(data.notes || '').trim() || null, new Date().toISOString()]
      )
      run(db, 'UPDATE accounts_payable SET balance=?, status=?, paid_at=? WHERE id=?',
        [newBalance, newBalance === 0 ? 'paid' : 'open', newBalance === 0 ? new Date().toISOString() : null, account.id])
      return { success: true, balance: newBalance }
    })
    if (result.success) saveDb()
    return result
  })
}