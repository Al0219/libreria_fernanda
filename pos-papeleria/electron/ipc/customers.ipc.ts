import { IpcMain } from 'electron'
import { getDb, saveDb } from '../db/client'
import { queryAll, queryFirst, run } from '../db/helpers'

function normalizeName(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-GT')
}

function normalizeNit(value: unknown) {
  return String(value || '').replace(/[\s-]/g, '').toLocaleUpperCase('es-GT')
}

function normalizePhone(value: unknown) {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('502')) digits = digits.slice(3)
  return digits
}

function customerValues(data: any) {
  const name = String(data.name || '').trim().replace(/\s+/g, ' ')
  if (!name) throw new Error('El nombre del cliente es obligatorio')

  const creditAuthorized = Boolean(data.creditAuthorized)
  const creditLimit = Number(data.creditLimit || 0)
  if (!Number.isFinite(creditLimit) || creditLimit < 0) throw new Error('El límite de crédito no es válido.')
  if (creditAuthorized && creditLimit <= 0) throw new Error('Define un límite de crédito mayor a cero para autorizar crédito.')

  const nit = String(data.nit || '').trim()
  const phone = String(data.phone || '').trim()
  return {
    name,
    nameNormalized: normalizeName(name),
    nit: nit || null,
    nitNormalized: normalizeNit(nit),
    phone: phone || null,
    phoneNormalized: normalizePhone(phone),
    email: String(data.email || '').trim() || null,
    address: String(data.address || '').trim() || null,
    notes: String(data.notes || '').trim() || null,
    creditAuthorized,
    creditLimit,
  }
}

function duplicateError(error: unknown) {
  return String(error).includes('UNIQUE constraint failed: customers.name_normalized')
}

const customerSelect = "SELECT c.*, COALESCE((SELECT SUM(ar.balance) FROM accounts_receivable ar WHERE ar.customer_id=c.id AND ar.status='open'), 0) as outstanding_balance FROM customers c"

export function registerCustomerHandlers(ipcMain: IpcMain) {
  ipcMain.handle('customers:getAll', (_e, filters?: { search?: string; includeArchived?: boolean }) => {
    const db = getDb()
    const params: string[] = []
    let sql = customerSelect + ' WHERE 1=1'
    if (!filters?.includeArchived) sql += ' AND c.active=1'
    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`
      sql += ' AND (c.name LIKE ? OR c.nit LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)'
      params.push(term, term, term, term)
    }
    return queryAll(db, `${sql} ORDER BY c.active DESC, c.name ASC`, params)
  })

  ipcMain.handle('customers:getById', (_e, id: number) =>
    queryFirst(getDb(), customerSelect + ' WHERE c.id=?', [id])
  )

  ipcMain.handle('customers:create', (_e, data: any) => {
    const db = getDb()
    const customer = customerValues(data)
    try {
      const id = run(db,
        `INSERT INTO customers (
          name, name_normalized, nit, nit_normalized, phone, phone_normalized, email, address, notes, credit_authorized, credit_limit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer.name, customer.nameNormalized, customer.nit, customer.nitNormalized,
          customer.phone, customer.phoneNormalized, customer.email, customer.address, customer.notes,
          customer.creditAuthorized ? 1 : 0, customer.creditLimit,
        ]
      )
      saveDb()
      return { id, ...customer, active: 1, outstanding_balance: 0 }
    } catch (error) {
      if (duplicateError(error)) throw new Error('Ya existe un cliente con el mismo nombre, NIT y teléfono.')
      throw error
    }
  })

  ipcMain.handle('customers:update', (_e, id: number, data: any) => {
    const db = getDb()
    const customer = customerValues(data)
    try {
      run(db,
        `UPDATE customers SET
          name=?, name_normalized=?, nit=?, nit_normalized=?, phone=?, phone_normalized=?,
          email=?, address=?, notes=?, credit_authorized=?, credit_limit=?
         WHERE id=?`,
        [
          customer.name, customer.nameNormalized, customer.nit, customer.nitNormalized,
          customer.phone, customer.phoneNormalized, customer.email, customer.address, customer.notes,
          customer.creditAuthorized ? 1 : 0, customer.creditLimit, id,
        ]
      )
      saveDb()
      return { id, ...customer }
    } catch (error) {
      if (duplicateError(error)) throw new Error('Ya existe un cliente con el mismo nombre, NIT y teléfono.')
      throw error
    }
  })

  ipcMain.handle('customers:setActive', (_e, id: number, active: boolean) => {
    const db = getDb()
    run(db, 'UPDATE customers SET active=? WHERE id=?', [active ? 1 : 0, id])
    saveDb()
    return { success: true }
  })
}