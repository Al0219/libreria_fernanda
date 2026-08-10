import { IpcMain } from 'electron'
import { getDb, saveDb } from '../db/client'
import { queryAll, queryFirst, run, transaction } from '../db/helpers'
import { businessDate } from '../lib/business-time'

const EXPENSE_CATEGORIES = ['Alimentación', 'Gasto personal', 'Suministros', 'Transporte', 'Otro']

function calculateMetrics(db: any, date: string, registerId: number, openingAmount: number) {
  const cashSales = Number(queryFirst(db,
    "SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE date=? AND payment_method='cash' AND (cancelled IS NULL OR cancelled=0)",
    [date])?.total || 0)
  const cashPurchases = Number(queryFirst(db,
    "SELECT COALESCE(SUM(total_amount), 0) as total FROM stock_entries WHERE date=? AND payment_method='cash' AND (cancelled IS NULL OR cancelled=0)",
    [date])?.total || 0)
  const expenses = Number(queryFirst(db,
    'SELECT COALESCE(SUM(amount), 0) as total FROM cash_expenses WHERE cash_register_id=?',
    [registerId])?.total || 0)

  return {
    openingAmount: Number(openingAmount || 0),
    cashSales,
    cashPurchases,
    expenses,
    expectedCash: Number(openingAmount || 0) + cashSales - cashPurchases - expenses,
  }
}

function getDayData(date: string) {
  const db = getDb()
  const register = queryFirst(db, 'SELECT * FROM cash_registers WHERE business_date=?', [date])
  if (!register) return { date, register: null, metrics: null, expenses: [] }

  const expenses = queryAll(db,
    'SELECT * FROM cash_expenses WHERE cash_register_id=? ORDER BY datetime(created_at) DESC, id DESC',
    [register.id])
  const metrics = calculateMetrics(db, date, register.id, register.opening_amount)

  if (register.status === 'closed') {
    metrics.expectedCash = Number(register.expected_cash || 0)
  }

  return { date, register, metrics, expenses }
}

export function registerCashRegisterHandlers(ipcMain: IpcMain) {
  ipcMain.handle('cashRegister:getToday', () => getDayData(businessDate()))

  ipcMain.handle('cashRegister:getHistory', () => queryAll(getDb(),
    'SELECT * FROM cash_registers ORDER BY business_date DESC LIMIT 30'
  ))

  ipcMain.handle('cashRegister:open', (_e, data: { openingAmount: number; notes?: string }) => {
    const date = businessDate()
    const openingAmount = Number(data.openingAmount)
    if (!Number.isFinite(openingAmount) || openingAmount < 0) {
      return { success: false, error: 'El fondo inicial debe ser un monto válido.' }
    }

    const db = getDb()
    const existing = queryFirst(db, 'SELECT id FROM cash_registers WHERE business_date=?', [date])
    if (existing) return { success: false, error: 'Ya existe una apertura o corte para este día.' }

    const id = run(db,
      'INSERT INTO cash_registers (business_date, opening_amount, opening_notes, opened_at) VALUES (?,?,?,?)',
      [date, openingAmount, data.notes?.trim() || null, new Date().toISOString()]
    )
    saveDb()
    return { success: true, id }
  })

  ipcMain.handle('cashRegister:addExpense', (_e, data: { category: string; description: string; amount: number }) => {
    const date = businessDate()
    const amount = Number(data.amount)
    if (!EXPENSE_CATEGORIES.includes(data.category)) return { success: false, error: 'La categoría de gasto no es válida.' }
    if (!data.description?.trim()) return { success: false, error: 'Describe el gasto.' }
    if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'El monto debe ser mayor a cero.' }

    const db = getDb()
    const register = queryFirst(db, 'SELECT id, status FROM cash_registers WHERE business_date=?', [date])
    if (!register) return { success: false, error: 'Primero debes abrir la caja del día.' }
    if (register.status !== 'open') return { success: false, error: 'La caja ya fue cerrada; no admite más gastos.' }

    const id = run(db,
      'INSERT INTO cash_expenses (cash_register_id, business_date, category, description, amount, created_at) VALUES (?,?,?,?,?,?)',
      [register.id, date, data.category, data.description.trim(), amount, new Date().toISOString()]
    )
    saveDb()
    return { success: true, id }
  })

  ipcMain.handle('cashRegister:close', (_e, data: { countedCash: number; notes?: string }) => {
    const date = businessDate()
    const countedCash = Number(data.countedCash)
    if (!Number.isFinite(countedCash) || countedCash < 0) {
      return { success: false, error: 'El efectivo contado debe ser un monto válido.' }
    }

    const db = getDb()
    const result = transaction(db, () => {
      const register = queryFirst(db, 'SELECT * FROM cash_registers WHERE business_date=?', [date])
      if (!register) return { success: false, error: 'No hay una caja abierta para este día.' }
      if (register.status !== 'open') return { success: false, error: 'La caja ya fue cerrada.' }

      const metrics = calculateMetrics(db, date, register.id, register.opening_amount)
      const difference = countedCash - metrics.expectedCash
      run(db,
        'UPDATE cash_registers SET status=?, expected_cash=?, counted_cash=?, difference=?, closing_notes=?, closed_at=? WHERE id=?',
        ['closed', metrics.expectedCash, countedCash, difference, data.notes?.trim() || null, new Date().toISOString(), register.id]
      )
      return { success: true, expectedCash: metrics.expectedCash, difference }
    })

    if (result.success) saveDb()
    return result
  })
  ipcMain.handle('cashRegister:reopen', () => {
    const date = businessDate()
    const db = getDb()
    const result = transaction(db, () => {
      const register = queryFirst(db, 'SELECT id, status FROM cash_registers WHERE business_date=?', [date])
      if (!register) return { success: false, error: 'No existe una caja para el día actual.' }
      if (register.status !== 'closed') return { success: false, error: 'La caja ya está abierta.' }

      run(db,
        'UPDATE cash_registers SET status=?, expected_cash=NULL, counted_cash=NULL, difference=NULL, closing_notes=NULL, closed_at=NULL WHERE id=?',
        ['open', register.id]
      )
      return { success: true }
    })
    if (result.success) saveDb()
    return result
  })

  ipcMain.handle('cashRegister:deleteExpense', (_e, id: number) => {
    const expenseId = Number(id)
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return { success: false, error: 'El gasto indicado no es válido.' }
    }

    const date = businessDate()
    const db = getDb()
    const result = transaction(db, () => {
      const register = queryFirst(db, 'SELECT id, status FROM cash_registers WHERE business_date=?', [date])
      if (!register) return { success: false, error: 'No hay una caja abierta para el día actual.' }
      if (register.status !== 'open') return { success: false, error: 'La caja ya fue cerrada; no se pueden eliminar gastos.' }

      const expense = queryFirst(db,
        'SELECT id FROM cash_expenses WHERE id=? AND cash_register_id=? AND business_date=?',
        [expenseId, register.id, date]
      )
      if (!expense) return { success: false, error: 'El gasto no corresponde a la caja actual.' }

      run(db, 'DELETE FROM cash_expenses WHERE id=?', [expenseId])
      return { success: true }
    })
    if (result.success) saveDb()
    return result
  })
}
