import { IpcMain } from 'electron'
import { getDb, saveDb } from '../db/client'
import { queryAll, queryFirst, run, transaction } from '../db/helpers'
import { businessDate } from '../lib/business-time'

const paymentMethods = ['cash', 'card', 'transfer']

function accountStatusExpression(today: string) {
  return "CASE WHEN ar.status='open' AND ar.due_date < '" + today + "' THEN 'overdue' ELSE ar.status END"
}

export function registerCreditHandlers(ipcMain: IpcMain) {
  ipcMain.handle('credits:getDashboard', (_e, filters?: { search?: string; status?: string }) => {
    const db = getDb()
    const today = businessDate()
    const params: any[] = []
    const statusExpression = accountStatusExpression(today)
    let where = " WHERE ar.status='open'"
    if (filters?.status === 'overdue') { where += ' AND ar.due_date < ?'; params.push(today) }
    else if (filters?.status === 'open') { where += ' AND ar.due_date >= ?'; params.push(today) }
    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`
      where += ' AND (c.name LIKE ? OR c.nit LIKE ? OR s.folio LIKE ?)'
      params.push(term, term, term)
    }

    const accounts = queryAll(db,
      'SELECT ar.*, s.folio, s.date as sale_date, c.name as customer_name, c.nit as customer_nit, ' + statusExpression + ' as display_status, ' +
      '(ar.original_amount - ar.balance) as paid_amount ' +
      'FROM accounts_receivable ar JOIN sales s ON s.id=ar.sale_id JOIN customers c ON c.id=ar.customer_id' + where +
      ' ORDER BY CASE WHEN ar.due_date < ? THEN 0 ELSE 1 END, ar.due_date ASC, ar.id ASC',
      [...params, today]
    )

    const summary = queryFirst(db,
      "SELECT COALESCE(SUM(balance), 0) as outstanding, COALESCE(SUM(CASE WHEN due_date < ? THEN balance ELSE 0 END), 0) as overdue, COUNT(*) as open_count FROM accounts_receivable WHERE status='open'",
      [today]
    )
    return { summary, accounts, today }
  })

  ipcMain.handle('credits:getPayments', (_e, accountId: number) => queryAll(getDb(),
    'SELECT * FROM credit_payments WHERE account_id=? ORDER BY datetime(created_at) DESC, id DESC', [accountId]
  ))

  ipcMain.handle('credits:addPayment', (_e, data: { accountId: number; amount: number; paymentMethod: string; notes?: string }) => {
    const accountId = Number(data.accountId)
    const amount = Math.round(Number(data.amount) * 100) / 100
    if (!Number.isInteger(accountId) || accountId <= 0) return { success: false, error: 'La cuenta por cobrar no es válida.' }
    if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'El abono debe ser mayor a cero.' }
    if (!paymentMethods.includes(data.paymentMethod)) return { success: false, error: 'El medio de cobro no es válido.' }

    const db = getDb()
    const date = businessDate()
    const result = transaction(db, () => {
      const account = queryFirst(db,
        "SELECT ar.*, s.cancelled FROM accounts_receivable ar JOIN sales s ON s.id=ar.sale_id WHERE ar.id=?",
        [accountId]
      )
      if (!account || account.status !== 'open' || account.cancelled) return { success: false, error: 'La cuenta no está disponible para abonos.' }
      if (amount > Number(account.balance) + 0.0001) return { success: false, error: 'El abono no puede superar el saldo pendiente.' }

      const newBalance = Math.max(0, Math.round((Number(account.balance) - amount) * 100) / 100)
      run(db,
        'INSERT INTO credit_payments (account_id, sale_id, customer_id, amount, payment_method, business_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [account.id, account.sale_id, account.customer_id, amount, data.paymentMethod, date, String(data.notes || '').trim() || null, new Date().toISOString()]
      )
      run(db,
        'UPDATE accounts_receivable SET balance=?, status=?, paid_at=? WHERE id=?',
        [newBalance, newBalance === 0 ? 'paid' : 'open', newBalance === 0 ? new Date().toISOString() : null, account.id]
      )
      return { success: true, balance: newBalance }
    })
    if (result.success) saveDb()
    return result
  })
}